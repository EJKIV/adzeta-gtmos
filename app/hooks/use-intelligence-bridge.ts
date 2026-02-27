/**
 * Intelligence Bridge Hook
 *
 * Watches recommendations from the server-side Decision Synthesis Engine
 * and manages the handoff to execution:
 * - Auto-creates action items for high-confidence recommendations (>80%)
 * - Queues low-confidence recommendations for operator review
 * - Tracks recommendation lifecycle (pending -> approved -> executed)
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFeedbackRecorder } from './use-personalization';
import {
  getAutoExecutableRecommendations,
  getReviewQueueRecommendations,
  getAverageConfidence,
  getConfidenceDistribution,
  type Recommendation,
} from '@/lib/intelligence/recommendation-engine';
import type { SignalType } from '@/lib/preference-service';

// Action item created from a recommendation
export interface ActionItem {
  id: string;
  recommendationId: string;
  title: string;
  description: string;
  status: 'pending' | 'queued' | 'executed' | 'failed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
  executedAt?: string;
  error?: string;
}

// Stream state
export interface IntelligenceStreamState {
  recommendations: Recommendation[];
  autoExecuted: ActionItem[];
  reviewQueue: Recommendation[];
  isProcessing: boolean;
  lastUpdated: string | null;
  error: Error | null;

  stats: {
    total: number;
    autoExecutable: number;
    queuedForReview: number;
    avgConfidence: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
}

// Hook return type
export interface UseIntelligenceBridgeResult extends IntelligenceStreamState {
  approveRecommendation: (id: string) => Promise<boolean>;
  rejectRecommendation: (id: string, reason?: string) => Promise<boolean>;
  executeRecommendation: (id: string) => Promise<boolean>;
  retryAutoExecution: (id: string) => Promise<boolean>;
  refresh: () => void;
  dismissRecommendation: (id: string) => void;
}

interface StoredFeedback {
  signalType: SignalType;
  section?: string;
  timestamp: string;
}

// Session-level stores for optimistic UI
const recommendationStore = new Map<string, Recommendation>();
const actionStore = new Map<string, ActionItem>();
const dismissedRecommendations = new Set<string>();

export function useIntelligenceStream(
  userId: string | null,
  autoExecuteThreshold: number = 80,
): UseIntelligenceBridgeResult {
  const { recordFeedback } = useFeedbackRecorder();

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [autoExecuted, setAutoExecuted] = useState<ActionItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isMountedRef = useRef(true);

  // Fetch recommendations from server
  useEffect(() => {
    let cancelled = false;

    async function fetchRecommendations() {
      setIsProcessing(true);
      setError(null);

      try {
        const res = await globalThis.fetch('/api/intelligence');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;

        const recs: Recommendation[] = (data.recommendations ?? []).map((r: Record<string, unknown>) => {
          // Map API response to Recommendation shape
          // The API may return partial shapes — fill in defaults
          return {
            id: r.id as string,
            type: r.type as string,
            title: r.title as string,
            description: r.description as string,
            priority: r.priority as string,
            confidenceScore: (r.confidenceScore as number) ?? (r.confidence as number) ?? 50,
            confidenceTrend: (r.confidenceTrend as string) ?? 'stable',
            sourceMetrics: (r.sourceMetrics as string[]) ?? [],
            sourceTrends: (r.sourceTrends as unknown[]) ?? [],
            scores: (r.scores as Record<string, number>) ?? {
              trendImpact: 0,
              preferenceMatch: 50,
              historicalAccuracy: 0.7,
              combined: (r.confidenceScore as number) ?? 50,
            },
            suggestedAction: (r.suggestedAction as Record<string, unknown>) ?? {
              type: 'manual_review',
              description: (r.description as string) ?? '',
              estimatedImpact: 'Unknown',
            },
            createdAt: (r.createdAt as string) ?? (r.created_at as string) ?? new Date().toISOString(),
            expiresAt: (r.expiresAt as string) ?? new Date(Date.now() + 86400000).toISOString(),
            userFeedback: r.userFeedback as string | undefined,
          } as Recommendation;
        });

        // Filter dismissed
        const filtered = recs.filter(r => !dismissedRecommendations.has(r.id));

        // Store for lookup
        filtered.forEach(r => recommendationStore.set(r.id, r));

        if (isMountedRef.current) {
          setRecommendations(filtered);
          setLastUpdated(new Date().toISOString());
        }

        // Auto-execute high-confidence recommendations
        const autoExecutable = getAutoExecutableRecommendations(filtered, autoExecuteThreshold);
        for (const rec of autoExecutable) {
          const existing = Array.from(actionStore.values()).find(
            a => a.recommendationId === rec.id
          );
          if (!existing) {
            await persistAction(rec);
          }
        }

        const existingActions = Array.from(actionStore.values()).filter(
          a => filtered.some(r => r.id === a.recommendationId)
        );
        if (isMountedRef.current) {
          setAutoExecuted(existingActions);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to fetch intelligence'));
        }
      } finally {
        if (isMountedRef.current) {
          setIsProcessing(false);
        }
      }
    }

    fetchRecommendations();

    // Refresh every 60s
    const interval = setInterval(fetchRecommendations, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [autoExecuteThreshold, refreshKey]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Persist action to autonomous_tasks via API
  const persistAction = useCallback(async (recommendation: Recommendation): Promise<ActionItem> => {
    const action: ActionItem = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recommendationId: recommendation.id,
      title: recommendation.title,
      description: recommendation.suggestedAction?.description ?? recommendation.description,
      status: 'pending',
      priority: recommendation.priority,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await globalThis.fetch('/api/autonomy/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: recommendation.title,
          description: recommendation.suggestedAction?.description ?? recommendation.description,
          priority: recommendation.priority,
          task_type: 'kpi_investigation',
          confidence_score: recommendation.confidenceScore,
          source_recommendation_id: recommendation.id,
        }),
      });

      if (res.ok) {
        action.status = 'executed';
        action.executedAt = new Date().toISOString();
      } else {
        action.status = 'failed';
        action.error = `HTTP ${res.status}`;
      }
    } catch (err) {
      action.status = 'failed';
      action.error = err instanceof Error ? err.message : 'Unknown error';
    }

    actionStore.set(action.id, action);

    if (isMountedRef.current) {
      setAutoExecuted(prev => [...prev.filter(a => a.id !== action.id), action]);
    }

    return action;
  }, []);

  const approveRecommendation = useCallback(async (id: string): Promise<boolean> => {
    const recommendation = recommendationStore.get(id);
    if (!recommendation) return false;

    try {
      const action = await persistAction(recommendation);
      recommendation.userFeedback = 'accepted';
      await recordFeedback('explicit_positive', 'intelligence');
      return action.status === 'executed';
    } catch (err) {
      console.error('Failed to approve recommendation:', err);
      return false;
    }
  }, [persistAction, recordFeedback]);

  const rejectRecommendation = useCallback(async (id: string, _reason?: string): Promise<boolean> => {
    const recommendation = recommendationStore.get(id);
    if (!recommendation) return false;

    try {
      recommendation.userFeedback = 'rejected';
      setRecommendations(prev => prev.map(r =>
        r.id === id ? { ...r, userFeedback: 'rejected' as const } : r
      ));
      await recordFeedback('explicit_negative', 'intelligence');
      return true;
    } catch (err) {
      console.error('Failed to reject recommendation:', err);
      return false;
    }
  }, [recordFeedback]);

  const executeRecommendation = useCallback(async (id: string): Promise<boolean> => {
    const recommendation = recommendationStore.get(id);
    if (!recommendation) return false;

    try {
      const action = await persistAction(recommendation);
      return action.status === 'executed';
    } catch (err) {
      console.error('Failed to execute recommendation:', err);
      return false;
    }
  }, [persistAction]);

  const retryAutoExecution = useCallback(async (id: string): Promise<boolean> => {
    const action = Array.from(actionStore.values()).find(
      a => a.recommendationId === id && a.status === 'failed'
    );
    if (!action) return false;

    const recommendation = recommendationStore.get(id);
    if (!recommendation) return false;

    try {
      actionStore.delete(action.id);
      const newAction = await persistAction(recommendation);
      return newAction.status === 'executed';
    } catch (err) {
      console.error('Failed to retry execution:', err);
      return false;
    }
  }, [persistAction]);

  const dismissRecommendation = useCallback((id: string): void => {
    dismissedRecommendations.add(id);
    const rec = recommendationStore.get(id);
    if (rec) {
      rec.userFeedback = 'dismissed';
    }
    setRecommendations(prev => prev.filter(r => r.id !== id));
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const reviewQueue = useMemo(() => {
    return getReviewQueueRecommendations(recommendations, autoExecuteThreshold)
      .filter(r => !r.userFeedback);
  }, [recommendations, autoExecuteThreshold]);

  const stats = useMemo(() => {
    const distribution = getConfidenceDistribution(recommendations);
    const autoExecutable = getAutoExecutableRecommendations(recommendations, autoExecuteThreshold);

    return {
      total: recommendations.length,
      autoExecutable: autoExecutable.length,
      queuedForReview: reviewQueue.length,
      avgConfidence: getAverageConfidence(recommendations),
      highConfidence: distribution.high,
      mediumConfidence: distribution.medium,
      lowConfidence: distribution.low,
    };
  }, [recommendations, reviewQueue, autoExecuteThreshold]);

  return {
    recommendations,
    autoExecuted,
    reviewQueue,
    isProcessing,
    lastUpdated,
    error,
    stats,
    approveRecommendation,
    rejectRecommendation,
    executeRecommendation,
    retryAutoExecution,
    dismissRecommendation,
    refresh,
  };
}

export {
  getAutoExecutableRecommendations,
  getReviewQueueRecommendations,
  getAverageConfidence,
  getConfidenceDistribution,
};
