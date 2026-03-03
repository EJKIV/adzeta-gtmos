'use client';

import { Trophy } from 'lucide-react';
import type { OracleComparisonBlock } from './types';

export function ComparisonBlock({ title, items }: OracleComparisonBlock) {
  return (
    <div>
      {title && (
        <h3
          className="text-xs font-semibold uppercase tracking-wide mb-2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {title}
        </h3>
      )}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)` }}>
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-lg px-3 py-3 border"
            style={{
              borderColor: item.winner
                ? 'var(--color-brand-500, #6366f1)'
                : 'var(--color-border-subtle, #e5e7eb)',
              backgroundColor: item.winner
                ? 'var(--color-brand-50, rgba(99,102,241,0.06))'
                : 'var(--color-bg-sunken, rgba(0,0,0,0.02))',
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {item.name}
              </span>
              {item.winner && (
                <Trophy className="h-3.5 w-3.5" style={{ color: 'var(--color-brand-500, #6366f1)' }} />
              )}
            </div>
            <div className="space-y-1.5">
              {item.values.map((v, vi) => (
                <div key={vi} className="flex justify-between items-baseline gap-2">
                  <span
                    className="text-[11px] truncate"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {v.label}
                  </span>
                  <span
                    className="text-sm font-medium tabular-nums whitespace-nowrap"
                    style={{
                      color: v.highlight
                        ? 'var(--color-brand-500, #6366f1)'
                        : 'var(--color-text-primary)',
                      fontWeight: v.highlight ? 700 : 500,
                    }}
                  >
                    {v.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
