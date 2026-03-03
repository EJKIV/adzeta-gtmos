'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/app/hooks/use-toast';
import type {
  AdzetaWorkQueueItem,
  AdzetaAutonomyGate,
  AdzetaProactiveSuggestion,
  AdzetaAgentMetric,
  ApprovalState,
} from '@/types/adzeta';

// ============================================================================
// Shared types
// ============================================================================

interface HookResult<T> {
  data: T;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// useWorkQueue
// ============================================================================

interface WorkQueueResult extends HookResult<AdzetaWorkQueueItem[]> {
  approveTask: (taskId: string, notes?: string) => Promise<void>;
  rejectTask: (taskId: string, notes?: string) => Promise<void>;
  modifyTask: (taskId: string, modifications: Record<string, unknown>, notes?: string) => Promise<void>;
}

export function useWorkQueue(state?: ApprovalState): WorkQueueResult {
  const [data, setData] = useState<AdzetaWorkQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      const params = new URLSearchParams();
      if (state) params.set('state', state);
      const res = await globalThis.fetch(`/api/adzeta/work-queue?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.tasks ?? []);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch work queue'));
    } finally {
      setIsLoading(false);
    }
  }, [state]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const actionTask = useCallback(async (
    taskId: string,
    action: 'approve' | 'reject' | 'modify',
    notes?: string,
    modifications?: Record<string, unknown>
  ) => {
    // Optimistic update
    setData(prev => prev.filter(t => t.task_id !== taskId));
    try {
      const res = await globalThis.fetch(`/api/adzeta/work-queue/${taskId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes, modifications }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const labels = { approve: 'Task approved', reject: 'Task rejected', modify: 'Task modified' };
      toast({ title: labels[action] });
      await fetchData();
    } catch (err) {
      toast({ title: 'Action failed', description: (err as Error).message, variant: 'destructive' });
      await fetchData();
    }
  }, [fetchData, toast]);

  const approveTask = useCallback(
    (taskId: string, notes?: string) => actionTask(taskId, 'approve', notes),
    [actionTask]
  );
  const rejectTask = useCallback(
    (taskId: string, notes?: string) => actionTask(taskId, 'reject', notes),
    [actionTask]
  );
  const modifyTask = useCallback(
    (taskId: string, modifications: Record<string, unknown>, notes?: string) =>
      actionTask(taskId, 'modify', notes, modifications),
    [actionTask]
  );

  return { data, isLoading, isError, error, refetch: fetchData, approveTask, rejectTask, modifyTask };
}

// ============================================================================
// useAutonomyGates
// ============================================================================

interface GateWithProgress extends AdzetaAutonomyGate {
  progress: {
    runs_progress: number;
    success_rate: number;
    confidence_progress: number;
  };
}

interface GatesResult extends HookResult<GateWithProgress[]> {
  toggleGate: (gateId: string, action: 'lock' | 'unlock', reason?: string) => Promise<void>;
}

export function useAutonomyGates(): GatesResult {
  const [data, setData] = useState<GateWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      const res = await globalThis.fetch('/api/adzeta/autonomy/gates');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.gates ?? []);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch gates'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleGate = useCallback(async (gateId: string, action: 'lock' | 'unlock', reason?: string) => {
    try {
      const res = await globalThis.fetch(`/api/adzeta/autonomy/gates/${gateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ title: action === 'unlock' ? 'Gate unlocked' : 'Gate locked' });
      await fetchData();
    } catch (err) {
      toast({ title: 'Gate toggle failed', description: (err as Error).message, variant: 'destructive' });
    }
  }, [fetchData, toast]);

  return { data, isLoading, isError, error, refetch: fetchData, toggleGate };
}

// ============================================================================
// useProactiveSuggestions
// ============================================================================

interface SuggestionsResult extends HookResult<AdzetaProactiveSuggestion[]> {
  acceptSuggestion: (id: string) => Promise<void>;
  dismissSuggestion: (id: string, reason?: string) => Promise<void>;
}

export function useProactiveSuggestions(): SuggestionsResult {
  const [data, setData] = useState<AdzetaProactiveSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      const res = await globalThis.fetch('/api/adzeta/suggestions');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.suggestions ?? []);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch suggestions'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const acceptSuggestion = useCallback(async (id: string) => {
    setData(prev => prev.filter(s => s.suggestion_id !== id));
    try {
      const res = await globalThis.fetch(`/api/adzeta/suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ title: 'Suggestion accepted' });
      await fetchData();
    } catch (err) {
      toast({ title: 'Accept failed', description: (err as Error).message, variant: 'destructive' });
      await fetchData();
    }
  }, [fetchData, toast]);

  const dismissSuggestion = useCallback(async (id: string, reason?: string) => {
    setData(prev => prev.filter(s => s.suggestion_id !== id));
    try {
      const res = await globalThis.fetch(`/api/adzeta/suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', reason }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ title: 'Suggestion dismissed' });
      await fetchData();
    } catch (err) {
      toast({ title: 'Dismiss failed', description: (err as Error).message, variant: 'destructive' });
      await fetchData();
    }
  }, [fetchData, toast]);

  return { data, isLoading, isError, error, refetch: fetchData, acceptSuggestion, dismissSuggestion };
}

// ============================================================================
// useAdzetaMetrics
// ============================================================================

interface MetricsSummary {
  total_tasks: number;
  approval_rate: number;
  auto_execution_rate: number;
  avg_confidence: number;
}

interface MetricsData {
  daily: AdzetaAgentMetric[];
  summary: MetricsSummary;
}

const EMPTY_METRICS: MetricsData = {
  daily: [],
  summary: { total_tasks: 0, approval_rate: 0, auto_execution_rate: 0, avg_confidence: 0 },
};

export function useAdzetaMetrics(days: number = 30): HookResult<MetricsData> {
  const [data, setData] = useState<MetricsData>(EMPTY_METRICS);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      const res = await globalThis.fetch(`/api/adzeta/metrics?days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData({
        daily: json.daily ?? [],
        summary: json.summary ?? EMPTY_METRICS.summary,
      });
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, isLoading, isError, error, refetch: fetchData };
}
