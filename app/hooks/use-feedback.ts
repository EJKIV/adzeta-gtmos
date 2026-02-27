'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ThreadEntry } from '@/lib/skills/types';

type Rating = 'positive' | 'negative';

/**
 * Manages chat message feedback state and API persistence.
 * Extracted from useChatEngine to isolate feedback concerns.
 */
export function useFeedback(activeSessionId: string | null) {
  const [feedbackMap, setFeedbackMap] = useState<Map<string, Rating>>(new Map());
  const threadRef = useRef<ThreadEntry[]>([]);

  const reset = useCallback(() => {
    setFeedbackMap(new Map());
  }, []);

  /** Keep thread ref in sync for lookup without re-render dependency */
  const syncThread = useCallback((thread: ThreadEntry[]) => {
    threadRef.current = thread;
  }, []);

  const handleFeedback = useCallback((
    messageId: string,
    rating: Rating,
    comment?: string,
  ) => {
    setFeedbackMap((prev) => new Map(prev).set(messageId, rating));

    if (!activeSessionId) return;

    const currentThread = threadRef.current;
    const entry = currentThread.find((e) => e.id === messageId);
    let userQuery: string | undefined;
    const idx = currentThread.findIndex((e) => e.id === messageId);
    for (let i = idx - 1; i >= 0; i--) {
      if (currentThread[i].type === 'command' && currentThread[i].text) {
        userQuery = currentThread[i].text;
        break;
      }
    }

    fetch('/api/feedback/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: activeSessionId,
        messageClientId: messageId,
        rating,
        comment,
        userQuery,
        aiOutput: entry?.output,
        skillId: entry?.output?.skillId,
      }),
    }).catch(() => {
      // Feedback is best-effort — don't block the user
    });
  }, [activeSessionId]);

  return { feedbackMap, handleFeedback, reset, syncThread };
}
