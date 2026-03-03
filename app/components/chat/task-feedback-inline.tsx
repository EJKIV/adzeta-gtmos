'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronDown, ChevronUp, CheckCircle, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useTaskFeedback, type TaskFeedbackPayload } from '@/hooks/use-task-feedback';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskFeedbackInlineProps {
  /** Unique task identifier */
  taskId: string;
  /** Task summary to display */
  taskSummary: string;
  /** Optional additional task metadata */
  metadata?: Record<string, unknown>;
  /** Auto-dismiss after submission (default: true) */
  autoDismiss?: boolean;
  /** Auto-dismiss delay in ms after submit (default: 30000) */
  dismissDelay?: number;
  /** Called when feedback is successfully submitted */
  onSubmitted?: (taskId: string, rating: number) => void;
  /** Called when component is dismissed */
  onDismiss?: () => void;
  className?: string;
}

type FeedbackState = 'rating' | 'details' | 'submitting' | 'submitted';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TaskFeedbackInline - Inline task completion feedback component
 * 
 * Displays in chat thread when a task completes, allowing users to
 * rate the task (1-5 stars) and optionally provide text feedback.
 * 
 * Features:
 * - Star rating with keyboard navigation
 * - Collapsible text feedback sections
 * - Auto-dismiss after 30 seconds or on submit
 * - Local persistence if submit fails
 * - Full accessibility (ARIA labels, focus management)
 * - Mobile-responsive design
 * 
 * @example
 * ```tsx
 * <TaskFeedbackInline
 *   taskId="task-123"
 *   taskSummary="Campaign sequence created successfully"
 *   onSubmitted={(id, rating) => console.log('Rated:', rating)}
 * />
 * ```
 */
