'use client';

import { useState } from 'react';
import { ApprovalCard } from '@/app/components/chat/approval-card';
import { useApprovalStatus } from '@/hooks/use-approval-status';

/**
 * Demo component for testing real-time approval status polling
 * 
 * This demonstrates:
 * - <2s status change detection
 * - Polling with SSE fallback
 * - Memory-safe cleanup
 * - Auto-dismiss on completion
 */
export function ApprovalPollingDemo() {
  const [testTaskId, setTestTaskId] = useState('test-task-123');
  const [simulatedStatus, setSimulatedStatus] = useState('pending');
  
  // Hook for monitoring the approval status
  const { status, isLoading, error, timeSinceUpdate } = useApprovalStatus(testTaskId, {
    pollInterval: 2000,
    enableSseFallback: true,
  });

  // Simulate an external approval (e.g., from another user or system)
  const simulateExternalApproval = () => {
    // In a real scenario, this would be triggered by:
    // - Another user clicking approve in a different browser
    // - A system worker completing the task
    // - Webhook from external service
    console.log('[Demo] Simulating external approval...');
    
    // The polling hook will detect this within 2 seconds
    fetch(`/api/work-queue/${testTaskId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: { demo: true } }),
    }).catch(() => {
      console.log('[Demo] API call ignored - just demonstrating');
    });
  };

  const simulateExternalRejection = () => {
    console.log('[Demo] Simulating external rejection...');
    fetch(`/api/work-queue/${testTaskId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: { demo: true } }),
    }).catch(() => {
      console.log('[Demo] API call ignored - just demonstrating');
    });
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Approval Status Polling Demo</h2>
        <p className="text-muted-foreground">
          This demo shows the real-time approval status polling in action.
          The polling hook checks every 2 seconds for status changes.
        </p>
      </div>

      {/* Debug Panel */}
      <div className="p-4 bg-muted rounded-lg space-y-2 font-mono text-sm">
        <div className="flex justify-between">
          <span>Real Status:</span>
          <span className={`
            ${status === 'approved' ? 'text-green-500' : ''}
            ${status === 'rejected' ? 'text-red-500' : ''}
            ${status === 'pending' ? 'text-yellow-500' : ''}
          `}>
            {status}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Polling Active:</span>
          <span>{isLoading ? 'Yes' : 'No'}</span>
        </div>
        <div className="flex justify-between">
          <span>Time Since Update:</span>
          <span>{timeSinceUpdate}s</span>
        </div>
        {error && (
          <div className="text-red-500">Error: {error}</div>
        )}
      </div>

      {/* Approval Card */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Approval Card</h3>
        <ApprovalCard
          data={{
            taskId: testTaskId,
            title: 'Create New Sequence',
            description: 'Create an Apollo sequence for outreach to 50 prospects',
            confidence: 0.85,
            riskLevel: 'medium',
            metadata: { commandId: 'demo-cmd-123' },
          }}
          onApproved={(id) => console.log('Approved:', id)}
          onRejected={(id) => console.log('Rejected:', id)}
          onModify={(id) => console.log('Modify:', id)}
          autoDismiss
          dismissDelay={2000}
        />
      </div>

      {/* Test Controls */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Test Controls</h3>
        <div className="flex gap-2">
          <button
            onClick={simulateExternalApproval}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Simulate External Approval
          </button>
          
          <button
            onClick={simulateExternalRejection}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Simulate External Rejection
          </button>
          
          <button
            onClick={() => setTestTaskId(`task-${Date.now()}`)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            New Task
          </button>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Click "Simulate External Approval/Rejection" to trigger status change.
          The card will detect the change within 2 seconds and update automatically.
        </p>
      </div>
    </div>
  );
}

export default ApprovalPollingDemo;
