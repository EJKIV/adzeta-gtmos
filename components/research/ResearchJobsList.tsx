'use client';

/**
 * Research Jobs List Component
 * 
 * Display active and completed research jobs with progress
 */

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Search,
  User,
  Building2,
  Cpu,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { ResearchJob, ResearchJobStatus } from '@/lib/research/types';

interface ResearchJobsListProps {
  userId: string;
  className?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const statusConfig: Record<ResearchJobStatus, { 
  icon: React.ElementType; 
  color: string; 
  label: string;
}> = {
  pending: { icon: Clock, color: 'text-yellow-400', label: 'Pending' },
  queued: { icon: Clock, color: 'text-blue-400', label: 'Queued' },
  active: { icon: Loader2, color: 'text-violet-400', label: 'Running' },
  paused: { icon: Clock, color: 'text-amber-400', label: 'Paused' },
  completed: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-400', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'text-slate-400', label: 'Cancelled' },
};

const jobTypeConfig: Record<ResearchJob['job_type'], { icon: React.ElementType; label: string }> = {
  prospect_search: { icon: Search, label: 'Prospect Search' },
  person_enrich: { icon: User, label: 'Person Enrichment' },
  company_enrich: { icon: Building2, label: 'Company Enrichment' },
  technographic_scan: { icon: Cpu, label: 'Technographic Scan' },
};

export function ResearchJobsList({ userId, className = '' }: ResearchJobsListProps) {
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');

  // Fetch jobs
  useEffect(() => {
    const fetchJobs = async () => {
      if (!userId) return;

      setLoading(true);
      
      const { data, error } = await supabase
        .from('research_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch research jobs:', error);
      } else {
        setJobs(data || []);
      }
      
      setLoading(false);
    };

    fetchJobs();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('research_jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'research_jobs',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setJobs((prev) => [payload.new as ResearchJob, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setJobs((prev) =
              prev.map((job) =
                job.id === payload.new.id ? (payload.new as ResearchJob) : job
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setJobs((prev) =
              prev.filter((job) => job.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    switch (filter) {
      case 'active':
        return ['pending', 'queued', 'active', 'paused'].includes(job.status);
      case 'completed':
        return ['completed', 'failed', 'cancelled'].includes(job.status);
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h3 className="text-lg font-semibold text-slate-100">Research Jobs</h3>
        
        <div className="flex items-center space-x-2">
          {(['active', 'completed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                ${filter === f 
                  ? 'bg-violet-600 text-white' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}
              `}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button
            onClick={() => window.location.reload()}
            className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="divide-y divide-slate-800">
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Search className="w-12 h-12 mb-4 opacity-50" />
            <p>No {filter} research jobs found</p>
            <p className="mt-2 text-sm">Try typing "research 50 VP Sales in fintech"</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))
        )}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: ResearchJob }) {
  const status = statusConfig[job.status];
  const jobType = jobTypeConfig[job.job_type];
  const StatusIcon = status.icon;
  const TypeIcon = jobType.icon;

  // Format timestamp
  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Format duration
  const formatDuration = (ms: number | undefined) => {
    if (!ms) return '-';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <div className="px-6 py-4 hover:bg-slate-800/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          {/* Status Icon */}
          <div className={`mt-1 ${status.color}`}>
            <StatusIcon className={`w-5 h-5 ${job.status === 'active' ? 'animate-spin' : ''}`} />
          </div>

          {/* Job Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <TypeIcon className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-300">
                {jobType.label}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full bg-slate-800 ${status.color}`}>
                {status.label}
              </span>
            </div>

            {/* Job Details */}
            <div className="mt-2 text-sm text-slate-400">
              {job.search_criteria?.person_titles && (
                <span>Titles: {job.search_criteria.person_titles.join(', ')}</span>
              )}
              {job.search_criteria?.industry && (
                <span className="ml-4">Industry: {job.search_criteria.industry}</span>
              )}
              {job.enrichment_target && (
                <span>Target: {job.enrichment_target}</span>
              )}
            </div>

            {/* Progress Bar */}
            {(job.status === 'active' || job.status === 'queued') && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Progress</span>
                  <span>{job.progress_percent}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-all duration-500"
                    style={{ width: `${job.progress_percent}%` }}
                  />
                </div>
                {job.completed_requests > 0 && (
                  <div className="mt-1 text-xs text-slate-500">
                    {job.completed_requests} completed {job.failed_requests > 0 && `(${job.failed_requests} failed)`}
                  </div>
                )}
              </div>
            )}

            {/* Results Summary */}
            {job.results_summary && (
              <div className="mt-2 flex items-center space-x-4 text-xs text-slate-500">
                {job.results_summary.prospects_found && (
                  <span>Found: {job.results_summary.prospects_found}</span>
                )}
                {job.results_summary.enriched && (
                  <span>Enriched: {job.results_summary.enriched}</span>
                )}
                {job.results_summary.avg_confidence && (
                  <span>Confidence: {Math.round(job.results_summary.avg_confidence * 100)}%</span>
                )}
              </div>
            )}

            {/* Error Message */}
            {job.error_message && (
              <div className="mt-2 text-xs text-red-400">
                Error: {job.error_message}
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="text-right text-xs text-slate-500 space-y-1">
          <div>Created: {formatDate(job.created_at)}</div>
          {job.started_at && (<div>Started: {formatDate(job.started_at)}</div>)}
          {job.completed_at && (<div>Completed: {formatDate(job.completed_at)}</div>)}
          {job.retry_count > 0 && (<div className="text-amber-400">Retries: {job.retry_count}</div>)}
        </div>
      </div>
    </div>
  );
}

export default ResearchJobsList;