/**
 * Progress Aggregator
 * 
 * Aggregates child task progress into parent percentage
 * - Weighted by estimated effort
 * - Handles parallel execution (multiple subagents)
 * - Supports nested subtask hierarchies
 */

import type { SubTask, ProgressRecord, AggregationResult, AggregationConfig } from './types';
import { DEFAULT_TASK_WEIGHTS } from './types';

/** Default aggregation configuration */
const DEFAULT_CONFIG: AggregationConfig = {
  enableWeighting: true,
  defaultWeight: 1.0,
  parallelAggregationMode: 'average',
};

/**
 * Aggregate subtasks into parent progress
 * 
 * @param subtasks - Array of subtask progress records
 * @param config - Optional aggregation configuration
 * @returns Aggregation result with combined metrics
 */
export function aggregateProgress(
  subtasks: SubTask[],
  config: Partial<AggregationConfig> = {}
): AggregationResult {
  const finalConfig: AggregationConfig = { ...DEFAULT_CONFIG, ...config };

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

  // Calculate weights
  const tasksWithWeights = subtasks.map(subtask => ({
    ...subtask,
    effectiveWeight: finalConfig.enableWeighting
      ? (subtask.weight || finalConfig.defaultWeight)
      : 1.0,
  }));

  const totalWeight = tasksWithWeights.reduce((sum, s) => sum + s.effectiveWeight, 0);

  // Calculate weighted progress
  const weightedProgress = tasksWithWeights.reduce((sum, s) => {
    const progress = Math.min(100, Math.max(0, s.percentComplete));
    return sum + (progress / 100) * s.effectiveWeight;
  }, 0);

  // Calculate overall percentage
  const percentComplete = totalWeight > 0
    ? Math.round((weightedProgress / totalWeight) * 100)
    : 0;

  // Calculate step statistics
  const currentStep = tasksWithWeights.reduce((sum, s) => sum + s.stepNumber, 0);
  const totalSteps = tasksWithWeights.reduce((sum, s) => sum + s.totalSteps, 0);

  // Count task states
  const activeSubtasks = tasksWithWeights.filter(s => s.status === 'running').length;
  const completedSubtasks = tasksWithWeights.filter(s => 
    s.status === 'completed' || s.percentComplete === 100
  ).length;
  const failedSubtasks = tasksWithWeights.filter(s => s.status === 'failed').length;

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
 * Merge multiple parent progress records
 * Useful when a task has multiple parallel parent streams
 * 
 * @param records - Array of progress records to merge
 * @returns Merged aggregation result
 */
export function mergeParallelProgress(records: ProgressRecord[]): AggregationResult {
  if (records.length === 0) {
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

  if (records.length === 1) {
    return aggregateProgress(records[0].subtasks);
  }

  // Treat each record as a "subtask" equivalent
  const virtualSubtasks: SubTask[] = records.map(r => ({
    id: r.taskId,
    taskId: r.taskId,
    label: r.message || r.agentLabel || 'Unknown',
    status: r.status,
    stepNumber: r.currentStep,
    totalSteps: r.totalSteps,
    percentComplete: r.percentComplete,
    weight: DEFAULT_TASK_WEIGHTS[r.agentLabel] || 1.0,
    message: r.message,
    agentLabel: r.agentLabel,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
  }));

  return aggregateProgress(virtualSubtasks);
}

/**
 * Calculate weighted progress for a single task
 * 
 * @param currentStep - Current step number
 * @param totalSteps - Total steps
 * @param completedSubtasks - Number of completed subtasks
 * @param totalSubtasks - Total number of subtasks
 * @param weight - Weight for this task (default 1.0)
 * @returns Weighted progress percentage
 */
export function calculateWeightedProgress(
  currentStep: number,
  totalSteps: number,
  completedSubtasks: number = 0,
  totalSubtasks: number = 0,
  weight: number = 1.0
): number {
  // Base progress from steps
  let baseProgress = 0;
  if (totalSteps > 0) {
    baseProgress = (currentStep / totalSteps) * 100;
  }

  // Adjust based on subtask completion
  if (totalSubtasks > 0) {
    const subtaskProgress = (completedSubtasks / totalSubtasks) * 100;
    // Average between step progress and subtask progress
    baseProgress = (baseProgress + subtaskProgress) / 2;
  }

  // Apply weight (doesn't change final % but affects aggregation)
  return Math.min(100, Math.max(0, baseProgress));
}

/**
 * Detect slow subtasks that might need attention
 * 
 * @param subtasks - Array of subtasks to analyze
 * @param thresholdPercent - Progress threshold to consider "slow" (default 10%)
 * @returns Array of slow subtask IDs
 */
export function detectSlowSubtasks(
  subtasks: SubTask[],
  thresholdPercent: number = 10
): { id: string; label: string; duration: number }[] {
  const now = Date.now();
  const slow: { id: string; label: string; duration: number }[] = [];

  for (const subtask of subtasks) {
    if (!subtask.startedAt) continue;
    
    const startedAt = new Date(subtask.startedAt).getTime();
    const duration = now - startedAt;
    const durationMinutes = duration / 60000;

    // Consider slow if running for > threshold % of expected time
    // and not making progress
    if (subtask.status === 'running' && 
        subtask.percentComplete < thresholdPercent &&
        durationMinutes > 1) {
      slow.push({
        id: subtask.id,
        label: subtask.label,
        duration,
      });
    }
  }

  return slow;
}

/**
 * Calculate overall task health score
 * 
 * @param subtasks - Array of subtasks
 * @returns Health score 0-100 (higher is better)
 */
export function calculateHealthScore(subtasks: SubTask[]): number {
  if (subtasks.length === 0) return 100;

  const totalTasks = subtasks.length;
  const completed = subtasks.filter(s => s.status === 'completed').length;
  const failed = subtasks.filter(s => s.status === 'failed').length;
  const running = subtasks.filter(s => s.status === 'running').length;

  // Health calculation:
  // - Completed tasks: +1 each
  // - Running tasks: +0.5 each
  // - Failed tasks: -0.5 each
  // - Waiting tasks: +0.25 each
  const score = (
    (completed * 1.0) +
    (running * 0.5) +
    (failed * -0.5) +
    ((totalTasks - completed - running - failed) * 0.25)
  ) / totalTasks;

  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

/**
 * Get task summary statistics
 * 
 * @param subtasks - Array of subtasks
 * @returns Summary statistics object
 */
export function getTaskSummary(subtasks: SubTask[]): {
  total: number;
  completed: number;
  running: number;
  failed: number;
  waiting: number;
  averageProgress: number;
} {
  if (subtasks.length === 0) {
    return {
      total: 0,
      completed: 0,
      running: 0,
      failed: 0,
      waiting: 0,
      averageProgress: 0,
    };
  }

  const completed = subtasks.filter(s => s.status === 'completed').length;
  const running = subtasks.filter(s => s.status === 'running').length;
  const failed = subtasks.filter(s => s.status === 'failed').length;
  const waiting = subtasks.filter(s => s.status === 'waiting').length;
  const averageProgress = subtasks.reduce((sum, s) => sum + s.percentComplete, 0) / subtasks.length;

  return {
    total: subtasks.length,
    completed,
    running,
    failed,
    waiting,
    averageProgress: Math.round(averageProgress),
  };
}

/**
 * Format progress for display
 * 
 * @param percent - Progress percentage
 * @returns Formatted string
 */
export function formatProgress(percent: number): string {
  if (percent === 100) return 'Complete';
  if (percent >= 99) return '99%';
  return `${Math.floor(percent)}%`;
}

/**
 * Format time duration for display
 * 
 * @param durationMs - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  
  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remSeconds = seconds % 60;
    return remSeconds > 0 ? `${minutes}m ${remSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
}
