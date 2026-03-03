/**
 * Progress Indicator Component
 * 
 * Displays task progress with:
 * - Steps visualization (1 of 5, checkmarks for complete)
 * - Percentage complete with animated progress bar
 * - Status badge: "Running", "Completed", "Failed", "Waiting"
 * - Estimated time remaining (based on elapsed time)
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Clock, RotateCcw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { TaskStatus, ProgressIndicatorProps } from '@/types/progress';
import { useProgress } from '@/hooks/use-progress';

// Status badge configuration
const STATUS_CONFIG: Record<TaskStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: React.ReactNode;
}> = {
  waiting: {
    label: 'Waiting',
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
    icon: <Clock className="h-3 w-3" />,
  },
  running: {
    label: 'Running',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
    >
      <Clock className="h-3 w-3" />
    </motion.div>,
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: <Check className="h-3 w-3" />,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

export function ProgressIndicator({
  taskId,
  title,
  showSteps = true,
  showPercentage = true,
  showTimeEstimate = true,
  showHeartbeat = true,
  compact = false,
  onRetry,
  onViewLogs,
  onEscalate,
}: ProgressIndicatorProps) {
  const { progress, error, isConnected } = useProgress(taskId);
  const [showDetails, setShowDetails] = useState(false);

  if (!progress && !isConnected) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Clock className="h-4 w-4 animate-pulse" />
        <span>Initializing progress...</span>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  const status = progress.status;
  const statusConfig = STATUS_CONFIG[status];
  const percent = Math.min(100, Math.max(0, progress.percentComplete));

  // Calculate estimated time remaining
  const estimatedTime = calculateTimeRemaining(progress);

  const isError = status === 'failed';
  const isComplete = status === 'completed';

  return (
    <div
      className={cn(
        'w-full max-w-2xl rounded-xl border overflow-hidden transition-all duration-300',
        isComplete && 'border-green-200 shadow-sm',
        isError && 'border-red-200 shadow-sm',
        !isComplete && !isError && 'border-slate-200',
        compact && 'max-w-md',
      )}
      style={{
        backgroundColor: isError ? '#fef2f2' : 
                          isComplete ? '#f0fdf4' : 
                          'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {showHeartbeat && (
            <HeartbeatDot status={status} />
          )}
          <div className="min-w-0">
            <h4 
              className="text-sm font-medium truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {title || progress.message || 'Task in progress'}
            </h4>
            <p 
              className="text-xs truncate"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {progress.agentLabel || 'Processing...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status Badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
              statusConfig.color,
              statusConfig.bgColor,
            )}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </span>

          {/* Expand/Collapse */}
          {progress.subtasks.length > 0 && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 rounded hover:bg-slate-100 transition-colors"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progress Section */}
      <div className="px-4 pb-3">
        {/* Percentage and Time */}
        <div className="flex items-center justify-between mb-2">
          {showPercentage && (
            <span 
              className="text-sm font-semibold"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {percent}%
            </span>
          )}
          {showTimeEstimate && estimatedTime && (
            <span 
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {estimatedTime}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-2 rounded-full overflow-hidden bg-slate-200">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              background: isError 
                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                : isComplete
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : 'linear-gradient(90deg, #64748b, #3b82f6, #22c55e)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>

        {/* Steps Visualization */}
        {showSteps && !compact && progress.totalSteps > 0 && (
          <div className="mt-3">
            <StepsVisualization 
              currentStep={progress.currentStep}
              totalSteps={progress.totalSteps}
              status={status}
            />
          </div>
        )}
      </div>

      {/* Error State */}
      <AnimatePresence>
        {isError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t px-4 py-3 space-y-2"
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Task Failed</span>
            </div>
            {progress.errorMessage && (
              <p className="text-xs text-red-500 line-clamp-2">
                {progress.errorMessage}
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Retry
                </button>
              )}
              {onViewLogs && (
                <button
                  onClick={onViewLogs}
                  className="text-xs text-red-600 hover:underline"
                >
                  View logs
                </button>
              )}
              {onEscalate && (
                <button
                  onClick={onEscalate}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Escalate
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtasks Details */}
      <AnimatePresence>
        {showDetails && progress.subtasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t px-4 py-3 space-y-2"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p className="text-xs font-medium mb-2"
               style={{ color: 'var(--color-text-secondary)' }}>
              Subtasks ({progress.subtasks.filter(s => s.status === 'completed').length}/{progress.subtasks.length})
            </p>
            <div className="space-y-2">
              {progress.subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <StepCheckmark 
                    status={subtask.status} 
                    size="sm" 
                  />
                  <span className="flex-1 truncate"
                        style={{ color: 'var(--color-text-secondary)' }}>
                    {subtask.label || subtask.message}
                  </span>
                  <span 
                    className="text-xs"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {subtask.percentComplete}%
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Steps Visualization Component
 * Shows numbered circles (1,2,3,4,5) with connecting lines
 */
function StepsVisualization({
  currentStep,
  totalSteps,
  status,
}: {
  currentStep: number;
  totalSteps: number;
  status: TaskStatus;
}) {
  const steps = Array.from({ length: Math.min(totalSteps, 8) }, (_, i) => i + 1);

  return (
    <div className="flex items-center">
      {steps.map((step, index) => {
        const isCompleted = step < currentStep || (step === currentStep && status === 'completed');
        const isCurrent = step === currentStep && status === 'running';
        const isWaiting = step > currentStep;

        return (
          <div key={step} className="flex items-center">
            {/* Step Circle */}
            <motion.div
              initial={false}
              animate={{
                scale: isCurrent ? [1, 1.1, 1] : 1,
              }}
              transition={{ duration: 1.5, repeat: isCurrent ? Infinity : 0 }}
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                isCompleted && 'bg-green-500 text-white',
                isCurrent && 'bg-blue-500 text-white ring-2 ring-blue-200',
                isWaiting && 'bg-slate-200 text-slate-500',
              )}
            >
              {isCompleted ? (
                <Check className="h-3 w-3" />
              ) : (
                step
              )}
            </motion.div>

            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div className="w-8 h-0.5 bg-slate-200 relative mx-1">
                <div
                  className="absolute inset-y-0 left-0 bg-green-500 transition-all duration-500"
                  style={{ width: isCompleted ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Animated heartbeat dot
 */
function HeartbeatDot({ status }: { status: TaskStatus }) {
  if (status !== 'running') {
    return <div className="w-2 h-2 rounded-full bg-slate-300" />;
  }

  return (
    <motion.div
      className="w-2 h-2 rounded-full bg-blue-500"
      animate={{
        scale: [1, 1.5, 1],
        opacity: [0.7, 1, 0.7],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

/**
 * Step checkmark component
 */
function StepCheckmark({ 
  status, 
  size = 'md' 
}: { 
  status: TaskStatus; 
  size?: 'sm' | 'md' | 'lg' 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  if (status === 'completed') {
    return (
      <div className={cn(
        `${sizeClasses[size]} rounded-full bg-green-500 flex items-center justify-center`,
      )}>
        <Check className={cn(iconSizes[size], 'text-white')}
        />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className={cn(
        `${sizeClasses[size]} rounded-full bg-red-500 flex items-center justify-center`,
      )}>
        <AlertCircle className={cn(iconSizes[size], 'text-white')}
        />
      </div>
    );
  }

  if (status === 'running') {
    return (
      <div className={cn(
        `${sizeClasses[size]} rounded-full border-2 border-blue-500 border-t-transparent animate-spin`,
      )}
      />
    );
  }

  return (
    <div className={cn(
      `${sizeClasses[size]} rounded-full bg-slate-200`,
    )}
    />
  );
}

/**
 * Calculate estimated time remaining
 */
function calculateTimeRemaining(progress: {
  startedAt: string;
  percentComplete: number;
}): string | null {
  if (progress.percentComplete <= 0 || progress.percentComplete >= 100) {
    return null;
  }

  const startedAt = new Date(progress.startedAt).getTime();
  const elapsedMs = Date.now() - startedAt;
  const estimatedTotalMs = (elapsedMs / progress.percentComplete) * 100;
  const remainingMs = estimatedTotalMs - elapsedMs;

  if (remainingMs < 60000) {
    return `${Math.ceil(remainingMs / 1000)}s remaining`;
  } else if (remainingMs < 3600000) {
    return `${Math.ceil(remainingMs / 60000)}m remaining`;
  } else {
    return `${(remainingMs / 3600000).toFixed(1)}h remaining`;
  }
}

export default ProgressIndicator;
