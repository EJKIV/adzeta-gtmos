/**
 * GTM-OS Orchestration Types
 * TypeScript definitions for orchestration layer integration
 */

import type { OracleBlock } from '@/components/oracle-blocks/types';

/** Command status lifecycle */
export type CommandStatus =
  | 'pending'
  | 'parsing'
  | 'routing'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'pending_review'
  | 'needs_more_info';

/** Agent roles in the system */
export type AgentRole = 
  | 'prospect-researcher'
  | 'icp-analyst'
  | 'seq-architect'
  | 'copywriter'
  | 'performance-analyst'
  | 'claude-code'
  | 'marcus'
  | 'piper'
  | string;

/** Query classification result */
export interface QueryClassification {
  task_type: 'research' | 'analytics' | 'recommendation' | 'action' | 'proactive_alert';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  reasoning: string;
}

/** Response from POST /api/oracle/command */
export interface OrchestratorCommand {
  command_id: string;
  status: CommandStatus;
  session_key: string;
  environment?: 'dev' | 'prod';
  estimated_duration?: string;
  queue_position?: number;
  // Auto-classification results
  classification?: QueryClassification;
  requires_approval?: boolean;
  work_queue_task_id?: string | null;
}

/** Request body for POST /api/oracle/command */
export interface CreateCommandRequest {
  raw_command: string;
  environment?: 'dev' | 'prod';
  context?: {
    current_page?: string;
    selected_prospects?: string[];
    active_campaign?: string;
    environment?: 'dev' | 'prod';
    [key: string]: unknown;
  };
}

/** Detailed command info from GET /api/oracle/command/[id] */
export interface CommandDetails {
  id: string;
  status: CommandStatus;
  environment?: 'dev' | 'prod';
  result_summary?: string;
  result_data?: Record<string, unknown>;
  output_artifacts?: {
    files?: string[];
    urls?: string[];
    commits?: string[];
  };
  user_visible_response?: string;
  error_message?: string;
  error_code?: string;
  routed_to_agent?: string;
  routed_to_agent_role?: string;
  intent_category?: string;
  intent_confidence?: number;
  token_usage_input?: number;
  token_usage_output?: number;
  estimated_cost?: number;
  duration_ms?: number;
  received_at?: string;
  completed_at?: string;
}

/** Feedback submission payload */
export interface FeedbackPayload {
  command_id: string;
  rating: number; // 1-5
  feedback_text?: string;
  categories?: string[];
  proposed_better_response?: string;
  mark_for_rlhf: boolean;
  environment?: 'dev' | 'prod';
}

/** Feedback API response */
export interface FeedbackResponse {
  success: boolean;
  signal_id?: string;
  error?: string;
}

/** Status badge configuration for UI */
export interface StatusBadgeConfig {
  color: 'yellow' | 'blue' | 'purple' | 'orange' | 'green' | 'red' | 'gray';
  text: string;
  icon?: string;
}

/** Status badge mapping */
export const STATUS_BADGE_CONFIG: Record<CommandStatus, StatusBadgeConfig> = {
  pending: { color: 'yellow', text: 'Routing...' },
  parsing: { color: 'blue', text: 'Parsing...' },
  routing: { color: 'purple', text: 'Selecting agent...' },
  executing: { color: 'orange', text: 'Working...' },
  completed: { color: 'green', text: 'Done' },
  failed: { color: 'red', text: 'Failed' },
  cancelled: { color: 'gray', text: 'Cancelled' },
  pending_review: { color: 'orange', text: 'Review Required' },
  needs_more_info: { color: 'blue', text: 'More info needed' },
};

/** Thread entry for orchestrator-integrated chat */
export interface OrchestratorThreadEntry {
  id: string;
  type: 'command' | 'response' | 'status' | 'error' | 'agent_update';
  text?: string; // The original command
  status?: CommandStatus;
  response?: string; // The user_visible_response
  result_data?: unknown;
  output_artifacts?: {
    files?: string[];
    urls?: string[];
    commits?: string[];
  };
  routed_to_agent?: string;
  routed_to_agent_role?: string;
  intent_category?: string;
  intent_confidence?: number;
  blocks?: OracleBlock[];
  error_message?: string;
  statusMessage?: string;
  isStreaming?: boolean;
  token_usage?: {
    input: number;
    output: number;
  };
  estimated_cost?: number;
  duration_ms?: number;
  timestamp: Date;
  // Auto-classification results
  classification?: QueryClassification;
  requires_approval?: boolean;
  work_queue_task_id?: string | null;
}

/** Props for StatusBadge component */
export interface StatusBadgeProps {
  status: CommandStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/** Props for AgentAttribution component */
export interface AgentAttributionProps {
  agent_id: string;
  agent_role?: string;
  confidence?: number;
  showAvatar?: boolean;
}

/** Props for CommandStatusCard component */
export interface CommandStatusCardProps {
  entry: OrchestratorThreadEntry;
  isLoading: boolean;
}

/** Props for ResponseCard component */
export interface ResponseCardProps {
  entry: OrchestratorThreadEntry;
}

/** Polling configuration */
export interface PollingConfig {
  initialInterval: number;   // ms (5000 = 5s)
  executingInterval: number; // ms (2000 = 2s) - faster during execution
  maxAttempts: number;
  timeoutMs: number;
}

/** Default polling config */
export const DEFAULT_POLLING_CONFIG: PollingConfig = {
  initialInterval: 5000,
  executingInterval: 2000,
  maxAttempts: 60,
  timeoutMs: 300000, // 5 minutes
};

/** Error types for orchestration */
export interface OrchestratorError {
  code: string;
  message: string;
  command_id?: string;
  retryable?: boolean;
}

/** Cancel command response */
export interface CancelCommandResponse {
  success: boolean;
  message: string;
  error?: string;
}
