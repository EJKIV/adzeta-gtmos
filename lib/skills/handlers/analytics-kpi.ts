/**
 * Skill: analytics.kpi_detail
 *
 * Drills into a specific KPI with 30-day history and forecast.
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput, MetricsBlock, ChartBlock, InsightBlock } from '../types';

function generate30DayData(): Record<string, unknown>[] {
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
  return data;
}

async function handler(input: SkillInput): Promise<SkillOutput> {
  const kpiName = (input.params.query as string)?.match(/\b(pipeline|meetings|reply rate|qualified|sequences|leads)\b/i)?.[0] || 'pipeline value';

  const metrics: MetricsBlock = {
    type: 'metrics',
    metrics: [
      { label: 'Current', value: '$1.25M', delta: 12, deltaDirection: 'up' },
      { label: '7d Average', value: '$1.18M', delta: 5.9, deltaDirection: 'up' },
      { label: '30d Average', value: '$1.05M', delta: 19, deltaDirection: 'up' },
    ],
  };

  const chart: ChartBlock = {
    type: 'chart',
    chartType: 'line',
    title: `${kpiName} — 30-Day History`,
    xKey: 'date',
    yKeys: ['value'],
    colors: ['#de347f'],
    data: generate30DayData(),
  };

  const insight: InsightBlock = {
    type: 'insight',
    title: `${kpiName} trending upward`,
    description: `${kpiName} has increased 19% over the past 30 days. The 7-day trend is accelerating, suggesting continued momentum.`,
    severity: 'success',
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
    executionMs: 0,
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
