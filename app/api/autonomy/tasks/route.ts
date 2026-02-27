import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getServerSupabase } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ tasks: [], dataSource: 'demo' });
  }

  try {
    const { data: tasks, error } = await supabase
      .from('autonomous_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('autonomy/tasks query error:', error);
      return NextResponse.json({ tasks: [], dataSource: 'demo' });
    }

    return NextResponse.json({
      tasks: tasks ?? [],
      dataSource: 'live',
    });
  } catch (err) {
    console.error('autonomy/tasks error:', err);
    return NextResponse.json({ tasks: [], dataSource: 'demo' });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'No database connection' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const userId = auth.userId ?? '00000000-0000-0000-0000-000000000000';

    const { data, error } = await supabase
      .from('autonomous_tasks')
      .insert({
        user_id: userId,
        task_type: body.task_type ?? 'kpi_investigation',
        title: body.title,
        description: body.description,
        priority: body.priority ?? 'medium',
        status: body.status ?? 'pending',
        confidence_score: body.confidence_score,
        source_recommendation_id: body.source_recommendation_id,
        metadata: body.metadata ?? {},
      })
      .select()
      .single();

    if (error) {
      console.error('autonomy/tasks insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: data });
  } catch (err) {
    console.error('autonomy/tasks POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
