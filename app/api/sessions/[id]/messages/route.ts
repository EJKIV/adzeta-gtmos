import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authenticate } from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const supabase = getServerSupabase();
  if (!supabase) {
    // No Supabase — skip persistence silently
    return NextResponse.json({ ok: true });
  }

  const body = await req.json();

  const { error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      client_id: body.clientId ?? null,
      type: body.type,
      text: body.text ?? null,
      output: body.output ?? null,
    });

  if (error) {
    // RLS or session not found — client will queue to IndexedDB
    console.warn('[messages] DB insert failed:', error.message);
    return NextResponse.json({ ok: true, persisted: false });
  }

  // Touch the session's updated_at
  await supabase
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  return NextResponse.json({ ok: true });
}
