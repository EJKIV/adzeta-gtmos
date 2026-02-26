'use client';

import type { TextBlock } from '@/lib/skills/types';

/**
 * Escape HTML entities to prevent XSS before applying markdown transforms.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Minimal markdown-to-HTML: bold, italic, inline code, line breaks.
 * Input is sanitized first — safe against injected HTML/script tags.
 */
function simpleMarkdown(src: string): string {
  return escapeHtml(src)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded text-xs" style="background:var(--color-n100)">$1</code>')
    .replace(/\n/g, '<br/>');
}

export function TextRenderer({ block, inline }: { block: TextBlock; inline?: boolean }) {
  return (
    <div
      className={inline ? 'px-0 py-1' : 'rounded-xl border px-4 py-3'}
      style={inline ? {} : {
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg-elevated)',
      }}
    >
      {block.source && (
        <span className="inline-block mb-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide text-white bg-[#de347f]">
          {block.source}
        </span>
      )}

      <div
        className="text-sm leading-relaxed"
        style={{ color: 'var(--color-text-secondary)' }}
        dangerouslySetInnerHTML={{ __html: simpleMarkdown(block.content) }}
      />

      {block.isStreaming && (
        <span className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom bg-[#de347f] animate-pulse" />
      )}
    </div>
  );
}
