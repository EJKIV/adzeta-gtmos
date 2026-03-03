'use client';

import ReactMarkdown from 'react-markdown';
import type { OracleTextBlock } from './types';

const STYLE_CLASSES: Record<string, string> = {
  normal: '',
  alert: 'border-l-2 border-red-400 pl-3',
  success: 'border-l-2 border-green-400 pl-3',
  warning: 'border-l-2 border-yellow-400 pl-3',
};

const STYLE_COLORS: Record<string, string> = {
  normal: 'var(--color-text-primary)',
  alert: 'var(--color-error, #ef4444)',
  success: 'var(--color-success, #22c55e)',
  warning: '#eab308',
};

export function TextBlock({ content, style = 'normal' }: OracleTextBlock) {
  return (
    <div
      className={`text-sm leading-relaxed prose prose-sm max-w-none ${STYLE_CLASSES[style] ?? ''}`}
      style={{ color: STYLE_COLORS[style] ?? STYLE_COLORS.normal }}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
