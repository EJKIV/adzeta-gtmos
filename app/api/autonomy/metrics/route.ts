import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getServerSupabase } from '@/lib/supabase-server';
import type { AutonomyMetrics } from '@/lib/autonomy/types';

const DEMO_METRICS: AutonomyMetrics = {
  decisions: {
    today: { total: 0, autoExecuted: 0, operatorApproved: 0, operatorRejected: 0 },
    thisWeek: { total: 0, autoExecuted: 0, operatorOverride: 0 },
    overrideRate: 0,
  },
  healing: {
    eventsToday: 0,
    eventsThisWeek: 0,
    successRate: 100,
    avgTimeToHealMs: 0,
    escalationRate: 0,
  },
  predictiveGuard: {
    totalPredictions: 0,
    preventedCount: 0,
    occurredCount: 0,
    falsePositiveCount: 0,
    avgConfidence: 0,
    accuracyRate: 0,
  },
  strategic: {
    activeHypotheses: 0,
    testsRunning: 0,
    pendingApprovals: 0,
    recentValidations: 0,
  },
  health: {
    status: 'healthy',
    lastCheck: new Date().toISOString(),
    activeTasks: 0,
    blockedTasks: 0,
  },
};

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ...DEMO_METRICS, dataSource: 'demo' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [allTasksRes, weekTasksRes] = await Promise.all([
      supabase
        .from('autonomous_tasks')
        .select('id, status, priority, created_at, completed_at, confidence_score')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('autonomous_tasks')
        .select('id, status, created_at, completed_at')
        .gte('created_at', weekAgo),
    ]);

    const allTasks = allTasksRes.data ?? [];
    const weekTasks = weekTasksRes.data ?? [];
    const todayTasks = weekTasks.filter(t => t.created_at?.startsWith(today));

    const todayCompleted = todayTasks.filter(t => t.status === 'completed').length;
    const todayCancelled = todayTasks.filter(t => t.status === 'cancelled').length;
    const weekCompleted = weekTasks.filter(t => t.status === 'completed').length;
    const weekCancelled = weekTasks.filter(t => t.status === 'cancelled').length;

    const overrideRate = weekTasks.length > 0
      ? Math.round((weekCancelled / weekTasks.length) * 100)
      : 0;

    const activeTasks = allTasks.filter(t => t.status === 'in_progress' || t.status === 'assigned').length;
    const blockedTasks = allTasks.filter(t => t.status === 'blocked').length;

    const health = blockedTasks > 5 ? 'critical' : blockedTasks > 0 ? 'degraded' : 'healthy';

    const metrics: AutonomyMetrics & { dataSource: string } = {
      decisions: {
        today: {
          total: todayTasks.length,
          autoExecuted: todayCompleted,
          operatorApproved: 0,
          operatorRejected: todayCancelled,
        },
        thisWeek: {
          total: weekTasks.length,
          autoExecuted: weekCompleted,
          operatorOverride: weekCancelled,
        },
        overrideRate,
      },
      healing: {
        eventsToday: 0,
        eventsThisWeek: 0,
        successRate: 100,
        avgTimeToHealMs: 0,
        escalationRate: 0,
      },
      predictiveGuard: {
        totalPredictions: 0,
        preventedCount: 0,
        occurredCount: 0,
        falsePositiveCount: 0,
        avgConfidence: 0,
        accuracyRate: 0,
      },
      strategic: {
        activeHypotheses: 0,
        testsRunning: 0,
        pendingApprovals: allTasks.filter(t => t.status === 'pending').length,
        recentValidations: 0,
      },
      health: {
        status: health as 'healthy' | 'degraded' | 'critical',
        lastCheck: new Date().toISOString(),
        activeTasks,
        blockedTasks,
      },
      dataSource: 'live',
    };

    return NextResponse.json(metrics);
  } catch (err) {
    console.error('autonomy/metrics error:', err);
    return NextResponse.json({ ...DEMO_METRICS, dataSource: 'demo' });
  }
}
