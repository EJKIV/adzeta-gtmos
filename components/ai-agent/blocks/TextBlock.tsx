'use client';

import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import type { TextBlock as TextBlockType } from '@/types/ai-agent';

const variantStyles: Record<string, string> = {
  default: '',
  success: 'border-l-4 border-l-[var(--color-success)] bg-[var(--color-success-bg)] pl-4',
  warning: 'border-l-4 border-l-[var(--color-warning)] bg-[var(--color-warning-bg)] pl-4',
  error: 'border-l-4 border-l-[var(--color-error)] bg-[var(--color-error-bg)] pl-4',
  info: 'border-l-4 border-l-[var(--color-info)] bg-[var(--color-info-bg)] pl-4',
};

export function TextBlock({ text, variant = 'default' }: TextBlockType) {
  return (
    <div className={cn('rounded-md py-1', variantStyles[variant])}>
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  );
}
