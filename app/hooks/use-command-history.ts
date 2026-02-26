'use client';

import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

/**
 * Tracks command history with up/down arrow navigation.
 * Returns a handler for keydown events and the current draft.
 */
export function useCommandHistory() {
  const historyRef = useRef<string[]>([]);
  const [index, setIndex] = useState(-1);
  const draftRef = useRef('');

  const push = useCallback((text: string) => {
    const h = historyRef.current;
    // Deduplicate: remove if same as last entry
    if (h.length > 0 && h[h.length - 1] === text) {
      setIndex(-1);
      return;
    }
    h.push(text);
    if (h.length > MAX_HISTORY) h.shift();
    setIndex(-1);
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
