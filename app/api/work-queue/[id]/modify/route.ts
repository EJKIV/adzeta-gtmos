import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getSupabaseClient, detectEnvironment } from '@/lib/supabase/environment';

/**
 * POST /api/work-queue/:id/modify
 * Mark a task for modification/modal opening
 * This is primarily for tracking - actual modifications happen through other flows
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);

  try {
    const body = await req.json().catch(() => ({}));

    // Get current item to verify it exists
    const { data: currentItem, error: fetchError } = await supabase
      .from('work_queue')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentItem) {
      return NextResponse.json(
        { error: 'Task not found', status: 'error', taskId: id },
        { status: 404 }
      );
    }

    // Update the task metadata to track modification intent
    const updates = {
      metadata: {
        ...currentItem.metadata,
        approval_status: 'pending_modification',
        modify_requested_at: new Date().toISOString(),
        modify_requested_by: auth.userId,
        modification_notes: body.notes || null,
        ...body.metadata,
      },
    };

    const { data, error } = await supabase
      .from('work_queue')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to modify task:', error);
      return NextResponse.json(
        { error: error.message, status: 'error', taskId: id },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'modified',
      taskId: id,
      item: data,
    });

  } catch (err) {
    console.error('Error in modify endpoint:', err);
    return NextResponse.json(
      { error: 'Internal server error', status: 'error', taskId: id },
      { status: 500 }
    );
  }
}
