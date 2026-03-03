// ============================================================================
// AdZeta Autonomy System Types
// ============================================================================

// --- Enums ---

export type TaskType = 'research' | 'analytics' | 'recommendation' | 'action' | 'proactive_alert';

export type ApprovalState =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'modified'
  | 'auto_executed'
  | 'executing'
  | 'completed'
  | 'failed';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type GateStatus = 'locked' | 'unlocked' | 'active';

export type FeedbackType =
  | 'approval'
  | 'rejection'
  | 'modification'
  | 'rating'
  | 'comment'
  | 'outcome_report';

export type TriggerType =
  | 'metric_anomaly'
  | 'opportunity_detected'
  | 'trend_change'
  | 'scheduled_check'
  | 'idle_prompt';

export type Urgency = 'low' | 'normal' | 'high' | 'urgent';

// --- Table Types ---

export interface AdzetaWorkQueueItem {
  id: string;
  task_id: string;
  task_type: TaskType;
  title: string;
  description: string | null;
  raw_request: string;
  agent_id: string;
  confidence_score: number | null;
  risk_level: RiskLevel | null;
  approval_state: ApprovalState;
  suggested_action: string | null;
  suggested_action_payload: Record<string, unknown> | null;
  rationale: string | null;
  risk_assessment: Record<string, unknown> | null;
  approver_id: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  executed_at: string | null;
  execution_result: Record<string, unknown> | null;
  execution_error: string | null;
  outcome: 'success' | 'failure' | 'cancelled' | 'pending' | null;
  outcome_metrics: Record<string, unknown> | null;
  priority: number;
  scheduled_for: string | null;
  deadline: string | null;
  oracle_command_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AdzetaAutonomyGate {
  id: string;
  gate_id: string;
  gate_name: string;
  task_type: string;
  min_confidence: number;
  min_historical_runs: number;
  min_success_rate: number;
  max_error_rate: number;
  min_days_since_first_run: number | null;
  current_status: GateStatus | null;
  unlocked_at: string | null;
  runs_count: number;
  success_count: number;
  error_count: number;
  avg_confidence: number | null;
  manually_unlocked: boolean;
  manually_locked: boolean;
  locked_reason: string | null;
  last_evaluated_at: string | null;
  evaluated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdzetaUserFeedback {
  id: string;
  task_id: string | null;
  oracle_command_id: string | null;
  feedback_type: FeedbackType;
  rating: number | null;
  comment: string | null;
  modification_json: Record<string, unknown> | null;
  user_id: string;
  session_id: string | null;
  outcome_success: boolean | null;
  outcome_metrics: Record<string, unknown> | null;
  time_to_completion_seconds: number | null;
  created_at: string;
}

export interface AdzetaAgentMetric {
  id: string;
  metric_date: string;
  agent_id: string;
  task_type: string;
  total_queries: number;
  approved_count: number;
  rejected_count: number;
  modified_count: number;
  auto_executed_count: number;
  avg_confidence: number | null;
  avg_response_time_seconds: number | null;
  avg_user_rating: number | null;
  success_count: number;
  failure_count: number;
  error_count: number;
  success_rate: number | null;
  approval_rate: number | null;
  created_at: string;
}

export interface AdzetaProactiveSuggestion {
  id: string;
  suggestion_id: string;
  trigger_type: TriggerType;
  title: string;
  description: string | null;
  urgency: Urgency;
  suggested_action: string | null;
  suggested_action_payload: Record<string, unknown> | null;
  confidence: number | null;
  user_id: string | null;
  dismissed: boolean;
  dismissed_at: string | null;
  dismissed_reason: string | null;
  accepted: boolean;
  accepted_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface AdzetaAutonomyConfig {
  id: string;
  config_key: string;
  config_value: unknown;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
  change_reason: string | null;
}

// --- API Request Types ---

export interface CreateTaskRequest {
  task_type: TaskType;
  title: string;
  description?: string;
  raw_request: string;
  confidence_score?: number;
  risk_level?: RiskLevel;
  suggested_action?: string;
  suggested_action_payload?: Record<string, unknown>;
  rationale?: string;
  risk_assessment?: Record<string, unknown>;
  priority?: number;
  scheduled_for?: string;
  deadline?: string;
  oracle_command_id?: string;
}

export interface ApproveTaskRequest {
  action: 'approve' | 'reject' | 'modify';
  notes?: string;
  modifications?: Record<string, unknown>;
}

export interface SubmitFeedbackRequest {
  task_id?: string;
  oracle_command_id?: string;
  feedback_type: FeedbackType;
  rating?: number;
  comment?: string;
  modification_json?: Record<string, unknown>;
  outcome_success?: boolean;
  outcome_metrics?: Record<string, unknown>;
  time_to_completion_seconds?: number;
}

export interface GateUpdateRequest {
  action: 'lock' | 'unlock';
  reason?: string;
}

export interface ConfigUpdateRequest {
  config_key: string;
  config_value: unknown;
  change_reason?: string;
}

export interface SuggestionActionRequest {
  action: 'accept' | 'dismiss';
  reason?: string;
}

// --- API Response Types ---

export interface WorkQueueResponse {
  tasks: AdzetaWorkQueueItem[];
  total: number;
}

export interface GatesResponse {
  gates: (AdzetaAutonomyGate & {
    progress: {
      runs_progress: number;
      success_rate: number;
      confidence_progress: number;
    };
  })[];
}

export interface MetricsResponse {
  daily: AdzetaAgentMetric[];
  summary: {
    total_tasks: number;
    approval_rate: number;
    auto_execution_rate: number;
    avg_confidence: number;
  };
}

export interface SuggestionsResponse {
  suggestions: AdzetaProactiveSuggestion[];
}

export interface ConfigResponse {
  config: AdzetaAutonomyConfig[];
}
