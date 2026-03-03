/**
 * Progress Reporter (Backend)
 * 
 * Handles subagent progress reporting via POST /api/progress/report
 * Stores to Supabase with 1h TTL and manages SSE streams
 */

import { getSupabaseClient } from '@/lib/supabase-client';
import type {
  ProgressReport,
  ProgressRecord,
  SubTask,
  TaskStatus,
  CacheEntry,
  AggregationResult,
} from './types';
import { DEFAULT_TASK_WEIGHTS } from './types';

// In-memory cache for active tasks (Redis-like behavior)
const taskCache = new Map<string, CacheEntry>();

// Default TTL for completed/failed tasks before cleanup (1 hour)
const TASK_TTL_MS = 60 * 60 * 1000;

// Stale threshold (2 minutes)
const STALE_THRESHOLD_MS = 2 * 60 * 1000;

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

/**
 * Initialize a new progress record
 */
export async function initializeProgress(
  taskId: string,
  runId: string,
  totalSteps: number,
  agentLabel: string,
  parentTaskId?: string
): Promise<ProgressRecord> {
  const now = new Date().toISOString();
  const record: ProgressRecord = {
    taskId,
    runId,
    status: 'waiting',
    currentStep: 0,
    totalSteps,
    percentComplete: 0,
    message: 'Task initialized',
    agentLabel,
    subtasks: [],
    startedAt: now,
    updatedAt: now,
  };

  // Store in Supabase
  const supabase = getSupabaseClient?.();
  if (supabase) {
    const { error } = await supabase.from('task_progress').upsert({
      task_id: taskId,
      run_id: runId,
      status: 'waiting',
      current_step: 0,
      total_steps: totalSteps,
      percent_complete: 0,
      message: 'Task initialized',
      agent_label: agentLabel,
      subtasks: [],
      parent_task_id: parentTaskId || null,
      started_at: now,
      updated_at: now,
      expires_at: new Date(Date.now() + TASK_TTL_MS).toISOString(),
    });

    if (error) {
      console.warn('[ProgressReporter] Failed to store initial progress:', error.message);
    }
  }

  // Set up cache entry
  const entry: CacheEntry = {
    record,
    subscribers: new Set(),
  };
  taskCache.set(taskId, entry);

  // Schedule cleanup
  scheduleCleanup(taskId);

  return record;
}

/**
 * Report progress update from a subagent
 */
export async function reportProgress(
  report: ProgressReport
): Promise<ProgressRecord | null> {
  const { taskId, runId } = report;

  // Get existing record
  const existing = taskCache.get(taskId);
  const now = new Date().toISOString();

  // Build updated record
  const record: ProgressRecord = {
    ...existing?.record,
    taskId,
    runId,
    status: report.status || 'running',
    currentStep: report.stepNumber,
    totalSteps: report.totalSteps,
    percentComplete: Math.min(100, Math.max(0, report.percentComplete)),
    message: report.message,
    agentLabel: report.agentLabel,
    subtasks: existing?.record.subtasks || [],
    startedAt: existing?.record.startedAt || now,
    updatedAt: now,
  };

  // Handle subtask if provided
  if (report.subtaskId) {
    const subtaskIndex = record.subtasks.findIndex(s => s.id === report.subtaskId);
    const subtask: SubTask = {
      id: report.subtaskId,
      taskId,
      label: report.message,
      status: report.status || 'running',
      stepNumber: report.stepNumber,
      totalSteps: report.totalSteps,
      percentComplete: report.percentComplete,
      weight: report.weight || DEFAULT_TASK_WEIGHTS.default,
      message: report.message,
      agentLabel: report.agentLabel,
      startedAt: subtaskIndex >= 0 ? record.subtasks[subtaskIndex].startedAt : now,
      completedAt: report.status === 'completed' || report.percentComplete === 100 ? now : undefined,
    };

    if (subtaskIndex >= 0) {
      record.subtasks[subtaskIndex] = subtask;
    } else {
      record.subtasks.push(subtask);
    }

    // Recalculate parent progress based on subtasks
    const aggregation = aggregateSubtasks(record.subtasks);
    record.percentComplete = aggregation.percentComplete;
    record.currentStep = aggregation.currentStep;
    record.totalSteps = aggregation.totalSteps;
  }

  // Update cache
  const entry = taskCache.get(taskId);
  if (entry) {
    entry.record = record;
    // Broadcast to SSE subscribers
    broadcastProgress(taskId, record);
  } else {
    taskCache.set(taskId, {
      record,
      subscribers: new Set(),
    });
    scheduleCleanup(taskId);
  }

  // Persist to Supabase
  const supabase = getSupabaseClient?.();
  if (supabase) {
    const { error } = await supabase.from('task_progress').upsert({
      task_id: taskId,
      run_id: runId,
      status: record.status,
      current_step: record.currentStep,
      total_steps: record.totalSteps,
      percent_complete: record.percentComplete,
      message: record.message,
      agent_label: record.agentLabel,
      subtasks: JSON.parse(JSON.stringify(record.subtasks)),
      updated_at: now,
      completed_at: record.status === 'completed' ? now : record.completedAt,
      error_message: record.errorMessage,
      expires_at: new Date(Date.now() + TASK_TTL_MS).toISOString(),
    });

    if (error) {
      console.warn('[ProgressReporter] Failed to store progress:', error.message);
    }
  }

  return record;
}

