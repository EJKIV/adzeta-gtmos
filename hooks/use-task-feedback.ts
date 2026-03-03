'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/app/hooks/use-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskFeedbackPayload {
  taskId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  workedWell?: string;
  improvement?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface TaskFeedbackResponse {
  success: boolean;
  feedbackId?: string;
  error?: string;
}

export interface PendingFeedback {
  payload: TaskFeedbackPayload;
  retryCount: number;
  lastAttempt: number;
}

export interface UseTaskFeedbackReturn {
  /** Submit feedback - returns false if queued for retry */
  submitFeedback: (payload: Omit<TaskFeedbackPayload, 'timestamp'>) => Promise<boolean>;
  /** Current submission state */
  isSubmitting: boolean;
  /** Last error message */
  error: string | null;
  /** Clear any stored error */
  clearError: () => void;
  /** Check if there's pending feedback in localStorage */
  hasPendingFeedback: boolean;
  /** Manually retry any pending feedback */
  retryPending: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'adzeta_pending_task_feedback';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const SUBMIT_TIMEOUT_MS = 10000;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get pending feedback from localStorage
 */
function getStoredPending(): PendingFeedback[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as PendingFeedback[];
  } catch {
    return [];
  }
}

/**
 * Store pending feedback to localStorage
 */
function setStoredPending(pending: PendingFeedback[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (pending.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    }
  } catch (err) {
    console.warn('[useTaskFeedback] Failed to store pending feedback:', err);
  }
}

/**
 * Add a feedback item to the pending queue
 */
function queueForRetry(payload: TaskFeedbackPayload): void {
  const pending = getStoredPending();
  
  // Remove any existing entry for this taskId
  const filtered = pending.filter(p => p.payload.taskId !== payload.taskId);
  
  filtered.push({
    payload,
    retryCount: 0,
    lastAttempt: Date.now(),
  });
  
  setStoredPending(filtered);
}

/**
 * Remove a feedback item from the pending queue
 */
function removeFromQueue(taskId: string): void {
  const pending = getStoredPending();
  const filtered = pending.filter(p => p.payload.taskId !== taskId);
  setStoredPending(filtered);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useTaskFeedback - Hook for submitting task feedback with offline persistence
 * 
 * Features:
 * - Submits feedback to /api/feedback endpoint
 * - Automatically retries failed submissions
 * - Persists pending feedback to localStorage
 * - Retries queued feedback on network reconnect
 * 
 * @example
 * ```tsx
 * const { submitFeedback, isSubmitting, error } = useTaskFeedback();
 * 
 * const handleSubmit = async (rating: number) => {
 *   const success = await submitFeedback({
 *     taskId: 'task-123',
 *     rating: rating as 1|2|3|4|5,
 *     workedWell: 'Great response!',
 *   });
 *   if (success) {
 *     // Feedback submitted successfully
 *   }
 * };
 * ```
 */
export function useTaskFeedback(): UseTaskFeedbackReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingFeedback, setHasPendingFeedback] = useState(false);
  const { toast } = useToast();
  
  // Track online status
  const isOnlineRef = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update pending status
  const updatePendingStatus = useCallback(() => {
    const pending = getStoredPending();
    setHasPendingFeedback(pending.length > 0);
  }, []);

  // Check pending status on mount
  useEffect(() => {
    updatePendingStatus();
  }, [updatePendingStatus]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      // Retry any pending feedback when connection restored
      retryPendingInternal();
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Submit feedback to the API
   */
  const submitFeedback = useCallback(async (
    params: Omit<TaskFeedbackPayload, 'timestamp'>
  ): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);

    const payload: TaskFeedbackPayload = {
      ...params,
      timestamp: new Date().toISOString(),
    };

    try {
      // If offline, queue for later
      if (!isOnlineRef.current) {
        queueForRetry(payload);
        updatePendingStatus();
        
        toast({
          title: 'Feedback saved',
          description: 'Your feedback has been saved and will be submitted when you\'re back online.',
        });
        
        setIsSubmitting(false);
        return false;
      }

      // Attempt submission with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result: TaskFeedbackResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Feedback submission failed');
      }

      // Success!
      toast({
        title: 'Thanks for your feedback! 🙏',
        description: 'Your input helps us improve.',
      });

      setIsSubmitting(false);
      removeFromQueue(payload.taskId);
      updatePendingStatus();
      return true;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      
      // Queue for retry if it's a network error or server error
      if (
        err instanceof TypeError || // Network error
        (err instanceof Error && err.name === 'AbortError') || // Timeout
        (err instanceof Error && message.includes('500')) || // Server error
        (err instanceof Error && message.includes('503')) // Service unavailable
      ) {
        queueForRetry(payload);
        updatePendingStatus();
        
        // Schedule retry
        scheduleRetry();
        
        setIsSubmitting(false);
        return false;
      }

      // Other errors are permanent
      setError(message);
      setIsSubmitting(false);
      return false;
    }
  }, [toast, updatePendingStatus]);

  /**
   * Schedule a retry of pending feedback
   */
  const scheduleRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    retryTimeoutRef.current = setTimeout(() => {
      retryPendingInternal();
    }, RETRY_DELAY_MS);
  }, []);

  /**
   * Internal retry function
   */
  const retryPendingInternal = useCallback(async () => {
    const pending = getStoredPending();
    if (pending.length === 0) return;
    if (!isOnlineRef.current) return;

    for (const item of [...pending]) {
      if (item.retryCount >= MAX_RETRIES) {
        // Max retries reached, remove from queue
        removeFromQueue(item.payload.taskId);
        continue;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result: TaskFeedbackResponse = await response.json();
          if (result.success) {
            removeFromQueue(item.payload.taskId);
            continue;
          }
        }

        // Increment retry count
        item.retryCount++;
        item.lastAttempt = Date.now();
        
        if (item.retryCount >= MAX_RETRIES) {
          removeFromQueue(item.payload.taskId);
        }

      } catch {
        // Increment retry count
        item.retryCount++;
        item.lastAttempt = Date.now();
        
        if (item.retryCount >= MAX_RETRIES) {
          removeFromQueue(item.payload.taskId);
        }
      }
    }

    // Update storage with new retry counts
    const remaining = getStoredPending().map(p => {
      const updated = pending.find(item => item.payload.taskId === p.payload.taskId);
      return updated || p;
    }).filter(p => p.retryCount < MAX_RETRIES);
    
    setStoredPending(remaining);
    updatePendingStatus();

    // If still have pending, schedule another retry
    if (remaining.length > 0) {
      scheduleRetry();
    }
  }, [updatePendingStatus, scheduleRetry]);

  /**
   * Public retry function
   */
  const retryPending = useCallback(async () => {
    if (!isOnlineRef.current) {
      toast({
        title: 'Offline',
        description: 'Cannot retry feedback while offline. Will retry when connection restored.',
      });
      return;
    }
    
    await retryPendingInternal();
  }, [retryPendingInternal, toast]);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    submitFeedback,
    isSubmitting,
    error,
    clearError,
    hasPendingFeedback,
    retryPending,
  };
}
