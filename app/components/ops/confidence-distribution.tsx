'use client';

export function ConfidenceDistributionBar({
  high,
  medium,
  low,
}: {
  high: number;
  medium: number;
  low: number;
}) {
  const total = high + medium + low || 1;

  return (
    <div>
      <div
        className="w-full h-2 rounded-full overflow-hidden flex"
        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
      >
        <div
          className="bg-emerald-500 transition-all duration-500"
          style={{ width: `${(high / total) * 100}%` }}
          title={`High confidence: ${high}`}
        />
        <div
          className="bg-amber-500 transition-all duration-500"
          style={{ width: `${(medium / total) * 100}%` }}
          title={`Medium confidence: ${medium}`}
        />
        <div
          className="bg-slate-400 transition-all duration-500"
          style={{ width: `${(low / total) * 100}%` }}
          title={`Low confidence: ${low}`}
        />
      </div>
      <div className="flex gap-6 mt-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full" />
          <span style={{ color: 'var(--color-text-secondary)' }}>High ({high})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded-full" />
          <span style={{ color: 'var(--color-text-secondary)' }}>Medium ({medium})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-400 rounded-full" />
          <span style={{ color: 'var(--color-text-secondary)' }}>Low ({low})</span>
        </div>
      </div>
    </div>
  );
}
