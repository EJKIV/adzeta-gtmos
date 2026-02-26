'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChatSessions } from './use-chat-sessions';
import { parseSSEBuffer } from '@/lib/sse/parse-sse';
import type { ThreadEntry, SkillOutput, ResultContext, FollowUp } from '@/lib/skills/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractResultContext(output: SkillOutput): ResultContext | undefined {
  for (const block of output.blocks) {
    if (block.type === 'table' && block.rows.length > 0) {
      const ids = block.rows.map((r) => r.id as string).filter(Boolean);
      if (ids.length) {
        return { prospectIds: ids, sourceSkillId: output.skillId, resultCount: ids.length };
      }
    }
  }
  return undefined;
}

/** Derive a readable session title from skill output instead of raw text. */
function deriveSessionTitle(text: string, output?: SkillOutput): string {
  if (output && output.status !== 'error' && output.skillId !== 'unknown') {
    const domainLabel: Record<string, string> = {
      'research.prospect_search': 'Prospect Search',
      'analytics.pipeline_summary': 'Pipeline Summary',
      'analytics.kpi_detail': 'KPI Detail',
      'intelligence.recommendations': 'Recommendations',
      'workflow.campaign_create': 'Campaign',
      'workflow.export': 'Export',
      'system.help': 'Help',
    };
    const label = domainLabel[output.skillId];
    if (label) {
      // Extract a qualifier from the text (e.g., "CMOs at fintech" → "Prospect Search — CMOs at fintech")
      const short = text.length > 40 ? text.slice(0, 37) + '...' : text;
      return `${label} — ${short}`.slice(0, 60);
    }
  }
  return text.slice(0, 60);
}

// ---------------------------------------------------------------------------
// Minimum cooldown between commands (ms)
// ---------------------------------------------------------------------------
const COMMAND_COOLDOWN_MS = 500;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface ChatEngine {
  thread: ThreadEntry[];
  isProcessing: boolean;
  isLoadingSession: boolean;
  transitioning: boolean;
  statusMessage: string | null;
  lastFollowUps: FollowUp[];
  feedbackMap: Map<string, 'positive' | 'negative'>;
  sessions: ReturnType<typeof useChatSessions>['sessions'];
  activeSessionId: string | null;
  sessionError: boolean;
  handleCommand: (text: string) => void;
  handleNewChat: () => void;
  handleSwitchSession: (sessionId: string) => void;
  handleArchiveSession: (sessionId: string) => void;
  handleFeedback: (messageId: string, rating: 'positive' | 'negative', comment?: string) => void;
}