export function TaskFeedbackInline({
  taskId,
  taskSummary,
  metadata,
  autoDismiss = true,
  dismissDelay = 30000,
  onSubmitted,
  onDismiss,
  className,
}: TaskFeedbackInlineProps) {
  // Form state
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [workedWell, setWorkedWell] = useState('');
  const [improvement, setImprovement] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [state, setState] = useState<FeedbackState>('rating');
  
  // Auto-dismiss timer
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs for focus management
  const ratingGroupRef = useRef<HTMLDivElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  
  // Feedback submission hook
  const { submitFeedback, isSubmitting, error, clearError } = useTaskFeedback();

  // ───────────────────────────────────────────────────────────────────────────
  // Auto-dismiss setup
  // ───────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (autoDismiss && state !== 'submitted') {
      dismissTimerRef.current = setTimeout(() => {
        if (state === 'rating' && !rating) {
          // Only auto-dismiss if no rating selected yet
          onDismiss?.();
        }
      }, dismissDelay);
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [autoDismiss, dismissDelay, state, rating, onDismiss]);

  // Clear timer on successful submit
  useEffect(() => {
    if (state === 'submitted' && dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, [state]);

  // ───────────────────────────────────────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────────────────────────────────────

  const handleRatingSelect = useCallback((value: number) => {
    setRating(value);
    clearError();
    
    // Move to details if user wants to add more
    if (value >= 4) {
      // High ratings - focus on submit or show details
      setTimeout(() => {
        submitButtonRef.current?.focus();
      }, 50);
    }
  }, [clearError]);

  const handleSubmit = useCallback(async () => {
    if (!rating) return;

    setState('submitting');

    const success = await submitFeedback({
      taskId,
      rating: rating as 1 | 2 | 3 | 4 | 5,
      workedWell: workedWell.trim() || undefined,
      improvement: improvement.trim() || undefined,
      metadata,
    });

    if (success) {
      setState('submitted');
      onSubmitted?.(taskId, rating);
      
      // Auto-dismiss after showing thanks
      if (autoDismiss) {
        setTimeout(() => {
          onDismiss?.();
        }, 3000);
      }
    } else {
      // Queued for retry - still show thanks
      setState('submitted');
      onSubmitted?.(taskId, rating);
    }
  }, [rating, taskId, workedWell, improvement, metadata, submitFeedback, onSubmitted, autoDismiss, onDismiss]);

  // ───────────────────────────────────────────────────────────────────────────
  // Keyboard Navigation
  // ───────────────────────────────────────────────────────────────────────────

  const handleStarKeyDown = useCallback((e: React.KeyboardEvent, starIndex: number) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        if (starIndex < 5) {
          const nextStar = ratingGroupRef.current?.querySelector(`[data-star="${starIndex + 1}"]`) as HTMLElement;
          nextStar?.focus();
        }
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        if (starIndex > 1) {
          const prevStar = ratingGroupRef.current?.querySelector(`[data-star="${starIndex - 1}"]`) as HTMLElement;
          prevStar?.focus();
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleRatingSelect(starIndex);
        break;
      case 'Home':
        e.preventDefault();
        const firstStar = ratingGroupRef.current?.querySelector('[data-star="1"]') as HTMLElement;
        firstStar?.focus();
        break;
      case 'End':
        e.preventDefault();
        const lastStar = ratingGroupRef.current?.querySelector('[data-star="5"]') as HTMLElement;
        lastStar?.focus();
        break;
    }
  }, [handleRatingSelect]);

  // ───────────────────────────────────────────────────────────────────────────
  // Render Helpers
  // ───────────────────────────────────────────────────────────────────────────

  const displayRating = hoverRating ?? rating;

  // ───────────────────────────────────────────────────────────────────────────
  // Render: Submitted State
  // ───────────────────────────────────────────────────────────────────────────

  if (state === 'submitted') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "w-full max-w-full sm:max-w-lg",
          className
        )}
      >
        <Card 
          className="border-l-4 border-l-green-500 bg-green-50/50 overflow-hidden"
          role="status"
          aria-live="polite"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700">
                  Thanks for your feedback! 🙏
                </p>
                <p className="text-xs text-green-600/80 mt-0.5">
                  Your input helps us improve.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Render: Rating/Details State
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "w-full max-w-full sm:max-w-lg",
        className
      )}
    >
      <Card 
        className={cn(
          "border-l-4 border-l-green-500 overflow-hidden",
          "focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
        )}
        role="form"
        aria-labelledby="feedback-title"
        aria-describedby="feedback-description"
      >
        <CardHeader className="pb-3 space-y-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-green-50 shrink-0">
              <MessageSquare className="h-4 w-4 text-green-600" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle 
                id="feedback-title"
                className="text-sm font-medium leading-tight"
              >
                Task completed successfully
              </CardTitle>
              <p 
                id="feedback-description"
                className="text-xs text-muted-foreground mt-1 line-clamp-2"
              >
                {taskSummary}
              </p>
            </div>
          </div>

          {/* Rating Section */}
          <div className="pt-2">
            <label 
              htmlFor="star-rating"
              className="sr-only"
            >
              Rate this task completion (1-5 stars, required)
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              How was your experience?
            </p>
            
            <div
              ref={ratingGroupRef}
              id="star-rating"
              role="radiogroup"
              aria-label="Rating"
              aria-required="true"
              aria-invalid={!rating}
              className="flex items-center gap-1"
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  data-star={star}
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  tabIndex={star === 1 || rating === star ? 0 : -1}
                  onClick={() => handleRatingSelect(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onKeyDown={(e) => handleStarKeyDown(e, star)}
                  disabled={isSubmitting}
                  className={cn(
                    "p-1 rounded transition-all duration-150",
                    "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1",
                    isSubmitting && "opacity-50 cursor-not-allowed",
                    displayRating && star <= displayRating && "text-amber-400",
                    (!displayRating || star > displayRating) && "text-slate-300 hover:text-amber-200"
                  )}
                >
                  <Star
                    className={cn(
                      "h-6 w-6 transition-all",
                      displayRating && star <= displayRating ? "fill-current" : "fill-none"
                    )}
                  />
                </button>
              ))}
            </div>
            
            {/* Rating label */}
            {rating && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-medium text-green-600 mt-1"
              >
                {rating === 1 && "Needs improvement"}
                {rating === 2 && "Below average"}
                {rating === 3 && "Average"}
                {rating === 4 && "Good"}
                {rating === 5 && "Excellent!"}
              </motion.p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200"
              role="alert"
            >
              {error}
            </motion.div>
          )}
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Expandable Details Section */}
          <AnimatePresence>
            {(showDetails || rating !== null) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 overflow-hidden"
              >
                {/* What worked well */}
                <div>
                  <label 
                    htmlFor="worked-well"
                    className="text-xs font-medium text-slate-700"
                  >
                    What worked well? (optional)
                  </label>
                  <Textarea
                    id="worked-well"
                    value={workedWell}
                    onChange={(e) => setWorkedWell(e.target.value)}
                    placeholder="Tell us what you liked..."
                    disabled={isSubmitting}
                    rows={2}
                    className="mt-1 text-xs resize-none"
                  />
                </div>

                {/* What could improve */}
                <div>
                  <label 
                    htmlFor="improvement"
                    className="text-xs font-medium text-slate-700"
                  >
                    What could improve? (optional)
                  </label>
                  <Textarea
                    id="improvement"
                    value={improvement}
                    onChange={(e) => setImprovement(e.target.value)}
                    placeholder="How can we do better?"
                    disabled={isSubmitting}
                    rows={2}
                    className="mt-1 text-xs resize-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle details button */}
          {!showDetails && rating !== null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(true)}
              disabled={isSubmitting}
              className="text-xs h-8 px-2 -ml-2 text-slate-500 hover:text-slate-700"
            >
              <ChevronDown className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Add more feedback (optional)
            </Button>
          )}
          
          {showDetails && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(false)}
              disabled={isSubmitting}
              className="text-xs h-8 px-2 -ml-2 text-slate-500 hover:text-slate-700"
            >
              <ChevronUp className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Hide additional feedback
            </Button>
          )}

          {/* Submit Button */}
          <Button
            ref={submitButtonRef}
            type="button"
            onClick={handleSubmit}
            disabled={!rating || isSubmitting}
            size="sm"
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Compact version for inline embedding
type CompactTaskFeedbackProps = Omit<TaskFeedbackInlineProps, 'autoDismiss' | 'dismissDelay'>;

export function CompactTaskFeedback({
  taskId,
  taskSummary,
  metadata,
  onSubmitted,
  onDismiss,
  className,
}: CompactTaskFeedbackProps) {
  return (
    <div className={cn("p-3 rounded-lg border bg-card", className)}>
      <TaskFeedbackInline
        taskId={taskId}
        taskSummary={taskSummary}
        metadata={metadata}
        onSubmitted={onSubmitted}
        onDismiss={onDismiss}
      />
    </div>
  );
}

export default TaskFeedbackInline;
