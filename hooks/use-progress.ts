/**
 * React Hook for Progress Tracking
 * 
 * Connects to SSE stream for real-time updates and manages connection state.
 * Provides progress data, error handling, and reconnection logic.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ProgressRecord, ProgressStatusResponse } from '@/types/progress';

interface UseProgressOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnects?: number;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

interface UseProgressState {
  progress: ProgressRecord | null;
  error: Error | null;
  isConnected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
}

export function useProgress(
  taskId: string | null | undefined,
  options: UseProgressOptions = {}
) {
  const {
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnects = 5,
    onError,
    onComplete,
  } = options;

  const [state, setState] = useState<UseProgressState>({
    progress: null,
    error: null,
    isConnected: false,
    reconnecting: false,
    reconnectAttempts: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setState(prev => ({ ...prev, isConnected: false, reconnecting: false }));
  }, []);

  useEffect(() => {
    if (!taskId) {
      disconnect();
      return;
    }

    let reconnectCount = 0;

    const connect = () => {
      // Fetch initial state first
      fetch(`/api/progress/status/${taskId}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<ProgressStatusResponse>;
        })
        .then(data => {
          setState(prev => ({
            ...prev,
            progress: {
              taskId: data.taskId,
              runId: '', // Will be filled from SSE
              status: data.status,
              currentStep: data.currentStep,
              totalSteps: data.totalSteps,
              percentComplete: data.percentComplete,
              message: data.message,
              agentLabel: data.agentLabel || '',
              subtasks: data.subtasks,
              startedAt: data.startedAt || new Date().toISOString(),
              updatedAt: data.updatedAt,
              completedAt: data.completedAt,
              errorMessage: data.errorMessage,
              estimatedDurationMs: data.estimatedTimeRemaining 
                ? parseDuration(data.estimatedTimeRemaining)
                : undefined,
            },
            error: null,
          }));

          // If task is already complete, call onComplete
          if (data.status === 'completed') {
            onComplete?.();
            return;
          }
        })
        .catch(err => {
          console.warn('[useProgress] Failed to fetch initial state:', err);
        });

      // Then connect SSE
      const eventSource = new EventSource(`/api/progress/stream/${taskId}`);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('open', () => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          error: null,
          reconnecting: false,
          reconnectAttempts: 0,
        }));
        reconnectCount = 0;
      });

      eventSource.addEventListener('progress', (e) => {
        try {
          const data = JSON.parse(e.data) as Partial<ProgressRecord>;
          setState(prev => ({
            ...prev,
            progress: prev.progress
              ? { ...prev.progress, ...data, updatedAt: new Date().toISOString() }
              : data as ProgressRecord,
          }));
        } catch (err) {
          console.error('[useProgress] Failed to parse progress event:', err);
        }
      });

      eventSource.addEventListener('complete', (e) => {
        try {
          const data = JSON.parse(e.data) as Partial<ProgressRecord>;
          setState(prev => ({
            ...prev,
            progress: prev.progress
              ? { ...prev.progress, ...data, status: 'completed', updatedAt: new Date().toISOString() }
              : (data as ProgressRecord),
          }));
          disconnect();
          onComplete?.();
        } catch (err) {
          console.error('[useProgress] Failed to parse complete event:', err);
        }
      });

      eventSource.addEventListener('error', (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as Partial<ProgressRecord>;
          if (data.errorMessage) {
            setState(prev => ({
              ...prev,
              progress: prev.progress
                ? { ...prev.progress, ...data, status: 'failed' as const, updatedAt: new Date().toISOString() }
                : data as ProgressRecord,
            }));
          }
        } catch {
          // Not an error event with data, likely connection error
        }

        // Handle reconnection
        if (autoReconnect && reconnectCount < maxReconnects) {
          reconnectCount++;
          setState(prev => ({
            ...prev,
            isConnected: false,
            reconnecting: true,
            reconnectAttempts: reconnectCount,
          }));
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval * reconnectCount); // Backoff
        } else {
          const error = new Error('Max reconnection attempts reached');
          setState(prev => ({
            ...prev,
            error,
            isConnected: false,
            reconnecting: false,
          }));
          onError?.(error);
        }
      });

      eventSource.onerror = (err) => {
        console.error('[useProgress] EventSource error:', err);
      };
    };

    connect();

    return () => {
      disconnect();
    };
  }, [taskId, autoReconnect, reconnectInterval, maxReconnects, onError, onComplete, disconnect]);

  return {
    progress: state.progress,
    isConnected: state.isConnected,
    error: state.error,
    reconnecting: state.reconnecting,
    reconnectAttempts: state.reconnectAttempts,
    disconnect,
    reconnect: disconnect,
  };
}

/**
 * Hook for long-running task detection
 * Returns true if a task is running for > threshold
 */
export function useLongRunningTask(
  taskId: string | null | undefined,
  thresholdMinutes: number = 5
) {
  const { progress } = useProgress(taskId);
  const [isLongRunning, setIsLongRunning] = useState(false);

  useEffect(() => {
    if (!progress || progress.status !== 'running') {
      setIsLongRunning(false);
      return;
    }

    const startedAt = new Date(progress.startedAt).getTime();
    const thresholdMs = thresholdMinutes * 60 * 1000;
    const elapsed = Date.now() - startedAt;

    if (elapsed > thresholdMs) {
      setIsLongRunning(true);
      return;
    }

    // Check periodically
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed > thresholdMs) {
        setIsLongRunning(true);
        clearInterval(interval);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [progress, thresholdMinutes]);

  return isLongRunning;
}

/**
 * Parse duration string to milliseconds
 * Handles formats like "2m remaining", "45s remaining", "1.5h remaining"
 */
function parseDuration(durationStr: string): number {
  const match = durationStr.match(/(\d+(?:\.\d+)?)\s*(h|m|s|ms)/);
  if (!match) return 0;

  const [, value, unit] = match;
  const num = parseFloat(value);

  switch (unit) {
    case 'h': return num * 60 * 60 * 1000;
    case 'm': return num * 60 * 1000;
    case 's': return num * 1000;
    case 'ms': return num;
    default: return 0;
  }
}
