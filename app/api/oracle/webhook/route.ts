import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getEnvironmentFromBody } from '@/lib/supabase/environment';
import type { CommandDetails } from '@/lib/types/orchestration';

/**
 * POST /api/oracle/webhook
 * 
 * Receives notifications from the orchestration layer
 * or triggers notifications to the orchestrator
 * 
 * Use cases:
 * 1. Frontend calls this after creating a command to notify Zetty
 * 2. Zetty calls this to update command status
 * 3. Subagents call this to report completion
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      command_id, 
      event_type, 
      payload,
      source = 'internal'
    } = body;

    if (!command_id) {
      return NextResponse.json(
        { error: 'command_id is required' },
        { status: 400 }
      );
    }

    if (!event_type) {
      return NextResponse.json(
        { error: 'event_type is required' },
        { status: 400 }
      );
    }

    // Detect environment from request
    const env = getEnvironmentFromBody(body);

    // Log the webhook event
    console.log('[webhook] Received:', { command_id, event_type, environment: env, source });

    switch (event_type) {
      case 'command_created':
        return handleCommandCreated(command_id, env);
      
      case 'command_updated':
        return handleCommandUpdated(command_id, env, payload);
      
      case 'command_completed':
        return handleCommandCompleted(command_id, env, payload);
      
      case 'command_failed':
        return handleCommandFailed(command_id, env, payload);
      
      case 'agent_assigned':
        return handleAgentAssigned(command_id, env, payload);
      
      default:
        return NextResponse.json(
          { error: `Unknown event_type: ${event_type}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('[webhook] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle new command creation
 * - Verify command exists in correct environment
 * - Notify OpenClaw gateway (if configured)
 * - Return success
 */
async function handleCommandCreated(command_id: string, env: 'dev' | 'prod') {
  try {
    const supabase = getSupabaseClient(env, true);

    // Verify command exists
    const { data: command, error } = await supabase
      .from('command_history')
      .select('*')
      .eq('id', command_id)
      .eq('environment', env)
      .single();

    if (error || !command) {
      return NextResponse.json(
        { error: 'Command not found', command_id, environment: env },
        { status: 404 }
      );
    }

    // Store notification for Zetty to poll
    const { error: notifyError } = await supabase
      .from('command_notifications')
      .insert({
        command_id,
        event_type: 'command_created',
        processed: false,
        metadata: { environment: env },
      });

    if (notifyError) {
      console.error('[webhook] Failed to store notification:', notifyError);
      // Continue - don't fail the webhook
    }

    // Queue command for the background polling service to pick up
    const { error: oracleError } = await supabase
      .from('oracle_commands')
      .upsert(
        {
          command_id,
          raw_input: command.raw_command,
          environment: env,
          user_id: command.user_id,
          status: 'pending',
        },
        { onConflict: 'command_id' }
      );

    if (oracleError) {
      console.error('[webhook] Failed to queue oracle command:', oracleError);
    }

    return NextResponse.json({
      command_id,
      status: 'pending',
      message: 'Command queued',
    });
  } catch (err) {
    console.error('[webhook] handleCommandCreated error:', err);
    return NextResponse.json(
      { error: 'Failed to process command creation' },
      { status: 500 }
    );
  }
}

/**
 * Handle command status update
 */
async function handleCommandUpdated(
  command_id: string,
  env: 'dev' | 'prod',
  payload: Partial<CommandDetails>
) {
  try {
    const supabase = getSupabaseClient(env, true);

    const { status, result_summary, user_visible_response } = payload;

    const { error } = await supabase
      .from('command_history')
      .update({
        status,
        result_summary,
        user_visible_response,
        updated_at: new Date().toISOString(),
      })
      .eq('id', command_id)
      .eq('environment', env);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update command', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      command_id,
      environment: env,
      event: 'command_updated',
    });
  } catch (err) {
    console.error('[webhook] handleCommandUpdated error:', err);
    return NextResponse.json(
      { error: 'Failed to update command' },
      { status: 500 }
    );
  }
}

/**
 * Handle command completion
 */
async function handleCommandCompleted(
  command_id: string,
  env: 'dev' | 'prod',
  payload: Partial<CommandDetails>
) {
  try {
    const supabase = getSupabaseClient(env, true);

    const { 
      result_summary,
      result_data,
      user_visible_response,
      output_artifacts,
      routed_to_agent,
      token_usage_input,
      token_usage_output,
      estimated_cost,
      duration_ms 
    } = payload;

    const { error } = await supabase
      .from('command_history')
      .update({
        status: 'completed',
        result_summary,
        result_data,
        user_visible_response,
        output_artifacts,
        routed_to_agent,
        token_usage_input,
        token_usage_output,
        estimated_cost,
        duration_ms,
        completed_at: new Date().toISOString(),
      })
      .eq('id', command_id)
      .eq('environment', env);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to complete command', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      command_id,
      environment: env,
      event: 'command_completed',
    });
  } catch (err) {
    console.error('[webhook] handleCommandCompleted error:', err);
    return NextResponse.json(
      { error: 'Failed to complete command' },
      { status: 500 }
    );
  }
}

/**
 * Handle command failure
 */
async function handleCommandFailed(
  command_id: string,
  env: 'dev' | 'prod',
  payload: { error_message: string; error_code?: string }
) {
  try {
    const supabase = getSupabaseClient(env, true);

    const { error_message, error_code } = payload;

    const { error } = await supabase
      .from('command_history')
      .update({
        status: 'failed',
        error_message,
        error_code,
        completed_at: new Date().toISOString(),
      })
      .eq('id', command_id)
      .eq('environment', env);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to record failure', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      command_id,
      environment: env,
      event: 'command_failed',
    });
  } catch (err) {
    console.error('[webhook] handleCommandFailed error:', err);
    return NextResponse.json(
      { error: 'Failed to record failure' },
      { status: 500 }
    );
  }
}

/**
 * Handle agent assignment
 */
async function handleAgentAssigned(
  command_id: string,
  env: 'dev' | 'prod',
  payload: { agent_id: string; agent_role?: string; confidence?: number }
) {
  try {
    const supabase = getSupabaseClient(env, true);

    const { agent_id, agent_role, confidence } = payload;

    const { error } = await supabase
      .from('command_history')
      .update({
        status: 'executing',
        routed_to_agent: agent_id,
        routed_to_agent_role: agent_role,
        intent_confidence: confidence,
      })
      .eq('id', command_id)
      .eq('environment', env);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to assign agent', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      command_id,
      environment: env,
      event: 'agent_assigned',
      agent_id,
    });
  } catch (err) {
    console.error('[webhook] handleAgentAssigned error:', err);
    return NextResponse.json(
      { error: 'Failed to assign agent' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/oracle/webhook
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const env = (url.searchParams.get('environment') as 'dev' | 'prod') || 'dev';
  
  // Test connection to specified environment
  try {
    const supabase = getSupabaseClient(env, true);
    const { data, error } = await supabase.from('command_history').select('count').limit(1);
    
    if (error) throw error;
    
    return NextResponse.json({
      status: 'ok',
      service: 'orchestrator-webhook',
      version: '1.0.0',
      environment: env,
      db_connection: 'healthy',
      features: [
        'command_created',
        'command_updated',
        'command_completed',
        'command_failed',
        'agent_assigned'
      ]
    });
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      service: 'orchestrator-webhook',
      environment: env,
      db_connection: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
