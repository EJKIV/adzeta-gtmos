import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authenticate } from '@/lib/api-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ messages: [] });
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, session_id, client_id, type, text, output, created_at')
    .eq('session_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[sessions] Messages query failed:', error.message);
    return NextResponse.json({ messages: [] });
  }

  return NextResponse.json({ messages: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.title === 'string') {
    updates.title = body.title.slice(0, 60);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await supabase
    .from('chat_sessions')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.warn('[sessions] PATCH failed:', error.message);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from('chat_sessions')
    .update({ is_archived: true })
    .eq('id', id);

  if (error) {
    console.warn('[sessions] DELETE (archive) failed:', error.message);
  }

  return NextResponse.json({ ok: true });
}
