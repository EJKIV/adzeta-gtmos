/**
 * Frontend Shell Hooks
 * 
 * Custom React hooks for UI state, personalization, and interactions.
 */

// Approval status polling
export { 
  useApprovalStatus, 
  useApprovalStatusChanged,
  useApprovalCompleted 
} from './use-approval-status';
export type { 
  ApprovalStatus, 
  ApprovalStatusResponse, 
  UseApprovalStatusOptions, 
  UseApprovalStatusReturn 
} from './use-approval-status';

// Task feedback with offline persistence
export {
  useTaskFeedback,
} from './use-task-feedback';
export type {
  TaskFeedbackPayload,
  TaskFeedbackResponse,
  PendingFeedback,
  UseTaskFeedbackReturn,
} from './use-task-feedback';

// Dwell time tracking
export { useDwellTime, DwellTimeTracker } from './use-dwell-time';
export type { DwellTimeConfig, DwellTimeEvent, DwellTimeTrackerProps } from './use-dwell-time';

// Personalization (simplified - new)
export {
  useSimplePersonalization,
  useCardOrder,
  useRecordEngagement,
} from './use-simple-personalization';

export type {
  PersonalizationState,
  CardType,
  PreferenceModel,
  SignalType,
} from './use-simple-personalization';

// Legacy personalization (kept for backward compatibility)
export {
  usePersonalization,
  usePersonalizedCardOrder,
  usePreferredTimeRange,
  useNotificationPreferences,
  usePersonalizedKPIs,
  usePersonalizedTheme,
  DEFAULT_UI_CONFIG,
} from './use-personalization';

export type {
  PersonalizationState as LegacyPersonalizationState,
} from './use-personalization';

// Events stream
export {
  useEventsStream,
  useEventDetail,
} from './use-events-stream';
export type {
  EventsFilter,
  EventsMetrics,
  EventsResponse,
  UseEventsStreamOptions,
  UseEventsStreamReturn,
} from './use-events-stream';
