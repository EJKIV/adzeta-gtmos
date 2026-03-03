'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAIStream } from './use-ai-stream';
import { useBlockActions } from './use-block-actions';
import { useChatSessions } from './use-chat-sessions';
import type { Message } from '@/types/ai-agent';

export interface UseChatSessionOptions {
  userId?: string;
}

export interface UseChatSessionReturn {
  // Message state
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  phase: string;
  statusMessage: string;

  // Session management (delegated from useChatSessions)
  sessions: ReturnType<typeof useChatSessions>['sessions'];
  activeSessionId: string | null;
  createSession: ReturnType<typeof useChatSessions>['createSession'];
  switchSession: ReturnType<typeof useChatSessions>['switchSession'];
  archiveSession: ReturnType<typeof useChatSessions>['archiveSession'];

  // Actions
  sendMessage: (text: string) => Promise<void>;
  abort: () => void;

  // Block action handlers (pass these into MessageRenderer)
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => Promise<void>;
  onAction: (actionId: string, params: Record<string, unknown>) => Promise<void>;
}

/**
 * Ties together AI streaming + block actions + session persistence.
 * This is the main hook that chat pages should use.
 */
export function useChatSession({ userId }: UseChatSessionOptions = {}): UseChatSessionReturn {
  const [messages, setMessages] = useState<Message[]>([]);

  // Session persistence
  const chatSessions = useChatSessions(userId);
  const { activeSessionId, loadMessages, saveMessage, createSession } = chatSessions;

  // Streaming
  const handleNewMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);

    // Persist to session
    if (activeSessionId) {
      saveMessage(activeSessionId, {
        id: message.id,
        type: 'response',
        text: message.text,
        output: message.output as unknown as import('@/lib/skills/types').SkillOutput | undefined,
        timestamp: new Date(message.createdAt),
      });
    }
  }, [activeSessionId, saveMessage]);

  const { phase, statusMessage, streamingContent, isStreaming, send, abort } = useAIStream({
    onMessage: handleNewMessage,
  });

  // Skill invoke handler
  const handleSkillInvoke = useCallback(async (skillId: string, params: Record<string, unknown>) => {
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createSession('New conversation');
    }
    if (!sessionId) return;

    await send(sessionId, JSON.stringify({ skillId, params }));
  }, [activeSessionId, createSession, send]);

  // Block actions
  const { onSkillInvoke, onAction } = useBlockActions({
    onSkillInvoke: handleSkillInvoke,
  });

  // Send user message
  const sendMessage = useCallback(async (text: string) => {
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createSession(text.slice(0, 50));
    }
    if (!sessionId) return;

    // Add user message to local state
    const userMessage: Message = {
      id: crypto.randomUUID(),
      sessionId,
      type: 'user',
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Persist user message
    await saveMessage(sessionId, {
      id: userMessage.id,
      type: 'command',
      text,
      timestamp: new Date(),
    });

    // Start streaming
    await send(sessionId, text);
  }, [activeSessionId, createSession, saveMessage, send]);

  // Load messages when session changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    loadMessages(activeSessionId).then((entries) => {
      const loaded: Message[] = entries.map((e) => ({
        id: e.id,
        sessionId: activeSessionId,
        type: e.type === 'command' ? 'user' : 'assistant',
        text: e.text || '',
        output: e.output as Message['output'],
        createdAt: e.timestamp.toISOString(),
      }));
      setMessages(loaded);
    });
  }, [activeSessionId, loadMessages]);

  return {
    messages,
    isStreaming,
    streamingContent,
    phase,
    statusMessage,
    sessions: chatSessions.sessions,
    activeSessionId: chatSessions.activeSessionId,
    createSession: chatSessions.createSession,
    switchSession: chatSessions.switchSession,
    archiveSession: chatSessions.archiveSession,
    sendMessage,
    abort,
    onSkillInvoke,
    onAction,
  };
}
