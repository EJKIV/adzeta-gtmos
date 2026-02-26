'use client';

import { useEffect } from 'react';
import type { ThreadEntry } from '@/lib/skills/types';
import { ChatMessage } from './chat-message';
import { useChatScroll } from '@/app/hooks/use-chat-scroll';
import { ChevronDown } from 'lucide-react';

interface ChatThreadProps {
  entries: ThreadEntry[];
  isProcessing: boolean;
  isLoading?: boolean;
  onFollowUp: (command: string) => void;
  statusMessage?: string | null;
  feedbackMap?: Map<string, 'positive' | 'negative'>;
  onFeedback?: (messageId: string, rating: 'positive' | 'negative', comment?: string) => void;
  sessionId?: string | null;
}

export function ChatThread({ entries, isProcessing, isLoading, onFollowUp, statusMessage, feedbackMap, onFeedback, sessionId }: ChatThreadProps) {
  const { containerRef, showScrollButton, scrollToBottom, onContentChange } = useChatScroll();

  // Auto-scroll on new messages
  useEffect(() => {
    onContentChange();
  }, [entries.length, entries[entries.length - 1]?.output?.blocks.length, onContentChange]);

  // Loading skeleton while session messages are being fetched
  if (entries.length === 0 && isLoading) {
    return (
      <div ref={containerRef} className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
              {i % 2 === 0 ? (
                /* Command skeleton */
                <div className="flex justify-end">
                  <div className="h-10 w-48 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
                </div>
              ) : (
                /* Response skeleton */
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
                  <div className="h-4 w-1/2 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
                  <div className="h-20 w-full rounded-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty thread — nothing to show (empty state handled by ChatLayout)
  if (entries.length === 0) {
    return <div ref={containerRef} className="h-full overflow-y-auto" />;
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {entries.map((entry, index) => {
          // Find retry handler for error responses
          let onRetry: (() => void) | undefined;
          if (entry.type === 'response' && entry.output?.status === 'error') {
            // Find the preceding command to re-run
            for (let i = index - 1; i >= 0; i--) {
              if (entries[i].type === 'command' && entries[i].text) {
                const cmdText = entries[i].text!;
                onRetry = () => onFollowUp(cmdText);
                break;
              }
            }
          }

          // Find preceding user query for feedback context
          let userQuery: string | undefined;
          if (entry.type === 'response') {
            for (let i = index - 1; i >= 0; i--) {
              if (entries[i].type === 'command' && entries[i].text) {
                userQuery = entries[i].text;
                break;
              }
            }
          }

          return (
            <ChatMessage
              key={entry.id}
              type={entry.type}
              text={entry.text}
              output={entry.output}
              timestamp={entry.timestamp}
              onFollowUp={onFollowUp}
              onRetry={onRetry}
              messageId={entry.id}
              sessionId={sessionId}
              userQuery={userQuery}
              feedbackRating={feedbackMap?.get(entry.id) ?? null}
              onFeedback={onFeedback}
            />
          );
        })}

        {/* Typing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="flex gap-1 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-500)] animate-dot-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-500)] animate-dot-pulse" style={{ animationDelay: '200ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-500)] animate-dot-pulse" style={{ animationDelay: '400ms' }} />
            </div>
            <span
              className="text-xs animate-status-text"
              style={{ color: 'var(--color-text-muted)' }}
              key={statusMessage || 'thinking'}
            >
              {statusMessage || 'Thinking...'}
            </span>
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom()}
          aria-label="Scroll to bottom"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 rounded-full border shadow-lg transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)',
          }}
        >
          <ChevronDown className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      )}
    </div>
  );
}
