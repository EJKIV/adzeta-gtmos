'use client';

import type { ReactNode } from 'react';

const STARTER_COMMANDS = [
  { label: 'Show pipeline health', command: 'show pipeline health' },
  { label: 'Find CMOs at fintech', command: 'find CMOs at fintech companies' },
  { label: 'What should I focus on?', command: 'what should I focus on?' },
  { label: 'Show all skills', command: 'help' },
];

interface EmptyStateProps {
  onCommand: (command: string) => void;
  children?: ReactNode;
}

export function EmptyState({ onCommand, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-16">
      <div className="mb-2">
        <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-600)]">
          /
        </span>
      </div>
      <h2
        className="text-lg font-semibold mb-1"
        style={{ color: 'var(--color-text-primary)' }}
      >
        GTM Command Center
      </h2>
      <p
        className="text-sm mb-8 text-center max-w-md"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        Ask anything about your pipeline, research prospects, or get recommendations.
      </p>

      {/* Children slot — centered input when used from page.tsx */}
      {children && (
        <div className="w-full max-w-2xl mb-8">
          {children}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {STARTER_COMMANDS.map((s) => (
          <button
            key={s.command}
            onClick={() => onCommand(s.command)}
            className="pill-btn px-4 py-2 text-sm font-medium rounded-full border hover:scale-[1.02]"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
