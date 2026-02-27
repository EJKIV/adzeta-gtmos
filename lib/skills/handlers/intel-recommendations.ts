/**
 * Skill: intelligence.recommendations
 *
 * Returns prioritized recommendations from the recommendation engine.
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput, InsightBlock } from '../types';
import { getServerSupabase } from '@/lib/supabase-server';
import { generateRecommendations } from '@/lib/intelligence/recommendation-engine';
import type { SynthesisInput, RecommendationPriority } from '@/lib/intelligence/recommendation-engine';
import { calculateKpiTrend } from '@/lib/predictions/simple-forecast';
import type { CardType } from '@/lib/preference-service';

const PRIORITY_TO_SEVERITY: Record<RecommendationPriority, 'critical' | 'warning' | 'info' | 'success'> = {
  critical: 'critical',
  high: 'warning',
  medium: 'info',
  low: 'success',
};

async function handler(_input: SkillInput): Promise<SkillOutput> {
  const start = Date.now();
  const supabase = getServerSupabase();

  if (!supabase) {
    return mockResponse(Date.now() - start);
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const [perfResult, tasksResult] = await Promise.all([
      supabase
        .from('channel_performance')
        .select('date, messages_sent, replies, meetings_booked, revenue_won')
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: true }),
      supabase
        .from('autonomous_tasks')
        .select('id, status')
        .limit(50),
    ]);

    const perfRows = perfResult.data ?? [];
    const tasks = tasksResult.data ?? [];

    if (perfRows.length < 2) {
      return mockResponse(Date.now() - start);
    }

    // Build trends
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
    const trends = [
      (() => {
        const vals = dates.map(d => { const dd = byDate.get(d)!; return dd.sent > 0 ? (dd.replies / dd.sent) * 100 : 0; });
        return calculateKpiTrend('reply_rate', vals[vals.length - 1], vals.slice(0, -1));
      })(),
      (() => {
        const vals = dates.map(d => byDate.get(d)!.meetings);
        return calculateKpiTrend('meetings_booked', vals[vals.length - 1], vals.slice(0, -1));
      })(),
      (() => {
        const vals = dates.map(d => byDate.get(d)!.revenue);
        return calculateKpiTrend('revenue', vals[vals.length - 1], vals.slice(0, -1));
      })(),
    ];

    const blockedTasks = tasks.filter(t => t.status === 'blocked').length;

    const synthesisInput: SynthesisInput = {
      forecast: {
        generatedAt: new Date().toISOString(),
        trends,
        summary: {
          trendingUp: trends.filter(t => t.direction === 'up').length,
          trendingFlat: trends.filter(t => t.direction === 'flat').length,
          trendingDown: trends.filter(t => t.direction === 'down').length,
        },
      },
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
        openPriorities: tasks.filter(t => t.status === 'pending').length,
        activeRuns: tasks.filter(t => t.status === 'in_progress').length,
      },
    };

    const recommendations = generateRecommendations(synthesisInput);

    const insights: InsightBlock[] = recommendations.slice(0, 5).map(r => ({
      type: 'insight' as const,
      title: r.title,
      description: r.description,
      severity: PRIORITY_TO_SEVERITY[r.priority],
      confidence: r.confidenceScore / 100,
    }));

    if (insights.length === 0) {
      insights.push({
        type: 'insight',
        title: 'All systems nominal',
        description: 'No significant trends or issues detected. KPIs are within normal ranges.',
        severity: 'success',
        confidence: 0.9,
      });
    }

    return {
      skillId: 'intelligence.recommendations',
      status: 'success',
      blocks: insights,
      followUps: [
        { label: 'Pipeline summary', command: 'show pipeline health' },
        { label: 'View anomalies', command: 'show anomalies' },
        { label: 'Risk assessment', command: 'show deal risks' },
      ],
      executionMs: Date.now() - start,
      dataFreshness: 'live',
    };
  } catch (err) {
    console.error('intelligence.recommendations error:', err);
    return mockResponse(Date.now() - start);
  }
}

function mockResponse(executionMs: number): SkillOutput {
  return {
    skillId: 'intelligence.recommendations',
    status: 'success',
    blocks: [
      {
        type: 'insight',
        title: 'Reply rate declining on Sequence #3',
        description: 'Reply rate dropped 4.2% this week. Consider pausing and A/B testing new subject lines.',
        severity: 'warning',
        confidence: 0.82,
      } as InsightBlock,
      {
        type: 'insight',
        title: 'High-value prospects not contacted',
        description: '12 A+ scored prospects from last week have not been added to any sequence.',
        severity: 'critical',
        confidence: 0.91,
      } as InsightBlock,
      {
        type: 'insight',
        title: 'Meeting conversion rate improving',
        description: 'Meetings-to-opportunity conversion is up 15% this month.',
        severity: 'success',
        confidence: 0.75,
      } as InsightBlock,
    ],
    followUps: [
      { label: 'Pipeline summary', command: 'show pipeline health' },
      { label: 'View anomalies', command: 'show anomalies' },
      { label: 'Risk assessment', command: 'show deal risks' },
    ],
    executionMs,
    dataFreshness: 'mock',
  };
}

skillRegistry.register({
  id: 'intelligence.recommendations',
  name: 'Recommendations',
  description: 'Shows prioritized, actionable recommendations based on current GTM health.',
  domain: 'intelligence',
  inputSchema: {},
  responseType: ['insight'],
  triggerPatterns: [
    '\\b(recommend|suggestion|advice|what should|priorities)\\b',
    '\\b(intelligence|insights|opportunities)\\b',
  ],
  estimatedMs: 300,
  examples: [
    'what should I focus on?',
    'show recommendations',
    'any suggestions?',
    'top priorities',
  ],
  handler,
});
