'use client';

import React from 'react';
import type { SkillOutput, ResponseBlock } from '@/lib/skills/types';
import { MetricsRenderer } from './metrics-renderer';
import { ChartRenderer } from './chart-renderer';
import { TableRenderer } from './table-renderer';
import { InsightRenderer } from './insight-renderer';
import { ConfirmationRenderer } from './confirmation-renderer';
import { ProgressRenderer } from './progress-renderer';
import { TextRenderer } from './text-renderer';

function BlockRenderer({ block }: { block: ResponseBlock }) {
  switch (block.type) {
    case 'metrics':
      return <MetricsRenderer block={block} />;
    case 'chart':
      return <ChartRenderer block={block} />;
    case 'table':
      return <TableRenderer block={block} />;
    case 'insight':
      return <InsightRenderer block={block} />;
    case 'confirmation':
      return <ConfirmationRenderer block={block} />;
    case 'progress':
      return <ProgressRenderer block={block} />;
    case 'text':
      return <TextRenderer block={block} />;
    case 'error':
      return (
        <div
          className="rounded-xl border border-l-4 border-l-[#dc2626] bg-[#dc2626]/[0.04] px-4 py-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-sm font-semibold text-[#dc2626]">{block.message}</p>
          {block.suggestion && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {block.suggestion}
            </p>
          )}
        </div>
      );
    default: {
      const _exhaustive: never = block;
      return null;
    }
  }
}

interface ResponseRendererProps {
  output: SkillOutput;
  onFollowUp?: (command: string) => void;
}

/** Block types that represent actionable data — follow-ups attach after the last one. */
const ACTIONABLE_TYPES = new Set(['table', 'chart', 'metrics']);

export function ResponseRenderer({ output, onFollowUp }: ResponseRendererProps) {
  const hasFollowUps = output.followUps.length > 0 && !!onFollowUp;

  // Find the index *after* the last actionable block so follow-ups sit right below
  // the data they act on, not stranded after text / insight blocks.
  let followUpInsertIndex = output.blocks.length; // fallback: end
  if (hasFollowUps) {
    for (let i = output.blocks.length - 1; i >= 0; i--) {
      if (ACTIONABLE_TYPES.has(output.blocks[i].type)) {
        followUpInsertIndex = i + 1;
        break;
      }
    }
  }

  const followUpButtons = hasFollowUps ? (
    <div className="flex flex-wrap gap-2 pt-1">
      {output.followUps.map((fu, i) => (
        <button
          key={i}
          onClick={() => onFollowUp!(fu.command)}
          className="pill-btn px-3 py-1.5 text-xs font-medium rounded-full border hover:scale-[1.02]"
        >
          {fu.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      {output.blocks.map((block, i) => (
        <React.Fragment key={`${block.type}-${i}`}>
          <BlockRenderer block={block} />
          {i + 1 === followUpInsertIndex && followUpButtons}
        </React.Fragment>
      ))}
      {/* If no actionable block was found, follow-ups render at the end */}
      {followUpInsertIndex === output.blocks.length && followUpButtons}
    </div>
  );
}
