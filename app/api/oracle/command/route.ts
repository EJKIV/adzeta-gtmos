import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient, getEnvironmentFromBody } from '@/lib/supabase/environment';
import { authenticate } from '@/lib/api-auth';
import { classifyQuery, shouldRequireApproval, getSuggestedAction } from '@/lib/query-classifier';

// Validation schema - task_type is now automatically determined, not user-selected
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

    // ================================
    // AUTO-CLASSIFY THE QUERY
    // ================================
    const classification = classifyQuery(raw_command);
    console.log('[oracle/command] Query classified:', {
      task_type: classification.task_type,
      risk_level: classification.risk_level,
      confidence: classification.confidence,
    });

    // Check autonomy gate for this task type
    const { data: gate, error: gateError } = await supabase
      .from('adzeta_autonomy_gates')
      .select('*')
      .eq('task_type', classification.task_type)
      .single();

    if (gateError) {
      console.warn('[oracle/command] Could not fetch gate:', gateError.message);
    }

    // Determine if approval is required
    const requiresApproval = shouldRequireApproval(classification, gate);

    // Generate session key
    const sessionKey = `agent:adzeta-gtm:${crypto.randomUUID()}`;

    // ================================
    // Insert into command_history
    // ================================
    const { data: command, error: insertError } = await supabase
      .from('command_history')
      .insert({
        user_id: userId,
        session_key: sessionKey,
        raw_command,
        source: 'webchat',
        status: requiresApproval ? 'pending_review' : 'pending',
        environment: env,
        task_type: classification.task_type,
        risk_level: classification.risk_level,
        confidence_score: classification.confidence,
        routing_decision_data: {
          ...context,
          environment: env,
          classification,
          requires_approval: requiresApproval,
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

    // ================================
    // Create work queue entry if approval required
    // ================================
    let workQueueTask = null;
    if (requiresApproval) {
      let approvalState = 'pending_review';

      // Check if gate allows auto-execution
      if (
        gate &&
        (gate.current_status === 'unlocked' || gate.manually_unlocked) &&
        !gate.manually_locked &&
        classification.confidence >= (gate.min_confidence ?? 0.7)
      ) {
        approvalState = 'auto_executed';
      }

      const { data: task, error: taskError } = await supabase
        .from('adzeta_work_queue')
        .insert({
          task_type: classification.task_type,
          title: classification.suggested_title,
          description: `Automatically classified task: ${classification.reasoning}`,
          raw_request: raw_command,
          confidence_score: classification.confidence,
          risk_level: classification.risk_level,
          approval_state: approvalState,
          suggested_action: getSuggestedAction(classification),
          suggested_action_payload: {
            command_id: command.id,
            classification,
          },
          rationale: classification.reasoning,
          risk_assessment: { level: classification.risk_level, indicators: [] },
          oracle_command_id: command.id,
          priority: classification.risk_level === 'critical' ? 10 : classification.risk_level === 'high' ? 7 : 5,
          user_id: userId,
        })
        .select()
        .single();

      if (taskError) {
        console.error('[oracle/command] Work queue insert failed:', taskError);
      } else {
        workQueueTask = task;
        console.log('[oracle/command] Created work queue task:', task.task_id);
      }
    }

    // ================================
    // Insert into oracle_commands (polling table)
    // ================================
    const { error: oracleInsertError } = await supabase
      .from('oracle_commands')
      .insert({
        command_id: command.id,
        raw_input: raw_command,
        environment: env,
        user_id: userId,
        status: requiresApproval ? 'pending' : 'ready',
        task_type: classification.task_type,
        confidence_score: classification.confidence,
      });

    if (oracleInsertError) {
      console.error('[oracle/command] oracle_commands insert failed:', oracleInsertError);
    }

    // ================================
    // Notify orchestrator via webhook
    // ================================
    try {
      await fetch(`${request.nextUrl.origin}/api/oracle/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_id: command.id,
          event_type: 'command_created',
          environment: env,
          source: 'command_route',
          task_type: classification.task_type,
          requires_approval: requiresApproval,
          work_queue_task_id: workQueueTask?.task_id,
        }),
        signal: AbortSignal.timeout(5000)
      });
    } catch (webhookErr) {
      console.warn('[oracle/command] Webhook notification failed:', webhookErr);
    }

    return NextResponse.json({
      command_id: command.id,
      status: requiresApproval ? 'pending_review' : 'processing',
      classification: {
        task_type: classification.task_type,
        risk_level: classification.risk_level,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
      },
      requires_approval: requiresApproval,
      work_queue_task_id: workQueueTask?.task_id ?? null,
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
