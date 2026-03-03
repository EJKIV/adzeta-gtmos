import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getSupabaseClient, detectEnvironment } from '@/lib/supabase/environment';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);

  const { data, error } = await supabase
    .from('work_queue')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ item: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);
  const body = await req.json();

  const updates: Record<string, unknown> = {};

  if (body.priority != null) updates.priority = body.priority;
  if (body.status != null) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.assigned_agent !== undefined) updates.assigned_agent = body.assigned_agent;
  if (body.blocked_reason !== undefined) updates.blocked_reason = body.blocked_reason;
  if (body.unblock_conditions !== undefined) updates.unblock_conditions = body.unblock_conditions;

  // Merge metadata fields
  if (body.metadata) {
    const { data: existing } = await supabase
      .from('work_queue')
      .select('metadata')
      .eq('id', id)
      .single();

    updates.metadata = { ...(existing?.metadata ?? {}), ...body.metadata };
  }

  // Track state transitions
  if (body.status === 'in_progress' && !updates.started_at) {
    updates.started_at = new Date().toISOString();
  }
  if (body.status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('work_queue')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);

  // Soft delete — mark as archived
  const { error } = await supabase
    .from('work_queue')
    .update({ status: 'archived', completed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
