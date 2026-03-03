'use client';

import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskFeedbackInline } from './task-feedback-inline';

/**
 * TaskFeedbackInline Demo
 */
export function TaskFeedbackInlineDemo() {
  const [showFeedback, setShowFeedback] = useState(true);
  const [submittedFeedback, setSubmittedFeedback] = useState<{taskId: string; rating: number} | null>(null);

  const handleReset = () => {
    setShowFeedback(true);
    setSubmittedFeedback(null);
  };

  const handleDismiss = () => {
    setShowFeedback(false);
  };

  const handleSubmitted = (taskId: string, rating: number) => {
    setSubmittedFeedback({ taskId, rating });
  };

  const taskSummary = `Campaign sequence created with 5 touchpoints and 2 variants
  Target: CTOs at Series A+ startups
  Sequence: LinkedIn connect → Email → LinkedIn message → Email → Call`;

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Task Feedback Inline Demo</h2>
        <p className="text-sm text-muted-foreground">
          This demonstrates the inline task completion feedback flow.
        </p>
      </div>

      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={showFeedback}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Demo
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500" aria-live="polite">
            Status: <strong className="text-slate-900">{showFeedback ? 'Showing' : 'Dismissed'}</strong>
          </span>
          
          {submittedFeedback && (
            <span className="text-sm text-green-600">
              | Rated {submittedFeedback.rating}/5 stars
            </span>
          )}
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-sm font-medium mb-4 text-slate-500">Component Preview:</h3>
        
        {showFeedback ? (
          <TaskFeedbackInline
            taskId="demo-task-123"
            taskSummary={taskSummary}
            metadata={{
              demo: true,
              environment: 'demo',
              components: ['ApprovalCard', 'Polling', 'TaskFeedbackInline'],
            }}
            onSubmitted={handleSubmitted}
            onDismiss={handleDismiss}
            autoDismiss={false}
          />
        ) : (
          <div className="p-8 text-center text-slate-400">
            <p>Feedback component dismissed.</p>
            <Button variant="ghost" size="sm" onClick={handleReset} className="mt-2">
              <Play className="h-4 w-4 mr-2" />
              Show again
            </Button>
          </div>
        )}
      </div>

      <div className="bg-green-50 p-4 rounded-lg border border-green-200 space-y-3">
        <h4 className="font-medium text-green-800 flex items-center gap-2">
          <span aria-hidden="true">*</span> Features Demonstrated
        </h4>
        <ul className="text-sm text-green-700 space-y-1 list-disc pl-4">
          <li>Star rating with hover states and keyboard navigation</li>
          <li>Collapsible text feedback sections</li>
          <li>Success confirmation with auto-dismiss</li>
          <li>Screen reader announcements (ARIA live regions)</li>
          <li>Mobile-responsive design</li>
          <li>Local persistence if submission fails</li>
        </ul>
      </div>
    </div>
  );
}

export default TaskFeedbackInlineDemo;
