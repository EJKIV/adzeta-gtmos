'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/app/components/auth-provider';
import type {
  OrchestratorThreadEntry,
  CreateCommandRequest,
  OrchestratorError,
} from '@/lib/types/orchestration';

export interface UseChatEngineOptions {
  maxHistory: number;
  onError?: (error: OrchestratorError) => void;
}

export interface UseChatEngineReturn {
  thread: OrchestratorThreadEntry[];
  isProcessing: boolean;
  error: OrchestratorError | null;
  handleCommand: (text: string) => Promise<void>;
  cancelCommand: (commandId: string) => Promise<boolean>;
  retryCommand: (commandId: string) => void;
  clearThread: () => void;
  history: string[];
  addToHistory: (text: string) => void;
  updateThreadEntry: (id: string, updates: Partial<OrchestratorThreadEntry>) => void;
  // Compat shims for page.tsx
  transitioning: boolean;
  sessionError: string | null;
  isLoadingSession: boolean;
  statusMessage: string;
  feedbackMap: Record<string, unknown>;
  handleFeedback: (commandId: string, rating: number) => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export function useChatEngine(optionsOrUserId?: UseChatEngineOptions | string): UseChatEngineReturn {
  const options: UseChatEngineOptions = typeof optionsOrUserId === 'object' && optionsOrUserId !== null
    ? optionsOrUserId
    : { maxHistory: 50 };
  const { maxHistory } = options;
  const { getAccessToken } = useAuth();
  const { toast } = useToast();

  const [thread, setThread] = useState<OrchestratorThreadEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<OrchestratorError | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  // Track active streams for cleanup
  const activeStreams = useRef<Map<string, () => void>>(new Map());

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getAccessToken();
    if (token) return { Authorization: `Bearer ${token}` };
    return {};
  }, [getAccessToken]);

  const updateThreadEntry = useCallback((id: string, updates: Partial<OrchestratorThreadEntry>) => {
    setThread(prev =>
      prev.map(entry =>
        entry.id === id ? { ...entry, ...updates } : entry
      )
    );
  }, []);

  /**
   * Open an SSE stream for a command and pipe events into the thread.
   */
  const startStream = useCallback((commandId: string) => {
    const environment = process.env.NEXT_PUBLIC_ENVIRONMENT === 'prod' ? 'prod' : 'dev';
    let retries = 0;
    let evtSource: EventSource | null = null;
    let fullText = '';
    let cancelled = false;

    function connect() {
      if (cancelled) return;

      evtSource = new EventSource(
        `/api/oracle/stream?commandId=${commandId}&environment=${environment}`
      );

      evtSource.onmessage = (e) => {
        let data: { type: string; status?: string; message?: string; text?: string; response?: string; block?: import('@/components/oracle-blocks/types').OracleBlock };
        try { data = JSON.parse(e.data); } catch { return; }

        if (data.type === 'status') {
          updateThreadEntry(commandId, {
            status: (data.status as OrchestratorThreadEntry['status']) ?? 'executing',
            statusMessage: data.message,
            isStreaming: true,
          });
        }

        if (data.type === 'block') {
          setThread(prev => prev.map(entry =>
            entry.id === commandId
              ? { ...entry, blocks: [...(entry.blocks ?? []), data.block!], isStreaming: true, status: 'executing' }
              : entry
          ));
        }

        if (data.type === 'chunk') {
          fullText += data.text ?? '';
          updateThreadEntry(commandId, {
            response: fullText,
            isStreaming: true,
            status: 'executing',
          });
        }

        if (data.type === 'done') {
          updateThreadEntry(commandId, {
            response: data.response ?? fullText,
            isStreaming: false,
            status: 'completed',
          });
          setIsProcessing(false);
          cleanup();
        }

        if (data.type === 'error') {
          updateThreadEntry(commandId, {
            error_message: data.message ?? 'Unknown error',
            isStreaming: false,
            status: 'failed',
          });
          setIsProcessing(false);
          toast({ title: 'Command failed', description: data.message, variant: 'destructive' });
          cleanup();
        }
      };

      evtSource.onerror = () => {
        evtSource?.close();
        if (cancelled) return;

        if (retries < MAX_RETRIES) {
          retries++;
          updateThreadEntry(commandId, {
            status: 'pending',
            isStreaming: true,
            error_message: undefined,
          });
          setTimeout(connect, RETRY_DELAY_MS);
        } else {
          updateThreadEntry(commandId, {
            error_message: 'Connection lost after retries',
            isStreaming: false,
            status: 'failed',
          });
          setIsProcessing(false);
          cleanup();
        }
      };
    }

    function cleanup() {
      cancelled = true;
      evtSource?.close();
      activeStreams.current.delete(commandId);
    }

    // Store cleanup handle
    activeStreams.current.set(commandId, cleanup);

    connect();
  }, [updateThreadEntry, toast]);

  /**
   * Retry a failed command by re-opening the SSE stream.
   */
  const retryCommand = useCallback((commandId: string) => {
    // Reset entry state
    updateThreadEntry(commandId, {
      status: 'pending',
      isStreaming: true,
      error_message: undefined,
      response: undefined,
    });
    setIsProcessing(true);
    startStream(commandId);
  }, [updateThreadEntry, startStream]);

  /**
   * Submit a new command.
   */
  const handleCommand = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessing) return;

    setHistory(prev => {
      const next = [trimmed, ...prev.filter(h => h !== trimmed)];
      return next.slice(0, maxHistory);
    });

    setIsProcessing(true);
    setError(null);

    try {
      const environment = process.env.NEXT_PUBLIC_ENVIRONMENT === 'prod' ? 'prod' : 'dev';

      const requestBody: CreateCommandRequest = {
        raw_command: trimmed,
        environment,
        context: { current_page: window.location.pathname, environment },
      };

      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/oracle/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw { code: 'COMMAND_CREATE_FAILED', message: errorData.error || 'Failed to create command' } as OrchestratorError;
      }

      const data = await response.json();

      // Add entry to thread
      const newEntry: OrchestratorThreadEntry = {
        id: data.command_id,
        type: 'command',
        text: trimmed,
        status: 'pending',
        isStreaming: true,
        timestamp: new Date(),
      };

      setThread(prev => [...prev, newEntry]);

      // Open SSE stream
      startStream(data.command_id);

    } catch (err) {
      const oe: OrchestratorError = {
        code: (err as OrchestratorError).code || 'UNKNOWN_ERROR',
        message: (err as OrchestratorError).message || 'An unexpected error occurred',
      };
      setError(oe);
      setIsProcessing(false);
      toast({ title: 'Error', description: oe.message, variant: 'destructive' });
      if (options.onError) options.onError(oe);
    }
  }, [isProcessing, maxHistory, options, toast, startStream, getAuthHeaders]);

  /**
   * Cancel a running command — close stream + notify backend.
   */
  const cancelCommand = useCallback(async (commandId: string): Promise<boolean> => {
    // Close the SSE stream immediately
    const cleanup = activeStreams.current.get(commandId);
    if (cleanup) cleanup();

    updateThreadEntry(commandId, { status: 'cancelled', isStreaming: false });
    setIsProcessing(false);
    toast({ title: 'Command cancelled' });
    return true;
  }, [toast, updateThreadEntry]);

  // Cleanup all streams on unmount
  useEffect(() => {
    return () => {
      activeStreams.current.forEach(cleanup => cleanup());
      activeStreams.current.clear();
    };
  }, []);

  const addToHistory = useCallback((text: string) => {
    setHistory(prev => {
      const next = [text, ...prev.filter(h => h !== text)];
      return next.slice(0, maxHistory);
    });
  }, [maxHistory]);

  const clearThread = useCallback(() => {
    setThread([]);
    setError(null);
  }, []);

  return {
    thread,
    isProcessing,
    error,
    handleCommand,
    cancelCommand,
    retryCommand,
    clearThread,
    history,
    addToHistory,
    updateThreadEntry,
    // Compat shims
    transitioning: isProcessing,
    sessionError: error?.message ?? null,
    isLoadingSession: false,
    statusMessage: '',
    feedbackMap: {},
    handleFeedback: () => {},
  };
}
