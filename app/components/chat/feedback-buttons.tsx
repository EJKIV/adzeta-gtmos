'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useFeedback } from '@/app/hooks/use-feedback';

interface FeedbackButtonsProps {
  commandId: string;
}

export function FeedbackButtons({ commandId }: FeedbackButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const { submitFeedback } = useFeedback();

  const handleSubmit = async () => {
    if (!rating) return;

    const success = await submitFeedback({
      commandId,
      rating,
      feedbackText: feedbackText || undefined,
      markForRLHF: rating >= 4 || rating <= 2, // Mark extreme ratings for training
    });

    if (success) {
      setIsOpen(false);
      setFeedbackText('');
      setRating(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                setRating(5);
                submitFeedback({ commandId, rating: 5, markForRLHF: true });
              }}
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                setRating(2);
                setIsOpen(true);
              }}
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help us improve</DialogTitle>
            <DialogDescription>
              Tell us what went wrong or how we can do better.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  variant={rating === star ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRating(star as 1 | 2 | 3 | 4 | 5)}
                >
                  {star}
                </Button>
              ))}
            </div>
            <Textarea
              placeholder="What could have been better?"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
            <Button onClick={handleSubmit} disabled={!rating}>
              Submit Feedback
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
