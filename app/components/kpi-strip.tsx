'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useDataFetch } from '@/app/hooks/use-data-fetch';
import { SampleDataBadge } from './sample-data-badge';
import { KpiDrillDown } from './kpi-drill-down';

interface KpiItem {
  label: string;
  value: string;
  delta: number;
  direction: 'up' | 'down' | 'flat';
  key: string;
}

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

function toKpiItems(data: KpiResponse): KpiItem[] {
  const keys: (keyof Omit<KpiResponse, 'dataSource'>)[] = [
    'pipeline_value', 'meetings_booked', 'reply_rate', 'qualified_leads', 'active_sequences',
  ];
  return keys.map((key) => {
    const entry = data[key] as KpiApiEntry;
    return {
      key,
      label: entry.label,
      value: formatValue(entry),
      delta: entry.delta,
      direction: entry.change,
    };
  });
}

function DeltaBadge({ delta, direction }: { delta: number; direction: 'up' | 'down' | 'flat' }) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const color =
    direction === 'up'
      ? 'text-[#16a34a]'
      : direction === 'down'
      ? 'text-[#dc2626]'
      : 'text-[#86868b]';

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {delta !== 0 && <span>{delta > 0 ? '+' : ''}{delta}%</span>}
    </span>
  );
}

interface KpiStripProps {
  onDrillDown?: (key: string) => void;
  expandedKpi?: string | null;
}

export function KpiStrip({ onDrillDown: externalDrillDown, expandedKpi: externalExpanded }: KpiStripProps) {
  const [internalExpanded, setInternalExpanded] = useState<string | null>(null);
  const expandedKpi = externalExpanded !== undefined ? externalExpanded : internalExpanded;

  const handleDrillDown = useCallback((key: string) => {
    if (externalDrillDown) {
      externalDrillDown(key);
    } else {
      setInternalExpanded((prev) => (prev === key ? null : key));
    }
  }, [externalDrillDown]);

  const { data, isLoading } = useDataFetch<KpiResponse>('/api/command-center/kpis', {
    refreshInterval: 30000,
    retryCount: 2,
    staleWhileRevalidate: true,
  });

  if (isLoading && !data) {
    return (
      <div
        className="rounded-2xl border p-4"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
        data-testid="kpi-strip"
      >
        <div className="flex flex-wrap gap-4 justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-[120px] animate-pulse">
              <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
              <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded mb-1" />
              <div className="h-3 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const items = toKpiItems(data);
  const isDemo = data.dataSource === 'demo';

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
      data-testid="kpi-strip"
    >
      {isDemo && (
        <div className="flex items-center gap-2 mb-3">
          <SampleDataBadge />
        </div>
      )}
      <div className="flex flex-wrap gap-4 justify-between">
        {items.map((kpi, i) => (
          <button
            key={kpi.key}
            onClick={() => handleDrillDown(kpi.key)}
            className={`flex-1 min-w-[120px] text-left rounded-lg p-2 -m-2 transition-all duration-200 ${
              expandedKpi === kpi.key
                ? 'ring-2 ring-[#de347f]/40 bg-[#de347f]/[0.03]'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {kpi.label}
            </p>
            <p className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              {kpi.value}
            </p>
            <DeltaBadge delta={kpi.delta} direction={kpi.direction} />
          </button>
        ))}
      </div>

      {/* Inline Drill-Down */}
      {expandedKpi && (
        <div className="mt-4">
          <KpiDrillDown
            kpiKey={expandedKpi}
            onClose={() => {
              if (externalDrillDown) {
                externalDrillDown(expandedKpi);
              } else {
                setInternalExpanded(null);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
