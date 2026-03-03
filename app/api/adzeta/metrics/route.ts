import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getSupabaseClient, detectEnvironment } from '@/lib/supabase/environment';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '30', 10);

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Daily metrics
  const { data: daily, error: dailyErr } = await supabase
    .from('adzeta_agent_metrics')
    .select('*')
    .gte('metric_date', since.toISOString().split('T')[0])
    .order('metric_date', { ascending: true });

  if (dailyErr) return NextResponse.json({ error: dailyErr.message }, { status: 500 });

  // Summary from v_agent_performance view
  const { data: perf, error: perfErr } = await supabase
    .from('v_agent_performance')
    .select('*');

  if (perfErr) return NextResponse.json({ error: perfErr.message }, { status: 500 });

  const rows = perf ?? [];
  const totalTasks = rows.reduce((s, r) => s + (r.total_tasks ?? 0), 0);
  const totalApproved = rows.reduce((s, r) => s + (r.approved ?? 0) + (r.completed ?? 0), 0);
  const totalAutoExec = rows.reduce((s, r) => s + (r.auto_executed ?? 0), 0);
  const avgConf = rows.length > 0
    ? rows.reduce((s, r) => s + (r.avg_confidence ?? 0), 0) / rows.length
    : 0;

  return NextResponse.json({
    daily: daily ?? [],
    summary: {
      total_tasks: totalTasks,
      approval_rate: totalTasks > 0 ? totalApproved / totalTasks : 0,
      auto_execution_rate: totalTasks > 0 ? totalAutoExec / totalTasks : 0,
      avg_confidence: Math.round(avgConf * 100) / 100,
    },
  });
}
