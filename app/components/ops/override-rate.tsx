'use client';

import { getOverrideRateColor } from '@/app/hooks/use-autonomy';

export function OverrideRateIndicator({ rate }: { rate: number }) {
  const colorClass = getOverrideRateColor(rate);
  const isGood = rate < 5;

  return (
    <div className="flex items-center gap-2">
      <div className={`text-2xl font-bold ${colorClass}`}>
        {rate.toFixed(1)}%
      </div>
      <div className="flex flex-col">
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>override rate</span>
        <span className={`text-xs ${isGood ? 'text-emerald-600' : 'text-amber-600'}`}>
          {isGood ? 'On target' : 'Above 5%'}
        </span>
      </div>
    </div>
  );
}
