import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getSupabaseClient, detectEnvironment } from '@/lib/supabase/environment';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);

  const { data, error } = await supabase
    .from('adzeta_proactive_suggestions')
    .select('*')
    .eq('dismissed', false)
    .eq('accepted', false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('urgency', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ suggestions: data ?? [] });
}
