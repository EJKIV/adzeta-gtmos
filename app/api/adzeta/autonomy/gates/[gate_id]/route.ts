import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getSupabaseClient, detectEnvironment } from '@/lib/supabase/environment';
import type { GateUpdateRequest } from '@/types/adzeta';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ gate_id: string }> }
) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gate_id } = await params;
  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);
  const body: GateUpdateRequest = await req.json();

  const updates =
    body.action === 'unlock'
      ? {
          manually_unlocked: true,
          manually_locked: false,
          current_status: 'unlocked' as const,
          unlocked_at: new Date().toISOString(),
          locked_reason: null,
        }
      : {
          manually_locked: true,
          manually_unlocked: false,
          current_status: 'locked' as const,
          locked_reason: body.reason ?? null,
        };

  const { data, error } = await supabase
    .from('adzeta_autonomy_gates')
    .update(updates)
    .eq('gate_id', gate_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ gate: data });
}
