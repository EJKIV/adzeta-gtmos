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
    console.warn('[sessions] DB query failed:', error.message);
    return NextResponse.json({ sessions: [] });
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

  // Use authenticated user ID from the auth check
  const userId = auth.userId;
  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: userId, title })
    .select()
    .single();

  if (error) {
    // RLS or DB error — fall back to a local-only session so chat still works
    console.warn('[sessions] DB insert failed, using local-only session:', error.message);
    return NextResponse.json({
      session: {
        id: crypto.randomUUID(),
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_archived: false,
        localOnly: true,
      },
    });
  }

  return NextResponse.json({ session: data });
}
