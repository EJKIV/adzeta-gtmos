/**
 * POST /api/progress/report
 * 
 * Subagents report their progress here.
 * Payload: { taskId, runId, stepNumber, totalSteps, percentComplete, message, agentLabel }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { reportProgress } from '@/lib/progress/reporter';

// Validation schema for progress reports
const ProgressReportSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  runId: z.string().min(1, 'Run ID is required'),
  stepNumber: z.number().int().min(0, 'Step number must be non-negative'),
  totalSteps: z.number().int().min(1, 'Total steps must be at least 1'),
  percentComplete: z.number().min(0).max(100),
  message: z.string().max(500, 'Message must be under 500 characters'),
  agentLabel: z.string().min(1, 'Agent label is required'),
  status: z.enum(['waiting', 'running', 'completed', 'failed', 'cancelled']).optional(),
  subtaskId: z.string().optional(),
  parentTaskId: z.string().optional(),
  weight: z.number().optional(),
  timestamp: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request body
    const result = ProgressReportSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Invalid progress report',
          details: result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const report = result.data;
    const timestamp = report.timestamp || new Date().toISOString();

    // Store the progress report
    const record = await reportProgress({
      ...report,
      timestamp,
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Failed to store progress report' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      taskId: record.taskId,
      runId: record.runId,
      percentComplete: record.percentComplete,
      status: record.status,
      updatedAt: record.updatedAt,
    });

  } catch (error) {
    console.error('[ProgressReport] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process progress report',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET is not supported - use /api/progress/stream/:taskId for real-time updates
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      hint: 'Use GET /api/progress/stream/:taskId for real-time updates'
    },
    { status: 405 }
  );
}