export function useChatEngine(userId?: string): ChatEngine {
  const [thread, setThread] = useState<ThreadEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [lastResultContext, setLastResultContext] = useState<ResultContext | undefined>();
  const [lastFollowUps, setLastFollowUps] = useState<FollowUp[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Map<string, 'positive' | 'negative'>>(new Map());
  const [sessionError, setSessionError] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const threadRef = useRef<ThreadEntry[]>([]);
  const threadLengthRef = useRef(0);
  const lastCommandTimeRef = useRef(0);

  // Keep refs in sync
  useEffect(() => {
    threadRef.current = thread;
    threadLengthRef.current = thread.length;
  }, [thread]);

  // Abort on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // Session management
  const {
    sessions,
    activeSessionId,
    createSession,
    loadMessages,
    saveMessage,
    updateTitle,
    switchSession,
    clearSession,
    archiveSession,
  } = useChatSessions(userId);

  // Load messages when switching sessions
  useEffect(() => {
    if (!activeSessionId) return;
    setIsLoadingSession(true);
    loadMessages(activeSessionId).then((msgs) => {
      setThread(msgs);
      setIsLoadingSession(false);
      const lastResponse = [...msgs].reverse().find((m) => m.type === 'response');
      setLastFollowUps(lastResponse?.output?.followUps ?? []);
    });
  }, [activeSessionId, loadMessages]);

  // Cmd+N keyboard shortcut for new chat
  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    setThread([]);
    setLastFollowUps([]);
    setLastResultContext(undefined);
    setIsProcessing(false);
    setStatusMessage(null);
    setFeedbackMap(new Map());
    setSessionError(false);
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewChat();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewChat]);

  // -------------------------------------------------------------------
  // Command execution with SSE streaming
  // -------------------------------------------------------------------
  const handleCommand = useCallback(async (text: string) => {
    // Rate-limit rapid submissions
    const now = Date.now();
    if (now - lastCommandTimeRef.current < COMMAND_COOLDOWN_MS) return;
    lastCommandTimeRef.current = now;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const isFirstMessage = threadLengthRef.current === 0;
    if (isFirstMessage) {
      setTransitioning(true);
      setTimeout(() => setTransitioning(false), 400);
    }

    // Lazy session creation
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createSession(text.slice(0, 60));
      if (!sessionId) {
        setSessionError(true);
        // Continue without persistence — don't block the user
      }
    }

    const commandId = `cmd-${crypto.randomUUID()}`;
    const responseId = `res-${crypto.randomUUID()}`;

    const commandEntry: ThreadEntry = { id: commandId, type: 'command', text, timestamp: new Date() };

    setThread((prev) => [...prev, commandEntry]);
    setIsProcessing(true);

    if (sessionId) saveMessage(sessionId, commandEntry);

    try {
      const res = await fetch('/api/agent/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          text,
          resultContext: lastResultContext,
          userId,
        }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let openclawText = '';
      let skillOutput: SkillOutput | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSEBuffer(buffer);
        buffer = remaining;

        for (const evt of events) {
          switch (evt.event) {
            case 'status': {
              const { message } = JSON.parse(evt.data);
              setStatusMessage(message);
              break;
            }

            case 'skill-result': {
              const output: SkillOutput = JSON.parse(evt.data);
              skillOutput = output;
              const ctx = extractResultContext(output);
              if (ctx) setLastResultContext(ctx);

              const responseEntry: ThreadEntry = {
                id: responseId,
                type: 'response',
                output,
                timestamp: new Date(),
              };

              setThread((prev) => [...prev, responseEntry]);
              setLastFollowUps(output.followUps ?? []);

              if (sessionId) saveMessage(sessionId, responseEntry);

              // Smart title on first message
              if (isFirstMessage && sessionId) {
                const smartTitle = deriveSessionTitle(text, output);
                updateTitle(sessionId, smartTitle);
              }
              break;
            }

            case 'openclaw-delta': {
              const { content } = JSON.parse(evt.data) as { content: string };
              openclawText += content;

              setThread((prev) =>
                prev.map((entry) => {
                  if (entry.id !== responseId || !entry.output) return entry;
                  const hasTextBlock = entry.output.blocks.some((b) => b.type === 'text');
                  const updatedBlocks = hasTextBlock
                    ? entry.output.blocks.map((b) =>
                        b.type === 'text'
                          ? { ...b, content: openclawText, isStreaming: true }
                          : b
                      )
                    : [
                        ...entry.output.blocks,
                        { type: 'text' as const, content: openclawText, source: 'Zetty', isStreaming: true },
                      ];
                  return { ...entry, output: { ...entry.output, blocks: updatedBlocks } };
                })
              );
              break;
            }

            case 'openclaw-error': {
              const { message, hint } = JSON.parse(evt.data) as { message: string; hint?: string };
              setThread((prev) =>
                prev.map((entry) => {
                  if (entry.id !== responseId || !entry.output) return entry;
                  return {
                    ...entry,
                    output: {
                      ...entry.output,
                      blocks: [
                        ...entry.output.blocks,
                        {
                          type: 'insight' as const,
                          title: 'Zetty unavailable',
                          description: hint || message,
                          severity: 'warning' as const,
                        },
                      ],
                    },
                  };
                })
              );
              break;
            }

            case 'done': {
              setThread((prev) =>
                prev.map((entry) => {
                  if (entry.id !== responseId || !entry.output) return entry;
                  return {
                    ...entry,
                    output: {
                      ...entry.output,
                      blocks: entry.output.blocks.map((b) =>
                        b.type === 'text' ? { ...b, isStreaming: false } : b
                      ),
                    },
                  };
                })
              );
              break;
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const errorOutput: SkillOutput = {
        skillId: 'error',
        status: 'error',
        blocks: [{ type: 'error', message: 'Something went wrong. Please try again.' }],
        followUps: [{ label: 'Show help', command: 'help' }],
        executionMs: 0,
        dataFreshness: 'mock',
      };
      setThread((prev) => [
        ...prev,
        { id: responseId, type: 'response', output: errorOutput, timestamp: new Date() },
      ]);
      setLastFollowUps(errorOutput.followUps);
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
    }
  }, [lastResultContext, userId, activeSessionId, createSession, updateTitle, saveMessage]);

  // -------------------------------------------------------------------
  // Session switching
  // -------------------------------------------------------------------
  const handleSwitchSession = useCallback(async (sessionId: string) => {
    abortRef.current?.abort();
    setIsProcessing(false);
    setStatusMessage(null);
    setLastResultContext(undefined);
    setFeedbackMap(new Map());
    setSessionError(false);
    setThread([]);
    switchSession(sessionId);
  }, [switchSession]);

  // -------------------------------------------------------------------
  // Archive / delete session
  // -------------------------------------------------------------------
  const handleArchiveSession = useCallback(async (sessionId: string) => {
    await archiveSession(sessionId);
    if (activeSessionId === sessionId) {
      handleNewChat();
    }
  }, [archiveSession, activeSessionId, handleNewChat]);

  // -------------------------------------------------------------------
  // Feedback (uses ref to avoid re-render cascade)
  // -------------------------------------------------------------------
  const handleFeedback = useCallback((messageId: string, rating: 'positive' | 'negative', comment?: string) => {
    setFeedbackMap((prev) => new Map(prev).set(messageId, rating));

    if (!activeSessionId) return;

    // Read from ref to avoid depending on thread state
    const currentThread = threadRef.current;
    const entry = currentThread.find((e) => e.id === messageId);
    let userQuery: string | undefined;
    const idx = currentThread.findIndex((e) => e.id === messageId);
    for (let i = idx - 1; i >= 0; i--) {
      if (currentThread[i].type === 'command' && currentThread[i].text) {
        userQuery = currentThread[i].text;
        break;
      }
    }

    fetch('/api/feedback/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: activeSessionId,
        messageClientId: messageId,
        rating,
        comment,
        userQuery,
        aiOutput: entry?.output,
        skillId: entry?.output?.skillId,
      }),
    }).catch(() => {});
  }, [activeSessionId]);

  return {
    thread,
    isProcessing,
    isLoadingSession,
    transitioning,
    statusMessage,
    lastFollowUps,
    feedbackMap,
    sessions,
    activeSessionId,
    sessionError,
    handleCommand,
    handleNewChat,
    handleSwitchSession,
    handleArchiveSession,
    handleFeedback,
  };
}
