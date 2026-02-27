import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getServerSupabase } from '@/lib/supabase-server';
import { generateRecommendations } from '@/lib/intelligence/recommendation-engine';
import type { SynthesisInput } from '@/lib/intelligence/recommendation-engine';
import { calculateKpiTrend } from '@/lib/predictions/simple-forecast';
import type { CardType } from '@/lib/preference-service';

const DEMO_DATA = {
  recommendations: [
    {
      id: 'demo-1',
      type: 'investigate_decline',
      title: 'Investigate MQL decline',
      description: 'MQL volume dropped 15% vs last week',
      confidenceScore: 85,
      priority: 'high',
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  ],
  pending_count: 1,
  auto_executed_today: 0,
  total_decisions: 0,
};

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ...DEMO_DATA, dataSource: 'demo' });
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    // Parallel queries: channel performance, autonomous tasks, prospects
    const [perfResult, tasksResult, prospectsResult] = await Promise.all([
      supabase
        .from('channel_performance')
        .select('date, messages_sent, replies, meetings_booked, reply_rate, meeting_rate, revenue_won')
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: true }),
      supabase
        .from('autonomous_tasks')
        .select('id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('prospects')
        .select('id, quality_score, last_contact_at')
        .in('quality_score', ['a', 'b'])
        .limit(50),
    ]);

    const perfRows = perfResult.data ?? [];
    const tasks = tasksResult.data ?? [];
    const prospects = prospectsResult.data ?? [];

    // Build KPI trends from channel_performance
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
    const trends = [];

    if (dates.length >= 2) {
      const replyRates = dates.map(d => {
        const dd = byDate.get(d)!;
        return dd.sent > 0 ? (dd.replies / dd.sent) * 100 : 0;
      });
      const meetingValues = dates.map(d => byDate.get(d)!.meetings);
      const sentValues = dates.map(d => byDate.get(d)!.sent);
      const revenueValues = dates.map(d => byDate.get(d)!.revenue);

      trends.push(
        calculateKpiTrend('reply_rate', replyRates[replyRates.length - 1], replyRates.slice(0, -1)),
        calculateKpiTrend('meetings_booked', meetingValues[meetingValues.length - 1], meetingValues.slice(0, -1)),
        calculateKpiTrend('messages_sent', sentValues[sentValues.length - 1], sentValues.slice(0, -1)),
        calculateKpiTrend('revenue', revenueValues[revenueValues.length - 1], revenueValues.slice(0, -1)),
      );
    }

    // Count task states
    const today = new Date().toISOString().split('T')[0];
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
    const autoExecutedToday = tasks.filter(
      t => t.status === 'completed' && t.created_at?.startsWith(today)
    ).length;

    // Count uncontacted high-quality prospects
    const now = Date.now();
    const staleProspects = prospects.filter(p => {
      if (!p.last_contact_at) return true;
      return (now - new Date(p.last_contact_at).getTime()) > 7 * 86400000;
    }).length;

    // Build synthesis input for recommendation engine
    const synthesisInput: SynthesisInput = {
      forecast: trends.length > 0
        ? {
            generatedAt: new Date().toISOString(),
            trends,
            summary: {
              trendingUp: trends.filter(t => t.direction === 'up').length,
              trendingFlat: trends.filter(t => t.direction === 'flat').length,
              trendingDown: trends.filter(t => t.direction === 'down').length,
            },
          }
        : null,
      preferences: {
        cardOrder: ['kpi', 'alerts', 'objectives', 'intelligence'] as CardType[],
        recentFeedback: [],
      },
      historicalAccuracy: {
        investigate_decline: 0.75,
        double_down_growth: 0.68,
        reorder_dashboard: 0.82,
        address_anomaly: 0.71,
        review_blocked_tasks: 0.79,
        pause_underperforming: 0.65,
      },
      context: {
        blockedTasks,
        openPriorities: pendingTasks + staleProspects,
        activeRuns: tasks.filter(t => t.status === 'in_progress').length,
      },
    };

    const recommendations = generateRecommendations(synthesisInput);

    // Add status field for consumer compatibility
    const enrichedRecs = recommendations.map(r => ({
      ...r,
      status: r.userFeedback ? r.userFeedback : 'pending',
    }));

    const response = {
      recommendations: enrichedRecs,
      pending_count: enrichedRecs.filter(r => r.status === 'pending').length,
      auto_executed_today: autoExecutedToday,
      total_decisions: tasks.length,
      dataSource: 'live',
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('intelligence route error:', err);
    return NextResponse.json({ ...DEMO_DATA, dataSource: 'demo' });
  }
}
