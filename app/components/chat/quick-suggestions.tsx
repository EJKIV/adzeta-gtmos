'use client';

import type { FollowUp } from '@/lib/skills/types';

const DEFAULT_SUGGESTIONS: FollowUp[] = [
  { label: 'Research prospects', command: 'find CMOs at fintech companies' },
  { label: 'Pipeline health', command: 'show pipeline health' },
  { label: 'What needs attention?', command: 'what should I focus on?' },
];

interface QuickSuggestionsProps {
  followUps?: FollowUp[];
  onCommand: (command: string) => void;
}

export function QuickSuggestions({ followUps, onCommand }: QuickSuggestionsProps) {
  const items = followUps && followUps.length > 0 ? followUps : DEFAULT_SUGGESTIONS;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto flex gap-2 w-full">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => onCommand(item.command)}
            className="pill-btn flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border hover:scale-[1.02] whitespace-nowrap"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
