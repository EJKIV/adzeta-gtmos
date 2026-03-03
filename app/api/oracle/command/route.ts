import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient, getEnvironmentFromBody } from '@/lib/supabase/environment';
import { authenticate } from '@/lib/api-auth';

// Validation schema
const commandSchema = z.object({
  raw_command: z.string().min(1, 'Command is required'),
  environment: z.enum(['dev', 'prod']).default('dev'),
  context: z.object({
    current_page: z.string().optional(),
    selected_prospects: z.array(z.string()).optional(),
    active_campaign: z.string().optional(),
    environment: z.enum(['dev', 'prod']).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const result = commandSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.issues },
        { status: 400 }
      );
    }

    const { raw_command, environment, context } = result.data;

    // Determine environment (from body or context)
    const env = getEnvironmentFromBody(body);

    // Get appropriate Supabase client (service role for DB writes)
    const supabase = getSupabaseClient(env, true);

    const userId = auth.userId!;

    // Generate session key
    const sessionKey = `agent:adzeta-gtm:${crypto.randomUUID()}`;

    // Insert into command_history
    const { data: command, error: insertError } = await supabase
      .from('command_history')
      .insert({
        user_id: userId,
        session_key: sessionKey,
        raw_command,
        source: 'webchat',
        status: 'pending',
        environment: env,
        routing_decision_data: {
          ...context,
          environment: env,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('[oracle/command] Insert failed:', insertError);
      return NextResponse.json(
        { error: 'Failed to create command', details: insertError.message },
        { status: 500 }
      );
    }

    // Insert into oracle_commands (polling table for the standalone runner)
    const { error: oracleInsertError } = await supabase
      .from('oracle_commands')
      .insert({
        command_id: command.id,
        raw_input: raw_command,
        environment: env,
        user_id: userId,
        status: 'pending',
      });

    if (oracleInsertError) {
      console.error('[oracle/command] oracle_commands insert failed:', oracleInsertError);
      // Non-fatal — command_history row still exists
    }

    // Notify orchestrator via webhook (fire-and-forget, handles notification storage)
    try {
      await fetch(`${request.nextUrl.origin}/api/oracle/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_id: command.id,
          event_type: 'command_created',
          environment: env,
          source: 'command_route'
        }),
        signal: AbortSignal.timeout(5000)
      });
    } catch (webhookErr) {
      console.warn('[oracle/command] Webhook notification failed:', webhookErr);
    }

    return NextResponse.json({
      command_id: command.id,
      status: 'pending',
    }, { status: 201 });

  } catch (err) {
    console.error('[oracle/command] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get environment from query param or header
    const url = new URL(request.url);
    const env = (url.searchParams.get('environment') as 'dev' | 'prod') || 'dev';

    const supabase = getSupabaseClient(env, true);

    // Get recent commands
    const { data: commands, error } = await supabase
      .from('command_history')
      .select('*')
      .eq('user_id', auth.userId!)
      .eq('environment', env)
      .order('received_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch commands' },
        { status: 500 }
      );
    }

    return NextResponse.json({ commands, environment: env });

  } catch (err) {
    console.error('[oracle/command] GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
