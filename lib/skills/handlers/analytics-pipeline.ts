/**
 * Skill: analytics.pipeline_summary
 *
 * Returns GTM pipeline health — KPI metrics, 7-day trend chart, and insight summary.
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput, MetricsBlock, ChartBlock, InsightBlock } from '../types';
import { getServerSupabase } from '@/lib/supabase-server';

const QUERY_TIMEOUT_MS = 3_000;

async function handler(_input: SkillInput): Promise<SkillOutput> {
  const start = Date.now();
  const supabase = getServerSupabase();

  if (!supabase) {
    return mockResponse(Date.now() - start);
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const [perfResult, prospectsResult, sequencesResult] = await Promise.race([
      Promise.all([
        supabase
          .from('channel_performance')
          .select('date, messages_sent, replies, meetings_booked, reply_rate, revenue_won')
          .gte('date', sevenDaysAgo)
          .order('date', { ascending: true }),
        supabase
          .from('prospects')
          .select('id')
          .in('quality_score', ['a', 'b']),
        supabase
          .from('outreach_sequences')
          .select('id')
          .eq('status', 'active'),
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase query timeout')), QUERY_TIMEOUT_MS)
      ),
    ]);

    const perfRows = perfResult.data ?? [];
    if (perfRows.length === 0) {
      return mockResponse(Date.now() - start);
    }

    // Aggregate by date
    const byDate = new Map<string, { sent: number; replies: number; meetings: number; revenue: number }>();
    for (const r of perfRows) {
      const d = byDate.get(r.date) ?? { sent: 0, replies: 0, meetings: 0, revenue: 0 };
      d.sent += r.messages_sent ?? 0;
      d.replies += r.replies ?? 0;
      d.meetings += r.meetings_booked ?? 0;
      d.revenue += r.revenue_won ?? 0;
      byDate.set(r.date, d);
    }

    const dates = [...byDate.keys()].sort();
    const totalRevenue = dates.reduce((s, d) => s + byDate.get(d)!.revenue, 0);
    const totalMeetings = dates.reduce((s, d) => s + byDate.get(d)!.meetings, 0);
    const totalSent = dates.reduce((s, d) => s + byDate.get(d)!.sent, 0);
    const totalReplies = dates.reduce((s, d) => s + byDate.get(d)!.replies, 0);
    const replyRate = totalSent > 0 ? (totalReplies / totalSent) * 100 : 0;
    const qualifiedLeads = prospectsResult.data?.length ?? 0;
    const activeSequences = sequencesResult.data?.length ?? 0;

    // Compute deltas from first half vs second half of week
    const midpoint = Math.floor(dates.length / 2);
    const firstHalf = dates.slice(0, midpoint);
    const secondHalf = dates.slice(midpoint);
    const firstRevenue = firstHalf.reduce((s, d) => s + byDate.get(d)!.revenue, 0);
    const secondRevenue = secondHalf.reduce((s, d) => s + byDate.get(d)!.revenue, 0);
    const revenueDelta = firstRevenue > 0 ? Math.round(((secondRevenue - firstRevenue) / firstRevenue) * 100) : 0;

    const firstMeetings = firstHalf.reduce((s, d) => s + byDate.get(d)!.meetings, 0);
    const secondMeetings = secondHalf.reduce((s, d) => s + byDate.get(d)!.meetings, 0);
    const meetingsDelta = firstMeetings > 0 ? Math.round(((secondMeetings - firstMeetings) / firstMeetings) * 100) : 0;

    const dir = (d: number) => d > 0 ? 'up' as const : d < 0 ? 'down' as const : 'flat' as const;

    const metrics: MetricsBlock = {
      type: 'metrics',
      metrics: [
        { label: 'Pipeline Value', value: totalRevenue, format: 'currency', delta: revenueDelta, deltaDirection: dir(revenueDelta) },
        { label: 'Meetings Booked', value: totalMeetings, format: 'number', delta: meetingsDelta, deltaDirection: dir(meetingsDelta) },
        { label: 'Reply Rate', value: Math.round(replyRate * 10) / 10, format: 'percent', delta: 0, deltaDirection: 'flat' },
        { label: 'Qualified Leads', value: qualifiedLeads, format: 'number', delta: 0, deltaDirection: 'flat' },
        { label: 'Active Sequences', value: activeSequences, format: 'number', delta: 0, deltaDirection: 'flat' },
      ],
    };

    // Build chart from daily data
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chart: ChartBlock = {
      type: 'chart',
      chartType: 'area',
      title: '7-Day Pipeline Trend',
      xKey: 'day',
      yKeys: ['pipeline', 'meetings'],
      colors: ['#de347f', '#8f76f5'],
      data: dates.map(d => {
        const dd = byDate.get(d)!;
        const dayOfWeek = dayNames[new Date(d).getDay()];
        return {
          day: dayOfWeek,
          pipeline: Math.round(dd.revenue / 1000),
          meetings: dd.meetings,
        };
      }),
    };

    // Build insight from trends
    const trendDirection = revenueDelta > 3 ? 'growing' : revenueDelta < -3 ? 'declining' : 'holding steady';
    const insight: InsightBlock = {
      type: 'insight',
      title: `Pipeline ${trendDirection}`,
      description: `Pipeline value is ${revenueDelta > 0 ? 'up' : revenueDelta < 0 ? 'down' : 'flat'} ${Math.abs(revenueDelta)}% this period. Reply rate is at ${Math.round(replyRate * 10) / 10}%. ${totalMeetings} meetings booked across ${dates.length} days.`,
      severity: revenueDelta >= 0 ? 'success' : 'warning',
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
      executionMs: Date.now() - start,
      dataFreshness: 'live',
    };
  } catch (err) {
    console.error('analytics.pipeline_summary error:', err);
    return mockResponse(Date.now() - start);
  }
}

function mockResponse(executionMs: number): SkillOutput {
  return {
    skillId: 'analytics.pipeline_summary',
    status: 'success',
    blocks: [
      {
        type: 'metrics',
        metrics: [
          { label: 'Pipeline Value', value: 1_247_000, format: 'currency', delta: 12, deltaDirection: 'up' },
          { label: 'Meetings Booked', value: 24, format: 'number', delta: 8, deltaDirection: 'up' },
          { label: 'Reply Rate', value: 18.4, format: 'percent', delta: -2.1, deltaDirection: 'down' },
          { label: 'Qualified Leads', value: 186, format: 'number', delta: 5, deltaDirection: 'up' },
          { label: 'Active Sequences', value: 7, format: 'number', delta: 0, deltaDirection: 'flat' },
        ],
      } as MetricsBlock,
      {
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
      } as ChartBlock,
      {
        type: 'insight',
        title: 'Pipeline growing steadily',
        description: 'Pipeline value is up 12% week-over-week. Reply rate dipped slightly — consider A/B testing subject lines on active sequences.',
        severity: 'success',
        confidence: 0.85,
      } as InsightBlock,
    ],
    followUps: [
      { label: 'Drill into reply rate', command: 'show reply rate details' },
      { label: 'View sequences', command: 'show active sequences' },
      { label: 'Forecast next week', command: 'forecast pipeline next week' },
    ],
    executionMs,
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
