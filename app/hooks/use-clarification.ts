'use client';

import { useState, useCallback } from 'react';

export interface ClarificationState {
  commandId: string;
  intent: Record<string, unknown>;
  depth: number;
  confidence: number;
  ready: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ClarificationResponse {
  command_id: string;
  confidence: number;
  ready: boolean;
  message: string;
  actions: Array<{
    id: string;
    type: 'button' | 'choice' | 'confirm' | 'text';
    label: string;
    description?: string;
    provides?: { key: string; value?: unknown };
  }>;
  next_step?: {
    skill: string;
    action: string;
    description: string;
  };
  intent: Record<string, unknown>;
  depth: number;
}

interface UseClarificationReturn {
  state: ClarificationState;
  startClarification: (commandId: string, initialIntent?: Record<string, unknown>) => Promise<void>;
  continueClarification: (answers: Record<string, unknown>) => Promise<ClarificationResponse | null>;
  reset: () => void;
}

/**
 * useClarification Hook
 * 
 * Manages multi-turn clarification conversations.
 * NOT pausing - inline within chat flow.
 * 
 * Usage:
 * const { state, continueClarification } = useClarification();
 * 
 * // When user clicks clarification button:
 * await continueClarification({ 'icp.titles': ['VP Sales'] });
 */
export function useClarification(): UseClarificationReturn {
  const [state, setState] = useState<ClarificationState>({
    commandId: '',
    intent: {},
    depth: 0,
    confidence: 0,
    ready: false,
    isLoading: false,
    error: null,
  });

  const startClarification = useCallback(async (
    commandId: string, 
    initialIntent: Record<string, unknown> = {}
  ) => {
    setState({
      commandId,
      intent: initialIntent,
      depth: 0,
      confidence: 0,
      ready: false,
      isLoading: true,
      error: null,
    });

    try {
      const res = await fetch('/api/oracle/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_id: commandId,
          intent: initialIntent,
          depth: 0,
          mode: 'initial',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: ClarificationResponse = await res.json();
      
      setState(prev => ({
        ...prev,
        intent: data.intent,
        depth: data.depth,
        confidence: data.confidence,
        ready: data.ready,
        isLoading: false,
      }));

    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  const continueClarification = useCallback(async (
    answers: Record<string, unknown>
  ): Promise<ClarificationResponse | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Merge answers into current intent
      const updatedIntent = { ...state.intent };
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
          command_id: state.commandId,
          intent: updatedIntent,
          answers,
          depth: state.depth,
          mode: 'follow_up',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: ClarificationResponse = await res.json();
      
      setState({
        commandId: state.commandId,
        intent: data.intent,
        depth: data.depth,
        confidence: data.confidence,
        ready: data.ready,
        isLoading: false,
        error: null,
      });

      return data;

    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
      return null;
    }
  }, [state.commandId, state.depth, state.intent]);

  const reset = useCallback(() => {
    setState({
      commandId: '',
      intent: {},
      depth: 0,
      confidence: 0,
      ready: false,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    state,
    startClarification,
    continueClarification,
    reset,
  };
}

export default useClarification;
