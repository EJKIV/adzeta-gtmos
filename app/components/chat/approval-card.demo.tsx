/**
 * ApprovalCard Component Demo
 * 
 * This file demonstrates how to use the ApprovalCard component
 * in the chat interface.
 */

import { ApprovalCard, type ApprovalCardData } from './approval-card';

// ── Types ──────────────────────────────────────────────────────────────

// The approval data that would come from the work queue or command response
const sampleApprovalData: ApprovalCardData = {
  taskId: 'task-123',
  title: 'Create new campaign sequence for Enterprise prospects',
  description: 'Generate a 5-step email sequence targeting VP-level sales leaders in tech industry',
  confidence: 0.85,
  riskLevel: 'medium',
  metadata: {
    estimated_cost: 0.50,
    tool_count: 3,
    prospect_count: 1250,
  },
};

// ── Usage Examples ─────────────────────────────────────────────────────

/**
 * Example 1: Basic inline usage in chat
 */
export function ChatWithApproval() {
  const handleApprove = async (taskId: string) => {
    console.log('Approved:', taskId);
    // Optionally refresh the thread to show updated state
  };

  const handleReject = async (taskId: string) => {
    console.log('Rejected:', taskId);
  };

  const handleModify = async (taskId: string) => {
    console.log('Modify requested:', taskId);
    // Open a modal or inline form to modify the task
  };

  return (
    <ApprovalCard
      data={sampleApprovalData}
      onApproved={handleApprove}
      onRejected={handleReject}
      onModify={handleModify}
    />
  );
}

/**
 * Example 2: Different risk levels
 */
export function RiskLevelExamples() {
  const levels: Array<{
    data: ApprovalCardData;
    label: string;
  }> = [
    {
      label: 'Low Risk (High Confidence)',
      data: {
        taskId: 'task-a',
        title: 'Update campaign status',
        confidence: 0.95,
        riskLevel: 'low',
      },
    },
    {
      label: 'Medium Risk',
      data: {
        taskId: 'task-b',
        title: 'Create new prospect list',
        confidence: 0.72,
        riskLevel: 'medium',
      },
    },
    {
      label: 'High Risk',
      data: {
        taskId: 'task-c',
        title: 'Send bulk campaign to 10k contacts',
        confidence: 0.45,
        riskLevel: 'high',
      },
    },
    {
      label: 'Critical Risk',
      data: {
        taskId: 'task-d',
        title: 'Delete entire prospect database',
        confidence: 0.25,
        riskLevel: 'critical',
      },
    },
  ];

  return (
    <div className="space-y-4 p-4">
      {levels.map(({ label, data }) => (
        <div key={data.taskId}>
          <h3 className="text-sm font-medium mb-2">{label}</h3>
          <ApprovalCard data={data} />
        </div>
      ))}
    </div>
  );
}

/**
 * Example 3: Integration with useChatEngine hook
 */
export function ChatIntegrationExample() {
  /**
   * In your main page component:
   * 
   * const {
   *   thread,
   *   pendingApprovals,
   *   updateApprovalStatus,
   * } = useChatEngine({ maxHistory: 50 });
   *
   * // When a command requires approval:
   * useEffect(() => {
   *   thread.forEach(entry => {
   *     if (entry.requires_approval && entry.work_queue_task_id) {
   *       updateApprovalStatus(entry.id, {
   *         requiresApproval: true,
   *         taskId: entry.work_queue_task_id,
   *         title: entry.text || 'Task Approval',
   *         confidence: entry.classification?.confidence || 0.5,
   *         riskLevel: entry.classification?.risk_level || 'medium',
   *       });
   *     }
   *   });
   * }, [thread]);
   *
   * // Render the chat thread:
   * <ChatThread
   *   entries={thread}
   *   pendingApprovals={pendingApprovals}
   *   onApproveTask={(id) => console.log('Approved:', id)}
   *   onRejectTask={(id) => console.log('Rejected:', id)}
   *   onModifyTask={(id) => console.log('Modify:', id)}
   * />
   */
}

/**
 * Example 4: Responsive testing
 * 
 * The ApprovalCard component is fully responsive and works on both
 * mobile and desktop:
 * 
 * - Mobile: Buttons stack vertically
 * - Desktop: Buttons flex horizontally with primary action emphasized
 * - All touch targets are at least 44x44px
 * - Keyboard navigation works (Tab through buttons, Enter/Space to activate)
 */

/**
 * Example 5: Accessibility testing
 * 
 * The component includes:
 * - ARIA labels on all buttons
 * - Role="article" and aria-label for the card
 * - aria-live="polite" for error messages
 * - keyboard navigation support
 * - Screen reader announces status changes
 */

export default {
  ChatWithApproval,
  RiskLevelExamples,
  ChatIntegrationExample,
};
