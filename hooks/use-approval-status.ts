'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'modified' | 'error' | 'loading';

export interface ApprovalStatusResponse {
  status: Exclude<ApprovalStatus, 'loading' | 'error'>;
  updatedAt: string; // ISO timestamp
  taskId?: string;
  metadata?: Record<string, unknown>;
}

export interface UseApprovalStatusOptions {
  /** Polling interval in milliseconds (default: 2000ms) */
  pollInterval?: number;
  /** Enable SSE fallback if polling fails (default: true) */
  enableSseFallback?: boolean;
  /** Maximum number of consecutive errors before switching to SSE fallback (default: 3) */
  maxRetries?: number;
  /** Delay before retrying after error in ms (default: 5000ms) */
  retryDelay?: number;
  /** Auto-disable polling when status is no longer pending */
  stopOnComplete?: boolean;
}

export interface UseApprovalStatusReturn {
  status: ApprovalStatus;
  data: ApprovalStatusResponse | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  /** Manually refresh status */
  refresh: () => void;
  /** Time elapsed since last update in seconds */
  timeSinceUpdate: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_POLL_INTERVAL = 2000; // 2 seconds for <2s detection target
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 5000;
const SSE_RECONNECT_DELAY = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useApprovalStatus - Real-time approval status polling hook
 * 
 * Polls the work queue status endpoint to detect status changes within <2 seconds.
 * Falls back to Server-Sent Events if polling fails.
 * 
 * @example
 * ```tsx
 * const { status, data, error } = useApprovalStatus('task-123', {
 *   pollInterval: 2000,
 *   enableSseFallback: true,
 * });
 * 
 * useEffect(() => {
 *   if (status === 'approved') {
 *     showSuccessToast();
 *   }
 * }, [status]);
 * ```
 */
export function useApprovalStatus(
  taskId: string | null | undefined,
  options: UseApprovalStatusOptions = {}
): UseApprovalStatusReturn {
  const {
    pollInterval = DEFAULT_POLL_INTERVAL,
    enableSseFallback = true,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    stopOnComplete = true,
  } = options;

  // State
  const [status, setStatus] = useState<ApprovalStatus>('loading');
  const [data, setData] = useState<ApprovalStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState(0);
  const [useSse, setUseSse] = useState(false);

  // Refs for cleanup and avoiding stale closures
  const abortControllerRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const lastStatusRef = useRef<ApprovalStatus>('loading');

  // Track if we've already completed (for stopOnComplete)
  const isCompleteRef = useRef(false);

  // Update time-since counter
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated && isMountedRef.current) {
        setTimeSinceUpdate(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Close SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear any pending poll timeouts
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  // Poll function
  const pollStatus = useCallback(async () => {
    if (!taskId || !isMountedRef.current) return;
    if (isCompleteRef.current && stopOnComplete) return;

    // Don't poll if we're using SSE
    if (useSse) return;

    setIsLoading(true);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/api/work-queue/status/${taskId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApprovalStatusResponse = await response.json();

      if (!isMountedRef.current) return;

      // Update state
      setData(result);
      setStatus(result.status);
      setLastUpdated(new Date());
      setError(null);
      retryCountRef.current = 0;
      lastStatusRef.current = result.status;

      // Check if complete
      if (result.status !== 'pending') {
        isCompleteRef.current = true;
      }

    } catch (err) {
      if (!isMountedRef.current) return;

      // Don't treat abort errors as failures
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      retryCountRef.current++;

      // Switch to SSE fallback if we've hit max retries
      if (enableSseFallback && retryCountRef.current >= maxRetries) {
        setUseSse(true);
      }

      setStatus('error');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [taskId, useSse, stopOnComplete, enableSseFallback, maxRetries]);

  // SSE fallback connection
  const connectSse = useCallback(() => {
    if (!taskId || !isMountedRef.current) return;
    if (eventSourceRef.current) return; // Already connected

    const url = `/api/work-queue/status/${taskId}/stream`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      if (!isMountedRef.current) return;

      try {
        const result: ApprovalStatusResponse = JSON.parse(event.data);
        
        setData(result);
        setStatus(result.status);
        setLastUpdated(new Date());
        setError(null);
        lastStatusRef.current = result.status;

        if (result.status !== 'pending') {
          isCompleteRef.current = true;
        }
      } catch (err) {
        console.error('[useApprovalStatus] Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = () => {
      if (!isMountedRef.current) return;
      
      // SSE failed, close and retry polling after delay
      eventSource.close();
      eventSourceRef.current = null;
      
      // Switch back to polling
      setUseSse(false);
      retryCountRef.current = 0;
      
      // Schedule next poll
      pollTimeoutRef.current = setTimeout(pollStatus, retryDelay);
    };

    eventSource.onopen = () => {
      retryCountRef.current = 0;
      setError(null);
    };
  }, [taskId, pollStatus, retryDelay]);

  // Main polling effect
  useEffect(() => {
    if (!taskId) {
      setStatus('loading');
      return;
    }

    // Reset state for new taskId
    isCompleteRef.current = false;
    retryCountRef.current = 0;
    isMountedRef.current = true;
    setUseSse(false);
    setError(null);

    // Initial poll
    pollStatus();

    // Set up polling interval
    const intervalId = setInterval(() => {
      if (!isCompleteRef.current || !stopOnComplete) {
        pollStatus();
      }
    }, pollInterval);

    return () => {
      isMountedRef.current = false;
      cleanup();
      clearInterval(intervalId);
    };
  }, [taskId, pollInterval, stopOnComplete, pollStatus, cleanup]);

  // SSE fallback effect
  useEffect(() => {
    if (useSse && enableSseFallback && !isCompleteRef.current) {
      connectSse();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [useSse, enableSseFallback, connectSse]);

  // Manual refresh function
  const refresh = useCallback(() => {
    retryCountRef.current = 0;
    isCompleteRef.current = false;
    setUseSse(false);
    pollStatus();
  }, [pollStatus]);

  return {
    status,
    data,
    isLoading,
    error,
    lastUpdated,
    refresh,
    timeSinceUpdate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Additional hooks for specific use cases
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook that returns only the has-changed boolean
 * Useful for triggering side effects when status changes
 */
export function useApprovalStatusChanged(
  taskId: string | null | undefined,
  options?: UseApprovalStatusOptions
): {
  hasChanged: boolean;
  previousStatus: ApprovalStatus | null;
  currentStatus: ApprovalStatus;
} {
  const { status, data } = useApprovalStatus(taskId, options);
  const previousStatusRef = useRef<ApprovalStatus | null>(null);

  const hasChanged = previousStatusRef.current !== null && 
    previousStatusRef.current !== status;

  useEffect(() => {
    if (status !== 'loading') {
      previousStatusRef.current = status;
    }
  }, [status, data?.updatedAt]);

  return {
    hasChanged,
    previousStatus: previousStatusRef.current,
    currentStatus: status,
  };
}

/**
 * Hook specifically for tracking when approval completes
 * Returns true once when status transitions from pending to a completed state
 */
export function useApprovalCompleted(
  taskId: string | null | undefined,
  options?: UseApprovalStatusOptions
): {
  isComplete: boolean;
  completionStatus: ApprovalStatus | null;
  wasPending: boolean;
} {
  const { status } = useApprovalStatus(taskId, options);
  const wasPendingRef = useRef(false);
  const isCompleteRef = useRef(false);

  const completedStatuses: ApprovalStatus[] = ['approved', 'rejected', 'modified'];
  const isCurrentlyComplete = completedStatuses.includes(status);

  useEffect(() => {
    if (status === 'pending') {
      wasPendingRef.current = true;
    }
    if (isCurrentlyComplete && wasPendingRef.current && !isCompleteRef.current) {
      isCompleteRef.current = true;
    }
  }, [status, isCurrentlyComplete]);

  return {
    isComplete: isCompleteRef.current || isCurrentlyComplete,
    completionStatus: isCurrentlyComplete ? status : null,
    wasPending: wasPendingRef.current,
  };
}

export default useApprovalStatus;
