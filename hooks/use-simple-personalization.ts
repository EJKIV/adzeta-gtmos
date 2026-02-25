/**
 * useSimplePersonalization Hook (Minimal)
 * 
 * Simplified personalization:
 * - Fetch user's preference model from /api/users/me/preferences
 * - Return default if none exists
 * - Apply to: dashboard card order only
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getUserPreferences,
  storeFeedback,
  DEFAULT_CARD_ORDER,
} from '../lib/preference-service';

export type CardType = 'kpi' | 'objectives' | 'intelligence' | 'alerts';
export type SignalType = 'explicit_positive' | 'explicit_negative' | 'dwell' | 'skip';

export interface PreferenceModel {
  user_id: string;
  card_order: CardType[];
  updated_at: string;
}

// 5 minute TTL for cache
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_KEY = 'prefs_cache';

interface CacheEntry {
  userId: string;
  model: PreferenceModel;
  timestamp: number;
}

// Module-level: read from localStorage ONCE at module init (survives Fast Refresh)
let moduleUserId: string | null = typeof window !== 'undefined' 
  ? localStorage.getItem('user_id') 
  : null;
let moduleFetchPromise: Promise<PreferenceModel | null> | null = null;
let moduleLastFetchTime = 0;
const FETCH_DEDUP_MS = 100; // Deduplicate fetches within 100ms

// Generate or get user ID - uses localStorage as source of truth
function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  
  // Check localStorage first (survives Fast Refresh)
  let userId = localStorage.getItem('user_id');
  
  if (!userId) {
    // Generate new ID only if no stored ID
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('user_id', userId);
  }
  
  // Also cache in module for performance
  moduleUserId = userId;
  return userId;
}

// Load from cache
function loadCache(userId: string): PreferenceModel | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    
    const entry: CacheEntry = JSON.parse(raw);
    if (entry.userId !== userId) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
    
    return entry.model;
  } catch {
    return null;
  }
}

// Save to cache
function saveCache(userId: string, model: PreferenceModel): void {
  if (typeof window === 'undefined') return;
  
  try {
    const entry: CacheEntry = {
      userId,
      model,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
}

// Module-level fetch with deduplication
async function fetchPreferencesWithDedup(userId: string): Promise<PreferenceModel | null> {
  const now = Date.now();
  
  // Return existing promise if fetch is in progress
  if (moduleFetchPromise && (now - moduleLastFetchTime) < FETCH_DEDUP_MS) {
    return moduleFetchPromise;
  }
  
  moduleLastFetchTime = now;
  
  moduleFetchPromise = (async () => {
    try {
      const response = await fetch(`/api/users/${userId}/preferences`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // No preferences yet, use defaults
          return {
            user_id: userId,
            card_order: DEFAULT_CARD_ORDER,
            updated_at: new Date().toISOString(),
          };
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return {
        user_id: data.user_id || userId,
        card_order: data.card_order || DEFAULT_CARD_ORDER,
        updated_at: data.updated_at || new Date().toISOString(),
      };
    } catch (err) {
      console.error('Failed to fetch preferences:', err);
      return null;
    }
  })();
  
  return moduleFetchPromise;
}

export interface PersonalizationState {
  userId: string;
  cardOrder: CardType[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  recordFeedback: (signalType: SignalType, section?: string) => Promise<void>;
}

/**
 * Minimal personalization hook
 * Fetches preferences and provides card ordering
 */
export function useSimplePersonalization(): PersonalizationState {
  // Use useState with initializer that checks module-level cache first
  // This prevents multiple components from generating different IDs
  const [userId] = useState(() => {
    // Fast Refresh resilient: moduleUserId is initialized from localStorage at module load
    // If moduleUserId exists, use it; otherwise getUserId() will read/create
    return moduleUserId || getUserId();
  });
  
  const [cardOrder, setCardOrder] = useState<CardType[]>(DEFAULT_CARD_ORDER);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initial fetch - only runs once per session due to module-level dedup
  useEffect(() => {
    let cancelled = false;
    
    async function loadPreferences() {
      // Check cache first
      const cached = loadCache(userId);
      if (cached && !cancelled) {
        setCardOrder(cached.card_order);
        setIsLoading(false);
      }
      
      // Fetch from API (with deduplication)
      const model = await fetchPreferencesWithDedup(userId);
      
      if (cancelled) return;
      
      if (model) {
        setCardOrder(model.card_order);
        saveCache(userId, model);
        setError(null);
      } else {
        setError('Failed to load preferences');
        setCardOrder(DEFAULT_CARD_ORDER);
      }
      
      setIsLoading(false);
    }
    
    loadPreferences();
    
    return () => {
      cancelled = true;
    };
  }, [userId]);
  
  // Refresh function - forces new fetch
  const refresh = useCallback(async () => {
    // Clear the module fetch promise to allow new fetch
    moduleFetchPromise = null;
    
    const model = await fetchPreferencesWithDedup(userId);
    
    if (model) {
      setCardOrder(model.card_order);
      saveCache(userId, model);
      setError(null);
    } else {
      setError('Failed to refresh preferences');
    }
    setIsLoading(false);
  }, [userId]);
  
  // Record feedback
  const recordFeedback = useCallback(async (signalType: SignalType, section?: string) => {
    try {
      // Optimistic local store
      await storeFeedback(userId, signalType, section);
      
      // Also post to API for server-side processing
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          signal_type: signalType,
          section,
        }),
      });
    } catch (err) {
      console.error('Failed to record feedback:', err);
    }
  }, [userId]);
  
  return {
    userId,
    cardOrder,
    isLoading,
    error,
    refresh,
    recordFeedback,
  };
}

/**
 * Hook to get just the card order
 */
export function useCardOrder(): CardType[] {
  const { cardOrder } = useSimplePersonalization();
  return cardOrder;
}

/**
 * Hook to record section engagement
 */
export function useRecordEngagement() {
  const { recordFeedback } = useSimplePersonalization();
  
  return useCallback(
    (section: string, positive: boolean = true) => {
      const signalType: SignalType = positive ? 'explicit_positive' : 'explicit_negative';
      recordFeedback(signalType, section);
    },
    [recordFeedback]
  );
}

export default useSimplePersonalization;
