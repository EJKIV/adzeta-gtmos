'use client';

import { getTaskTypeIcon, formatAutonomyTime } from '@/app/hooks/use-autonomy';
import type { AutonomousTask } from '@/lib/autonomy/types';

export function AutonomyTaskCard({ task }: { task: AutonomousTask }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-700 border-slate-200',
    assigned: 'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const priorityColors: Record<string, string> = {
    critical: 'text-rose-600',
    high: 'text-orange-600',
    medium: 'text-amber-600',
    low: '',
  };

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow"
      style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
    >
      <div className="text-xl">{getTaskTypeIcon(task.type)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[task.status]}`}>
            {task.status}
          </span>
          <span
            className={`text-xs font-medium ${priorityColors[task.priority]}`}
            style={task.priority === 'low' ? { color: 'var(--color-text-tertiary)' } : undefined}
          >
            {task.priority}
          </span>
          {task.autoAssigned && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>auto</span>
          )}
        </div>
        <h4 className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
          {task.title}
        </h4>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-tertiary)' }}>
          {task.description}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span>{formatAutonomyTime(task.createdAt)}</span>
          {task.assignedTo && (
            <span style={{ color: 'var(--color-text-tertiary)' }}>
              {task.assignedTo.replace('agent:', '')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
