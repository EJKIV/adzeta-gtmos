import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase/environment';
import { authenticate } from '@/lib/api-auth';
import { generateClarificationQuestions, applyAnswers } from '@/lib/clarification/engine';

const clarifySchema = z.object({
  command_id: z.string(),
  intent: z.record(z.unknown()),
  answers: z.record(z.unknown()).optional(), // User's answers to previous questions
  depth: z.number().default(0), // How many clarification rounds so far
  mode: z.enum(['initial', 'follow_up', 'confirm']).default('initial'),
});

/**
 * POST /api/oracle/clarify
 * 
 * Dynamic clarification endpoint - returns questions or action buttons
 * NOT a form. Probes iteratively until confident.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = clarifySchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.issues },
        { status: 400 }
      );
    }

    const { command_id, intent, answers, depth, mode } = result.data;
    const userId = auth.userId!;
    const supabase = getSupabaseClient('dev', true);

    // Apply any answers to intent (for follow-up mode)
    let currentIntent = { ...intent };
    if (answers && Object.keys(answers).length > 0) {
      currentIntent = applyAnswers(currentIntent, answers);
    }

    // Generate questions based on current intent state
    const clarificationResult = await generateClarificationQuestions({
      intent: currentIntent,
      depth,
      mode,
      userId,
      supabase,
    });

    // Store clarification state
    await supabase
      .from('clarification_sessions')
      .upsert({
        command_id,
        user_id: userId,
        intent: currentIntent,
        questions_asked: depth + 1,
        confidence: clarificationResult.confidence,
        ready_to_proceed: clarificationResult.ready,
        updated_at: new Date().toISOString(),
      });

    return NextResponse.json({
      command_id,
      confidence: clarificationResult.confidence,
      ready: clarificationResult.ready,
      
      // What to show user:
      message: clarificationResult.message,
      
      // Dynamic action buttons/questions (NOT a form)
      actions: clarificationResult.actions,
      
      // If ready, what happens next
      next_step: clarificationResult.nextStep,
      
      // Current state
      intent: currentIntent,
      depth: depth + 1,
    });

  } catch (err) {
    console.error('[clarify] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/oracle/clarify/[command_id]
 * 
 * Get current clarification state for a command
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { command_id: string } }
) {
  try {
    const auth = await authenticate(request);
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { command_id } = params;
    const userId = auth.userId!;
    const supabase = getSupabaseClient('dev', true);

    const { data: session } = await supabase
      .from('clarification_sessions')
      .select('*')
      .eq('command_id', command_id)
      .eq('user_id', userId)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(session);

  } catch (err) {
    console.error('[clarify] GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
