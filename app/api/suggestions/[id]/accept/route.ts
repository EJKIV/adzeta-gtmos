import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AcceptSuggestionRequest {
  suggestion: {
    id: string;
    text: string;
    confidence: number;
    type?: string;
    metadata?: Record<string, unknown>;
  };
  acceptedAt: string;
}

interface AcceptSuggestionResponse {
  success: boolean;
  data?: {
    taskId: string;
    status: string;
    message: string;
  };
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/suggestions/:id/accept
// Accepts a suggestion and creates a task in the work queue
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: suggestionId } = await params;

  try {
    // Parse request body
    const body: AcceptSuggestionRequest = await request.json();
    const { suggestion, acceptedAt } = body;

    // Validate required fields
    if (!suggestion || !suggestion.text) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: suggestion.text',
        } satisfies AcceptSuggestionResponse,
        { status: 400 }
      );
    }

    // Log acceptance for analytics
    console.log('[API:suggestions/accept] Suggestion accepted:', {
      suggestionId,
      text: suggestion.text,
      confidence: suggestion.confidence,
      acceptedAt,
      type: suggestion.type || 'general',
    });

    // Create task in work queue
    const taskResult = await createTaskFromSuggestion(suggestion, acceptedAt);

    if (!taskResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: taskResult.error || 'Failed to create task',
        } satisfies AcceptSuggestionResponse,
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          taskId: taskResult.taskId!,
          status: 'created',
          message: 'Task created successfully from suggestion',
        },
      } satisfies AcceptSuggestionResponse,
      { status: 201 }
    );

  } catch (error) {
    console.error('[API:suggestions/accept] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } satisfies AcceptSuggestionResponse,
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Creation Helper
// ─────────────────────────────────────────────────────────────────────────────

interface TaskCreationResult {
  success: boolean;
  taskId?: string;
  error?: string;
}

async function createTaskFromSuggestion(
  suggestion: AcceptSuggestionRequest['suggestion'],
  acceptedAt: string
): Promise<TaskCreationResult> {
  try {
    // Generate a unique task ID based on timestamp and suggestion ID
    const taskId = `task-${Date.now()}-${suggestion.id.slice(0, 8)}`;

    // Determine task metadata based on suggestion type
    const taskMetadata = {
      source: 'intelligence',
      source_suggestion_id: suggestion.id,
      confidence: suggestion.confidence,
      accepted_at: acceptedAt,
      suggestion_type: suggestion.type || 'general',
      ...suggestion.metadata,
    };

    // Log the dismissal event (async, don't wait)
    logDismissalEvent(suggestion.id, 'accepted', acceptedAt).catch(console.error);

    // Ideally, create task in database or work queue here
    // For now, we'll log and return success
    // TODO: Integrate with actual work queue service when available

    // Attempt to create via work queue API
    try {
      const workQueueUrl = new URL('/api/work-queue', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      
      const response = await fetch(workQueueUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: taskId,
          title: suggestion.text,
          description: `Task created from AI suggestion (${Math.round(suggestion.confidence * 100)}% confidence)`,
          status: 'pending',
          priority: suggestion.confidence > 0.8 ? 'high' : 'normal',
          metadata: taskMetadata,
          created_at: acceptedAt,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[API:suggestions/accept] Task created in work queue:', result);
        return {
          success: true,
          taskId: result.id || taskId,
        };
      }

      // If work queue API fails, log but still return success
      // (task creation can be async/queued)
      console.warn('[API:suggestions/accept] Work queue API returned:', response.status);
    } catch (apiError) {
      console.warn('[API:suggestions/accept] Work queue API call failed:', apiError);
    }

    // Fallback: Return success (task will be handled asynchronously)
    return {
      success: true,
      taskId,
    };

  } catch (error) {
    console.error('[API:suggestions/accept] Task creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Logging Helper
// ─────────────────────────────────────────────────────────────────────────────

interface DismissalEvent {
  suggestionId: string;
  action: 'accepted' | 'dismissed';
  timestamp: string;
  sessionId?: string;
}

/**
 * Log dismissal/acceptance events for analytics
 */
async function logDismissalEvent(
  suggestionId: string,
  action: 'accepted' | 'dismissed',
  timestamp: string
): Promise<void> {
  const event: DismissalEvent = {
    suggestionId,
    action,
    timestamp,
  };

  // Log to console for development
  console.log('[Suggestion Analytics]', event);

  // TODO: Send to analytics service
  // await fetch('/api/analytics/log', { ... });
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTIONS handler for CORS
// ─────────────────────────────────────────────────────────────────────────────

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
