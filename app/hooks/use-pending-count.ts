'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Polls the intelligence API to get the count of pending review items.
 * Used by the nav sidebar to show a badge on the Operations nav item.
 */
export function usePendingCount(intervalMs: number = 30000) {
  const [count, setCount] = useState(0);

  const fetch_ = useCallback(async () => {
    try {
      const res = await globalThis.fetch('/api/intelligence');
      if (res.ok) {
        const data = await res.json();
        const pending = Array.isArray(data.recommendations)
          ? data.recommendations.filter(
              (r: { status?: string; userFeedback?: string }) =>
                r.status === 'pending' && !r.userFeedback
            ).length
          : 0;
        setCount(pending);
      }
    } catch {
      // Silently fail — badge just won't update
    }
  }, []);

  useEffect(() => {
    fetch_();
    if (intervalMs <= 0) return;
    const id = setInterval(fetch_, intervalMs);
    return () => clearInterval(id);
  }, [fetch_, intervalMs]);

  return count;
}
