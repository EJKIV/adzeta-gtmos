/** JobActions.tsx * * Action buttons for research jobs: * - Cancel button for running jobs * - Retry button for failed jobs * - View results for completed jobs */

'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  XCircle, 
  RefreshCw, 
  Eye,
  Loader2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { ResearchJob } from '@/lib/research/types';
import { getSupabaseClient } from '@/lib/supabase-client';

interface JobActionsProps {
  job: ResearchJob;
  className?: string;
  onAction?: (action: string, job: ResearchJob) => void;
}

type ActionStatus = 'idle' | 'loading' | 'success' | 'error';
interface ActionState {
  status: ActionStatus;
  message?: string;
}

const buttonConfig = {
  cancel: {
    icon: XCircle,
    label: 'Cancel',
    loadingLabel: 'Cancelling...',
    color: 'red',
    variant: 'outline' as const,
  },
  retry: {
    icon: RefreshCw,
    label: 'Retry',
    loadingLabel: 'Retrying...',
    color: 'amber',
    variant: 'outline' as const,
  },
  view: {
    icon: Eye,
    label: 'View Results',
    loadingLabel: 'Loading...',
    color: 'emerald',
    variant: 'solid' as const,
  },
};

interface ActionButtonProps {
  type: 'cancel' | 'retry' | 'view';
  onClick: () => void;
  state: ActionState;
  disabled?: boolean;
}

function ActionButton({ type, onClick, state, disabled }: ActionButtonProps) {
  const config = buttonConfig[type];
  const Icon = state.status === 'loading' ? Loader2 : 
               state.status === 'success' ? CheckCircle2 :
               state.status === 'error' ? AlertTriangle : config.icon;

  const baseClasses = cn(
    'inline-flex items-center gap-2 px-3 py-2 rounded-lg',
    'text-sm font-medium transition-all duration-200',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-offset-slate-950 focus-visible:ring-violet-500',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  const colorClasses: Record<string, { outline: string; solid: string }> = {
    red: {
      outline: cn(
        'border border-red-500/30 text-red-400',
        'hover:bg-red-500/10 hover:border-red-500/50',
        'active:bg-red-500/20'
      ),
      solid: '',
    },
    amber: {
      outline: cn(
        'border border-amber-500/30 text-amber-400',
        'hover:bg-amber-500/10 hover:border-amber-500/50',
        'active:bg-amber-500/20'
      ),
      solid: '',
    },
    emerald: {
      outline: cn(
        'border border-emerald-500/30 text-emerald-400',
        'hover:bg-emerald-500/10 hover:border-emerald-500/50',
        'active:bg-emerald-500/20'
      ),
      solid: cn(
        'bg-emerald-600 text-white',
        'hover:bg-emerald-500',
        'active:bg-emerald-700',
        'shadow-lg shadow-emerald-500/20'
      ),
    },
  };

  const isLoading = state.status === 'loading';
  const showSuccess = state.status === 'success';

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        baseClasses,
        colorClasses[config.color][config.variant],
        isLoading && 'cursor-wait',
        showSuccess && 'opacity-75'
      )}
      aria-label={isLoading ? config.loadingLabel : config.label}
    >
      <Icon className={cn(
        'w-4 h-4',
        isLoading && 'animate-spin'
      )} />
      <span>
        {isLoading ? config.loadingLabel : 
         showSuccess ? 'Done' : config.label}
      </span>
    </button>
  );
}

export function JobActions({ job, className, onAction }: JobActionsProps) {
  const [cancelState, setCancelState] = useState<ActionState>({ status: 'idle' });
  const [retryState, setRetryState] = useState<ActionState>({ status: 'idle' });

  const supabase = getSupabaseClient();

  // Determine which actions are available
  const canCancel = ['pending', 'queued', 'active', 'paused'].includes(job.status);
  const canRetry = job.status === 'failed';
  const canView = job.status === 'completed' && job.results_summary;

  const handleCancel = async () => {
    if (!canCancel) return;

    setCancelState({ status: 'loading' });
    
    try {
      const { error } = await supabase
        .from('research_jobs')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (error) throw error;

      setCancelState({ status: 'success' });
      onAction?.('cancel', job);
      
      // Reset after a delay
      setTimeout(() => setCancelState({ status: 'idle' }), 2000);
    } catch (err) {
      setCancelState({ 
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to cancel'
      });
      setTimeout(() => setCancelState({ status: 'idle' }), 3000);
    }
  };

  const handleRetry = async () => {
    if (!canRetry) return;

    setRetryState({ status: 'loading' });
    
    try {
      const { error } = await supabase
        .from('research_jobs')
        .update({ 
          status: 'queued',
          retry_count: (job.retry_count || 0) + 1,
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (error) throw error;

      setRetryState({ status: 'success' });
      onAction?.('retry', job);
      
      setTimeout(() => setRetryState({ status: 'idle' }), 2000);
    } catch (err) {
      setRetryState({ 
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to retry'
      });
      setTimeout(() => setRetryState({ status: 'idle' }), 3000);
    }
  };

  const handleView = () => {
    if (!canView) return;
    
    // Trigger the view action callback
    // The parent component can handle showing results modal
    onAction?.('view', job);
  };

  // If no actions available, return null
  if (!canCancel && !canRetry && !canView) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center gap-2',
      className
    )}>
      {canCancel && (
        <ActionButton
          type="cancel"
          onClick={handleCancel}
          state={cancelState}
        />
      )}
      {canRetry && (
        <ActionButton
          type="retry"
          onClick={handleRetry}
          state={retryState}
        />
      )}
      {canView && (
        <ActionButton
          type="view"
          onClick={handleView}
          state={{ status: 'idle' }}
        />
      )}
    </div>
  );
}

export default JobActions;