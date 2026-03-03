/**
 * GET /api/progress/stream/[taskId]
 * 
 * Server-Sent Events (SSE) endpoint for real-time progress updates.
 * Clients connect here to receive live progress updates for a specific task.
 */

import { NextRequest } from 'next/server';
import { subscribeToTask, getProgress, cleanupTask } from '@/lib/progress/reporter';
import { estimateTimeRemaining } from '@/lib/progress/reporter';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  if (!taskId) {
    return new Response(
      JSON.stringify({ error: 'Task ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to progress updates for this task
      unsubscribe = subscribeToTask(taskId, controller);

      // Send initial response if task exists
      const currentProgress = getProgress(taskId);
      if (currentProgress) {
        const encoder = new TextEncoder();
        const data = JSON.stringify({
          ...currentProgress,
          estimatedTimeRemaining: estimateTimeRemaining(taskId, currentProgress.agentLabel),
        });
        controller.enqueue(encoder.encode(`event: connected\ndata: ${data}\n\n`));
      }
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
