'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ThreadEntry } from '@/lib/skills/types';
import { queueMessage, flushPendingMessages } from '@/lib/offline/message-cache';

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  localOnly?: boolean;
}

interface DbMessage {
  id: string;
  session_id: string;
  client_id: string | null;
  type: 'command' | 'response';
  text: string | null;
  output: Record<string, unknown> | null;
  created_at: string;
}

export interface SessionError {
  operation: 'load' | 'create' | 'save' | 'archive' | 'title';
  message: string;
  timestamp: Date;
}

const MAX_ERRORS = 10;

export function useChatSessions(userId?: string) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionErrors, setSessionErrors] = useState<SessionError[]>([]);
  const sessionsRef = useRef(sessions);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  const pushError = useCallback((operation: SessionError['operation'], err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.warn(`[sessions] ${operation} failed:`, message);
    setSessionErrors((prev) => [
      ...prev.slice(-(MAX_ERRORS - 1)),
      { operation, message, timestamp: new Date() },
    ]);
  }, []);

  // Fetch sessions
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) {
        pushError('load', new Error(`HTTP ${res.status}`));
        return;
      }
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (err) {
      pushError('load', err);
    }
  }, [pushError]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Flush offline message queue when connectivity returns
  useEffect(() => {
    function handleOnline() {
      flushPendingMessages().then((count) => {
        if (count > 0) {
          console.info(`[sessions] Synced ${count} offline message(s)`);
        }
      });
    }
    window.addEventListener('online', handleOnline);
    // Also attempt a flush on mount in case we came back online while the tab was closed
    handleOnline();
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Create a new session
  const createSession = useCallback(async (title?: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || 'New chat' }),
      });
      if (!res.ok) {
        pushError('create', new Error(`HTTP ${res.status}`));
        return null;
      }
      const data = await res.json();
      const session = data.session as ChatSession;
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      return session.id;
    } catch (err) {
      pushError('create', err);
      return null;
    }
  }, [pushError]);

  // Load messages for a session
  const loadMessages = useCallback(async (sessionId: string): Promise<ThreadEntry[]> => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) {
        pushError('load', new Error(`HTTP ${res.status}`));
        return [];
      }
      const data = await res.json();
      return (data.messages ?? []).map((m: DbMessage) => ({
        id: m.client_id ?? m.id,
        type: m.type,
        text: m.text ?? undefined,
        output: m.output ?? undefined,
        timestamp: new Date(m.created_at),
      }));
    } catch (err) {
      pushError('load', err);
      return [];
    }
  }, [pushError]);

  // Save a message to the active session (falls back to IndexedDB offline queue)
  const saveMessage = useCallback(async (
    sessionId: string,
    entry: ThreadEntry,
  ) => {
    // Skip API call for local-only sessions
    const session = sessionsRef.current.find((s) => s.id === sessionId);
    if (session?.localOnly) {
      // Still cache locally for potential future sync
      queueMessage({
        sessionId,
        clientId: entry.id,
        type: entry.type,
        text: entry.text,
        output: entry.output as Record<string, unknown> | undefined,
        createdAt: entry.timestamp.toISOString(),
      });
      return;
    }

    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: entry.id,
          type: entry.type,
          text: entry.text,
          output: entry.output,
        }),
      });
      if (!res.ok) {
        pushError('save', new Error(`HTTP ${res.status}`));
        // Queue for later sync
        queueMessage({
          sessionId,
          clientId: entry.id,
          type: entry.type,
          text: entry.text,
          output: entry.output as Record<string, unknown> | undefined,
          createdAt: entry.timestamp.toISOString(),
        });
      }
    } catch (err) {
      pushError('save', err);
      // Queue for later sync
      queueMessage({
        sessionId,
        clientId: entry.id,
        type: entry.type,
        text: entry.text,
        output: entry.output as Record<string, unknown> | undefined,
        createdAt: entry.timestamp.toISOString(),
      });
    }
  }, [pushError]);

  // Update session title via PATCH
  const updateTitle = useCallback(async (sessionId: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: title.slice(0, 60) } : s))
    );
    // Optimistic — fire and forget, but log errors
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.slice(0, 60) }),
      });
      if (!res.ok) {
        pushError('title', new Error(`HTTP ${res.status}`));
      }
    } catch (err) {
      pushError('title', err);
    }
  }, [pushError]);

  // Archive a session
  const archiveSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) setActiveSessionId(null);
      } else {
        pushError('archive', new Error(`HTTP ${res.status}`));
      }
    } catch (err) {
      pushError('archive', err);
    }
  }, [activeSessionId, pushError]);

  // Switch session
  const switchSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  // Clear active session (for new chat without creating one yet)
  const clearSession = useCallback(() => {
    setActiveSessionId(null);
  }, []);

  return {
    sessions,
    activeSessionId,
    isLoading,
    sessionErrors,
    createSession,
    loadMessages,
    saveMessage,
    updateTitle,
    archiveSession,
    switchSession,
    clearSession,
    loadSessions,
  };
}
