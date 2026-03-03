import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getSupabaseClient, detectEnvironment } from '@/lib/supabase/environment';
import type { SubmitFeedbackRequest } from '@/types/adzeta';

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);
  const body: SubmitFeedbackRequest = await req.json();

  const { data, error } = await supabase
    .from('adzeta_user_feedback')
    .insert({
      task_id: body.task_id ?? null,
      oracle_command_id: body.oracle_command_id ?? null,
      feedback_type: body.feedback_type,
      rating: body.rating ?? null,
      comment: body.comment ?? null,
      modification_json: body.modification_json ?? null,
      user_id: auth.userId ?? '00000000-0000-0000-0000-000000000000',
      outcome_success: body.outcome_success ?? null,
      outcome_metrics: body.outcome_metrics ?? null,
      time_to_completion_seconds: body.time_to_completion_seconds ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ feedback: data }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);
  const url = new URL(req.url);
  const taskId = url.searchParams.get('task_id');

  let query = supabase
    .from('adzeta_user_feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (taskId) query = query.eq('task_id', taskId);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ feedback: data ?? [] });
}
