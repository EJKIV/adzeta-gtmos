'use client';

import { useRef, useCallback, useEffect } from 'react';
import { parseSSEBuffer } from '@/lib/sse/parse-sse';

export interface SSEEvent {
  event: string;
  data: string;
}

export interface StreamCallbacks {
  onEvent: (event: SSEEvent) => void;
  onDone: () => void;
  onError: (error: unknown) => void;
}

interface UseSSEStreamOptions {
  /** Called when reconnecting (with attempt number). */
  onReconnecting?: (attempt: number) => void;
  /** Maximum number of automatic retries. Defaults to 3. */
  maxRetries?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Manages SSE stream lifecycle: fetch, parse, abort, and reconnection.
 *
 * Per-stream callbacks (onEvent, onDone, onError) are passed to `stream()`
 * rather than the hook constructor, so each stream invocation captures its
 * own closure context — preventing race conditions when a new command
 * replaces an in-flight stream.
 *
 * Retries use a simple loop with exponential backoff.
 */
export function useSSEStream({
  onReconnecting,
  maxRetries = DEFAULT_MAX_RETRIES,
}: UseSSEStreamOptions = {}) {
  const abortRef = useRef<AbortController | null>(null);
  const callbacksRef = useRef<StreamCallbacks | null>(null);

  // Abort on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    callbacksRef.current = null;
  }, []);

  const executeStream = useCallback(async (
    url: string,
    body: Record<string, unknown>,
    signal: AbortSignal,
  ) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.body) throw new Error('No response body');
    if (res.status >= 400) {
      throw new Error(`HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const { events, remaining } = parseSSEBuffer(buffer);
      buffer = remaining;

      for (const evt of events) {
        callbacksRef.current?.onEvent(evt);
      }
    }
  }, []);

  const stream = useCallback(async (
    url: string,
    body: Record<string, unknown>,
    callbacks: StreamCallbacks,
  ) => {
    abort();
    callbacksRef.current = callbacks;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        onReconnecting?.(attempt);
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (abortRef.current?.signal.aborted) return;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await executeStream(url, body, controller.signal);
        callbacksRef.current?.onDone();
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        lastError = err;

        // Non-retryable: 4xx client errors
        if (err instanceof Error && /HTTP 4\d\d/.test(err.message)) break;

        // Retryable: network errors and 5xx server errors
        const isRetryable =
          (err instanceof TypeError && err.message === 'Failed to fetch') ||
          (err instanceof Error && /HTTP 5\d\d/.test(err.message));
        if (!isRetryable) break;
      }
    }

    callbacksRef.current?.onError(lastError);
  }, [abort, executeStream, maxRetries, onReconnecting]);

  return { stream, abort };
}
