import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/environment';
import { authenticate } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get environment from query param
    const url = new URL(request.url);
    const env = (url.searchParams.get('environment') as 'dev' | 'prod') || 'dev';

    const supabase = getSupabaseClient(env, true);

    // Read from oracle_commands (keyed by command_id, not pk id)
    const { data: command, error } = await supabase
      .from('oracle_commands')
      .select('command_id, status, response, created_at, completed_at, user_id')
      .eq('command_id', id)
      .eq('environment', env)
      .single();

    if (error || !command) {
      return NextResponse.json(
        { error: 'Command not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (command.user_id !== auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Normalize oracle_commands statuses to frontend CommandStatus values
    const statusMap: Record<string, string> = { processing: 'executing' };
    const normalizedStatus = statusMap[command.status] ?? command.status;

    return NextResponse.json({
      command_id: command.command_id,
      status: normalizedStatus,
      response: command.response,
      created_at: command.created_at,
      completed_at: command.completed_at,
    });

  } catch (err) {
    console.error('[oracle/command/[id]] GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const env = body.environment || 'dev';
    
    const supabase = getSupabaseClient(env, true);

    // Update command
    const { error: updateError } = await supabase
      .from('command_history')
      .update({
        status: body.status,
        result_summary: body.result_summary,
        result_data: body.result_data,
        user_visible_response: body.user_visible_response,
        output_artifacts: body.output_artifacts,
        routed_to_agent: body.routed_to_agent,
        routed_to_agent_role: body.routed_to_agent_role,
        intent_confidence: body.intent_confidence,
        token_usage_input: body.token_usage_input,
        token_usage_output: body.token_usage_output,
        estimated_cost: body.estimated_cost,
        duration_ms: body.duration_ms,
        completed_at: body.status === 'completed' || body.status === 'failed'
          ? new Date().toISOString()
          : undefined,
      })
      .eq('id', id)
      .eq('environment', env);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update command', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      command_id: id,
      environment: env
    });

  } catch (err) {
    console.error('[oracle/command/[id]] POST error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
