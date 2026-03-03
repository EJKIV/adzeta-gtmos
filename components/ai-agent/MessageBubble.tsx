'use client';

import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  children: React.ReactNode;
  timestamp?: string;
  isStreaming?: boolean;
}

export function MessageBubble({
  role,
  children,
  timestamp,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'flex gap-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-[var(--color-brand-50)]'
            : 'bg-[var(--color-bg-tertiary)]'
        )}
      >
        {isUser ? (
          <User className="w-5 h-5" style={{ color: 'var(--color-brand-500)' }} />
        ) : (
          <Bot className="w-5 h-5" style={{ color: 'var(--color-brand-600)' }} />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1 max-w-3xl',
          isUser ? 'text-right' : 'text-left'
        )}
      >
        <div
          className={cn(
            'inline-block px-4 py-3 rounded-lg',
            isUser
              ? 'bg-[var(--color-brand-500)] text-[var(--color-text-inverse)]'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
          )}
        >
          {children}
        </div>

        {timestamp && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {new Date(timestamp).toLocaleTimeString()}
          </p>
        )}

        {isStreaming && (
          <div
            className="flex items-center gap-2 mt-2 text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-text-muted)' }} />
              <span className="w-2 h-2 rounded-full animate-pulse delay-75" style={{ backgroundColor: 'var(--color-text-muted)' }} />
              <span className="w-2 h-2 rounded-full animate-pulse delay-150" style={{ backgroundColor: 'var(--color-text-muted)' }} />
            </div>
            <span>Zetty is thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}
