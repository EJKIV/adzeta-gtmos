'use client';

import type { TextBlock } from '@/lib/skills/types';

/**
 * Minimal markdown-to-HTML: bold, italic, inline code, line breaks.
 * No external dependency needed for the subset OpenClaw typically returns.
 */
function simpleMarkdown(src: string): string {
  return src
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded text-xs" style="background:var(--color-n100)">$1</code>')
    .replace(/\n/g, '<br/>');
}

export function TextRenderer({ block }: { block: TextBlock }) {
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{
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
