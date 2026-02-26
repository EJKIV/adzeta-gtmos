'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useDataFetch } from '@/app/hooks/use-data-fetch';
import { SampleDataBadge } from '../sample-data-badge';

interface KpiApiEntry {
  current: number;
  previous: number;
  delta: number;
  change: 'up' | 'down' | 'flat';
  label: string;
  format: 'currency' | 'number' | 'percent';
  last_updated: string;
}

interface KpiResponse {
  pipeline_value: KpiApiEntry;
  meetings_booked: KpiApiEntry;
  reply_rate: KpiApiEntry;
  qualified_leads: KpiApiEntry;
  active_sequences: KpiApiEntry;
  dataSource?: 'live' | 'demo';
}

function formatValue(entry: KpiApiEntry): string {
  if (entry.format === 'currency') {
    if (entry.current >= 1_000_000) return `$${(entry.current / 1_000_000).toFixed(2)}M`;
    if (entry.current >= 1_000) return `$${(entry.current / 1_000).toFixed(0)}k`;
    return `$${entry.current}`;
  }
  if (entry.format === 'percent') return `${entry.current}%`;
  return String(entry.current);
}

const KPI_KEYS: (keyof Omit<KpiResponse, 'dataSource'>)[] = [
  'pipeline_value', 'meetings_booked', 'reply_rate', 'qualified_leads', 'active_sequences',
];

export function SidebarKpis() {
  const { data, isLoading } = useDataFetch<KpiResponse>('/api/command-center/kpis', {
    refreshInterval: 30000,
    retryCount: 2,
    staleWhileRevalidate: true,
  });

  if (isLoading && !data) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between animate-pulse">
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-4 w-14 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const isDemo = data.dataSource === 'demo';

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          KPIs
        </h3>
        {isDemo && <SampleDataBadge />}
      </div>
      <div className="space-y-2.5">
        {KPI_KEYS.map((key) => {
          const entry = data[key] as KpiApiEntry;
          const Icon = entry.change === 'up' ? TrendingUp : entry.change === 'down' ? TrendingDown : Minus;
          const color =
            entry.change === 'up'
              ? 'text-[var(--color-success)]'
              : entry.change === 'down'
              ? 'text-[var(--color-error)]'
              : 'text-[var(--color-text-muted)]';

          return (
            <div
              key={key}
              className="flex items-center justify-between py-1"
            >
              <span
                className="text-xs truncate"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {entry.label}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {formatValue(entry)}
                </span>
                <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${color}`}>
                  <Icon className="h-3 w-3" />
                  {entry.delta !== 0 && <span>{entry.delta > 0 ? '+' : ''}{entry.delta}%</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
