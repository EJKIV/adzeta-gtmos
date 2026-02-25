'use client';

import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SampleDataBadgeProps {
  className?: string;
}

export function SampleDataBadge({ className }: SampleDataBadgeProps) {
  return (
    <span
      title="No live data source configured. Set API keys in .env.local to see real data."
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-help',
        'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        className
      )}
    >
      <FlaskConical className="h-3 w-3" />
      Sample Data
    </span>
  );
}
