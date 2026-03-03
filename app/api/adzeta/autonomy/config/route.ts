import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getSupabaseClient, detectEnvironment } from '@/lib/supabase/environment';
import type { ConfigUpdateRequest } from '@/types/adzeta';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);

  const { data, error } = await supabase
    .from('adzeta_autonomy_config')
    .select('*')
    .order('config_key');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ config: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);
  const body: ConfigUpdateRequest = await req.json();

  const { data, error } = await supabase
    .from('adzeta_autonomy_config')
    .upsert(
      {
        config_key: body.config_key,
        config_value: body.config_value,
        change_reason: body.change_reason ?? null,
        updated_by: auth.userId ?? null,
      },
      { onConflict: 'config_key' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ config: data });
}
