'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/app/hooks/use-toast';

interface TaskFeedbackButtonsProps {
  taskId: string;
  onSubmit?: () => void;
}

export function TaskFeedbackButtons({ taskId, onSubmit }: TaskFeedbackButtonsProps) {
  const [rating, setRating] = useState<number>(0);
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const submitFeedback = useCallback(async () => {
    try {
      const feedbackType = rating > 0 ? 'rating' : helpful != null ? (helpful ? 'approval' : 'rejection') : 'comment';
      const res = await globalThis.fetch('/api/adzeta/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          feedback_type: feedbackType,
          rating: rating > 0 ? rating : undefined,
          comment: comment || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSubmitted(true);
      toast({ title: 'Feedback submitted' });
      onSubmit?.();
    } catch (err) {
      toast({ title: 'Failed to submit', description: (err as Error).message, variant: 'destructive' });
    }
  }, [taskId, rating, helpful, comment, toast, onSubmit]);

  if (submitted) {
    return <p className="text-xs text-muted-foreground">Thanks for your feedback!</p>;
  }

  return (
    <div className="space-y-2">
      {/* Star rating */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={`text-lg leading-none ${
              star <= rating ? 'text-amber-400' : 'text-muted-foreground/30'
            } hover:text-amber-400 transition-colors`}
          >
            ★
          </button>
        ))}
      </div>

      {/* Helpful/Wrong toggle */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={helpful === true ? 'default' : 'outline'}
          onClick={() => setHelpful(helpful === true ? null : true)}
        >
          Helpful
        </Button>
        <Button
          size="sm"
          variant={helpful === false ? 'destructive' : 'outline'}
          onClick={() => setHelpful(helpful === false ? null : false)}
        >
          Wrong
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowComment(!showComment)}
        >
          Comment
        </Button>
      </div>

      {showComment && (
        <Textarea
          placeholder="Optional comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          className="text-sm"
        />
      )}

      {(rating > 0 || helpful != null || comment) && (
        <Button size="sm" onClick={submitFeedback}>
          Submit Feedback
        </Button>
      )}
    </div>
  );
}
