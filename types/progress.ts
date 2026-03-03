/**
 * Progress Visibility System Types
 * TypeScript definitions for real-time task progress tracking
 */

/** Task status states */
export type TaskStatus = 'waiting' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Sub-task structure for nested progress */
export interface SubTask {
  id: string;
  taskId: string;
  label: string;
  status: TaskStatus;
  stepNumber: number;
  totalSteps: number;
  percentComplete: number;
  weight: number; // For weighted aggregation
  message?: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  agentLabel?: string;
}

/** Progress report payload from subagents */
export interface ProgressReport {
  taskId: string;
  runId: string;
  stepNumber: number;
  totalSteps: number;
  percentComplete: number; // 0-100
  message: string;
  agentLabel: string;
  status?: TaskStatus;
  timestamp: string;
  // Optional sub-task info for nested progress
  subtaskId?: string;
  parentTaskId?: string;
  weight?: number;
}

/** Stored progress data (in Redis/DB) */
export interface ProgressRecord {
  taskId: string;
  runId: string;
  status: TaskStatus;
  currentStep: number;
  totalSteps: number;
  percentComplete: number;
  message: string;
  agentLabel: string;
  subtasks: SubTask[];
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;
  estimatedDurationMs?: number;
}

/** SSE event types */
export type ProgressEventType = 
  | 'progress'
  | 'step_complete'
  | 'subtask_update'
  | 'complete'
  | 'error'
  | 'heartbeat';

export interface ProgressEvent {
  type: ProgressEventType;
  taskId: string;
  data: ProgressRecord | Partial<ProgressRecord>;
  timestamp: string;
}

/** API Response types */
export interface ProgressStatusResponse {
  taskId: string;
  percentComplete: number;
  currentStep: number;
  totalSteps: number;
  status: TaskStatus;
  message: string;
  subtasks: SubTask[];
  updatedAt: string;
  startedAt: string;
  completedAt?: string;
  agentLabel: string;
  estimatedTimeRemaining?: string;
  errorMessage?: string;
}

/** Heartbeat status for UI */
export interface HeartbeatStatus {
  lastUpdateAt: string;
  isStale: boolean;
  staleDurationMs: number;
  isHealthy: boolean;
}

/** Progress indicator props */
export interface ProgressIndicatorProps {
  taskId: string;
  title?: string;
  showSteps?: boolean;
  showPercentage?: boolean;
  showTimeEstimate?: boolean;
  showHeartbeat?: boolean;
  compact?: boolean;
  onRetry?: () => void;
  onViewLogs?: () => void;
  onEscalate?: () => void;
}

/** Heartbeat pulse props */
export interface HeartbeatPulseProps {
  taskId: string;
  lastUpdateAt: string;
  status: TaskStatus;
  expanded?: boolean;
  onExpand?: () => void;
  subtasks?: SubTask[];
}

/** Aggregation config for weighted progress */
export interface AggregationConfig {
  enableWeighting: boolean;
  defaultWeight: number;
  parallelAggregationMode: 'sum' | 'average' | 'max';
}

/** Historical stats for time estimation */
export interface TaskTypeStats {
  taskType: string;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  sampleCount: number;
  lastUpdated: string;
}
