'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, ArrowUp } from 'lucide-react';
import { skillRegistry } from '@/lib/skills/registry';
import '@/lib/skills/register-all';
import { useCommandHistory } from '@/app/hooks/use-command-history';

interface ChatInputProps {
  onCommand: (text: string) => void;
  isProcessing: boolean;
  borderless?: boolean;
}

export function ChatInput({ onCommand, isProcessing, borderless }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [matchPreview, setMatchPreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const history = useCommandHistory();

  // Live skill-match preview
  useEffect(() => {
    if (!input.trim()) {
      setMatchPreview(null);
      return;
    }
    const match = skillRegistry.findByPattern(input);
    if (match) {
      setMatchPreview(`${match.skill.id} (${Math.round(match.confidence * 100)}%)`);
    } else {
      setMatchPreview(null);
    }
  }, [input]);

  // Cmd+K global focus
  useEffect(() => {
    function handleGlobal(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleGlobal);
    return () => window.removeEventListener('keydown', handleGlobal);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  const submit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;
    history.push(trimmed);
    onCommand(trimmed);
    setInput('');
    setMatchPreview(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, isProcessing, onCommand, history]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
        return;
      }
      if (e.key === 'Escape') {
        setInput('');
        setMatchPreview(null);
        textareaRef.current?.blur();
        return;
      }
      // Up/Down arrow for command history
      const historyValue = history.onKeyDown(e, input);
      if (historyValue !== undefined) {
        setInput(historyValue);
      }
    },
    [submit, history, input]
  );

  const canSend = input.trim().length > 0 && !isProcessing;

  return (
    <div
      className={`${borderless ? '' : 'border-t'} px-4 sm:px-6 py-3`}
      style={{
        backgroundColor: borderless ? 'transparent' : 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div
          className="flex items-end gap-2 rounded-2xl border px-4 py-2 transition-all duration-200 focus-within:border-[var(--color-brand-500)] focus-within:shadow-[0_0_0_3px_rgba(222,52,127,0.12)]"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          {/* Slash icon */}
          <span className="flex-shrink-0 pb-0.5">
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin text-[var(--color-brand-500)]" />
            ) : (
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-hover)] font-bold text-lg leading-none">
                /
              </span>
            )}
          </span>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            aria-label="Command input"
            rows={1}
            className="flex-1 bg-transparent text-sm outline-none resize-none leading-relaxed"
            style={{
              color: 'var(--color-text-primary)',
              maxHeight: '120px',
            }}
            disabled={isProcessing}
            autoComplete="off"
            spellCheck={false}
          />

          {/* Send button */}
          <button
            onClick={submit}
            disabled={!canSend}
            className="flex-shrink-0 p-1.5 rounded-lg transition-all"
            style={{
              background: canSend
                ? 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))'
                : 'var(--color-bg-tertiary)',
              opacity: canSend ? 1 : 0.4,
            }}
          >
            <ArrowUp className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Skill match preview */}
        {matchPreview && (
          <div
            className="mt-1.5 px-1 text-xs flex items-center gap-1.5"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <span className="text-[var(--color-brand-500)]">&rarr;</span>
            <span className="font-mono">{matchPreview}</span>
          </div>
        )}
      </div>
    </div>
  );
}
