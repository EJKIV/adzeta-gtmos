import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getServerSupabase } from '@/lib/supabase-server';

const DEMO_STATE = {
  kpis: {
    pipeline_value: { current: 1_247_000, delta: 12, direction: 'up' },
    meetings_booked: { current: 24, delta: 8, direction: 'up' },
    reply_rate: { current: 18.4, delta: -2.1, direction: 'down' },
    qualified_leads: { current: 186, delta: 5, direction: 'up' },
    active_sequences: { current: 7, delta: 0, direction: 'flat' },
  },
  health: 'healthy',
  recentCommands: [],
  activeJobs: [],
  timestamp: new Date().toISOString(),
};

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ...DEMO_STATE, timestamp: new Date().toISOString(), dataSource: 'demo' });
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const [perfResult, prospectsResult, sequencesResult] = await Promise.all([
      supabase
        .from('channel_performance')
        .select('date, messages_sent, replies, meetings_booked, reply_rate, revenue_won')
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: true }),
      supabase
        .from('prospects')
        .select('id, quality_score')
        .in('quality_score', ['a', 'b']),
      supabase
        .from('outreach_sequences')
        .select('id')
        .eq('status', 'active'),
    ]);

    const perfRows = perfResult.data ?? [];
    const prospects = prospectsResult.data ?? [];
    const sequences = sequencesResult.data ?? [];

    if (perfRows.length === 0) {
      return NextResponse.json({ ...DEMO_STATE, timestamp: new Date().toISOString(), dataSource: 'demo' });
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
    const latest = byDate.get(dates[dates.length - 1])!;
    const priorDates = dates.slice(0, -1);

    // Compute averages for delta
    const avgMeetings = priorDates.length > 0
      ? priorDates.reduce((s, d) => s + byDate.get(d)!.meetings, 0) / priorDates.length
      : latest.meetings;
    const avgReplyRate = priorDates.length > 0
      ? priorDates.reduce((s, d) => {
          const dd = byDate.get(d)!;
          return s + (dd.sent > 0 ? (dd.replies / dd.sent) * 100 : 0);
        }, 0) / priorDates.length
      : 0;
    const avgRevenue = priorDates.length > 0
      ? priorDates.reduce((s, d) => s + byDate.get(d)!.revenue, 0) / priorDates.length
      : latest.revenue;

    const currentReplyRate = latest.sent > 0 ? (latest.replies / latest.sent) * 100 : 0;
    const totalRevenue = dates.reduce((s, d) => s + byDate.get(d)!.revenue, 0);

    const direction = (current: number, avg: number) =>
      current > avg * 1.03 ? 'up' : current < avg * 0.97 ? 'down' : 'flat';

    const delta = (current: number, avg: number) =>
      avg > 0 ? Math.round(((current - avg) / avg) * 100) : 0;

    const state = {
      kpis: {
        pipeline_value: {
          current: Math.round(totalRevenue),
          delta: delta(latest.revenue, avgRevenue),
          direction: direction(latest.revenue, avgRevenue),
        },
        meetings_booked: {
          current: latest.meetings,
          delta: delta(latest.meetings, avgMeetings),
          direction: direction(latest.meetings, avgMeetings),
        },
        reply_rate: {
          current: Math.round(currentReplyRate * 10) / 10,
          delta: Math.round((currentReplyRate - avgReplyRate) * 10) / 10,
          direction: direction(currentReplyRate, avgReplyRate),
        },
        qualified_leads: {
          current: prospects.length,
          delta: 0,
          direction: 'flat',
        },
        active_sequences: {
          current: sequences.length,
          delta: 0,
          direction: 'flat',
        },
      },
      health: currentReplyRate >= 10 ? 'healthy' : currentReplyRate >= 5 ? 'degraded' : 'critical',
      recentCommands: [],
      activeJobs: [],
      timestamp: new Date().toISOString(),
      dataSource: 'live',
    };

    return NextResponse.json(state);
  } catch (err) {
    console.error('agent/state error:', err);
    return NextResponse.json({ ...DEMO_STATE, timestamp: new Date().toISOString(), dataSource: 'demo' });
  }
}
