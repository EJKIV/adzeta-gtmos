'use client';

import type { SkillOutput, ResponseBlock } from '@/lib/skills/types';
import { MetricsRenderer } from './metrics-renderer';
import { ChartRenderer } from './chart-renderer';
import { TableRenderer } from './table-renderer';
import { InsightRenderer } from './insight-renderer';
import { ConfirmationRenderer } from './confirmation-renderer';
import { ProgressRenderer } from './progress-renderer';

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
    default:
      return null;
  }
}

interface ResponseRendererProps {
  output: SkillOutput;
  onFollowUp?: (command: string) => void;
}

export function ResponseRenderer({ output, onFollowUp }: ResponseRendererProps) {
  return (
    <div className="space-y-3">
      {output.blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} />
      ))}

      {output.followUps.length > 0 && onFollowUp && (
        <div className="flex flex-wrap gap-2 pt-1">
          {output.followUps.map((fu, i) => (
            <button
              key={i}
              onClick={() => onFollowUp(fu.command)}
              className="px-3 py-1.5 text-xs font-medium rounded-full border transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                color: 'var(--color-text-secondary)',
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-elevated)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#de347f';
                e.currentTarget.style.color = '#de347f';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              {fu.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
