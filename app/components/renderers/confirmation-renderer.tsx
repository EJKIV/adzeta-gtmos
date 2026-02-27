'use client';

import type { ConfirmationBlock } from '@/lib/skills/types';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

const STATUS_CONFIG: Record<ConfirmationBlock['status'], { icon: React.ReactNode; label: string; color: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, label: 'Pending', color: 'text-[#86868b]' },
  executing: { icon: <Loader2 className="h-4 w-4 animate-spin" />, label: 'Executing', color: 'text-[#ea580c]' },
  completed: { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Completed', color: 'text-[#16a34a]' },
  failed: { icon: <XCircle className="h-4 w-4" />, label: 'Failed', color: 'text-[#dc2626]' },
};

export function ConfirmationRenderer({ block, onAction }: { block: ConfirmationBlock; onAction?: (command: string) => void }) {
  const cfg = STATUS_CONFIG[block.status];
  const showApproval = block.status === 'pending' && block.approvalActions && onAction;

  return (
    <div
      className="rounded-xl border px-4 py-3 flex items-center gap-3"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className={cfg.color}>{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {block.action}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {block.message}
        </p>
      </div>
      {showApproval ? (
        <div className="flex gap-2">
          <button
            onClick={() => onAction!(block.approvalActions!.approve.command)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: 'rgba(22, 163, 74, 0.08)',
              color: '#16a34a',
              border: '1px solid rgba(22, 163, 74, 0.2)',
            }}
          >
            {block.approvalActions!.approve.label}
          </button>
          <button
            onClick={() => onAction!(block.approvalActions!.reject.command)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              color: '#dc2626',
              border: '1px solid rgba(220, 38, 38, 0.2)',
            }}
          >
            {block.approvalActions!.reject.label}
          </button>
        </div>
      ) : (
        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
      )}
      {block.progress !== undefined && block.status === 'executing' && (
        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-n100)' }}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#de347f] to-[#ff5d74] transition-all duration-500"
            style={{ width: `${block.progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
