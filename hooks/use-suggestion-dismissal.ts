'use client';

import { useState, useCallback, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DismissedSuggestion {
  id: string;
  dismissedAt: string; // ISO timestamp
}

export interface UseSuggestionDismissalOptions {
  /** Storage key for localStorage (default: 'gtm-dismissed-suggestions') */
  storageKey?: string;
  /** Duration in milliseconds before a dismissed suggestion can reappear (default: 24 hours) */
  cooldownMs?: number;
}

export interface UseSuggestionDismissalReturn {
  /** List of currently dismissed suggestions */
  dismissedSuggestions: DismissedSuggestion[];
  /** Check if a suggestion is currently dismissed */
  isDismissed: (suggestionId: string) => boolean;
  /** Dismiss a suggestion */
  dismiss: (suggestionId: string) => void;
  /** Re-allow a previously dismissed suggestion */
  undismiss: (suggestionId: string) => void;
  /** Clear all dismissed suggestions */
  clearAll: () => void;
  /** Get the remaining cooldown time in ms for a dismissed suggestion */
  getRemainingCooldown: (suggestionId: string) => number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_STORAGE_KEY = 'gtm-dismissed-suggestions';
const DEFAULT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load dismissed suggestions from localStorage
 */
function loadFromStorage(storageKey: string): DismissedSuggestion[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as DismissedSuggestion[];
      // Validate it's an array
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('[useSuggestionDismissal] Failed to load from storage:', error);
  }
  
  return [];
}

/**
 * Save dismissed suggestions to localStorage
 */
function saveToStorage(storageKey: string, suggestions: DismissedSuggestion[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(suggestions));
  } catch (error) {
    console.error('[useSuggestionDismissal] Failed to save to storage:', error);
  }
}

/**
 * Clean up expired dismissed suggestions
 */
function cleanupExpired(
  suggestions: DismissedSuggestion[],
  cooldownMs: number,
  now: number
): DismissedSuggestion[] {
  return suggestions.filter(
    (item) => now - new Date(item.dismissedAt).getTime() < cooldownMs
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useSuggestionDismissal - Track dismissed suggestions with 24h cooldown
 * 
 * Manages client-side dismissal state for suggestion toasts.
 * Dismissed suggestions won't reappear until the cooldown expires.
 * 
 * @example
 * ```tsx
 * const { isDismissed, dismiss, getRemainingCooldown } = useSuggestionDismissal();
 * 
 * // Check if suggestion should be shown
 * if (!isDismissed(suggestion.id)) {
 *   showToast(suggestion);
 * }
 * 
 * // Dismiss with cooldown
 * dismiss(suggestion.id);
 * 
 * // Check remaining time
 * const remainingMs = getRemainingCooldown(suggestion.id);
 * ```
 */
export function useSuggestionDismissal(
  options: UseSuggestionDismissalOptions = {}
): UseSuggestionDismissalReturn {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    cooldownMs = DEFAULT_COOLDOWN_MS,
  } = options;

  // State
  const [dismissedSuggestions, setDismissedSuggestions] = useState<DismissedSuggestion[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const loaded = loadFromStorage(storageKey);
    const now = Date.now();
    const cleaned = cleanupExpired(loaded, cooldownMs, now);
    
    // Save cleaned list if items were removed
    if (cleaned.length !== loaded.length) {
      saveToStorage(storageKey, cleaned);
    }
    
    setDismissedSuggestions(cleaned);
    setIsHydrated(true);
  }, [storageKey, cooldownMs]);

  // Periodically clean up expired entries
  useEffect(() => {
    if (!isHydrated) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setDismissedSuggestions((current) => {
        const cleaned = cleanupExpired(current, cooldownMs, now);
        if (cleaned.length !== current.length) {
          saveToStorage(storageKey, cleaned);
        }
        return cleaned;
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [storageKey, cooldownMs, isHydrated]);

  /**
   * Check if a suggestion is currently dismissed (and not expired)
   */
  const isDismissed = useCallback(
    (suggestionId: string): boolean => {
      if (!isHydrated) return false; // Don't block during hydration
      
      const suggestion = dismissedSuggestions.find((item) => item.id === suggestionId);
      if (!suggestion) return false;
      
      const dismissedAt = new Date(suggestion.dismissedAt).getTime();
      const now = Date.now();
      
      return now - dismissedAt < cooldownMs;
    },
    [dismissedSuggestions, cooldownMs, isHydrated]
  );

  /**
   * Dismiss a suggestion (adds to storage with timestamp)
   */
  const dismiss = useCallback(
    (suggestionId: string): void => {
      setDismissedSuggestions((current) => {
        // Remove any existing entry for this ID
        const filtered = current.filter((item) => item.id !== suggestionId);
        
        // Add new dismissal entry
        const updated = [
          ...filtered,
          {
            id: suggestionId,
            dismissedAt: new Date().toISOString(),
          },
        ];
        
        saveToStorage(storageKey, updated);
        return updated;
      });
    },
    [storageKey]
  );

  /**
   * Remove a suggestion from the dismissed list (make it eligible again)
   */
  const undismiss = useCallback(
    (suggestionId: string): void => {
      setDismissedSuggestions((current) => {
        const updated = current.filter((item) => item.id !== suggestionId);
        saveToStorage(storageKey, updated);
        return updated;
      });
    },
    [storageKey]
  );

  /**
   * Clear all dismissed suggestions
   */
  const clearAll = useCallback((): void => {
    setDismissedSuggestions([]);
    saveToStorage(storageKey, []);
  }, [storageKey]);

  /**
   * Get remaining cooldown time in milliseconds
   * Returns 0 if not dismissed or cooldown expired
   */
  const getRemainingCooldown = useCallback(
    (suggestionId: string): number => {
      const suggestion = dismissedSuggestions.find((item) => item.id === suggestionId);
      if (!suggestion) return 0;
      
      const dismissedAt = new Date(suggestion.dismissedAt).getTime();
      const elapsed = Date.now() - dismissedAt;
      
      return Math.max(0, cooldownMs - elapsed);
    },
    [dismissedSuggestions, cooldownMs]
  );

  return {
    dismissedSuggestions,
    isDismissed,
    dismiss,
    undismiss,
    clearAll,
    getRemainingCooldown,
  };
}

/**
 * Hook to check multiple suggestions at once
 */
export function useBatchSuggestionDismissal(
  suggestionIds: string[],
  options?: UseSuggestionDismissalOptions
): {
  visibleSuggestionIds: string[];
  dismissedCount: number;
  visibleCount: number;
} {
  const { isDismissed } = useSuggestionDismissal(options);

  const filtered = suggestionIds.filter((id) => !isDismissed(id));

  return {
    visibleSuggestionIds: filtered,
    dismissedCount: suggestionIds.length - filtered.length,
    visibleCount: filtered.length,
  };
}

export default useSuggestionDismissal;
