'use client';

import { useEffect, useRef } from 'react';
import type { SkillOutput } from '@/lib/skills/types';
import { ResponseRenderer } from './renderers/response-renderer';
import { SampleDataBadge } from './sample-data-badge';

export interface ThreadEntry {
  id: string;
  type: 'command' | 'response';
  text?: string;
  output?: SkillOutput;
  timestamp: Date;
}

interface ResponseThreadProps {
  entries: ThreadEntry[];
  onFollowUp: (command: string) => void;
}

const STARTER_COMMANDS = [
  { label: 'Show pipeline health', command: 'show pipeline health' },
  { label: 'Find CMOs at fintech', command: 'find CMOs at fintech companies' },
  { label: 'What should I focus on?', command: 'what should I focus on?' },
  { label: 'Show all skills', command: 'help' },
];

export function ResponseThread({ entries, onFollowUp }: ResponseThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div data-testid="response-thread" className="py-8">
        <p className="text-center text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Try one of these to get started:
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {STARTER_COMMANDS.map((s) => (
            <button
              key={s.command}
              onClick={() => onFollowUp(s.command)}
              className="px-4 py-2 text-sm font-medium rounded-full border transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                color: 'var(--color-text-secondary)',
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-elevated)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#de347f';
                e.currentTarget.style.backgroundColor = 'rgba(222,52,127,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="response-thread" className="space-y-4">
      {entries.map((entry) => {
        if (entry.type === 'command') {
          return (
            <div key={entry.id} className="flex items-start gap-2">
              <span className="text-[#de347f] text-sm font-bold mt-0.5">/</span>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {entry.text}
                </p>
                <time className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
            </div>
          );
        }

        if (entry.type === 'response' && entry.output) {
          return (
            <div key={entry.id} className="pl-5 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
              <ResponseRenderer output={entry.output} onFollowUp={onFollowUp} />
              <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <span className="font-mono">{entry.output.skillId}</span>
                <span>&middot;</span>
                <span>{entry.output.executionMs}ms</span>
                <span>&middot;</span>
                {entry.output.dataFreshness === 'mock' ? (
                  <SampleDataBadge />
                ) : (
                  <span>{entry.output.dataFreshness}</span>
                )}
              </div>
            </div>
          );
        }

        return null;
      })}
      <div ref={endRef} />
    </div>
  );
}
