import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getSupabaseClient, detectEnvironment } from '@/lib/supabase/environment';
import type { ApproveTaskRequest } from '@/types/adzeta';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ task_id: string }> }
) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { task_id } = await params;
  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);
  const body: ApproveTaskRequest = await req.json();

  // Map action to approval_state
  const stateMap: Record<string, string> = {
    approve: 'approved',
    reject: 'rejected',
    modify: 'modified',
  };
  const newState = stateMap[body.action];
  if (!newState) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  // Conditional update — only if still pending_review (race protection)
  const { data, error } = await supabase
    .from('adzeta_work_queue')
    .update({
      approval_state: newState,
      approver_id: auth.userId ?? null,
      approved_at: new Date().toISOString(),
      approval_notes: body.notes ?? null,
      ...(body.modifications ? { suggested_action_payload: body.modifications } : {}),
    })
    .eq('task_id', task_id)
    .eq('approval_state', 'pending_review')
    .select()
    .single();

  if (error?.code === 'PGRST116') {
    return NextResponse.json(
      { error: 'Task already actioned or not found' },
      { status: 409 }
    );
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert feedback record
  const feedbackMap: Record<string, string> = {
    approve: 'approval',
    reject: 'rejection',
    modify: 'modification',
  };
  await supabase.from('adzeta_user_feedback').insert({
    task_id,
    feedback_type: feedbackMap[body.action],
    comment: body.notes ?? null,
    modification_json: body.modifications ?? null,
    user_id: auth.userId ?? '00000000-0000-0000-0000-000000000000',
  });

  return NextResponse.json({ task: data });
}
