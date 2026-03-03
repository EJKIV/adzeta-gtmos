import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getSupabaseClient, detectEnvironment } from '@/lib/supabase/environment';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  let query = supabase
    .from('work_queue')
    .select('*')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [], total: data?.length ?? 0 });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);
  const body = await req.json();

  // Get next priority (max + 1)
  const { data: maxRow } = await supabase
    .from('work_queue')
    .select('priority')
    .order('priority', { ascending: false })
    .limit(1)
    .single();

  const nextPriority = (maxRow?.priority ?? 0) + 1;

  const { data, error } = await supabase
    .from('work_queue')
    .insert({
      item_type: body.item_type ?? 'task',
      category: body.category ?? null,
      user_id: auth.userId ?? null,
      priority: body.priority ?? nextPriority,
      status: body.status ?? 'pending',
      assigned_agent: body.assigned_agent ?? null,
      blocked_reason: body.blocked_reason ?? null,
      unblock_conditions: body.unblock_conditions ?? null,
      deadline_at: body.deadline_at ?? null,
      notes: body.notes ?? null,
      metadata: {
        title: body.title ?? '',
        description: body.description ?? '',
        requires_tools: body.requires_tools ?? [],
        missing_tools: body.missing_tools ?? [],
        requested_agent: body.requested_agent ?? null,
        user_priority: body.user_priority ?? null,
        ...body.metadata,
      },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data }, { status: 201 });
}
