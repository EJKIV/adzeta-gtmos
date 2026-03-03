'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Check, X, Sparkles, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/hooks/use-toast';
import { useSuggestionDismissal } from '@/hooks/use-suggestion-dismissal';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SuggestionData {
  id: string;
  text: string;
  confidence: number; // 0-1
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface SuggestionToastProps {
  data: SuggestionData;
  onAccepted?: (suggestion: SuggestionData) => void;
  onDismissed?: (suggestion: SuggestionData) => void;
  /** Auto-dismiss after this many milliseconds (default: 10000ms) */
  autoDismissMs?: number;
  /** Additional CSS classes */
  className?: string;
  /** Position variant (default: 'inline') */
  position?: 'inline' | 'bottom-right';
  /** Whether to track dismissal in localStorage (default: true) */
  trackDismissal?: boolean;
}

type ToastState = 'entering' | 'visible' | 'exiting' | 'dismissed';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_AUTO_DISMISS_MS = 10000; // 10 seconds
const ANIMATION_ENTER_MS = 300;
const ANIMATION_EXIT_MS = 200;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SuggestionToast - Auto-dismissing toast for proactive suggestions
 * 
 * Displays AI-generated suggestions with confidence scores, allowing quick
 * accept/dismiss actions. Auto-dismisses after 10 seconds unless hovered.
 * 
 * Features:
 * - Auto-dismiss with hover pause
 * - 24h dismissal tracking (won't reappear after dismiss)
 * - Smooth entry/exit animations
 * - Accessible: focusable, ESC to dismiss, screen reader support
 * - Responsive: stacks on mobile, floats on desktop
 * 
 * @example
 * ```tsx
 * <SuggestionToast
 *   data={{
 *     id: 'sugg-123',
 *     text: 'Create a follow-up email sequence?',
 *     confidence: 0.85,
 *   }}
 *   onAccepted={(sugg) => console.log('Accepted:', sugg)}
 *   onDismissed={(sugg) => console.log('Dismissed:', sugg)}
 * />
 * ```
 */
export function SuggestionToast({
  data,
  onAccepted,
  onDismissed,
  autoDismissMs = DEFAULT_AUTO_DISMISS_MS,
  className,
  position = 'inline',
  trackDismissal = true,
}: SuggestionToastProps) {
  const { text, confidence } = data;
  const { toast } = useToast();
  const { dismiss, isDismissed } = useSuggestionDismissal();
  
  // State
  const [toastState, setToastState] = useState<ToastState>('entering');
  const [isHovered, setIsHovered] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [remainingMs, setRemainingMs] = useState(autoDismissMs);
  
  // Refs
  const toastRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimeRef = useRef<number>(Date.now());

  const confidencePercent = Math.round(confidence * 100);

  // ────────────────────────────────────────────────────────────────────────────
  // Animation lifecycle
  // ────────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    // Enter animation
    const enterTimer = setTimeout(() => {
      setToastState('visible');
    }, ANIMATION_ENTER_MS);

    return () => {
      clearTimeout(enterTimer);
    };
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Auto-dismiss timer with progress tracking
  // ────────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (toastState !== 'visible' || isHovered || isAccepting) {
      return;
    }

    lastTimeRef.current = Date.now();

    // Update progress every 100ms
    progressIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTimeRef.current;
      lastTimeRef.current = now;

      setRemainingMs((prev) => {
        const updated = Math.max(0, prev - elapsed);
        return updated;
      });
    }, 100);

    // Auto-dismiss timer
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, remainingMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [toastState, isHovered, isAccepting, remainingMs]);

  // ────────────────────────────────────────────────────────────────────────────
  // Keyboard handling (ESC to dismiss)
  // ────────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toastState === 'visible') {
        handleDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toastState]);

  // ────────────────────────────────────────────────────────────────────────────
  // Screen reader announcement
  // ────────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (toastState === 'visible' && typeof window !== 'undefined') {
      // Announce to screen readers
      const announcement = `New suggestion: ${text}. Press Enter to accept or Escape to dismiss.`;
      
      // Create a live region announcement
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.textContent = announcement;
      document.body.appendChild(liveRegion);

      return () => {
        setTimeout(() => {
          document.body.removeChild(liveRegion);
        }, 1000);
      };
    }
  }, [toastState, text]);

  // ────────────────────────────────────────────────────────────────────────────
  // Action handlers
  // ────────────────────────────────────────────────────────────────────────────
  
  const handleDismiss = useCallback(() => {
    if (toastState === 'exiting' || toastState === 'dismissed') return;

    setToastState('exiting');

    // Clear timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    // Track dismissal if enabled
    if (trackDismissal) {
      dismiss(data.id);
    }

    // Notify parent
    setTimeout(() => {
      setToastState('dismissed');
      onDismissed?.(data);
    }, ANIMATION_EXIT_MS);
  }, [data, dismiss, onDismissed, toastState, trackDismissal]);

  const handleAccept = useCallback(async () => {
    if (isAccepting || toastState !== 'visible') return;

    setIsAccepting(true);

    // Clear timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    try {
      // Call API to accept suggestion
      const response = await fetch(`/api/suggestions/${data.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          suggestion: data,
          acceptedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to accept: ${response.statusText}`);
      }

      const result = await response.json();

      // Show success toast
      toast({
        title: 'Suggestion accepted',
        description: 'Task has been created.',
      });

      // Notify parent
      onAccepted?.(data);

      // Exit animation
      setToastState('exiting');
      setTimeout(() => setToastState('dismissed'), ANIMATION_EXIT_MS);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept suggestion';
      toast({
        title: 'Accept failed',
        description: message,
        variant: 'destructive',
      });
      setIsAccepting(false);
    }
  }, [data, isAccepting, onAccepted, toast, toastState]);

  // ────────────────────────────────────────────────────────────────────────────
  // Hover handlers
  // ────────────────────────────────────────────────────────────────────────────
  
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    lastTimeRef.current = Date.now();
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ────────────────────────────────────────────────────────────────────────────
  
  const getConfidenceColor = (conf: number): string => {
    if (conf >= 0.8) return 'bg-green-500';
    if (conf >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Don't render if dismissed
  if (toastState === 'dismissed') return null;

  const progressPercent = (remainingMs / autoDismissMs) * 100;
  const confidenceColor = getConfidenceColor(confidence);

  return (
    <div
      ref={toastRef}
      className={cn(
        // Base styles
        'relative overflow-hidden rounded-lg border bg-card shadow-lg',
        'transition-all duration-300 ease-out',
        'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2',
        
        // Animation states
        toastState === 'entering' && 'opacity-0 translate-y-5',
        toastState === 'visible' && 'opacity-100 translate-y-0',
        toastState === 'exiting' && 'opacity-0 ease-in duration-200',
        
        // Hover state
        isHovered && 'scale-[1.02] shadow-xl',
        
        // Position variants
        position === 'inline' && 'w-full max-w-md mx-auto',
        position === 'bottom-right' && 'fixed bottom-4 right-4 z-50 w-full max-w-sm',
        
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="dialog"
      aria-modal="false"
      aria-labelledby="suggestion-text"
      aria-describedby="suggestion-confidence"
      tabIndex={0}
    >
      {/* Progress bar */}
      {!isHovered && toastState === 'visible' && (
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-gray-200"
          aria-hidden="true"
        >
          <div
            className={cn('h-full transition-all duration-100 ease-linear', confidenceColor)}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="p-4 pt-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            confidence >= 0.8 ? 'bg-green-100' : 
            confidence >= 0.5 ? 'bg-yellow-100' : 'bg-red-100'
          )}>
            <Sparkles className={cn(
              'w-4 h-4',
              confidence >= 0.8 ? 'text-green-600' : 
              confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'
            )} aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <p 
              id="suggestion-text"
              className="text-sm font-medium text-foreground"
            >
              {text}
            </p>

            {/* Confidence indicator */}
            <div 
              id="suggestion-confidence"
              className="mt-2 flex items-center gap-2"
            >
              <div className="flex items-center gap-1.5">
                <div className={cn('w-2 h-2 rounded-full', confidenceColor)} />
                <span className="text-xs text-muted-foreground">
                  {confidencePercent}% confidence
                </span>
              </div>

              {isHovered && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground animate-in fade-in">
                  <Timer className="w-3 h-3" />
                  Paused
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            disabled={isAccepting}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss suggestion"
          >
            <X className="w-4 h-4 mr-1" aria-hidden="true" />
            Dismiss
          </Button>

          <Button
            size="sm"
            onClick={handleAccept}
            disabled={isAccepting}
            className="bg-primary hover:bg-primary/90"
            aria-label="Accept suggestion"
          >
            {isAccepting ? (
              <>
                <span className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" aria-hidden="true" />
                Accept
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Screen reader only instructions */}
      <div className="sr-only" role="status" aria-live="polite">
        {isAccepting && 'Creating task...'}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Container Component for managing multiple toasts
// ─────────────────────────────────────────────────────────────────────────────

export interface SuggestionToastContainerProps {
  suggestions: SuggestionData[];
  onAccepted?: (suggestion: SuggestionData) => void;
  onDismissed?: (suggestion: SuggestionData) => void;
  maxVisible?: number;
}

/**
 * Container for managing multiple suggestion toasts
 * Stacks on mobile, positions on desktop
 */
export function SuggestionToastContainer({
  suggestions,
  onAccepted,
  onDismissed,
  maxVisible = 3,
}: SuggestionToastContainerProps) {
  const { isDismissed } = useSuggestionDismissal();

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions
    .filter((s) => !isDismissed(s.id))
    .slice(0, maxVisible);

  return (
    <>
      {/* Desktop: Fixed position stack */}
      <div className="hidden sm:block fixed bottom-4 right-4 z-50 space-y-3">
        {visibleSuggestions.map((suggestion) => (
          <SuggestionToast
            key={suggestion.id}
            data={suggestion}
            onAccepted={onAccepted}
            onDismissed={onDismissed}
            position="inline"
          />
        ))}
      </div>

      {/* Mobile: Inline stack */}
      <div className="sm:hidden space-y-3">
        {visibleSuggestions.map((suggestion) => (
          <SuggestionToast
            key={suggestion.id}
            data={suggestion}
            onAccepted={onAccepted}
            onDismissed={onDismissed}
            position="inline"
          />
        ))}
      </div>
    </>
  );
}

export default SuggestionToast;
