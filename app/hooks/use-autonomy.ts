/**
 * Autonomy Dashboard Hooks
 *
 * Provides hooks for monitoring autonomous system behavior:
 * - Decision metrics and override rates
 * - Auto-created tasks
 * - Self-healing events
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  AutonomousTask,
  HealingEvent,
  AutonomyMetrics,
  AutonomyEvent
} from '@/lib/autonomy/types';

// ============================================================================
// Types
// ============================================================================

export interface AutonomyMetricsResult {
  data: AutonomyMetrics | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface AutonomousTasksResult {
  tasks: AutonomousTask[];
  pendingTasks: AutonomousTask[];
  completedToday: number;
  createdToday: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface SelfHealingResult {
  events: HealingEvent[];
  todayCount: number;
  weekCount: number;
  successRate: number;
  avgTimeToHealMs: number;
  escalationRate: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook: useAutonomyMetrics
// ============================================================================

export function useAutonomyMetrics(refreshInterval: number = 30000): AutonomyMetricsResult {
  const [data, setData] = useState<AutonomyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      const res = await globalThis.fetch('/api/autonomy/metrics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const metrics = await res.json();
      setData(metrics);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchMetrics]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchMetrics,
  };
}

// ============================================================================
// Hook: useAutonomousTasks
// ============================================================================

export function useAutonomousTasks(refreshInterval: number = 30000): AutonomousTasksResult {
  const [tasks, setTasks] = useState<AutonomousTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      const res = await globalThis.fetch('/api/autonomy/tasks');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // The API returns { tasks: [...], dataSource: string }
      // Map DB rows to AutonomousTask shape
      const rawTasks = json.tasks ?? [];
      const mapped: AutonomousTask[] = rawTasks.map((t: Record<string, unknown>) => ({
        id: t.id as string,
        type: (t.task_type as string) ?? 'kpi_investigation',
        title: (t.title as string) ?? '',
        description: (t.description as string) ?? '',
        priority: (t.priority as string) ?? 'medium',
        status: (t.status as string) ?? 'pending',
        trigger: {
          type: 'recommendation' as const,
          sourceId: (t.source_recommendation_id as string) ?? '',
          confidence: (t.confidence_score as number) ?? 50,
        },
        autoAssigned: true,
        assignedTo: t.assignee as string | undefined,
        createdAt: (t.created_at as string) ?? new Date().toISOString(),
        assignedAt: t.assignee ? (t.updated_at as string) : undefined,
        dueAt: t.due_date as string | undefined,
        completedAt: t.completed_at as string | undefined,
        context: {
          affectedMetrics: [],
        },
        execution: {
          attempts: (t.healing_attempts as number) ?? 0,
        },
      }));
      setTasks(mapped);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch tasks'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;
    const interval = setInterval(fetchTasks, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchTasks]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const pendingTasks = useMemo(() =>
    tasks.filter(t => t.status === 'pending' || t.status === 'assigned' || t.status === 'in_progress'),
    [tasks]
  );

  const createdToday = useMemo(() =>
    tasks.filter(t => t.createdAt.startsWith(today)).length,
    [tasks, today]
  );

  const completedToday = useMemo(() =>
    tasks.filter(t => t.status === 'completed' && t.completedAt?.startsWith(today)).length,
    [tasks, today]
  );

  return {
    tasks,
    pendingTasks,
    completedToday,
    createdToday,
    isLoading,
    isError,
    error,
    refetch: fetchTasks,
  };
}

// ============================================================================
// Hook: useSelfHealingEvents
// ============================================================================

export function useSelfHealingEvents(refreshInterval: number = 30000): SelfHealingResult {
  const [events, setEvents] = useState<HealingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      const res = await globalThis.fetch('/api/autonomy/healing');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setEvents(json.events ?? []);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch healing events'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;
    const interval = setInterval(fetchEvents, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchEvents]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);

  const todayCount = useMemo(() =>
    events.filter(e => e.startedAt.startsWith(today)).length,
    [events, today]
  );

  const weekCount = useMemo(() =>
    events.filter(e => e.startedAt >= weekAgo).length,
    [events, weekAgo]
  );

  const successRate = useMemo(() => {
    if (events.length === 0) return 0;
    const healed = events.filter(e => e.status === 'healed').length;
    return Math.round((healed / events.length) * 100);
  }, [events]);

  const avgTimeToHealMs = useMemo(() => {
    const healedEvents = events.filter(e => e.status === 'healed' && e.resolvedAt);
    if (healedEvents.length === 0) return 0;
    const totalTime = healedEvents.reduce((sum, e) => {
      return sum + (new Date(e.resolvedAt!).getTime() - new Date(e.startedAt).getTime());
    }, 0);
    return Math.round(totalTime / healedEvents.length);
  }, [events]);

  const escalationRate = useMemo(() => {
    if (events.length === 0) return 0;
    const escalated = events.filter(e => e.status === 'escalated').length;
    return parseFloat(((escalated / events.length) * 100).toFixed(1));
  }, [events]);

  return {
    events,
    todayCount,
    weekCount,
    successRate,
    avgTimeToHealMs,
    escalationRate,
    isLoading,
    isError,
    error,
    refetch: fetchEvents,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function formatAutonomyTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function getOverrideRateColor(rate: number): string {
  if (rate < 5) return 'text-emerald-600';
  if (rate < 10) return 'text-amber-600';
  return 'text-rose-600';
}

export function getHealingStatusColor(status: string): string {
  switch (status) {
    case 'healed': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'escalated': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'failed': return 'text-rose-600 bg-rose-50 border-rose-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

export function getTaskTypeIcon(type: string): string {
  switch (type) {
    case 'kpi_investigation': return '🔍';
    case 'unblock_work': return '🚧';
    case 'strategic_gap': return '🎯';
    case 'anomaly_response': return '⚡';
    case 'proactive_mitigation': return '🛡️';
    case 'ab_test_proposal': return '🧪';
    default: return '🤖';
  }
}

export function formatHealingStrategy(strategy: string): string {
  return strategy
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

// Export types
export type {
  AutonomyMetrics,
  AutonomousTask,
  HealingEvent,
  AutonomyEvent,
} from '@/lib/autonomy/types';
