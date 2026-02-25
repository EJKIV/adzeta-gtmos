/**
 * Skill: analytics.pipeline_summary
 *
 * Returns GTM pipeline health — KPI metrics, 7-day trend chart, and insight summary.
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput, MetricsBlock, ChartBlock, InsightBlock } from '../types';

async function handler(input: SkillInput): Promise<SkillOutput> {
  // Mock GTM pipeline data (structured for real Supabase queries later)
  const pipelineValue = 1_247_000;
  const meetingsBooked = 24;
  const replyRate = 18.4;
  const qualifiedLeads = 186;
  const activeSequences = 7;

  const metrics: MetricsBlock = {
    type: 'metrics',
    metrics: [
      { label: 'Pipeline Value', value: pipelineValue, format: 'currency', delta: 12, deltaDirection: 'up' },
      { label: 'Meetings Booked', value: meetingsBooked, format: 'number', delta: 8, deltaDirection: 'up' },
      { label: 'Reply Rate', value: replyRate, format: 'percent', delta: -2.1, deltaDirection: 'down' },
      { label: 'Qualified Leads', value: qualifiedLeads, format: 'number', delta: 5, deltaDirection: 'up' },
      { label: 'Active Sequences', value: activeSequences, format: 'number', delta: 0, deltaDirection: 'flat' },
    ],
  };

  const chart: ChartBlock = {
    type: 'chart',
    chartType: 'area',
    title: '7-Day Pipeline Trend',
    xKey: 'day',
    yKeys: ['pipeline', 'meetings'],
    colors: ['#de347f', '#8f76f5'],
    data: [
      { day: 'Mon', pipeline: 980, meetings: 3 },
      { day: 'Tue', pipeline: 1020, meetings: 4 },
      { day: 'Wed', pipeline: 1080, meetings: 5 },
      { day: 'Thu', pipeline: 1150, meetings: 3 },
      { day: 'Fri', pipeline: 1190, meetings: 4 },
      { day: 'Sat', pipeline: 1210, meetings: 2 },
      { day: 'Sun', pipeline: 1247, meetings: 3 },
    ],
  };

  const insight: InsightBlock = {
    type: 'insight',
    title: 'Pipeline growing steadily',
    description: 'Pipeline value is up 12% week-over-week. Reply rate dipped slightly — consider A/B testing subject lines on active sequences.',
    severity: 'success',
    confidence: 0.85,
  };

  return {
    skillId: 'analytics.pipeline_summary',
    status: 'success',
    blocks: [metrics, chart, insight],
    followUps: [
      { label: 'Drill into reply rate', command: 'show reply rate details' },
      { label: 'View sequences', command: 'show active sequences' },
      { label: 'Forecast next week', command: 'forecast pipeline next week' },
    ],
    executionMs: 0,
    dataFreshness: 'mock',
  };
}

skillRegistry.register({
  id: 'analytics.pipeline_summary',
  name: 'Pipeline Summary',
  description: 'Shows GTM pipeline health: KPIs, 7-day trend, and insights.',
  domain: 'analytics',
  inputSchema: { timeRange: { type: 'string', optional: true } },
  responseType: ['metrics', 'chart', 'insight'],
  triggerPatterns: [
    '\\b(pipeline|funnel|conversion)\\b',
    '\\b(dashboard|overview|summary|status|health)\\b',
    '\\b(how.*doing|how.*going|what.*status)\\b',
  ],
  estimatedMs: 500,
  examples: [
    'show pipeline health',
    'dashboard summary',
    'how are we doing?',
    'pipeline overview',
  ],
  handler,
});
