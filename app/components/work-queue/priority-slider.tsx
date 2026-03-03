'use client';

import { Button } from '@/components/ui/button';

interface PrioritySliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function PrioritySlider({ value, onChange, min = 1, max = 10 }: PrioritySliderProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="h-7 w-7 p-0"
      >
        -
      </Button>
      <div className="flex items-center gap-1.5 min-w-[80px] justify-center">
        <span className="text-sm font-mono font-bold">#{value}</span>
        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((max - value + 1) / max) * 100}%`,
              background: value <= 2 ? '#ef4444' : value <= 5 ? '#f59e0b' : '#22c55e',
            }}
          />
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="h-7 w-7 p-0"
      >
        +
      </Button>
    </div>
  );
}
