'use client';

import { Search, BarChart3, Play, HelpCircle } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Research prospects', command: 'find CMOs at fintech companies', icon: Search },
  { label: 'Pipeline health', command: 'show pipeline health', icon: BarChart3 },
  { label: 'Start sequence', command: 'create new outreach sequence', icon: Play },
  { label: 'What needs attention?', command: 'what should I focus on?', icon: HelpCircle },
];

interface QuickActionsBarProps {
  onAction: (command: string) => void;
}

export function QuickActionsBar({ onAction }: QuickActionsBarProps) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="quick-actions">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.command}
            onClick={() => onAction(action.command)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-full border transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              color: 'var(--color-text-secondary)',
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg-elevated)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#de347f';
              e.currentTarget.style.backgroundColor = 'rgba(222,52,127,0.04)';
              e.currentTarget.style.color = '#de347f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
