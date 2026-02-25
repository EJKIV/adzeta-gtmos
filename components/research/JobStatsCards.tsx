/** JobStatsCards.tsx * * 4 stat cards for research jobs dashboard: * - Active Jobs * - Completed Today * - Failed Jobs * - Avg Enrichment Time */

'use client';

import React from 'react';
import { cn, formatNumber } from '@/lib/utils';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { ResearchJob, ResearchJobStatus } from '@/lib/research/types';

interface JobStatsCardsProps {
  jobs: ResearchJob[];
  className?: string;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'red' | 'amber';
  subtitle?: string;
  delta?: string;
  deltaClass?: 'positive' | 'negative' | 'neutral';
  loading?: boolean;
  index?: number;
}

const colorConfig = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    iconBg: 'bg-blue-500/20',
  },
  green: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    iconBg: 'bg-red-500/20',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
  },
};

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color, 
  subtitle,
  delta,
  deltaClass = 'neutral',
  loading,
  index = 0 
}: StatCardProps) {
  const colors = colorConfig[color];

  const getTrendIcon = () => {
    switch (deltaClass) {
      case 'positive':
        return <TrendingUp className="h-3 w-3" />;
      case 'negative':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = () => {
    switch (deltaClass) {
      case 'positive':
        return 'text-emerald-400';
      case 'negative':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className={cn(
        'rounded-xl p-5 border border-slate-800',
        'animate-pulse bg-slate-900/50'
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-24 bg-slate-800 rounded" />
          <div className="h-8 w-8 bg-slate-800 rounded-lg" />
        </div>
        <div className="h-8 w-16 bg-slate-800 rounded" />
      </div>
    );
  }

  const formattedValue = typeof value === 'number' ? formatNumber(value) : value;

  return (
    <div
      className={cn(
        'relative rounded-xl p-5 border transition-all duration-200',
        'hover:shadow-lg hover:shadow-black/10',
        'hover:-translate-y-0.5',
        'opacity-0 animate-fade-in-up',
        colors.bg,
        colors.border
      )}
      style={{
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderColor: colors.border.replace('border-', '').replace('/20', ''),
        animationDelay: `${index * 100}ms`,
        animationFillMode: 'forwards',
      }}
      role="region"
      aria-label={`${label} statistic`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-400">
          {label}
        </p>
        <div className={cn(
          'p-2 rounded-lg',
          colors.iconBg
        )}>
          <Icon className={cn('w-5 h-5', colors.text)} />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-100 tabular-nums">
          {formattedValue}
        </span>
        {delta && (
          <span className={cn(
            'inline-flex items-center gap-0.5 text-xs font-medium',
            getTrendColor()
          )}>
            {getTrendIcon()}
            {delta}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function JobStatsCards({ jobs, className }: JobStatsCardsProps) {
  // Calculate stats
  const activeStatuses: ResearchJobStatus[] = ['pending', 'queued', 'active', 'paused'];
  const completedStatus: ResearchJobStatus = 'completed';
  const failedStatus: ResearchJobStatus = 'failed';

  // Active jobs count
  const activeJobs = jobs.filter(job => activeStatuses.includes(job.status)).length;

  // Completed today (since midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedToday = jobs.filter(job => 
    job.status === completedStatus && 
    job.completed_at && 
    new Date(job.completed_at) >= today
  ).length;

  // Failed jobs count
  const failedJobs = jobs.filter(job => job.status === failedStatus).length;

  // Average enrichment time for completed jobs
  const completedJobs = jobs.filter(job => 
    job.status === completedStatus && 
    job.started_at && 
    job.completed_at
  );
  
  let avgEnrichmentTime = 0;
  if (completedJobs.length > 0) {
    const totalDuration = completedJobs.reduce((sum, job) => {
      const start = new Date(job.started_at!).getTime();
      const end = new Date(job.completed_at!).getTime();
      return sum + (end - start);
    }, 0);
    avgEnrichmentTime = Math.round(totalDuration / completedJobs.length / 1000); // in seconds
  }

  // Format average time
  const formatAvgTime = (seconds: number): string => {
    if (seconds === 0) return '—';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className={cn(
      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
      className
    )}>
      <StatCard
        label="Active Jobs"
        value={activeJobs}
        icon={Activity}
        color="blue"
        subtitle={activeJobs === 0 ? 'No jobs running' : `${activeJobs} in progress`}
        index={0}
      />
      <StatCard
        label="Completed Today"
        value={completedToday}
        icon={CheckCircle2}
        color="green"
        subtitle={completedToday === 0 ? 'Nothing finished today' : 'All completed successfully'}
        delta={completedToday > 0 ? `+${completedToday}` : undefined}
        deltaClass={completedToday > 0 ? 'positive' : 'neutral'}
        index={1}
      />
      <StatCard
        label="Failed Jobs"
        value={failedJobs}
        icon={XCircle}
        color="red"
        subtitle={failedJobs === 0 ? 'All systems operational' : 'Needs attention'}
        delta={failedJobs > 0 ? `${failedJobs}` : undefined}
        deltaClass={failedJobs > 0 ? 'negative' : 'neutral'}
        index={2}
      />
      <StatCard
        label="Avg Enrichment Time"
        value={formatAvgTime(avgEnrichmentTime)}
        icon={Clock}
        color="amber"
        subtitle={avgEnrichmentTime === 0 ? 'No completed jobs yet' : `Based on ${completedJobs.length} jobs`}
        index={3}
      />
    </div>
  );
}

export default JobStatsCards;