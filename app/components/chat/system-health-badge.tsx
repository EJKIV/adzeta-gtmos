'use client';

interface SystemHealthBadgeProps {
  healthy: boolean;
}

export function SystemHealthBadge({ healthy }: SystemHealthBadgeProps) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{
        backgroundColor: healthy ? 'rgba(22, 163, 74, 0.08)' : 'rgba(234, 88, 12, 0.08)',
      }}
    >
      <span className="relative flex h-1.5 w-1.5">
        {healthy ? (
          <>
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: 'var(--color-success)' }}
            />
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ backgroundColor: 'var(--color-success)' }}
            />
          </>
        ) : (
          <span
            className="relative inline-flex rounded-full h-1.5 w-1.5"
            style={{ backgroundColor: 'var(--color-warning)' }}
          />
        )}
      </span>
      <span
        className="text-[11px] font-semibold"
        style={{ color: healthy ? 'var(--color-success)' : 'var(--color-warning)' }}
      >
        {healthy ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}
