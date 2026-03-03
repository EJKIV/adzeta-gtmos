'use client';

import { useState, useCallback } from 'react';

export interface UseBlockActionsOptions {
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => Promise<void>;
}

export interface UseBlockActionsReturn {
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => Promise<void>;
  onAction: (actionId: string, params: Record<string, unknown>) => Promise<void>;
  isLoading: (actionId: string) => boolean;
}

/**
 * Dispatches onSkillInvoke and onAction per the spec's action handler pattern.
 * Tracks loading states per action ID.
 */
export function useBlockActions({ onSkillInvoke }: UseBlockActionsOptions): UseBlockActionsReturn {
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());

  const wrappedSkillInvoke = useCallback(async (skillId: string, params: Record<string, unknown>) => {
    const actionId = `skill-${skillId}-${Date.now()}`;
    setLoadingActions((prev) => new Set(prev).add(actionId));
    try {
      await onSkillInvoke(skillId, params);
    } finally {
      setLoadingActions((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  }, [onSkillInvoke]);

  const handleAction = useCallback(async (actionId: string, params: Record<string, unknown>) => {
    setLoadingActions((prev) => new Set(prev).add(actionId));
    try {
      // If params contain a skillId, invoke that skill
      if (params.skillId) {
        const { skillId, ...rest } = params;
        await onSkillInvoke(skillId as string, rest);
        return;
      }

      // Handle URL actions
      if (params.type === 'url' && params.url) {
        window.open(params.url as string, '_blank', 'noopener,noreferrer');
        return;
      }

      // Default: pass through to skill invoke with actionId
      await onSkillInvoke(actionId, params);
    } finally {
      setLoadingActions((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  }, [onSkillInvoke]);

  const isLoading = useCallback((actionId: string) => {
    return loadingActions.has(actionId);
  }, [loadingActions]);

  return {
    onSkillInvoke: wrappedSkillInvoke,
    onAction: handleAction,
    isLoading,
  };
}
