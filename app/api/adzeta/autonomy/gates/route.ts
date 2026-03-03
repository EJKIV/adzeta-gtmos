import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getSupabaseClient, detectEnvironment } from '@/lib/supabase/environment';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);

  const { data, error } = await supabase
    .from('adzeta_autonomy_gates')
    .select('*')
    .order('gate_id', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const gates = (data ?? []).map((gate) => ({
    ...gate,
    progress: {
      runs_progress: gate.min_historical_runs > 0
        ? Math.min(1, gate.runs_count / gate.min_historical_runs)
        : 1,
      success_rate: gate.runs_count > 0
        ? gate.success_count / gate.runs_count
        : 0,
      confidence_progress: gate.avg_confidence != null && gate.min_confidence > 0
        ? Math.min(1, gate.avg_confidence / gate.min_confidence)
        : 0,
    },
  }));

  return NextResponse.json({ gates });
}
