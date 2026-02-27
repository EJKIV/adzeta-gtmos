'use client';

import { createContext, useContext } from 'react';
import { useAuth } from './auth-provider';
import { useChatSessions } from '@/app/hooks/use-chat-sessions';
import type { ChatSession, SessionError } from '@/app/hooks/use-chat-sessions';
import type { ThreadEntry } from '@/lib/skills/types';

interface SessionContextType {
  sessions: ChatSession[];
  activeSessionId: string | null;
  sessionErrors: SessionError[];
  createSession: (title?: string) => Promise<string | null>;
  switchSession: (sessionId: string) => Promise<void>;
  clearSession: () => void;
  archiveSession: (sessionId: string) => Promise<void>;
  saveMessage: (sessionId: string, entry: ThreadEntry) => Promise<void>;
  loadMessages: (sessionId: string) => Promise<ThreadEntry[]>;
  updateTitle: (sessionId: string, title: string) => Promise<void>;
  loadSessions: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const session = useChatSessions(user?.id);

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}
