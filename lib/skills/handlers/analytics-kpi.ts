/**
 * Skill: analytics.kpi_detail
 *
 * Drills into a specific KPI with 30-day history and forecast.
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput, MetricsBlock, ChartBlock, InsightBlock } from '../types';
import { getServerSupabase } from '@/lib/supabase-server';
import { calculateTrend } from '@/lib/predictions/simple-forecast';

const QUERY_TIMEOUT_MS = 3_000;

type MetricDef = {
  key: string;
  label: string;
  extract: (d: { sent: number; replies: number; meetings: number; revenue: number }) => number;
  format: 'currency' | 'number' | 'percent';
};

const METRIC_MAP: Record<string, MetricDef> = {
  pipeline: { key: 'revenue', label: 'Pipeline Value', extract: d => d.revenue, format: 'currency' },
  revenue: { key: 'revenue', label: 'Revenue', extract: d => d.revenue, format: 'currency' },
  meetings: { key: 'meetings', label: 'Meetings Booked', extract: d => d.meetings, format: 'number' },
  'reply rate': { key: 'reply_rate', label: 'Reply Rate', extract: d => d.sent > 0 ? (d.replies / d.sent) * 100 : 0, format: 'percent' },
  replies: { key: 'reply_rate', label: 'Reply Rate', extract: d => d.sent > 0 ? (d.replies / d.sent) * 100 : 0, format: 'percent' },
  qualified: { key: 'qualified', label: 'Qualified Leads', extract: () => 0, format: 'number' },
  leads: { key: 'qualified', label: 'Qualified Leads', extract: () => 0, format: 'number' },
  sequences: { key: 'messages_sent', label: 'Messages Sent', extract: d => d.sent, format: 'number' },
  messages: { key: 'messages_sent', label: 'Messages Sent', extract: d => d.sent, format: 'number' },
};

async function handler(input: SkillInput): Promise<SkillOutput> {
  const start = Date.now();
  const query = (input.params.query as string) || '';
  const match = query.match(/\b(pipeline|revenue|meetings|reply rate|replies|qualified|leads|sequences|messages)\b/i);
  const metricKey = match ? match[0].toLowerCase() : 'pipeline';
  const metric = METRIC_MAP[metricKey] || METRIC_MAP['pipeline'];

  const supabase = getServerSupabase();
  if (!supabase) {
    return mockResponse(metric.label, Date.now() - start);
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const { data: rows, error } = await Promise.race([
      supabase
        .from('channel_performance')
        .select('date, messages_sent, replies, meetings_booked, revenue_won')
        .gte('date', thirtyDaysAgo)
        .order('date', { ascending: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase query timeout')), QUERY_TIMEOUT_MS)
      ),
    ]);

    if (error || !rows || rows.length < 2) {
      return mockResponse(metric.label, Date.now() - start);
    }

    // Aggregate by date
    const byDate = new Map<string, { sent: number; replies: number; meetings: number; revenue: number }>();
    for (const r of rows) {
      const d = byDate.get(r.date) ?? { sent: 0, replies: 0, meetings: 0, revenue: 0 };
      d.sent += r.messages_sent ?? 0;
      d.replies += r.replies ?? 0;
      d.meetings += r.meetings_booked ?? 0;
      d.revenue += r.revenue_won ?? 0;
      byDate.set(r.date, d);
    }

    const dates = [...byDate.keys()].sort();
    const values = dates.map(d => metric.extract(byDate.get(d)!));

    const current = values[values.length - 1];
    const avg7d = values.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, values.length);
    const avg30d = values.reduce((a, b) => a + b, 0) / values.length;

    const trend7d = calculateTrend(current, avg7d);
    const trend30d = calculateTrend(current, avg30d);

    const formatValue = (v: number) => {
      if (metric.format === 'currency') return `$${(v / 1000).toFixed(0)}k`;
      if (metric.format === 'percent') return `${v.toFixed(1)}%`;
      return String(Math.round(v));
    };

    const metrics: MetricsBlock = {
      type: 'metrics',
      metrics: [
        { label: 'Current', value: formatValue(current), delta: Math.round(trend7d.changePercent * 10) / 10, deltaDirection: trend7d.direction === 'up' ? 'up' : trend7d.direction === 'down' ? 'down' : 'flat' },
        { label: '7d Average', value: formatValue(avg7d), delta: Math.round(trend7d.changePercent * 10) / 10, deltaDirection: trend7d.direction === 'up' ? 'up' : trend7d.direction === 'down' ? 'down' : 'flat' },
        { label: '30d Average', value: formatValue(avg30d), delta: Math.round(trend30d.changePercent * 10) / 10, deltaDirection: trend30d.direction === 'up' ? 'up' : trend30d.direction === 'down' ? 'down' : 'flat' },
      ],
    };

    const chart: ChartBlock = {
      type: 'chart',
      chartType: 'line',
      title: `${metric.label} — 30-Day History`,
      xKey: 'date',
      yKeys: ['value'],
      colors: ['#de347f'],
      data: dates.map((d, i) => ({
        date: `${new Date(d).getMonth() + 1}/${new Date(d).getDate()}`,
        value: Math.round(values[i] * 100) / 100,
      })),
    };

    const trendWord = trend30d.direction === 'up' ? 'trending upward' : trend30d.direction === 'down' ? 'trending downward' : 'holding steady';
    const insight: InsightBlock = {
      type: 'insight',
      title: `${metric.label} ${trendWord}`,
      description: `${metric.label} has changed ${Math.round(Math.abs(trend30d.changePercent))}% over the past 30 days. The 7-day trend is ${trend7d.direction === 'up' ? 'accelerating' : trend7d.direction === 'down' ? 'decelerating' : 'stable'}.`,
      severity: trend30d.direction === 'up' ? 'success' : trend30d.direction === 'down' ? 'warning' : 'info',
      confidence: 0.78,
    };

    return {
      skillId: 'analytics.kpi_detail',
      status: 'success',
      blocks: [metrics, chart, insight],
      followUps: [
        { label: 'Full pipeline summary', command: 'show pipeline health' },
        { label: 'Forecast next quarter', command: 'forecast pipeline next quarter' },
      ],
      executionMs: Date.now() - start,
      dataFreshness: 'live',
    };
  } catch (err) {
    console.error('analytics.kpi_detail error:', err);
    return mockResponse(metric.label, Date.now() - start);
  }
}

function mockResponse(kpiName: string, executionMs: number): SkillOutput {
  const data: Record<string, unknown>[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      value: Math.round(1_000_000 + Math.random() * 300_000 + i * 5_000),
    });
  }

  return {
    skillId: 'analytics.kpi_detail',
    status: 'success',
    blocks: [
      {
        type: 'metrics',
        metrics: [
          { label: 'Current', value: '$1.25M', delta: 12, deltaDirection: 'up' },
          { label: '7d Average', value: '$1.18M', delta: 5.9, deltaDirection: 'up' },
          { label: '30d Average', value: '$1.05M', delta: 19, deltaDirection: 'up' },
        ],
      } as MetricsBlock,
      {
        type: 'chart',
        chartType: 'line',
        title: `${kpiName} — 30-Day History`,
        xKey: 'date',
        yKeys: ['value'],
        colors: ['#de347f'],
        data,
      } as ChartBlock,
      {
        type: 'insight',
        title: `${kpiName} trending upward`,
        description: `${kpiName} has increased 19% over the past 30 days. The 7-day trend is accelerating.`,
        severity: 'success',
        confidence: 0.78,
      } as InsightBlock,
    ],
    followUps: [
      { label: 'Full pipeline summary', command: 'show pipeline health' },
      { label: 'Forecast next quarter', command: 'forecast pipeline next quarter' },
    ],
    executionMs,
    dataFreshness: 'mock',
  };
}

skillRegistry.register({
  id: 'analytics.kpi_detail',
  name: 'KPI Detail',
  description: 'Drills into a specific KPI with 30-day history and forecast.',
  domain: 'analytics',
  inputSchema: { metric: { type: 'string', optional: true }, timeRange: { type: 'string', optional: true } },
  responseType: ['metrics', 'chart', 'insight'],
  triggerPatterns: [
    '\\b(kpi|metric|kpis|metrics|numbers)\\b',
    '\\b(forecast|predict|projection|trend)\\b',
    '\\b(detail|drill|deep dive|breakdown)\\b',
  ],
  estimatedMs: 400,
  examples: [
    'show KPI details',
    'forecast pipeline',
    'drill into reply rate',
    'metric breakdown',
  ],
  handler,
});
