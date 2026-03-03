'use client';

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
      <div className="flex gap-1">
        <span
          className="w-2 h-2 rounded-full animate-dot-pulse"
          style={{ backgroundColor: 'var(--color-brand-500)' }}
        />
        <span
          className="w-2 h-2 rounded-full animate-dot-pulse delay-200"
          style={{ backgroundColor: 'var(--color-brand-500)' }}
        />
        <span
          className="w-2 h-2 rounded-full animate-dot-pulse delay-400"
          style={{ backgroundColor: 'var(--color-brand-500)' }}
        />
      </div>
      <span>Zetty is thinking...</span>
    </div>
  );
}
