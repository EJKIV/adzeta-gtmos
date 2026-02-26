'use client';

import { Plus, X } from 'lucide-react';
import type { ChatSession } from '@/app/hooks/use-chat-sessions';

interface SessionBarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSwitchSession: (id: string) => void;
  onArchiveSession?: (id: string) => void;
  systemHealthy?: boolean;
}

export function SessionBar({
  sessions,
  activeSessionId,
  onNewChat,
  onSwitchSession,
  onArchiveSession,
  systemHealthy = true,
}: SessionBarProps) {
  return (
    <div className="flex items-center gap-2 h-full">
      {/* New Chat button */}
      <button
        onClick={onNewChat}
        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))',
        }}
      >
        <Plus className="h-3.5 w-3.5" />
        New
      </button>

      {/* Session pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {sessions.length === 0 && (
          <span className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
            No conversations yet
          </span>
        )}
        {sessions.slice(0, 20).map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <span
              key={session.id}
              className={`group flex-shrink-0 inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg border max-w-[180px] ${
                isActive ? '' : 'pill-btn-subtle'
              }`}
              style={isActive ? {
                color: 'var(--color-brand-500)',
                borderColor: 'rgba(222,52,127,0.4)',
                backgroundColor: 'rgba(222,52,127,0.06)',
              } : undefined}
            >
              <button
                onClick={() => onSwitchSession(session.id)}
                className="truncate"
                title={session.title}
              >
                {session.title}
              </button>
              {onArchiveSession && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchiveSession(session.id);
                  }}
                  className="hidden group-hover:inline-flex flex-shrink-0 rounded-full p-0.5 transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  aria-label={`Close ${session.title}`}
                  title="Close conversation"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
          );
        })}
      </div>

      {/* Status badge — reflects actual system health */}
      <div
        className="flex-shrink-0 ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full"
        style={{
          backgroundColor: systemHealthy ? 'rgba(22, 163, 74, 0.08)' : 'rgba(234, 88, 12, 0.08)',
        }}
      >
        <span className="relative flex h-1.5 w-1.5">
          {systemHealthy ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--color-success)' }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: 'var(--color-success)' }} />
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: 'var(--color-warning)' }} />
          )}
        </span>
        <span
          className="text-[11px] font-semibold"
          style={{ color: systemHealthy ? 'var(--color-success)' : 'var(--color-warning)' }}
        >
          {systemHealthy ? 'Live' : 'Offline'}
        </span>
      </div>
    </div>
  );
}
