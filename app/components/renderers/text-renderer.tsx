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

const CODE_STYLE = 'px-1 py-0.5 rounded text-xs';
const CODE_BLOCK_STYLE = 'block overflow-x-auto rounded-lg p-3 text-xs leading-relaxed my-2';

/**
 * Convert inline markdown (bold, italic, code, links) to HTML.
 * Called on already-escaped text — safe against XSS.
 */
function inlineMarkdown(line: string): string {
  return line
    // inline code (must come before bold/italic to avoid conflicts)
    .replace(/`(.+?)`/g, `<code class="${CODE_STYLE}" style="background:var(--color-n100)">$1</code>`)
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // links [text](url) — url was escaped, unescape &amp; back to & for href
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_, text, href) =>
        `<a href="${href.replace(/&amp;/g, '&')}" target="_blank" rel="noopener noreferrer" class="underline" style="color:var(--color-brand-500)">${text}</a>`,
    );
}

/**
 * Markdown-to-HTML supporting: headers, bold, italic, inline code, code blocks,
 * links, ordered/unordered lists, blockquotes, and line breaks.
 *
 * Input is HTML-escaped first — safe against injected HTML/script tags.
 */
function markdownToHtml(src: string): string {
  const escaped = escapeHtml(src);
  const lines = escaped.split('\n');
  const out: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inList: 'ul' | 'ol' | null = null;

  function closeList() {
    if (inList) {
      out.push(inList === 'ul' ? '</ul>' : '</ol>');
      inList = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code block toggle
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        out.push(`${codeLines.join('\n')}</code></pre>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        closeList();
        inCodeBlock = true;
        out.push(`<pre class="${CODE_BLOCK_STYLE}" style="background:var(--color-n100);color:var(--color-text-primary)"><code>`);
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      closeList();
      const level = headerMatch[1].length;
      const sizes: Record<number, string> = { 1: 'text-lg font-bold', 2: 'text-base font-semibold', 3: 'text-sm font-semibold', 4: 'text-sm font-medium' };
      out.push(`<p class="${sizes[level]} mt-3 mb-1" style="color:var(--color-text-primary)">${inlineMarkdown(headerMatch[2])}</p>`);
      continue;
    }

    // Blockquote
    if (line.startsWith('&gt; ') || line === '&gt;') {
      closeList();
      const content = line.replace(/^&gt;\s?/, '');
      out.push(`<blockquote class="border-l-2 pl-3 my-1" style="border-color:var(--color-brand-500);color:var(--color-text-tertiary)">${inlineMarkdown(content)}</blockquote>`);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (inList !== 'ul') {
        closeList();
        inList = 'ul';
        out.push('<ul class="list-disc list-inside my-1 space-y-0.5">');
      }
      out.push(`<li>${inlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inList !== 'ol') {
        closeList();
        inList = 'ol';
        out.push('<ol class="list-decimal list-inside my-1 space-y-0.5">');
      }
      out.push(`<li>${inlineMarkdown(olMatch[1])}</li>`);
      continue;
    }

    // Close any open list if we hit a non-list line
    closeList();

    // Horizontal rule
    if (/^---+$/.test(line)) {
      out.push('<hr class="my-2" style="border-color:var(--color-border-subtle)" />');
      continue;
    }

    // Empty line → paragraph break
    if (line.trim() === '') {
      out.push('<br/>');
      continue;
    }

    // Regular line
    out.push(`${inlineMarkdown(line)}<br/>`);
  }

  // Close unclosed blocks
  closeList();
  if (inCodeBlock) {
    out.push(`${codeLines.join('\n')}</code></pre>`);
  }

  return out.join('\n');
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
        dangerouslySetInnerHTML={{ __html: markdownToHtml(block.content) }}
      />

      {block.isStreaming && (
        <span className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom bg-[#de347f] animate-pulse" />
      )}
    </div>
  );
}
