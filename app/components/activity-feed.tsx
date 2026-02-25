'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Bell, Zap, Play } from 'lucide-react';
import { useDataFetch } from '@/app/hooks/use-data-fetch';
import { SampleDataBadge } from './sample-data-badge';

interface ActivityItem {
  id: string;
  severity: 'info' | 'warning' | 'success' | 'critical';
  description: string;
  timeAgo: string;
  actionCommand?: string;
  actionLabel?: string;
}

interface ActivityResponse {
  activities: ActivityItem[];
  dataSource: 'live' | 'demo';
}

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  info: <Bell className="h-3.5 w-3.5 text-[#2563eb]" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-[#ea580c]" />,
  success: <TrendingUp className="h-3.5 w-3.5 text-[#16a34a]" />,
  critical: <Zap className="h-3.5 w-3.5 text-[#dc2626]" />,
};

interface ActivityFeedProps {
  onAction?: (command: string) => void;
}

export function ActivityFeed({ onAction }: ActivityFeedProps) {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = useDataFetch<ActivityResponse>('/api/activity', {
    refreshInterval: 15000,
    retryCount: 2,
    staleWhileRevalidate: true,
  });

  const activities = data?.activities ?? [];
  const isDemo = data?.dataSource === 'demo';
  const visible = expanded ? activities : activities.slice(0, 3);

  if (isLoading && !data) {
    return (
      <div
        className="rounded-2xl border"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
        data-testid="activity-feed"
      >
        <div className="px-5 py-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <div className="h-3.5 w-3.5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
      data-testid="activity-feed"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-left rounded-t-2xl transition-colors"
        style={{ color: 'var(--color-text-primary)' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#de347f] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#de347f]" />
          </span>
          <span className="text-sm font-semibold">
            Activity
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--color-n100)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {activities.length}
          </span>
          {isDemo && <SampleDataBadge />}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
        ) : (
          <ChevronDown className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
        )}
      </button>

      <div className="px-5 pb-3 space-y-0">
        {visible.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 py-2.5 border-t first:border-t-0"
            style={{ borderColor: 'var(--color-border-subtle)' }}
          >
            <span className="shrink-0">{SEVERITY_ICONS[item.severity]}</span>
            <p className="flex-1 text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
              {item.description}
            </p>
            {item.actionCommand && onAction && (
              <button
                onClick={(e) => { e.stopPropagation(); onAction(item.actionCommand!); }}
                className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  color: '#de347f',
                  borderColor: 'rgba(222,52,127,0.3)',
                  backgroundColor: 'rgba(222,52,127,0.04)',
                }}
              >
                <Play className="h-3 w-3" />
                {item.actionLabel}
              </button>
            )}
            <time className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
              {item.timeAgo}
            </time>
          </div>
        ))}

        {!expanded && activities.length > 3 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full text-center text-xs font-medium py-1.5 transition-colors"
            style={{ color: 'var(--color-brand-500)' }}
          >
            View all ({activities.length})
          </button>
        )}
      </div>
    </div>
  );
}
