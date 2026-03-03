'use client';

import { useEffect, useRef } from 'react';
import { useProactiveSuggestions } from '@/app/hooks/use-adzeta';
import { useToast } from '@/app/hooks/use-toast';

export function SuggestionToastProvider() {
  const { data: suggestions } = useProactiveSuggestions();
  const { toast } = useToast();
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    for (const s of suggestions) {
      if (!seenIds.current.has(s.suggestion_id)) {
        seenIds.current.add(s.suggestion_id);
        toast({
          title: s.title,
          description: s.description ?? `${s.urgency} priority suggestion`,
        });
      }
    }
  }, [suggestions, toast]);

  return null;
}
