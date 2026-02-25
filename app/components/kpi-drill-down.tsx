'use client';

import { X } from 'lucide-react';
import { useDataFetch } from '@/app/hooks/use-data-fetch';
import { SampleDataBadge } from './sample-data-badge';

interface DetailResponse {
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows: Record<string, unknown>[];
  dataSource: 'live' | 'demo';
}

interface KpiDrillDownProps {
  kpiKey: string;
  onClose: () => void;
}

export function KpiDrillDown({ kpiKey, onClose }: KpiDrillDownProps) {
  const { data, isLoading } = useDataFetch<DetailResponse>(
    `/api/command-center/kpis/detail?key=${kpiKey}`,
    { retryCount: 1 }
  );

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        animationFillMode: 'forwards',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {isLoading ? 'Loading...' : data?.title ?? 'Detail'}
          </h3>
          {data?.dataSource === 'demo' && <SampleDataBadge />}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close drill-down"
        >
          <X className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex-1 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {data.columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  style={{ borderColor: 'var(--color-border-subtle)' }}
                >
                  {data.columns.map((col) => (
                    <td key={col.key} className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
