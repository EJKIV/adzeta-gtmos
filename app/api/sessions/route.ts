import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authenticate } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ sessions: [] });
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at, updated_at, is_archived')
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ sessions: [] }, { status: 500 });
  }

  return NextResponse.json({ sessions: data });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    // Fallback: return a client-side-only session
    return NextResponse.json({
      session: {
        id: crypto.randomUUID(),
        title: 'New chat',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_archived: false,
        localOnly: true,
      },
    });
  }

  const body = await req.json();
  const title = body.title?.slice(0, 60) || 'New chat';

  // Try to get user from auth; fall back to anon
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? '00000000-0000-0000-0000-000000000000';

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: userId, title })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}
