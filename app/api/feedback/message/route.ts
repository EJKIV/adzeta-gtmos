import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authenticate } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    // Graceful degradation — no DB, still OK from client's perspective
    return NextResponse.json({ ok: true });
  }

  const body = await req.json();
  const { sessionId, messageClientId, rating, comment, userQuery, aiOutput, skillId } = body;

  if (!sessionId || !messageClientId || !rating) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const userId = auth.userId ?? '00000000-0000-0000-0000-000000000000';

  const { error } = await supabase
    .from('chat_message_feedback')
    .upsert(
      {
        session_id: sessionId,
        message_client_id: messageClientId,
        rating,
        comment: comment || null,
        user_query: userQuery || null,
        ai_output: aiOutput || null,
        skill_id: skillId || null,
        user_id: userId,
      },
      { onConflict: 'message_client_id,user_id' }
    );

  if (error) {
    console.error('Feedback upsert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
