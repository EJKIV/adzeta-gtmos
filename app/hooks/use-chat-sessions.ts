'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ThreadEntry } from '@/lib/skills/types';

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

export function useChatSessions(userId?: string) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sessionsRef = useRef(sessions);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  // Fetch sessions
  const loadSessions = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      // silent
    }
  }, [userId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Create a new session
  const createSession = useCallback(async (title?: string): Promise<string | null> => {
    if (!userId) return null;
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || 'New chat' }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const session = data.session as ChatSession;
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      return session.id;
    } catch {
      return null;
    }
  }, [userId]);

  // Load messages for a session
  const loadMessages = useCallback(async (sessionId: string): Promise<ThreadEntry[]> => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.messages ?? []).map((m: DbMessage) => ({
        id: m.client_id ?? m.id,
        type: m.type,
        text: m.text ?? undefined,
        output: m.output ?? undefined,
        timestamp: new Date(m.created_at),
      }));
    } catch {
      return [];
    }
  }, []);

  // Save a message to the active session
  const saveMessage = useCallback(async (
    sessionId: string,
    entry: ThreadEntry,
  ) => {
    // Skip API call for local-only sessions (use ref to avoid stale closure)
    const session = sessionsRef.current.find((s) => s.id === sessionId);
    if (session?.localOnly) return;

    try {
      await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: entry.id,
          type: entry.type,
          text: entry.text,
          output: entry.output,
        }),
      });
    } catch {
      // silent
    }
  }, []);

  // Update session title via PATCH
  const updateTitle = useCallback(async (sessionId: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: title.slice(0, 60) } : s))
    );
    // Optimistic — fire and forget
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.slice(0, 60) }),
      });
    } catch {
      // silent
    }
  }, []);

  // Archive a session
  const archiveSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) setActiveSessionId(null);
      }
    } catch {
      // silent
    }
  }, [activeSessionId]);

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
