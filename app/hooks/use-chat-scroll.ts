'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

interface UseChatScrollOptions {
  /** Pixel threshold from bottom to consider "at bottom" */
  threshold?: number;
}

export function useChatScroll({ threshold = 80 }: UseChatScrollOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const checkAtBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);
  }, [threshold]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // Listen for scroll events
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkAtBottom, { passive: true });
    return () => el.removeEventListener('scroll', checkAtBottom);
  }, [checkAtBottom]);

  // Auto-scroll on content change if user is at bottom
  const onContentChange = useCallback(() => {
    if (isAtBottom) {
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }
  }, [isAtBottom, scrollToBottom]);

  return {
    containerRef,
    isAtBottom,
    showScrollButton,
    scrollToBottom,
    onContentChange,
  };
}
