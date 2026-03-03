'use client';

import { CheckCircle2, Circle, Loader2, XCircle, SkipForward } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProgressBlock as ProgressBlockType } from '@/types/ai-agent';

const stepStatusIcons = {
  pending: <Circle className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />,
  running: <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-info)' }} />,
  completed: <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-success)' }} />,
  skipped: <SkipForward className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />,
  error: <XCircle className="w-4 h-4" style={{ color: 'var(--color-error)' }} />,
};

const statusColors: Record<string, string> = {
  pending: 'var(--color-text-muted)',
  running: 'var(--color-info)',
  paused: 'var(--color-warning)',
  completed: 'var(--color-success)',
  failed: 'var(--color-error)',
};

export function ProgressBlock({
  title,
  status,
  progress,
  steps,
  startedAt,
  estimatedCompletion,
  elapsedMs,
  actions,
}: ProgressBlockType) {
  const formatElapsed = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <div className="space-y-3 rounded-lg border p-4" style={{ borderColor: 'var(--color-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        {title && (
          <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h4>
        )}
        <span className="text-xs font-medium capitalize" style={{ color: statusColors[status] }}>
          {status}
        </span>
      </div>

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-right" style={{ color: 'var(--color-text-muted)' }}>
            {progress}%
          </p>
        </div>
      )}

      {/* Steps */}
      {steps && steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-2">
              {stepStatusIcons[step.status]}
              <div className="flex-1">
                <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {step.label}
                </p>
                {step.details && (
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {step.details}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Time info */}
      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {elapsedMs !== undefined && <span>Elapsed: {formatElapsed(elapsedMs)}</span>}
        {estimatedCompletion && <span>ETA: {new Date(estimatedCompletion).toLocaleTimeString()}</span>}
      </div>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map((action) => (
            <Button key={action.id} variant="outline" size="sm">
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
