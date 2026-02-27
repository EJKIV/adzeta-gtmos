'use client';

import { useState, useRef } from 'react';
import { RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { SkillOutput } from '@/lib/skills/types';
import { ResponseRenderer } from '../renderers/response-renderer';
import { SampleDataBadge } from '../sample-data-badge';

interface ChatMessageProps {
  type: 'command' | 'response';
  text?: string;
  output?: SkillOutput;
  timestamp: Date;
  onFollowUp?: (command: string) => void;
  onRetry?: () => void;
  messageId?: string;
  sessionId?: string | null;
  userQuery?: string;
  feedbackRating?: 'positive' | 'negative' | null;
  onFeedback?: (messageId: string, rating: 'positive' | 'negative', comment?: string) => void;
}

export function ChatMessage({
  type, text, output, timestamp, onFollowUp, onRetry,
  messageId, feedbackRating, onFeedback,
}: ChatMessageProps) {
  const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [localRating, setLocalRating] = useState<'positive' | 'negative' | null>(feedbackRating ?? null);
  const [showComment, setShowComment] = useState(false);
  const commentRef = useRef<HTMLInputElement>(null);

  const handleThumb = (rating: 'positive' | 'negative') => {
    if (!messageId || !onFeedback) return;
    // Toggle off if clicking the same rating
    if (localRating === rating) {
      // Re-clicking same thumb — do nothing (keep rating), UX stays simple
      return;
    }
    setLocalRating(rating);
    if (rating === 'negative') {
      setShowComment(true);
      setTimeout(() => commentRef.current?.focus(), 50);
    } else {
      setShowComment(false);
      onFeedback(messageId, rating);
    }
  };

  const submitComment = () => {
    if (!messageId || !onFeedback) return;
    const comment = commentRef.current?.value?.trim() || undefined;
    onFeedback(messageId, 'negative', comment);
    setShowComment(false);
  };

  const cancelComment = () => {
    if (!messageId || !onFeedback) return;
    onFeedback(messageId, 'negative');
    setShowComment(false);
  };

  if (type === 'command') {
    return (
      <div className="flex justify-end animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
        <div className="max-w-xl">
          <div
            className="px-4 py-2.5 rounded-2xl rounded-br-md text-sm text-white"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))',
            }}
          >
            {text}
          </div>
          <time
            className="block text-right text-[11px] mt-1 mr-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {time}
          </time>
        </div>
      </div>
    );
  }

  if (type === 'response' && output) {
    const isError = output.status === 'error';
    const showFeedback = !isError && !!onFeedback && !!messageId;

    return (
      <div className="max-w-5xl animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
        <ResponseRenderer output={output} onFollowUp={onFollowUp} />
        <div
          className="mt-1 flex items-center gap-2 text-[11px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span className="font-mono">{output.skillId}</span>
          <span>&middot;</span>
          <span>{output.executionMs}ms</span>
          <span>&middot;</span>
          {output.dataFreshness === 'mock' ? (
            <SampleDataBadge />
          ) : (
            <span>{output.dataFreshness}</span>
          )}
          {isError && onRetry && (
            <>
              <span>&middot;</span>
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  color: 'var(--color-error)',
                  borderColor: 'rgba(220,38,38,0.3)',
                  backgroundColor: 'rgba(220,38,38,0.04)',
                }}
              >
                <RotateCcw className="h-2.5 w-2.5" />
                Retry
              </button>
            </>
          )}
          {showFeedback && (
            <>
              <span>&middot;</span>
              <button
                onClick={() => handleThumb('positive')}
                className="inline-flex items-center transition-opacity"
                style={{
                  color: localRating === 'positive' ? 'var(--color-success)' : 'currentColor',
                  opacity: localRating === 'negative' ? 0.3 : 1,
                }}
                aria-label="Good response"
                title="Good response"
              >
                <ThumbsUp className="h-2.5 w-2.5" />
              </button>
              <button
                onClick={() => handleThumb('negative')}
                className="inline-flex items-center transition-opacity"
                style={{
                  color: localRating === 'negative' ? 'var(--color-error)' : 'currentColor',
                  opacity: localRating === 'positive' ? 0.3 : 1,
                }}
                aria-label="Bad response"
                title="Bad response"
              >
                <ThumbsDown className="h-2.5 w-2.5" />
              </button>
            </>
          )}
        </div>
        {showComment && (
          <div className="mt-1 animate-fade-in">
            <div className="flex items-center gap-1.5">
              <input
                ref={commentRef}
                type="text"
                placeholder="What went wrong? (optional)"
                className="w-56 px-2 py-1 text-[11px] rounded border bg-transparent outline-none"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitComment();
                  if (e.key === 'Escape') cancelComment();
                }}
              />
              <button
                onClick={submitComment}
                className="px-2 py-1 text-[11px] font-medium rounded border transition-colors"
                style={{
                  color: 'var(--color-brand-500)',
                  borderColor: 'rgba(222,52,127,0.3)',
                  backgroundColor: 'rgba(222,52,127,0.04)',
                }}
              >
                Send
              </button>
              <button
                onClick={cancelComment}
                className="px-2 py-1 text-[11px] rounded transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
