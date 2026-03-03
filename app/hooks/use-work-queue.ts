'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/app/hooks/use-toast';

// ============================================================================
// Types — matches work_queue table + metadata convention
// ============================================================================

export type WorkQueueStatus = 'pending' | 'blocked' | 'ready' | 'in_progress' | 'paused' | 'completed' | 'archived';

export interface WorkQueueItem {
  id: string;
  item_type: string;
  reference_id: string | null;
  user_id: string | null;
  organization_id: string | null;
  category: string | null;
  priority: number;
  status: WorkQueueStatus;
  assigned_agent: string | null;
  blocked_reason: string | null;
  blocked_since: string | null;
  unblock_conditions: string | null;
  depends_on: string[] | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  deadline_at: string | null;
  notes: string | null;
  metadata: {
    title?: string;
    description?: string;
    requires_tools?: string[];
    missing_tools?: string[];
    requested_agent?: string;
    user_priority?: number;
    [key: string]: unknown;
  };
}

// ============================================================================
// Hook
// ============================================================================

interface WorkQueueResult {
  items: WorkQueueItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateItem: (id: string, updates: Partial<Pick<WorkQueueItem, 'priority' | 'status' | 'notes' | 'blocked_reason' | 'unblock_conditions' | 'assigned_agent'>> & { metadata?: Record<string, unknown> }) => Promise<void>;
  reorderItems: (newOrder: string[]) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  createItem: (item: {
    title: string;
    description?: string;
    item_type?: string;
    category?: string;
    priority?: number;
    requires_tools?: string[];
    missing_tools?: string[];
    requested_agent?: string;
    notes?: string;
    blocked_reason?: string;
    unblock_conditions?: string;
  }) => Promise<void>;
}

export function useWorkQueue(statusFilter?: WorkQueueStatus): WorkQueueResult {
  const [items, setItems] = useState<WorkQueueItem[]>([]);
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
      if (statusFilter) params.set('status', statusFilter);
      const res = await globalThis.fetch(`/api/work-queue?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Filter out archived unless explicitly requested
      const raw: WorkQueueItem[] = json.items ?? [];
      setItems(statusFilter === 'archived' ? raw : raw.filter(i => i.status !== 'archived'));
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch work queue'));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const updateItem = useCallback(async (id: string, updates: Record<string, unknown>) => {
    try {
      const res = await globalThis.fetch(`/api/work-queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchData();
    } catch (err) {
      toast({ title: 'Update failed', description: (err as Error).message, variant: 'destructive' });
    }
  }, [fetchData, toast]);

  const reorderItems = useCallback(async (newOrder: string[]) => {
    // Optimistic reorder
    setItems(prev => {
      const map = new Map(prev.map(i => [i.id, i]));
      return newOrder.map((id, idx) => {
        const item = map.get(id);
        return item ? { ...item, priority: idx + 1 } : item!;
      }).filter(Boolean);
    });
    try {
      const res = await globalThis.fetch('/api/work-queue/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOrder }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchData();
    } catch (err) {
      toast({ title: 'Reorder failed', description: (err as Error).message, variant: 'destructive' });
      await fetchData();
    }
  }, [fetchData, toast]);

  const deleteItem = useCallback(async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      const res = await globalThis.fetch(`/api/work-queue/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchData();
    } catch (err) {
      toast({ title: 'Delete failed', description: (err as Error).message, variant: 'destructive' });
      await fetchData();
    }
  }, [fetchData, toast]);

  const createItem = useCallback(async (item: Record<string, unknown>) => {
    try {
      const res = await globalThis.fetch('/api/work-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchData();
      toast({ title: 'Task added to queue' });
    } catch (err) {
      toast({ title: 'Failed to add task', description: (err as Error).message, variant: 'destructive' });
    }
  }, [fetchData, toast]);

  return { items, isLoading, isError, error, refetch: fetchData, updateItem, reorderItems, deleteItem, createItem };
}
