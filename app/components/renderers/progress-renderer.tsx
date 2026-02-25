'use client';

import type { ProgressBlock } from '@/lib/skills/types';

export function ProgressRenderer({ block }: { block: ProgressBlock }) {
  const pct = block.total > 0 ? Math.round((block.current / block.total) * 100) : 0;

  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {block.label}
        </p>
        <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-tertiary)' }}>
          {block.current}/{block.total}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-n100)' }}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#de347f] to-[#ff5d74] transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {block.status && (
        <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
          {block.status}
        </p>
      )}
    </div>
  );
}
