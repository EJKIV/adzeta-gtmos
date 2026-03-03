import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/environment';
import { authenticate } from '@/lib/api-auth';
import type { FeedbackPayload } from '@/lib/types/orchestration';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as FeedbackPayload & { environment?: 'dev' | 'prod' };
    const env = body.environment || 'dev';

    const supabase = getSupabaseClient(env, true);

    // Convert 1-5 rating to signal type
    const signalType = body.rating >= 4 
      ? 'explicit_positive' 
      : body.rating <= 2 
        ? 'explicit_negative' 
        : 'implicit_neutral';

    // Insert learning signal
    const { data: signal, error: insertError } = await supabase
      .from('learning_signals')
      .insert({
        signal_type: signalType,
        subject_id: body.command_id,
        subject_type: 'command',
        user_id: auth.userId!,
        rating_value: body.rating,
        feedback_text: body.feedback_text,
        categories: body.categories,
        proposed_better_response: body.proposed_better_response,
        session_key: `feedback:${crypto.randomUUID()}`,
        source: 'user_feedback',
        metadata: {
          environment: env,
          user_agent: request.headers.get('user-agent'),
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('[oracle/feedback] Insert failed:', insertError);
      return NextResponse.json(
        { error: 'Failed to record feedback', details: insertError.message },
        { status: 500 }
      );
    }

    // Update command_history with RLHF flag if marked for training
    if (body.mark_for_rlhf) {
      await supabase
        .from('command_history')
        .update({
          rlhf_training_eligible: true,
          user_feedback_id: signal.id,
        })
        .eq('id', body.command_id)
        .eq('environment', env);
    }

    return NextResponse.json({
      success: true,
      signal_id: signal.id,
      environment: env,
    });

  } catch (err) {
    console.error('[oracle/feedback] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
