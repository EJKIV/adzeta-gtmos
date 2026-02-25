/** JobProgressBar.tsx * * Enhanced progress bar component for running jobs with: * - Visual percentage bar * - Estimated time remaining * - Smooth animations */

'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Clock } from 'lucide-react';
import { ResearchJob } from '@/lib/research/types';

interface JobProgressBarProps {
  job: ResearchJob;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTimeEstimate?: boolean;
}

interface TimeEstimate {
  remainingMs: number;
  text: string;
}

function calculateTimeEstimate(job: ResearchJob): TimeEstimate | null {
  // Only estimate for active jobs with progress
  if (job.status !== 'active' || !job.started_at || job.progress_percent <= 0 || job.progress_percent >= 100) {
    return null;
  }

  const startTime = new Date(job.started_at).getTime();
  const now = Date.now();
  const elapsedMs = now - startTime;
  
  if (elapsedMs <= 0) return null;

  // Calculate estimated total time based on current progress
  const progressMultiplier = 100 / job.progress_percent;
  const estimatedTotalMs = elapsedMs * progressMultiplier;
  const remainingMs = Math.max(0, estimatedTotalMs - elapsedMs);

  // Format remaining time
  let text: string;
  const seconds = Math.round(remainingMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    text = `${hours}h ${remainingMinutes}m remaining`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    text = `${minutes}m ${remainingSeconds}s remaining`;
  } else {
    text = `${seconds}s remaining`;
  }

  return { remainingMs, text };
}

const sizeConfig = {
  sm: {
    height: 'h-1.5',
    text: 'text-xs',
    icon: 'w-3 h-3',
  },
  md: {
    height: 'h-2',
    text: 'text-sm',
    icon: 'w-4 h-4',
  },
  lg: {
    height: 'h-3',
    text: 'text-base',
    icon: 'w-5 h-5',
  },
};

export function JobProgressBar({ 
  job, 
  className, 
  size = 'md',
  showTimeEstimate = true 
}: JobProgressBarProps) {
  const [mounted, setMounted] = useState(false);
  const [timeEstimate, setTimeEstimate] = useState<TimeEstimate | null>(null);

  // Calculate time estimate on mount and when job changes
  useEffect(() => {
    setMounted(true);
    setTimeEstimate(calculateTimeEstimate(job));
  }, [job]);

  // Update time estimate every second
  useEffect(() => {
    if (job.status !== 'active') return;

    const interval = setInterval(() => {
      setTimeEstimate(calculateTimeEstimate(job));
    }, 1000);

    return () => clearInterval(interval);
  }, [job]);

  const config = sizeConfig[size];
  const progress = Math.max(0, Math.min(100, job.progress_percent || 0));

  // Don't show time estimate for queued or pending jobs
  const showEstimate = showTimeEstimate && 
    job.status === 'active' && 
    timeEstimate && 
    progress > 0 && 
    progress < 100;

  // Get color based on progress
  const getBarColor = () => {
    if (progress <= 30) return 'from-red-500 to-red-400';
    if (progress <= 70) return 'from-amber-500 to-amber-400';
    return 'from-emerald-500 to-emerald-400';
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Progress label row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Loader2 className={cn(
            'text-violet-400 animate-spin',
            config.icon
          )} />
          <span className={cn(
            'font-medium text-slate-300',
            config.text
          )}>
            {progress}%
          </span>
          <span className={cn('text-slate-500', config.text)}>
            complete
          </span>
        </div>
        {showEstimate && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className={config.icon} />
            <span className={config.text}>
              {timeEstimate.text}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className={cn(
        'w-full rounded-full overflow-hidden',
        'bg-slate-800/80',
        config.height
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            'bg-gradient-to-r',
            getBarColor(),
            mounted ? '' : 'w-0'
          )}
          style={{ 
            width: mounted ? `${progress}%` : '0%',
            transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Job progress: ${progress}%`}
        />
      </div>

      {/* Additional info */}
      {job.completed_requests > 0 && (
        <div className={cn(
          'mt-2 flex items-center gap-3 text-slate-500',
          config.text
        )}>
          <span>
            {job.completed_requests} completed
            {job.total_requests ? ` / ${job.total_requests} total` : ''}
          </span>
          {job.failed_requests > 0 && (
            <span className="text-red-400">
              {job.failed_requests} failed
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default JobProgressBar;