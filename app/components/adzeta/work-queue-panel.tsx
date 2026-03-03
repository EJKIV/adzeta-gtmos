'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useWorkQueue } from '@/app/hooks/use-adzeta';
import type { AdzetaWorkQueueItem, RiskLevel, TaskType } from '@/types/adzeta';

const RISK_COLORS: Record<RiskLevel, string> = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const TYPE_COLORS: Record<TaskType, string> = {
  research: 'bg-blue-100 text-blue-800',
  analytics: 'bg-purple-100 text-purple-800',
  recommendation: 'bg-indigo-100 text-indigo-800',
  action: 'bg-rose-100 text-rose-800',
  proactive_alert: 'bg-cyan-100 text-cyan-800',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function TaskCard({
  task,
  onApprove,
  onReject,
  onModify,
}: {
  task: AdzetaWorkQueueItem;
  onApprove: (id: string) => void;
  onReject: (id: string, notes?: string) => void;
  onModify: (id: string, mods: Record<string, unknown>, notes?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyNotes, setModifyNotes] = useState('');

  return (
    <Card className="border transition-shadow hover:shadow-sm">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={TYPE_COLORS[task.task_type]}>{task.task_type}</Badge>
            {task.risk_level && (
              <Badge className={RISK_COLORS[task.risk_level]}>{task.risk_level}</Badge>
            )}
            {task.confidence_score != null && (
              <span className="text-xs text-muted-foreground">
                {Math.round(task.confidence_score * 100)}% confidence
              </span>
            )}
          </div>
          <p className="font-medium truncate">{task.title}</p>
        </div>
        <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
          {timeAgo(task.created_at)}
        </span>
      </div>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}
          {task.rationale && (
            <div>
              <span className="text-xs font-semibold uppercase text-muted-foreground">Rationale</span>
              <p className="text-sm">{task.rationale}</p>
            </div>
          )}
          {task.risk_assessment && (
            <div>
              <span className="text-xs font-semibold uppercase text-muted-foreground">Risk Assessment</span>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                {JSON.stringify(task.risk_assessment, null, 2)}
              </pre>
            </div>
          )}
          {task.suggested_action && (
            <div>
              <span className="text-xs font-semibold uppercase text-muted-foreground">Suggested Action</span>
              <p className="text-sm">{task.suggested_action}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => onApprove(task.task_id)}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModifyOpen(true)}
            >
              Modify
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onReject(task.task_id)}
            >
              Reject
            </Button>
          </div>

          <Dialog open={modifyOpen} onOpenChange={setModifyOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modify Task</DialogTitle>
              </DialogHeader>
              <Textarea
                placeholder="Describe your modifications..."
                value={modifyNotes}
                onChange={(e) => setModifyNotes(e.target.value)}
                rows={4}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setModifyOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onModify(task.task_id, { notes: modifyNotes }, modifyNotes);
                    setModifyOpen(false);
                    setModifyNotes('');
                  }}
                >
                  Submit Modification
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      )}
    </Card>
  );
}

export function WorkQueuePanel() {
  const { data: tasks, isLoading, approveTask, rejectTask, modifyTask } = useWorkQueue('pending_review');

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Work Queue</CardTitle></CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Work Queue</CardTitle>
        {tasks.length > 0 && (
          <Badge variant="secondary">{tasks.length} pending</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg font-medium">All clear</p>
            <p className="text-sm">No tasks pending review</p>
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.task_id}
              task={task}
              onApprove={approveTask}
              onReject={rejectTask}
              onModify={modifyTask}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
