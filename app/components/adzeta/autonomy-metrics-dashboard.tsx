'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useAdzetaMetrics } from '@/app/hooks/use-adzeta';

const COLORS = [
  'var(--color-brand-500, #6366f1)',
  '#f59e0b',
  '#22c55e',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function AutonomyMetricsDashboard() {
  const { data, isLoading } = useAdzetaMetrics(30);

  // Aggregate daily rows by date for charts
  const dailyByDate = useMemo(() => {
    const map = new Map<string, {
      date: string;
      research: number;
      analytics: number;
      recommendation: number;
      action: number;
      approved: number;
      rejected: number;
      modified: number;
    }>();
    for (const row of data.daily) {
      const d = row.metric_date;
      const existing = map.get(d) ?? {
        date: d,
        research: 0,
        analytics: 0,
        recommendation: 0,
        action: 0,
        approved: 0,
        rejected: 0,
        modified: 0,
      };
      const tt = row.task_type as keyof typeof existing;
      if (tt in existing && tt !== 'date') {
        (existing[tt] as number) += row.total_queries;
      }
      existing.approved += row.approved_count;
      existing.rejected += row.rejected_count;
      existing.modified += row.modified_count;
      map.set(d, existing);
    }
    return Array.from(map.values());
  }, [data.daily]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Performance Metrics</CardTitle></CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted rounded" />)}
            </div>
            <div className="h-[220px] bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { summary } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Tasks" value={String(summary.total_tasks)} />
          <MetricCard
            label="Approval Rate"
            value={`${(summary.approval_rate * 100).toFixed(0)}%`}
          />
          <MetricCard
            label="Auto-Execution"
            value={`${(summary.auto_execution_rate * 100).toFixed(0)}%`}
          />
          <MetricCard
            label="Avg Confidence"
            value={`${(summary.avg_confidence * 100).toFixed(0)}%`}
          />
        </div>

        {/* Area chart: daily task volume by type */}
        {dailyByDate.length > 0 && (
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Daily Task Volume
            </h3>
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #e5e7eb)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                    axisLine={{ stroke: 'var(--color-border-subtle, #e5e7eb)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                    axisLine={{ stroke: 'var(--color-border-subtle, #e5e7eb)' }}
                  />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="research" stackId="1" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="analytics" stackId="1" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="recommendation" stackId="1" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="action" stackId="1" stroke={COLORS[3]} fill={COLORS[3]} fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Bar chart: approve/reject/modify counts */}
        {dailyByDate.length > 0 && (
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Approval Actions
            </h3>
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #e5e7eb)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                    axisLine={{ stroke: 'var(--color-border-subtle, #e5e7eb)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                    axisLine={{ stroke: 'var(--color-border-subtle, #e5e7eb)' }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="approved" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="rejected" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="modified" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
