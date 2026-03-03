import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getSupabaseClient, detectEnvironment } from '@/lib/supabase/environment';
import type { SuggestionActionRequest } from '@/types/adzeta';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);
  const body: SuggestionActionRequest = await req.json();

  if (body.action === 'dismiss') {
    const { data, error } = await supabase
      .from('adzeta_proactive_suggestions')
      .update({
        dismissed: true,
        dismissed_at: new Date().toISOString(),
        dismissed_reason: body.reason ?? null,
      })
      .eq('suggestion_id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ suggestion: data });
  }

  if (body.action === 'accept') {
    // Mark suggestion as accepted
    const { data: suggestion, error: sugError } = await supabase
      .from('adzeta_proactive_suggestions')
      .update({
        accepted: true,
        accepted_at: new Date().toISOString(),
      })
      .eq('suggestion_id', id)
      .select()
      .single();

    if (sugError) return NextResponse.json({ error: sugError.message }, { status: 500 });

    // Optionally create a work queue task from the suggestion
    let task = null;
    if (suggestion?.suggested_action) {
      const { data: newTask } = await supabase
        .from('adzeta_work_queue')
        .insert({
          task_type: 'research',
          title: suggestion.title,
          description: suggestion.description,
          raw_request: suggestion.suggested_action,
          suggested_action: suggestion.suggested_action,
          suggested_action_payload: suggestion.suggested_action_payload,
          confidence_score: suggestion.confidence,
          approval_state: 'approved',
          approver_id: auth.userId ?? null,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();
      task = newTask;
    }

    return NextResponse.json({ suggestion, task });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
