'use client';

import type { OracleActionBlock } from './types';

const BUTTON_STYLES: Record<string, { bg: string; color: string; border?: string }> = {
  primary: {
    bg: 'var(--color-brand-500, #6366f1)',
    color: '#fff',
  },
  secondary: {
    bg: 'transparent',
    color: 'var(--color-text-primary)',
    border: 'var(--color-border-subtle, #e5e7eb)',
  },
  danger: {
    bg: 'var(--color-error, #ef4444)',
    color: '#fff',
  },
};

export function ActionBlock({ actions }: OracleActionBlock) {
  const handleClick = (action: string, actionType: 'button' | 'link') => {
    if (actionType === 'link') {
      window.open(action, '_blank', 'noopener');
      return;
    }
    // For button actions: dispatch a custom event that the app can listen for
    window.dispatchEvent(
      new CustomEvent('oracle:action', { detail: { action } })
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a, i) => {
        const s = BUTTON_STYLES[a.style ?? 'secondary'] ?? BUTTON_STYLES.secondary;
        return (
          <button
            key={i}
            disabled={a.disabled}
            onClick={() => handleClick(a.action, a.type)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: s.bg,
              color: s.color,
              border: s.border ? `1px solid ${s.border}` : 'none',
            }}
          >
            {a.label}
          </button>
        );
      })}
    </div>
  );
}
