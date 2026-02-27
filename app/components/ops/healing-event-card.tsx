'use client';

import {
  getHealingStatusColor,
  formatHealingStrategy,
  formatDuration,
  formatAutonomyTime,
} from '@/app/hooks/use-autonomy';
import type { HealingEvent } from '@/lib/autonomy/types';

export function HealingEventCard({ event }: { event: HealingEvent }) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow"
      style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
    >
      <div className="text-xl">
        {event.status === 'healed' ? '\u{1F3E5}' : event.status === 'escalated' ? '\u26A0\uFE0F' : '\u{1F527}'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getHealingStatusColor(event.status)}`}>
            {event.status}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {formatHealingStrategy(event.strategy)}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {event.attempts.length} attempt{event.attempts.length !== 1 ? 's' : ''}
          {event.resolvedAt && (
            <span className="text-emerald-600 ml-1">
              (resolved in {formatDuration(new Date(event.resolvedAt).getTime() - new Date(event.startedAt).getTime())})
            </span>
          )}
        </p>
        <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {formatAutonomyTime(event.startedAt)}
        </div>
      </div>
    </div>
  );
}
