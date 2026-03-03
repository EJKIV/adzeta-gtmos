/**
 * Progress Visibility System - Library Exports
 */

// Core types
export type {
  TaskStatus,
  SubTask,
  ProgressReport,
  ProgressRecord,
  ProgressEventType,
  ProgressEvent,
  ProgressStatusResponse,
  HeartbeatStatus,
  ProgressIndicatorProps,
  HeartbeatPulseProps,
  AggregationConfig,
  TaskTypeStats,
} from '@/types/progress';

export type {
  CacheEntry,
  AggregationResult,
  ReporterConfig,
  UseProgressState,
  IProgressReporter,
  ValidationResult,
  SSEMessage,
} from './types';

export { DEFAULT_TASK_WEIGHTS } from './types';

// Reporter (backend)
export {
  initializeProgress,
  reportProgress,
  completeTask,
  failTask,
  getProgress,
  getActiveTasks,
  subscribeToTask,
  cleanupTask,
  cleanupStale,
  estimateTimeRemaining,
} from './reporter';

// Aggregator
export {
  aggregateProgress,
  mergeParallelProgress,
  calculateWeightedProgress,
  detectSlowSubtasks,
  calculateHealthScore,
  getTaskSummary,
  formatProgress,
  formatDuration,
} from './aggregator';
