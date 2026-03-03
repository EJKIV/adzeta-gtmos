'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  OrchestratorThreadEntry,
  CommandStatus,
} from '@/lib/types/orchestration';
import { OracleBlockRenderer } from '@/components/oracle-blocks/OracleBlockRenderer';
import { TaskFeedbackButtons } from '@/app/components/adzeta/task-feedback-buttons';

interface ChatThreadProps {
  entries: OrchestratorThreadEntry[];
  isLoading?: boolean;
  isProcessing?: boolean;
  onCancel?: (commandId: string) => void;
  onRetry?: (commandId: string) => void;
  onFollowUp?: (text: string) => void;
  statusMessage?: string;
  feedbackMap?: Record<string, unknown>;
  onFeedback?: (commandId: string, rating: number) => void;
  sessionId?: string | null;
  className?: string;
}

// ── Status indicator ─────────────────────────────────────────────────

const STATUS_DEFAULTS: Record<string, { label: string; detail: string }> = {
  pending:   { label: 'Queued',     detail: 'Waiting for an available agent...' },
  parsing:   { label: 'Parsing',    detail: 'Understanding your request...' },
  routing:   { label: 'Routing',    detail: 'Selecting the best agent...' },
  executing: { label: 'Working',    detail: 'Generating your response...' },
};

function StatusIndicator({ status, message }: { status: CommandStatus; message?: string }) {
  const defaults = STATUS_DEFAULTS[status];
  if (!defaults) return null;

  return (
    <div className="flex items-center gap-2.5">
      <Loader2
        className="h-4 w-4 animate-spin flex-shrink-0"
        style={{ color: 'var(--color-brand-500)' }}
      />
      <div className="min-w-0">
        <div
          className="text-xs font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {defaults.label}
        </div>
        <div
          className="text-[11px] truncate"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {message || defaults.detail}
        </div>
      </div>
    </div>
  );
}

// ── Streaming cursor ─────────────────────────────────────────────────

function StreamingCursor() {
  return (
    <span
      className="inline-block w-[2px] h-[1em] align-text-bottom ml-0.5 animate-pulse"
      style={{ backgroundColor: 'var(--color-brand-500)' }}
    />
  );
}

// ── Message entry ────────────────────────────────────────────────────

function MessageEntry({
  entry,
  onCancel,
  onRetry,
}: {
  entry: OrchestratorThreadEntry;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
}) {
  const isActive = ['pending', 'parsing', 'routing', 'executing'].includes(entry.status ?? '');
  const isFailed = entry.status === 'failed' || entry.status === 'cancelled';
  const isDone = entry.status === 'completed';
  const isStreaming = entry.isStreaming === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-3"
    >
      {/* ── User command (right-aligned) ── */}
      {entry.text && (
        <div className="flex justify-end">
          <div
            className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm"
            style={{ backgroundColor: 'var(--color-brand-500)', color: '#fff' }}
          >
            {entry.text}
          </div>
        </div>
      )}

      {/* ── Bot response area (left-aligned) ── */}
      <div className="flex justify-start">
        <div className="max-w-[92%] space-y-2">

          {/* Status while waiting (no content yet) */}
          {isActive && !entry.response && (!entry.blocks || entry.blocks.length === 0) && (
            <div
              className="rounded-2xl rounded-bl-md px-4 py-3"
              style={{ backgroundColor: 'var(--color-bg-elevated)' }}
            >
              <StatusIndicator status={entry.status!} message={entry.statusMessage} />
            </div>
          )}

          {/* Structured blocks */}
          {entry.blocks && entry.blocks.length > 0 && (
            <div
              className="rounded-2xl rounded-bl-md px-4 py-3 overflow-hidden"
              style={{ backgroundColor: 'var(--color-bg-elevated)' }}
            >
              <OracleBlockRenderer blocks={entry.blocks} />
              {isStreaming && <StreamingCursor />}
            </div>
          )}

          {/* Plain text fallback (no blocks) */}
          {entry.response && (!entry.blocks || entry.blocks.length === 0) && (
            <div
              className="rounded-2xl rounded-bl-md px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
              }}
            >
              {entry.response}
              {isStreaming && <StreamingCursor />}
            </div>
          )}

          {/* Error (no response body) */}
          {isFailed && !entry.response && (
            <div
              className="rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-1.5"
              style={{ backgroundColor: 'var(--color-error-bg)' }}
            >
              <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
              <span className="text-xs text-red-600">{entry.error_message || 'Command failed'}</span>
            </div>
          )}

          {/* Task feedback for completed entries */}
          {isDone && entry.id && (
            <div className="px-1 pt-1">
              <TaskFeedbackButtons taskId={entry.id} />
            </div>
          )}

          {/* Footer: status + actions */}
          <div className="flex items-center gap-2 px-1 min-h-[18px]">
            {/* Completed */}
            {isDone && (entry.response || (entry.blocks && entry.blocks.length > 0)) && (
              <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                <CheckCircle2 className="h-3 w-3" style={{ color: 'var(--color-success)' }} />
                Done
              </span>
            )}

            {/* Failed footer with error + retry */}
            {isFailed && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-red-500">
                <XCircle className="h-3 w-3" />
                {entry.response ? (entry.error_message || 'Failed') : null}
                {onRetry && (
                  <button
                    onClick={() => onRetry(entry.id)}
                    className="inline-flex items-center gap-0.5 ml-1 hover:underline"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Retry
                  </button>
                )}
              </span>
            )}

            {/* Status below content while streaming */}
            {isActive && (entry.response || (entry.blocks && entry.blocks.length > 0)) && (
              <StatusIndicator status={entry.status!} message={entry.statusMessage} />
            )}

            {/* Cancel */}
            {isActive && onCancel && (
              <button
                onClick={() => onCancel(entry.id)}
                className="text-[11px] hover:underline ml-auto"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Thread container ─────────────────────────────────────────────────

export function ChatThread({ entries, isLoading, onCancel, onRetry, className }: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on every entry change (new messages + streaming chunks)
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                No messages yet
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {entries.map((entry) => (
                <MessageEntry
                  key={entry.id}
                  entry={entry}
                  onCancel={onCancel}
                  onRetry={onRetry}
                />
              ))}
            </AnimatePresence>
          )}

          {isLoading && entries.every((e) => !['pending', 'parsing', 'routing', 'executing'].includes(e.status ?? '')) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start">
              <div
                className="rounded-2xl rounded-bl-md px-4 py-2.5 inline-flex items-center gap-1.5"
                style={{ backgroundColor: 'var(--color-bg-elevated)' }}
              >
                <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--color-text-tertiary)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Processing...</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
