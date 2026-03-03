import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// Task Feedback Types
// ─────────────────────────────────────────────────────────────────────────────

interface TaskFeedbackBody {
  taskId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  workedWell?: string;
  improvement?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface TaskFeedbackRecord {
  id?: string;
  task_id: string;
  rating: number;
  worked_well?: string;
  improvement?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

function validateTaskFeedback(body: unknown): body is TaskFeedbackBody {
  const b = body as Record<string, unknown>;
  
  if (!b || typeof b !== 'object') return false;
  if (typeof b.taskId !== 'string') return false;
  if (typeof b.rating !== 'number' || b.rating < 1 || b.rating > 5) return false;
  if (typeof b.timestamp !== 'string') return false;
  
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Client
// ─────────────────────────────────────────────────────────────────────────────

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Feedback Handler
// ─────────────────────────────────────────────────────────────────────────────

async function handleTaskFeedback(body: TaskFeedbackBody): Promise<NextResponse> {
  const supabase = getSupabaseClient();
  
  const record: TaskFeedbackRecord = {
    task_id: body.taskId,
    rating: body.rating,
    worked_well: body.workedWell,
    improvement: body.improvement,
    timestamp: body.timestamp,
    metadata: body.metadata || {},
  };

  const { data, error } = await supabase
    .from('task_feedback')
    .insert(record)
    .select('id')
    .single();

  if (error) {
    console.error('Task feedback insert error:', error);
    return NextResponse.json(
      { error: 'Failed to store feedback', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, feedbackId: data.id },
    { status: 201 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy Feedback Handler
// ─────────────────────────────────────────────────────────────────────────────

async function handleLegacyFeedback(body: Record<string, unknown>): Promise<NextResponse> {
  const supabase = getSupabaseClient();
  
  const { user_id, signal_type, card_type, section, duration_ms, metadata, context } = body;

  if (!user_id || !signal_type) {
    return NextResponse.json(
      { error: 'Missing required fields: user_id, signal_type' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('feedback_signals')
    .insert({
      user_id,
      signal_type,
      card_type,
      section,
      duration_ms,
      metadata: metadata || {},
      context: context || {},
      timestamp: new Date().toISOString(),
      processed: false
    })
    .select()
    .single();

  if (error) {
    console.error('Feedback insert error:', error);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Check env vars
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Missing database configuration' },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Route to appropriate handler based on body structure
    if (validateTaskFeedback(body)) {
      return await handleTaskFeedback(body);
    }

    // Fallback to legacy feedback handler
    return await handleLegacyFeedback(body);

  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
