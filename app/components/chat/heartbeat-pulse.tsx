/**
 * Heartbeat Pulse Component
 * 
 * Shows task heartbeat with:
 * - "Working..." animated pulse (last update within 30s)
 * - "Last update: 2m ago" warning (stale >2min)
 * - "Task completed" checkmark with timestamp
 * - Click to expand: see full sub-task breakdown
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Zap, Users } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { TaskStatus, HeartbeatPulseProps, SubTask } from '@/types/progress';

// Stale thresholds
const HEALTHY_THRESHOLD_MS = 30_000; // 30 seconds
const STALE_THRESHOLD_MS = 2 * 60_000; // 2 minutes

export function HeartbeatPulse({
  taskId,
  lastUpdateAt,
  status,
  expanded: controlledExpanded,
  onExpand,
  subtasks = [],
}: HeartbeatPulseProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;
  const setIsExpanded = onExpand 
    ? (v: boolean) => v ? onExpand?.() : null
    : setInternalExpanded;

  // Calculate heartbeat state
  const heartbeat = useMemo(() => {
    const now = Date.now();
    const lastUpdate = new Date(lastUpdateAt).getTime();
    const elapsed = now - lastUpdate;

    const isHealthy = elapsed < HEALTHY_THRESHOLD_MS;
    const isStale = elapsed >= STALE_THRESHOLD_MS;
    const isTerminal = status === 'completed' || status === 'failed' || status === 'cancelled';

    let icon: React.ReactNode;
    let text: string;
    let state: 'healthy' | 'stale' | 'terminal';

    if (isTerminal) {
      state = 'terminal';
      if (status === 'completed') {
        icon = <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
        text = `Completed ${formatTimeAgo(lastUpdate)}`;
      } else if (status === 'failed') {
        icon = <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
        text = `Failed ${formatTimeAgo(lastUpdate)}`;
      } else {
        icon = <AlertCircle className="h-3.5 w-3.5 text-slate-400" />;
        text = `Cancelled ${formatTimeAgo(lastUpdate)}`;
      }
    } else if (isStale) {
      state = 'stale';
      icon = <Clock className="h-3.5 w-3.5 text-amber-500" />;
      text = `Last update: ${formatDuration(elapsed)} ago`;
    } else if (isHealthy) {
      state = 'healthy';
      icon = (
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Activity className="h-3.5 w-3.5 text-blue-500" />
        </motion.div>
      );
      text = 'Working...';
    } else {
      state = 'healthy'; // Between healthy and stale
      icon = <Clock className="h-3.5 w-3.5 text-slate-400" />;
      text = `Last update: ${formatDuration(elapsed)} ago`;
    }

    return { icon, text, state, elapsed };
  }, [lastUpdateAt, status]);

  // Calculate subtask statistics
  const stats = useMemo(() => {
    const total = subtasks.length;
    const completed = subtasks.filter(s => s.status === 'completed').length;
    const running = subtasks.filter(s => s.status === 'running').length;
    const failed = subtasks.filter(s => s.status === 'failed').length;
    const active = running + subtasks.filter(s => s.status === 'waiting').length;

    return { total, completed, running, failed, active };
  }, [subtasks]);

  const showExpand = subtasks.length > 0 && status !== 'completed';

  return (
    <div
      className={cn(
        'w-full rounded-lg border transition-all duration-200',
        heartbeat.state === 'healthy' && 'border-blue-100 bg-blue-50/30',
        heartbeat.state === 'stale' && 'border-amber-100 bg-amber-50/30',
        heartbeat.state === 'terminal' && status === 'completed' && 'border-green-100 bg-green-50/30',
        heartbeat.state === 'terminal' && status === 'failed' && 'border-red-100 bg-red-50/30',
      )}
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg-elevated)',
      }}
    >
      {/* Header - Always visible */}
      <div 
        className={cn(
          'flex items-center gap-2 px-3 py-2',
          showExpand && 'cursor-pointer hover:bg-slate-50/50'
        )}
        onClick={() => showExpand && setIsExpanded(!isExpanded)}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">{heartbeat.icon}</div>

        {/* Status Text */}
        <span 
          className={cn(
            'text-xs flex-1',
            heartbeat.state === 'healthy' && 'text-blue-600',
            heartbeat.state === 'stale' && 'text-amber-600',
            heartbeat.state === 'terminal' && status === 'completed' && 'text-green-600',
            heartbeat.state === 'terminal' && status === 'failed' && 'text-red-600',
            heartbeat.state === 'terminal' && status === 'cancelled' && 'text-slate-500',
          )}
        >
          {heartbeat.text}
        </span>

        {/* Subtask Summary */}
        {subtasks.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] flex items-center gap-1"
                  style={{ color: 'var(--color-text-tertiary)' }}>
              <Users className="h-3 w-3" />
              {stats.completed}/{stats.total}
            </span>
            {showExpand && (
              <ChevronDown 
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  isExpanded && 'rotate-180',
                )}
                style={{ color: 'var(--color-text-tertiary)' }}
              />
            )}
          </div>
        )}
      </div>

      {/* Expanded Subtask Details */}
      <AnimatePresence>
        {isExpanded && subtasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t px-3 py-2 space-y-1"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium uppercase tracking-wide"
                    style={{ color: 'var(--color-text-tertiary)' }}>
                Subtasks
              </span>
              <div className="flex gap-1">
                {stats.running > 0 && (
                  <Badge 
                    variant="blue" 
                    text={`${stats.running} running`} 
                    icon={<Activity className="h-2.5 w-2.5" />}
                    />
                )}
                {stats.failed > 0 && (
                  <Badge 
                    variant="red" 
                    text={`${stats.failed} failed`} 
                    icon={<AlertCircle className="h-2.5 w-2.5" />}
                    />
                )}
              </div>
            </div>

            <div className="space-y-1 max-h-40 overflow-y-auto">
              {subtasks.map((subtask) => (
                <SubtaskRow key={subtask.id} subtask={subtask} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Subtask row component
 */
function SubtaskRow({ subtask }: { subtask: SubTask }) {
  const status = subtask.status;

  return (
    <div 
      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-slate-50/50 text-sm"
    >
      {/* Status Indicator */}
      <div className="flex-shrink-0">
        {<SubtaskStatusIcon status={status} />}
      </div>

      {/* Task Label */}
      <span 
        className="flex-1 truncate text-xs"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {subtask.label || subtask.message}
      </span>

      {/* Progress */}
      <div className="flex-shrink-0 flex items-center gap-2"
      >
        {status === 'running' && (
          <div className="w-12 h-1 rounded-full bg-slate-200 overflow-hidden">
            <div 
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${subtask.percentComplete}%` }}
            />
          </div>
        )}
        
        <span 
          className="text-[10px] w-8 text-right tabular-nums"
          style={{ 
            color: status === 'completed' 
              ? 'var(--color-success)' 
              : status === 'failed'
              ? 'var(--color-error)'
              : 'var(--color-text-tertiary)'
          }}
        >
          {status === 'completed' ? 'Done' 
            : status === 'failed' ? 'Failed'
            : `${subtask.percentComplete}%`}
        </span>
      </div>
    </div>
  );
}

/**
 * Subtask status icon
 */
function SubtaskStatusIcon({ status }: { status: TaskStatus }) {
  if (status === 'completed') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  }
  if (status === 'failed') {
    return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
  }
  if (status === 'running') {
    return (
      <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    );
  }
  return <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />;
}

/**
 * Small badge component
 */
function Badge({ 
  variant, 
  text, 
  icon 
}: { 
  variant: 'blue' | 'green' | 'red' | 'gray'; 
  text: string; 
  icon?: React.ReactNode 
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    gray: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border',
      colors[variant]
    )}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {text}
    </span>
  );
}

/**
 * Format duration for display
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Format time ago
 */
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) {
    return 'just now';
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h ago`;
  }
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default HeartbeatPulse;
