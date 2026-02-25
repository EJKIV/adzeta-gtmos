'use client';

import type { MetricsBlock, MetricItem } from '@/lib/skills/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function formatValue(item: MetricItem): string {
  const v = typeof item.value === 'number' ? item.value : item.value;
  if (item.format === 'currency') {
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
  }
  if (item.format === 'percent') return `${v}%`;
  if (item.format === 'compact' && typeof v === 'number') {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  }
  return String(v);
}

function DeltaIcon({ dir }: { dir?: 'up' | 'down' | 'flat' }) {
  if (dir === 'up') return <TrendingUp className="h-3 w-3 text-[#16a34a]" />;
  if (dir === 'down') return <TrendingDown className="h-3 w-3 text-[#dc2626]" />;
  return <Minus className="h-3 w-3 text-[#86868b]" />;
}

export function MetricsRenderer({ block }: { block: MetricsBlock }) {
  return (
    <div className="flex flex-wrap gap-3">
      {block.metrics.map((m, i) => (
        <div
          key={i}
          className="flex-1 min-w-[130px] rounded-xl px-4 py-3 border transition-all hover:-translate-y-0.5"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
            {m.label}
          </p>
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
            {formatValue(m)}
          </p>
          {m.delta !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <DeltaIcon dir={m.deltaDirection} />
              <span
                className={`text-xs font-medium ${
                  m.deltaDirection === 'up'
                    ? 'text-[#16a34a]'
                    : m.deltaDirection === 'down'
                    ? 'text-[#dc2626]'
                    : 'text-[#86868b]'
                }`}
              >
                {m.delta > 0 ? '+' : ''}{m.delta}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
