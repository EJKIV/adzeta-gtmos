'use client';

export function ConfidenceTrend({ trend }: { trend: 'rising' | 'stable' | 'falling' }) {
  const icons = { rising: '\u2197', stable: '\u2192', falling: '\u2198' };
  const colors: Record<string, string> = {
    rising: 'text-emerald-600',
    stable: '',
    falling: 'text-rose-500',
  };
  return (
    <span
      className={`text-sm font-medium ${colors[trend]}`}
      style={trend === 'stable' ? { color: 'var(--color-text-muted)' } : undefined}
      title={`Confidence ${trend}`}
    >
      {icons[trend]}
    </span>
  );
}
