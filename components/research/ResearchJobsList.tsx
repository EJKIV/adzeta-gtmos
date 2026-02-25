'use client';

/**
 * Research Jobs List Component
 *
 * Display active and completed research jobs with progress tracking,
 * stats dashboard, and action buttons.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  User,
  Building2,
  Cpu,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { ResearchJob, ResearchJobStatus } from '@/lib/research/types';
import { getSupabaseClient } from '@/lib/supabase-client';
import { JobStatsCards } from './JobStatsCards';
import { JobProgressBar } from './JobProgressBar';
import { JobActions } from './JobActions';

interface ResearchJobsListProps {
  userId: string;
  className?: string;
}

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
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const supabase = getSupabaseClient();

  // Fetch jobs function
  const fetchJobs = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('research_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setJobs(data || []);
    } catch (err) {
      console.error('Failed to fetch research jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  // Initial fetch and Realtime subscription
  useEffect(() => {
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
            setJobs((prev) =>
              prev.map((job) =>
                job.id === payload.new.id ? (payload.new as ResearchJob) : job
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setJobs((prev) =>
              prev.filter((job) => job.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, supabase, fetchJobs]);

  // Auto-refresh interval (5 seconds) as fallback to Realtime
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if not loading to avoid thrashing
      if (!loading) {
        fetchJobs();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchJobs, loading]);

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

  // Handle action completion
  const handleAction = useCallback((action: string, job: ResearchJob) => {
    // Refresh jobs after action to show updated state
    fetchJobs();
  }, [fetchJobs]);

  if (loading && jobs.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className={`bg-slate-900/50 border border-slate-800 rounded-xl p-6 ${className}`}>
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-6 h-6" />
          <div>
            <p className="font-medium">Error loading jobs</p>
            <p className="text-sm text-red-400/80">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchJobs}
          className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Dashboard */}
      <JobStatsCards jobs={jobs} />

      {/* Jobs List Container */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
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
              onClick={fetchJobs}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
              title="Refresh now"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
              <JobCard key={job.id} job={job} onAction={handleAction} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface JobCardProps {
  job: ResearchJob;
  onAction?: (action: string, job: ResearchJob) => void;
}

function JobCard({ job, onAction }: JobCardProps) {
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

  return (
    <div className="px-6 py-4 hover:bg-slate-800/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start space-x-4 flex-1">
          {/* Status Icon */}
          <div className={`mt-1 ${status.color}`}>
            <StatusIcon className={`w-5 h-5 ${job.status === 'active' ? 'animate-spin' : ''}`} />
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
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

            {/* Enhanced Progress Bar */}
            {(job.status === 'active' || job.status === 'queued') && (
              <div className="mt-3">
                <JobProgressBar job={job} size="sm" showTimeEstimate />
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

            {/* Action Buttons */}
            <div className="mt-3">
              <JobActions job={job} onAction={onAction} />
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="text-right text-xs text-slate-500 space-y-1 shrink-0">
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
