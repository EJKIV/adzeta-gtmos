/**
 * GET /api/progress/status/[taskId]
 * 
 * Get the current progress status for a task.
 * Returns JSON with progress details and subtasks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProgress, estimateTimeRemaining } from '@/lib/progress/reporter';
import { calculateHealthScore, getTaskSummary } from '@/lib/progress/aggregator';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const record = getProgress(taskId);

    if (!record) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Calculate derived metrics
    const healthScore = calculateHealthScore(record.subtasks);
    const summary = getTaskSummary(record.subtasks);
    const estimatedTimeRemaining = estimateTimeRemaining(taskId, record.agentLabel);

    return NextResponse.json({
      taskId: record.taskId,
      percentComplete: record.percentComplete,
      currentStep: record.currentStep,
      totalSteps: record.totalSteps,
      status: record.status,
      message: record.message,
      subtasks: record.subtasks,
      updatedAt: record.updatedAt,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      errorMessage: record.errorMessage,
      agentLabel: record.agentLabel,
      estimatedTimeRemaining,
      healthScore,
      summary,
    });

  } catch (error) {
    console.error('[ProgressStatus] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get progress status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
