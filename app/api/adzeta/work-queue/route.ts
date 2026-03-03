import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getSupabaseClient, detectEnvironment } from '@/lib/supabase/environment';
import type { CreateTaskRequest } from '@/types/adzeta';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);

  const url = new URL(req.url);
  const state = url.searchParams.get('state');
  const taskType = url.searchParams.get('task_type');
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  let query = supabase
    .from('adzeta_work_queue')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (state) query = query.eq('approval_state', state);
  if (taskType) query = query.eq('task_type', taskType);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tasks: data ?? [], total: count ?? data?.length ?? 0 });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);
  const body: CreateTaskRequest = await req.json();

  // Check autonomy gate for this task type
  const { data: gate } = await supabase
    .from('adzeta_autonomy_gates')
    .select('*')
    .eq('task_type', body.task_type)
    .single();

  let approvalState = 'pending_review';

  // Auto-execute if gate is unlocked and confidence meets threshold
  if (
    gate &&
    (gate.current_status === 'unlocked' || gate.manually_unlocked) &&
    !gate.manually_locked &&
    body.confidence_score != null &&
    body.confidence_score >= gate.min_confidence
  ) {
    approvalState = 'auto_executed';
  }

  const { data, error } = await supabase
    .from('adzeta_work_queue')
    .insert({
      task_type: body.task_type,
      title: body.title,
      description: body.description ?? null,
      raw_request: body.raw_request,
      confidence_score: body.confidence_score ?? null,
      risk_level: body.risk_level ?? null,
      suggested_action: body.suggested_action ?? null,
      suggested_action_payload: body.suggested_action_payload ?? null,
      rationale: body.rationale ?? null,
      risk_assessment: body.risk_assessment ?? null,
      priority: body.priority ?? 5,
      scheduled_for: body.scheduled_for ?? null,
      deadline: body.deadline ?? null,
      oracle_command_id: body.oracle_command_id ?? null,
      approval_state: approvalState,
      executed_at: approvalState === 'auto_executed' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ task: data, auto_executed: approvalState === 'auto_executed' }, { status: 201 });
}