/**
 * Mark a task as completed
 */
export async function completeTask(
  taskId: string,
  finalMessage?: string
): Promise<ProgressRecord | null> {
  const entry = taskCache.get(taskId);
  if (!entry) return null;

  const now = new Date().toISOString();
  const record: ProgressRecord = {
    ...entry.record,
    status: 'completed',
    percentComplete: 100,
    currentStep: entry.record.totalSteps,
    message: finalMessage || 'Task completed successfully',
    completedAt: now,
    updatedAt: now,
  };

  entry.record = record;
  broadcastProgress(taskId, record);

  // Persist to Supabase
  const supabase = getSupabaseClient?.();
  if (supabase) {
    await supabase.from('task_progress').upsert({
      task_id: taskId,
      status: 'completed',
      percent_complete: 100,
      current_step: entry.record.totalSteps,
      message: finalMessage || 'Task completed successfully',
      updated_at: now,
      completed_at: now,
      expires_at: new Date(Date.now() + TASK_TTL_MS).toISOString(),
    });
  }

  return record;
}

/**
 * Mark a task as failed
 */
export async function failTask(
  taskId: string,
  errorMessage: string
): Promise<ProgressRecord | null> {
  const entry = taskCache.get(taskId);
  if (!entry) return null;

  const now = new Date().toISOString();
  const record: ProgressRecord = {
    ...entry.record,
    status: 'failed',
    message: `Failed: ${errorMessage}`,
    errorMessage,
    updatedAt: now,
  };

  entry.record = record;
  broadcastProgress(taskId, record);

  // Persist to Supabase
  const supabase = getSupabaseClient?.();
  if (supabase) {
    await supabase.from('task_progress').upsert({
      task_id: taskId,
      status: 'failed',
      message: `Failed: ${errorMessage}`,
      error_message: errorMessage,
      updated_at: now,
      expires_at: new Date(Date.now() + TASK_TTL_MS).toISOString(),
    });
  }

  return record;
}

/**
 * Get progress record for a task
 */
export function getProgress(taskId: string): ProgressRecord | null {
  const entry = taskCache.get(taskId);
  return entry?.record || null;
}

/**
 * Get all active tasks
 */
export function getActiveTasks(): ProgressRecord[] {
  const now = Date.now();
  return Array.from(taskCache.values())
    .filter(e => 
      e.record.status === 'running' || 
      e.record.status === 'waiting'
    )
    .map(e => e.record);
}

/**
 * Add SSE subscriber for a task
 */
export function subscribeToTask(
  taskId: string,
  controller: ReadableStreamDefaultController
): () => void {
  let entry = taskCache.get(taskId);
  
  if (!entry) {
    // Create placeholder entry
    entry = {
      record: {
        taskId,
        runId: '',
        status: 'waiting',
        currentStep: 0,
        totalSteps: 0,
        percentComplete: 0,
        message: 'Waiting for task to start...',
        agentLabel: '',
        subtasks: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      subscribers: new Set(),
    };
    taskCache.set(taskId, entry);
  }

  entry.subscribers.add(controller);

  // Send immediate update
  if (entry.record.status !== 'waiting') {
    sendSSE(controller, 'progress', entry.record);
  }

  // Return unsubscribe function
  return () => {
    entry?.subscribers.delete(controller);
  };
}

/**
 * Broadcast progress to all subscribers
 */
function broadcastProgress(taskId: string, record: ProgressRecord): void {
  const entry = taskCache.get(taskId);
  if (!entry) return;

  const eventType = record.status === 'completed' ? 'complete' :
                    record.status === 'failed' ? 'error' :
                    'progress';

  for (const controller of entry.subscribers) {
    try {
      sendSSE(controller, eventType, record);
    } catch (err) {
      console.warn('[ProgressReporter] Failed to send SSE:', err);
      entry.subscribers.delete(controller);
    }
  }
}

/**
 * Send SSE message
 */
function sendSSE(
  controller: ReadableStreamDefaultController,
  event: string,
  data: unknown
): void {
  const encoder = new TextEncoder();
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(message));
}

