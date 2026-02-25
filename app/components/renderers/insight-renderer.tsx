'use client';

import type { InsightBlock } from '@/lib/skills/types';

const SEVERITY_STYLES: Record<InsightBlock['severity'], { border: string; bg: string; text: string }> = {
  info: { border: 'border-l-[#2563eb]', bg: 'bg-[#2563eb]/[0.04]', text: 'text-[#2563eb]' },
  warning: { border: 'border-l-[#ea580c]', bg: 'bg-[#ea580c]/[0.04]', text: 'text-[#ea580c]' },
  success: { border: 'border-l-[#16a34a]', bg: 'bg-[#16a34a]/[0.04]', text: 'text-[#16a34a]' },
  critical: { border: 'border-l-[#dc2626]', bg: 'bg-[#dc2626]/[0.04]', text: 'text-[#dc2626]' },
};

export function InsightRenderer({ block }: { block: InsightBlock }) {
  const s = SEVERITY_STYLES[block.severity] || SEVERITY_STYLES.info;

  return (
    <div
      className={`rounded-xl border border-l-4 ${s.border} ${s.bg} px-4 py-3`}
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-sm font-semibold ${s.text}`}>{block.title}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {block.description}
          </p>
        </div>
        {block.confidence !== undefined && (
          <span
            className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'var(--color-n100)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {Math.round(block.confidence * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
