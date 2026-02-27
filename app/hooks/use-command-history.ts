'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

const MAX_HISTORY = 50;
const STORAGE_KEY = 'gtm-command-history';

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveToStorage(history: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
  } catch {
    // Storage full or unavailable — non-critical
  }
}

/**
 * Tracks command history with up/down arrow navigation.
 * Persists to localStorage so history survives page refreshes.
 */
export function useCommandHistory() {
  const historyRef = useRef<string[]>([]);
  const [index, setIndex] = useState(-1);
  const draftRef = useRef('');
  const initializedRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (!initializedRef.current) {
      historyRef.current = loadFromStorage();
      initializedRef.current = true;
    }
  }, []);

  const push = useCallback((text: string) => {
    const h = historyRef.current;
    // Deduplicate: skip if same as last entry
    if (h.length > 0 && h[h.length - 1] === text) {
      setIndex(-1);
      return;
    }
    h.push(text);
    if (h.length > MAX_HISTORY) h.shift();
    setIndex(-1);
    saveToStorage(h);
  }, []);

  /**
   * Call on keydown. Returns the new input value if history navigated,
   * or undefined if the key was not handled.
   */
  const onKeyDown = useCallback((e: React.KeyboardEvent, currentInput: string): string | undefined => {
    const h = historyRef.current;
    if (h.length === 0) return undefined;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex = index === -1 ? h.length - 1 : Math.max(0, index - 1);
      if (index === -1) draftRef.current = currentInput;
      setIndex(nextIndex);
      return h[nextIndex];
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (index === -1) return undefined;
      const nextIndex = index + 1;
      if (nextIndex >= h.length) {
        setIndex(-1);
        return draftRef.current;
      }
      setIndex(nextIndex);
      return h[nextIndex];
    }

    // Any other key resets navigation
    if (index !== -1) setIndex(-1);
    return undefined;
  }, [index]);

  return { push, onKeyDown };
}
