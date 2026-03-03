'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { OracleMetricBlock } from './types';

const TREND_CONFIG = {
  positive: { Icon: TrendingUp, color: 'var(--color-success, #22c55e)' },
  negative: { Icon: TrendingDown, color: 'var(--color-error, #ef4444)' },
  neutral: { Icon: Minus, color: 'var(--color-text-tertiary)' },
} as const;

export function MetricBlock({ title, layout, metrics }: OracleMetricBlock) {
  const isGrid = layout === 'grid';

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
      <div
        className={
          isGrid
            ? 'grid grid-cols-2 sm:grid-cols-3 gap-3'
            : 'flex flex-wrap gap-4'
        }
      >
        {metrics.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2.5 ${isGrid ? '' : 'min-w-[120px]'}`}
            style={{ backgroundColor: 'var(--color-bg-sunken, rgba(0,0,0,0.04))' }}
          >
            <div
              className="text-[11px] font-medium truncate"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {m.label}
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className="text-lg font-semibold tabular-nums"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {m.value}
              </span>
              {m.unit && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {m.unit}
                </span>
              )}
            </div>
            {m.change != null && m.changeType && (
              <div className="flex items-center gap-1 mt-1">
                {(() => {
                  const { Icon, color } = TREND_CONFIG[m.changeType];
                  return (
                    <>
                      <Icon className="h-3 w-3" style={{ color }} />
                      <span className="text-[11px] font-medium" style={{ color }}>
                        {m.change > 0 ? '+' : ''}{m.change}%
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
