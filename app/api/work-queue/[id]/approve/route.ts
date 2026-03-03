import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getSupabaseClient, detectEnvironment } from '@/lib/supabase/environment';

/**
 * POST /api/work-queue/:id/approve
 * Approve a pending task for execution
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

    // Get current item to verify it exists and is pending
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

    // Only allow approving from specific statuses
    if (!['pending', 'blocked', 'ready'].includes(currentItem.status)) {
      return NextResponse.json(
        { 
          error: `Cannot approve task with status: ${currentItem.status}`, 
          status: 'error', 
          taskId: id 
        },
        { status: 400 }
      );
    }

    // Update the task
    const updates = {
      status: 'ready',
      blocked_reason: null,
      metadata: {
        ...currentItem.metadata,
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: auth.userId,
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
      console.error('Failed to approve task:', error);
      return NextResponse.json(
        { error: error.message, status: 'error', taskId: id },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'approved',
      taskId: id,
      item: data,
    });

  } catch (err) {
    console.error('Error in approve endpoint:', err);
    return NextResponse.json(
      { error: 'Internal server error', status: 'error', taskId: id },
      { status: 500 }
    );
  }
}
