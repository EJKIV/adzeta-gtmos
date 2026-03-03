/**
 * Progress Visibility System - Internal Types
 * Re-export public types and add implementation-specific types
 */

export type {
  TaskStatus,
  SubTask,
  ProgressReport,
  ProgressRecord,
  ProgressEventType,
  ProgressEvent,
  ProgressStatusResponse,
  HeartbeatStatus,
  AggregationConfig,
  TaskTypeStats,
} from '@/types/progress';

import type { ProgressReport, ProgressRecord, SubTask } from '@/types/progress';

/** In-memory cache entry for active tasks */
export interface CacheEntry {
  record: ProgressRecord;
  subscribers: Set<ReadableStreamDefaultController>;
  timer?: NodeJS.Timeout;
}

/** Aggregator result */
export interface AggregationResult {
  percentComplete: number;
  currentStep: number;
  totalSteps: number;
  weightedProgress: number;
  activeSubtasks: number;
  completedSubtasks: number;
  failedSubtasks: number;
}

/** Reporter configuration */
export interface ReporterConfig {
  apiEndpoint: string;
  retryAttempts: number;
  retryDelayMs: number;
  heartbeatIntervalMs: number;
}

/** Client-side progress hook state */
export interface UseProgressState {
  progress: ProgressRecord | null;
  error: Error | null;
  isConnected: boolean;
  reconnecting: boolean;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Default aggregation weights by task type */
export const DEFAULT_TASK_WEIGHTS: Record<string, number> = {
  'build': 1.5,
  'test': 1.0,
  'deploy': 2.0,
  'analysis': 1.2,
  'research': 1.3,
  'default': 1.0,
};

/** SSE message format for internal use */
export interface SSEMessage {
  event: string;
  data: unknown;
}

/** Reporter instance interface */
export interface IProgressReporter {
  report(progress: Partial<ProgressReport> & { taskId: string; runId: string }): Promise<void>;
  startHeartbeat(): void;
  stopHeartbeat(): void;
}
