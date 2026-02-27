import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getServerSupabase } from '@/lib/supabase-server';

const PRIORITY_MAP: Record<string, number> = {
  critical: 1,
  high: 5,
  medium: 15,
  low: 25,
};

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({
      tasks: { recent: [], all: [], highPriority: [], blocked: [] },
      workQueue: { openPriorities: 0 },
      timestamp: new Date().toISOString(),
      dataSource: 'demo',
    });
  }

  try {
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

    const { data: rows, error } = await supabase
      .from('autonomous_tasks')
      .select('id, title, status, priority, assignee, due_date, created_at, completed_at, confidence_score')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !rows) {
      return NextResponse.json({
        tasks: { recent: [], all: [], highPriority: [], blocked: [] },
        workQueue: { openPriorities: 0 },
        timestamp: new Date().toISOString(),
        dataSource: 'demo',
      });
    }

    const mapTask = (t: typeof rows[number]) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: PRIORITY_MAP[t.priority] ?? null,
      owner: t.assignee ?? null,
      due_date: t.due_date ?? null,
      completed_at: t.completed_at ?? null,
      created_at: t.created_at,
      progress: t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0,
    });

    const all = rows.map(mapTask);
    const recent = all.filter(t => t.created_at >= oneDayAgo);
    const highPriority = all.filter(t => t.priority !== null && t.priority <= 10);
    const blocked = all.filter(t => t.status === 'blocked');
    const openPriorities = all.filter(t => t.status === 'pending' || t.status === 'assigned').length;

    return NextResponse.json({
      tasks: { recent, all, highPriority, blocked },
      workQueue: { openPriorities },
      timestamp: new Date().toISOString(),
      dataSource: 'live',
    });
  } catch (err) {
    console.error('tasks route error:', err);
    return NextResponse.json({
      tasks: { recent: [], all: [], highPriority: [], blocked: [] },
      workQueue: { openPriorities: 0 },
      timestamp: new Date().toISOString(),
      dataSource: 'demo',
    });
  }
}
