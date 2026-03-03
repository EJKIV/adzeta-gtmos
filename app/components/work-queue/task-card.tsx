'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BlockerPanel } from './blocker-panel';
import { PrioritySlider } from './priority-slider';
import type { WorkQueueItem } from '@/app/hooks/use-work-queue';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  blocked: { label: 'Blocked', className: 'bg-red-100 text-red-800' },
  ready: { label: 'Ready', className: 'bg-emerald-100 text-emerald-800' },
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800' },
  paused: { label: 'Paused', className: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
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

interface TaskCardProps {
  item: WorkQueueItem;
  onUpdate: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onViewDetail?: (id: string) => void;
}

export function TaskCard({ item, onUpdate, onDelete, onViewDetail }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = item.metadata ?? {};
  const title = meta.title || item.item_type || 'Untitled Task';
  const description = meta.description || '';
  const requiresTools = (meta.requires_tools as string[]) ?? [];
  const missingTools = (meta.missing_tools as string[]) ?? [];
  const status = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending;

  return (
    <Card className="border transition-shadow hover:shadow-sm">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Priority */}
        <span className="text-xs font-mono font-bold text-muted-foreground w-6 text-center shrink-0">
          #{item.priority}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{title}</p>
          {item.category && (
            <span className="text-xs text-muted-foreground">{item.category}</span>
          )}
        </div>

        {/* Status + Blocker */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={status.className}>{status.label}</Badge>
          {missingTools.length > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
              {missingTools.length} tool{missingTools.length > 1 ? 's' : ''} needed
            </Badge>
          )}
        </div>

        {/* Time */}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {timeAgo(item.created_at)}
        </span>
      </div>

      {expanded && (
        <CardContent className="pt-0 space-y-3 border-t">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}

          <BlockerPanel
            blockedReason={item.blocked_reason}
            unblockConditions={item.unblock_conditions}
            requiresTools={requiresTools}
            missingTools={missingTools}
          />

          {item.notes && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                Notes
              </p>
              <p className="text-sm">{item.notes}</p>
            </div>
          )}

          {item.assigned_agent && (
            <div className="text-xs text-muted-foreground">
              Assigned to: <span className="font-medium">{item.assigned_agent}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <PrioritySlider
              value={item.priority}
              onChange={(p) => onUpdate(item.id, { priority: p })}
            />

            <div className="flex gap-2 ml-auto">
              {onViewDetail && (
                <Button size="sm" variant="outline" onClick={() => onViewDetail(item.id)}>
                  Details
                </Button>
              )}
              {item.status === 'ready' && (
                <Button size="sm" onClick={() => onUpdate(item.id, { status: 'in_progress' })}>
                  Start
                </Button>
              )}
              {item.status === 'in_progress' && (
                <Button size="sm" variant="outline" onClick={() => onUpdate(item.id, { status: 'paused' })}>
                  Pause
                </Button>
              )}
              {item.status === 'paused' && (
                <Button size="sm" onClick={() => onUpdate(item.id, { status: 'in_progress' })}>
                  Resume
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => onDelete(item.id)}>
                Remove
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
