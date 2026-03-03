/**
 * Chat Components - Inline interactions for GTM Command Center
 * 
 * This module exports all chat-related UI components.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core Components
// ─────────────────────────────────────────────────────────────────────────────

export { ChatThread } from './chat-thread';
export { ChatMessage } from './chat-message';
export { ChatInput } from './chat-input';
export { ChatLayout } from './chat-layout';

// ─────────────────────────────────────────────────────────────────────────────
// Action & Feedback Components
// ─────────────────────────────────────────────────────────────────────────────

export { 
  ApprovalCard, 
  CompactApprovalCard,
  type ApprovalCardData,
  type ApprovalRiskLevel,
  type ApprovalStatus,
} from './approval-card';

export {
  TaskFeedbackInline,
  CompactTaskFeedback,
  type TaskFeedbackInlineProps,
} from './task-feedback-inline';

export { ConfirmationCard } from './confirmation-card';
export { ConfidenceBar } from './confidence-bar';
export { ActionButtons } from './action-buttons';

// ─────────────────────────────────────────────────────────────────────────────
// Feedback & Suggestions
// ─────────────────────────────────────────────────────────────────────────────

export { FeedbackButtons } from './feedback-buttons';
export { QuickSuggestions } from './quick-suggestions';
export { EmptyState } from './empty-state';
export { SystemHealthBadge } from './system-health-badge';

// ─────────────────────────────────────────────────────────────────────────────
// Progress & Status Components
// ─────────────────────────────────────────────────────────────────────────────

export { ProgressIndicator } from './progress-indicator';
export { HeartbeatPulse } from './heartbeat-pulse';

// Demo Components (development only)
// Note: ApprovalCardDemo default export - import directly from file
export { TaskFeedbackInlineDemo } from './task-feedback-inline.demo';
export { TaskFeedbackInlineDemo as default } from './task-feedback-inline.demo';
