import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/environment';
import { authenticate } from '@/lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const env = body.environment || 'dev';

    const supabase = getSupabaseClient(env, true);

    // Check ownership and cancelability
    const { data: command, error: fetchError } = await supabase
      .from('command_history')
      .select('user_id, status')
      .eq('id', id)
      .eq('environment', env)
      .single();

    if (fetchError || !command) {
      return NextResponse.json(
        { error: 'Command not found' },
        { status: 404 }
      );
    }

    if (command.user_id !== auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Can only cancel pending, parsing, routing, or executing
    const cancellableStatuses = ['pending', 'parsing', 'routing', 'executing'];
    if (!cancellableStatuses.includes(command.status)) {
      return NextResponse.json(
        { 
          error: 'Cannot cancel command', 
          message: `Command is already ${command.status}` 
        },
        { status: 400 }
      );
    }

    // Update command status
    const { error: updateError } = await supabase
      .from('command_history')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('environment', env);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to cancel command', details: updateError.message },
        { status: 500 }
      );
    }

    // Also cancel any pending subagent tasks
    const { error: taskError } = await supabase
      .from('subagent_tasks')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('command_id', id);

    if (taskError) {
      console.warn('[oracle/cancel] Failed to cancel tasks:', taskError);
      // Continue - command is cancelled even if tasks weren't
    }

    return NextResponse.json({
      success: true,
      command_id: id,
      environment: env,
      message: 'Command cancelled',
    });

  } catch (err) {
    console.error('[oracle/cancel] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
