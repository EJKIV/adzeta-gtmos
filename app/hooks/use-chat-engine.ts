'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSessionContext } from '@/app/components/session-provider';
import { useFeedback } from './use-feedback';
import { useSSEStream } from './use-sse-stream';
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
      const short = text.length > 40 ? text.slice(0, 37) + '...' : text;
      return `${label} — ${short}`.slice(0, 60);
    }
  }
  return text.slice(0, 60);
}

function classifyError(err: unknown): { message: string; suggestion?: string } {
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return {
      message: 'Network error — unable to reach the server.',
      suggestion: 'Check your internet connection and try again.',
    };
  }
  if (err instanceof Error && err.message === 'No response body') {
    return {
      message: 'The server returned an empty response.',
      suggestion: 'The server may be restarting. Try again in a moment.',
    };
  }
  if (err instanceof Response || (err instanceof Error && /40[13]/.test(err.message))) {
    return {
      message: 'Authentication failed — your session may have expired.',
      suggestion: 'Try refreshing the page to re-authenticate.',
    };
  }
  if (err instanceof Error && /timeout|timed out/i.test(err.message)) {
    return {
      message: 'Request timed out — the server took too long to respond.',
      suggestion: 'Try a simpler query or try again later.',
    };
  }
  if (err instanceof Error && /429|rate.?limit/i.test(err.message)) {
    return {
      message: 'Rate limited — too many requests.',
      suggestion: 'Wait a moment before trying again.',
    };
  }
  return { message: 'Something went wrong. Please try again.' };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMMAND_COOLDOWN_MS = 500;

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface ChatEngine {
  thread: ThreadEntry[];
  isProcessing: boolean;
  isLoadingSession: boolean;
  transitioning: boolean;
  statusMessage: string | null;
  lastFollowUps: FollowUp[];
  feedbackMap: Map<string, 'positive' | 'negative'>;
  sessionError: boolean;
  handleCommand: (text: string) => void;
  handleFeedback: (messageId: string, rating: 'positive' | 'negative', comment?: string) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChatEngine(userId?: string): ChatEngine {
  // --- Thread state ---
  const [thread, setThread] = useState<ThreadEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [lastFollowUps, setLastFollowUps] = useState<FollowUp[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);

  // --- Refs (avoid re-render cascades) ---
  const lastResultContextRef = useRef<ResultContext | undefined>(undefined);
  const threadLengthRef = useRef(0);
  const lastCommandTimeRef = useRef(0);
  const prevSessionIdRef = useRef<string | null>(null);
  // Keep length ref in sync
  useEffect(() => {
    threadLengthRef.current = thread.length;
  }, [thread]);

  // --- Sessions (from context) ---
  const {
    activeSessionId,
    createSession,
    loadMessages,
    saveMessage,
    updateTitle,
    clearSession,
    sessionErrors,
  } = useSessionContext();

  // --- Feedback ---
  const feedback = useFeedback(activeSessionId);

  // Keep feedback thread ref in sync
  useEffect(() => {
    feedback.syncThread(thread);
  }, [thread, feedback.syncThread]);

  // --- SSE stream ---
  const handleSSEReconnecting = useCallback((attempt: number) => {
    setStatusMessage(`Reconnecting... (attempt ${attempt})`);
  }, []);

  const { stream, abort } = useSSEStream({
    onReconnecting: handleSSEReconnecting,
    maxRetries: 3,
  });

  // --- Reactive session transitions ---
  // When activeSessionId changes, clean up old state and load new session
  useEffect(() => {
    const prev = prevSessionIdRef.current;
    prevSessionIdRef.current = activeSessionId;

    // Skip the initial mount when both are null
    if (prev === null && activeSessionId === null) return;
    // No change
    if (prev === activeSessionId) return;

    // Cleanup from previous session
    abort();
    setIsProcessing(false);
    setStatusMessage(null);
    lastResultContextRef.current = undefined;
    feedback.reset();
    setSessionError(false);

    if (!activeSessionId) {
      // Cleared session (new chat)
      setThread([]);
      setLastFollowUps([]);
      setIsLoadingSession(false);
      return;
    }

    // Load the new session
    setIsLoadingSession(true);
    loadMessages(activeSessionId).then((msgs) => {
      setThread(msgs);
      setIsLoadingSession(false);
      const lastResponse = [...msgs].reverse().find((m) => m.type === 'response');
      setLastFollowUps(lastResponse?.output?.followUps ?? []);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  // Cmd+N keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        clearSession();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSession]);

  // --- Command execution ---
  const handleCommand = useCallback(async (text: string) => {
    // Rate-limit rapid submissions
    const now = Date.now();
    if (now - lastCommandTimeRef.current < COMMAND_COOLDOWN_MS) return;
    lastCommandTimeRef.current = now;

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
      }
    }

    const commandId = `cmd-${crypto.randomUUID()}`;
    const responseId = `res-${crypto.randomUUID()}`;
    // Per-stream accumulator — captured by closure, not shared via ref
    let openclawText = '';

    const commandEntry: ThreadEntry = { id: commandId, type: 'command', text, timestamp: new Date() };

    setThread((prev) => [...prev, commandEntry]);
    setIsProcessing(true);

    if (sessionId) saveMessage(sessionId, commandEntry);

    // Per-stream callbacks capture responseId, sessionId, openclawText etc.
    // in this closure, so rapid commands can't corrupt each other's state.
    stream('/api/agent/command', {
      text,
      resultContext: lastResultContextRef.current,
      userId,
    }, {
      onEvent(evt) {
        switch (evt.event) {
          case 'status': {
            const { message } = JSON.parse(evt.data);
            setStatusMessage(message);
            break;
          }

          case 'skill-result': {
            const output: SkillOutput = JSON.parse(evt.data);
            const ctx = extractResultContext(output);
            if (ctx) lastResultContextRef.current = ctx;

            const responseEntry: ThreadEntry = {
              id: responseId,
              type: 'response',
              output,
              timestamp: new Date(),
            };

            setThread((prev) => [...prev, responseEntry]);
            setLastFollowUps(output.followUps ?? []);

            if (sessionId) saveMessage(sessionId, responseEntry);

            if (isFirstMessage && sessionId) {
              const smartTitle = deriveSessionTitle(text, output);
              updateTitle(sessionId, smartTitle);
            }
            break;
          }

          case 'openclaw-delta': {
            const { content } = JSON.parse(evt.data) as { content: string };
            openclawText += content;
            const currentText = openclawText;

            setThread((prev) =>
              prev.map((entry) => {
                if (entry.id !== responseId || !entry.output) return entry;
                const hasTextBlock = entry.output.blocks.some((b) => b.type === 'text');
                const updatedBlocks = hasTextBlock
                  ? entry.output.blocks.map((b) =>
                      b.type === 'text'
                        ? { ...b, content: currentText, isStreaming: true }
                        : b
                    )
                  : [
                      ...entry.output.blocks,
                      { type: 'text' as const, content: currentText, source: 'Zetty', isStreaming: true },
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
      },
      onDone() {
        setIsProcessing(false);
        setStatusMessage(null);
      },
      onError(err) {
        const { message, suggestion } = classifyError(err);
        const errorOutput: SkillOutput = {
          skillId: 'error',
          status: 'error',
          blocks: [{ type: 'error', message, suggestion }],
          followUps: [{ label: 'Show help', command: 'help' }],
          executionMs: 0,
          dataFreshness: 'mock',
        };

        setThread((prev) => [
          ...prev,
          { id: responseId, type: 'response', output: errorOutput, timestamp: new Date() },
        ]);
        setLastFollowUps(errorOutput.followUps);
        setIsProcessing(false);
        setStatusMessage(null);
      },
    });
  }, [userId, activeSessionId, createSession, saveMessage, updateTitle, stream]);

  return {
    thread,
    isProcessing,
    isLoadingSession,
    transitioning,
    statusMessage,
    lastFollowUps,
    feedbackMap: feedback.feedbackMap,
    sessionError: sessionError || sessionErrors.length > 0,
    handleCommand,
    handleFeedback: feedback.handleFeedback,
  };
}
