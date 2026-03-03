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
  // NEW: Clarification flow
  clarificationState: {
    isActive: boolean;
    commandId: string | null;
    intent: Record<string, unknown>;
    depth: number;
    confidence: number;
    ready: boolean;
    isLoading: boolean;
    error: string | null;
  };
  continueClarification: (commandId: string, answers: Record<string, unknown>, intent: Record<string, unknown>, depth: number) => Promise<void>;
  resetClarification: () => void;
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
  const [feedbackMap, setFeedbackMap] = useState<Record<string, number>>({});

  // NEW: Clarification state (inline, not paused)
  const [clarificationState, setClarificationState] = useState({
    isActive: false,
    commandId: null as string | null,
    intent: {} as Record<string, unknown>,
    depth: 0,
    confidence: 0,
    ready: false,
    isLoading: false,
    error: null as string | null,
  });

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
   * NEW: Handle clarification flow (inline, no pause)
   */
  const continueClarification = useCallback(async (
    commandId: string,
    answers: Record<string, unknown>,
    currentIntent: Record<string, unknown>,
    currentDepth: number
  ) => {
    setClarificationState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Merge answers into current intent
      const updatedIntent = { ...currentIntent };
      for (const [key, value] of Object.entries(answers)) {
        const parts = key.split('.');
        let target: Record<string, unknown> = updatedIntent;
        
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!target[part] || typeof target[part] !== 'object') {
            target[part] = {};
          }
          target = target[part] as Record<string, unknown>;
        }
        
        target[parts[parts.length - 1]] = value;
      }

      const res = await fetch('/api/oracle/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_id: commandId,
          intent: updatedIntent,
          answers,
          depth: currentDepth,
          mode: 'follow_up',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      
      // Update thread entry with latest blocks
      updateThreadEntry(commandId, {
        response: {
          ...data,
          status: data.ready ? 'success' : 'needs_more_info',
          blocks: [], // Will be populated by SSE
        },
        status: data.ready ? 'completed' : 'needs_more_info',
      });

      setClarificationState({
        isActive: !data.ready,
        commandId,
        intent: data.intent,
        depth: data.depth,
        confidence: data.confidence,
        ready: data.ready,
        isLoading: false,
        error: null,
      });

      // If ready, trigger the actual campaign creation
      if (data.ready && data.next_step) {
        // Continue with campaign execution
        toast({
          title: 'All set!',
          description: `Proceeding to ${data.next_step.description}`,
        });
      }

    } catch (err) {
      setClarificationState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, [updateThreadEntry, toast]);

  const resetClarification = useCallback(() => {
    setClarificationState({
      isActive: false,
      commandId: null,
      intent: {},
      depth: 0,
      confidence: 0,
      ready: false,
      isLoading: false,
      error: null,
    });
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

      // Add entry to thread with classification info
      const newEntry: OrchestratorThreadEntry = {
        id: data.command_id,
        type: 'command',
        text: trimmed,
        status: 'pending',
        isStreaming: true,
        timestamp: new Date(),
        classification: data.classification,
      };

      setThread(prev => [...prev, newEntry]);

      // All commands start streaming immediately
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

  const handleFeedback = useCallback(async (commandId: string, rating: number) => {
    const environment = process.env.NEXT_PUBLIC_ENVIRONMENT === 'prod' ? 'prod' : 'dev';
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/oracle/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          command_id: commandId,
          rating,
          mark_for_rlhf: rating <= 2 || rating >= 4,
          environment,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFeedbackMap(prev => ({ ...prev, [commandId]: rating }));
      toast({ title: rating >= 4 ? 'Thanks for the feedback!' : 'Feedback recorded' });
    } catch {
      toast({ title: 'Failed to submit feedback', variant: 'destructive' });
    }
  }, [getAuthHeaders, toast]);

  // Derive status message from the most recent active entry
  const activeEntry = [...thread].reverse().find(e =>
    ['pending', 'parsing', 'routing', 'executing'].includes(e.status ?? '')
  );
  const statusMessage = activeEntry?.statusMessage ?? (
    activeEntry ? 'Processing your request...' : ''
  );

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
    transitioning: isProcessing,
    sessionError: error?.message ?? null,
    isLoadingSession: false,
    statusMessage,
    feedbackMap,
    handleFeedback,
    // NEW: Clarification flow
    clarificationState,
    continueClarification,
    resetClarification,
  };
}