/**
 * Aggregate subtasks into parent progress
 */
function aggregateSubtasks(subtasks: SubTask[]): AggregationResult {
  if (subtasks.length === 0) {
    return {
      percentComplete: 0,
      currentStep: 0,
      totalSteps: 0,
      weightedProgress: 0,
      activeSubtasks: 0,
      completedSubtasks: 0,
      failedSubtasks: 0,
    };
  }

  const totalWeight = subtasks.reduce((sum, s) => sum + (s.weight || 1), 0);
  const weightedProgress = subtasks.reduce((sum, s) => {
    return sum + (s.percentComplete / 100) * (s.weight || 1);
  }, 0);

  const percentComplete = Math.round((weightedProgress / totalWeight) * 100);
  
  const currentStep = subtasks.reduce((sum, s) => sum + s.stepNumber, 0);
  const totalSteps = subtasks.reduce((sum, s) => sum + s.totalSteps, 0);

  const activeSubtasks = subtasks.filter(s => s.status === 'running').length;
  const completedSubtasks = subtasks.filter(s => s.status === 'completed').length;
  const failedSubtasks = subtasks.filter(s => s.status === 'failed').length;

  return {
    percentComplete,
    currentStep,
    totalSteps,
    weightedProgress,
    activeSubtasks,
    completedSubtasks,
    failedSubtasks,
  };
}

/**
 * Schedule cleanup for a task after TTL
 */
function scheduleCleanup(taskId: string): void {
  setTimeout(() => {
    cleanupTask(taskId);
  }, TASK_TTL_MS);
}

/**
 * Clean up completed/failed task from cache
 */
export function cleanupTask(taskId: string): void {
  const entry = taskCache.get(taskId);
  if (!entry) return;

  // Close all SSE connections
  for (const controller of entry.subscribers) {
    try {
      controller.close();
    } catch {
      // Ignore errors
    }
  }

  taskCache.delete(taskId);
}

/**
 * Clean up stale entries
 */
export function cleanupStale(): void {
  const now = Date.now();
  for (const [taskId, entry] of taskCache.entries()) {
    const updatedAt = new Date(entry.record.updatedAt).getTime();
    const isStale = now - updatedAt > STALE_THRESHOLD_MS;
    const isTerminal = entry.record.status === 'completed' || 
                       entry.record.status === 'failed' ||
                       entry.record.status === 'cancelled';

    if (isTerminal || (isStale && entry.subscribers.size === 0)) {
      cleanupTask(taskId);
    }
  }
}

/**
 * Calculate estimated time remaining based on historical averages
 */
export function estimateTimeRemaining(
  taskId: string,
  taskType?: string
): string | undefined {
  const entry = taskCache.get(taskId);
  if (!entry) return undefined;

  const { record } = entry;
  if (record.percentComplete === 0 || record.percentComplete >= 100) {
    return undefined;
  }

  // Calculate based on elapsed time and progress
  const startedAt = new Date(record.startedAt).getTime();
  const elapsedMs = Date.now() - startedAt;
  const remainingPercent = 100 - record.percentComplete;
  const estimatedTotalMs = (elapsedMs / record.percentComplete) * 100;
  const remainingMs = (estimatedTotalMs * remainingPercent) / 100;

  // Format
  if (remainingMs < 60000) {
    return `${Math.ceil(remainingMs / 1000)}s remaining`;
  } else if (remainingMs < 3600000) {
    return `${Math.ceil(remainingMs / 60000)}m remaining`;
  } else {
    return `${(remainingMs / 3600000).toFixed(1)}h remaining`;
  }
}

// Periodic cleanup
setInterval(cleanupStale, HEARTBEAT_INTERVAL_MS);
