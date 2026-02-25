'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { skillRegistry } from '@/lib/skills/registry';

// Import handlers to ensure they self-register
import '@/lib/skills/handlers/analytics-pipeline';
import '@/lib/skills/handlers/analytics-kpi';
import '@/lib/skills/handlers/research-search';
import '@/lib/skills/handlers/intel-recommendations';
import '@/lib/skills/handlers/system-help';

interface DashboardCommandProps {
  onCommand: (text: string) => void;
  isProcessing: boolean;
}

export function DashboardCommand({ onCommand, isProcessing }: DashboardCommandProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [matchPreview, setMatchPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleGlobal);
    return () => window.removeEventListener('keydown', handleGlobal);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && input.trim() && !isProcessing) {
        e.preventDefault();
        onCommand(input.trim());
        setInput('');
        setMatchPreview(null);
      } else if (e.key === 'Escape') {
        setInput('');
        setMatchPreview(null);
        inputRef.current?.blur();
      }
    },
    [input, isProcessing, onCommand]
  );

  return (
    <div data-testid="dashboard-command">
      <div
        className="relative rounded-2xl border transition-all duration-200"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: isFocused ? '#de347f' : 'var(--color-border)',
          boxShadow: isFocused
            ? '0 0 0 3px rgba(222, 52, 127, 0.12), var(--shadow-lg)'
            : 'var(--shadow-card)',
        }}
      >
        <div className="flex items-center px-5 py-4 gap-3">
          {/* Icon */}
          <span className="text-lg">
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#de347f]" />
            ) : (
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#de347f] to-[#ff5d74] font-bold text-xl">/</span>
            )}
          </span>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything or give an instruction..."
            className="flex-1 bg-transparent text-base outline-none"
            style={{
              color: 'var(--color-text-primary)',
            }}
            disabled={isProcessing}
            autoComplete="off"
            spellCheck={false}
          />

          {/* Shortcut hint */}
          <kbd
            className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-mono rounded-md"
            style={{
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-n100)',
              border: '1px solid var(--color-border)',
            }}
          >
            {'\u2318'}K
          </kbd>
        </div>

        {/* Skill match preview */}
        {matchPreview && isFocused && (
          <div
            className="px-5 py-2 border-t text-xs"
            style={{
              borderColor: 'var(--color-border-subtle)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            <span className="text-[#de347f]">&rarr;</span>{' '}
            <span className="font-mono">{matchPreview}</span>
          </div>
        )}
      </div>
    </div>
  );
}
