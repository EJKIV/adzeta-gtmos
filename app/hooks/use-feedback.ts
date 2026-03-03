'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import type { FeedbackPayload, FeedbackResponse } from '@/lib/types/orchestration';

export interface UseFeedbackReturn {
  submitFeedback: (params: {
    commandId: string;
    rating: number;
    feedbackText?: string;
    proposedBetterResponse?: string;
    markForRLHF?: boolean;
  }) => Promise<boolean>;
}

/**
 * Hook for submitting feedback to the orchestration layer
 * Supports RLHF (Reinforcement Learning from Human Feedback)
 */
export function useFeedback(): UseFeedbackReturn {
  const { toast } = useToast();

  const submitFeedback = useCallback(
    async ({
      commandId,
      rating,
      feedbackText,
      proposedBetterResponse,
      markForRLHF = true,
    }: {
      commandId: string;
      rating: number;
      feedbackText?: string;
      proposedBetterResponse?: string;
      markForRLHF?: boolean;
    }): Promise<boolean> => {
      try {
        // Get environment
        const environment = process.env.NEXT_PUBLIC_ENVIRONMENT === 'prod' ? 'prod' : 'dev';

        const payload: FeedbackPayload & { environment?: 'dev' | 'prod' } = {
          command_id: commandId,
          rating,
          feedback_text: feedbackText,
          proposed_better_response: proposedBetterResponse,
          mark_for_rlhf: markForRLHF,
          categories: deriveCategories(rating, feedbackText),
          environment,
        };

        const response = await fetch('/api/oracle/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to submit feedback');
        }

        const result: FeedbackResponse = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Feedback submission failed');
        }

        toast({
          title: 'Feedback recorded',
          description: markForRLHF
            ? 'Thank you! Your feedback will help improve the system.'
            : 'Thank you for your feedback!',
        });

        return true;
      } catch (err) {
        console.error('Feedback submission error:', err);
        
        toast({
          title: 'Failed to record feedback',
          description:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred',
          variant: 'destructive',
        });

        return false;
      }
    },
    [toast]
  );

  return { submitFeedback };
}

/**
 * Derive feedback categories from rating and text
 */
function deriveCategories(
  rating: number,
  feedbackText?: string
): string[] | undefined {
  const categories: string[] = [];

  // Rating-based categories
  if (rating >= 4) {
    categories.push('accuracy');
  }
  if (rating <= 2) {
    categories.push('needs-improvement');
  }

  // Text-based categories
  if (feedbackText) {
    const text = feedbackText.toLowerCase();
    if (text.includes('slow') || text.includes('fast')) {
      categories.push('speed');
    }
    if (text.includes('unclear') || text.includes('confusing')) {
      categories.push('clarity');
    }
    if (text.includes('detailed') || text.includes('thorough')) {
      categories.push('thoroughness');
    }
    if (text.includes('tone') || text.includes('friendly') || text.includes('rude')) {
      categories.push('tone');
    }
    if (text.includes('helpful') || text.includes('useful')) {
      categories.push('helpfulness');
    }
  }

  // Remove duplicates and return or undefined if empty
  const uniqueCategories = [...new Set(categories)];
  return uniqueCategories.length > 0 ? uniqueCategories : undefined;
}

// Re-export types for convenience
export type { FeedbackPayload, FeedbackResponse } from '@/lib/types/orchestration';
