import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse rounded-md bg-slate-200 dark:bg-white/[0.06]',
            className
          )}
        />
      ))}
    </>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-slate-200 p-6 dark:border-slate-800', className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}

export function SkeletonKpiCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-slate-200 p-4 dark:border-slate-800 bg-white dark:bg-slate-950', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-24" />
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonObjectiveItem({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 animate-pulse', className)}>
      <div className="h-5 w-5 rounded bg-slate-200 dark:bg-white/[0.06]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-slate-200 dark:bg-white/[0.06] rounded" />
        <div className="flex items-center gap-2">
          <div className="h-3 w-16 bg-slate-200 dark:bg-white/[0.06] rounded" />
          <div className="h-3 w-12 bg-slate-200 dark:bg-white/[0.06] rounded" />
        </div>
      </div>
      <div className="h-6 w-16 bg-slate-200 dark:bg-white/[0.06] rounded" />
    </div>
  );
}

export function SkeletonIntelligenceItem({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 animate-pulse', className)}>
      <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-full bg-slate-200 dark:bg-white/[0.06] rounded" />
        <div className="h-3 w-2/3 bg-slate-200 dark:bg-white/[0.06] rounded" />
        <div className="h-3 w-1/3 bg-slate-200 dark:bg-white/[0.06] rounded" />
      </div>
      <div className="h-6 w-6 rounded bg-slate-200 dark:bg-white/[0.06]" />
    </div>
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div key={i} className="h-4 w-full rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
      ))}
      <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
    </div>
  );
}

export function SkeletonTable({ rows = 4, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn('rounded-xl border overflow-hidden', className)} style={{ borderColor: 'var(--color-border)' }}>
      <div className="border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
        <div className="flex gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-3 rounded animate-pulse flex-1" style={{ backgroundColor: 'var(--color-bg-tertiary)', maxWidth: i === 0 ? '120px' : '80px' }} />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, ri) => (
        <div
          key={ri}
          className="flex gap-4 px-4 py-3 border-b last:border-b-0"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          {Array.from({ length: cols }).map((_, ci) => (
            <div
              key={ci}
              className="h-4 rounded animate-pulse flex-1"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                maxWidth: ci === 0 ? '140px' : '100px',
                animationDelay: `${(ri * cols + ci) * 50}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonMessage({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* User message (right) */}
      <div className="flex justify-end">
        <div className="h-10 w-48 rounded-2xl rounded-br-md animate-pulse" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
      </div>
      {/* Bot response (left) */}
      <div className="flex justify-start">
        <div className="space-y-2 max-w-[70%]">
          <div className="h-4 w-64 rounded animate-pulse" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
          <div className="h-4 w-48 rounded animate-pulse" style={{ backgroundColor: 'var(--color-bg-tertiary)', animationDelay: '100ms' }} />
          <div className="h-4 w-32 rounded animate-pulse" style={{ backgroundColor: 'var(--color-bg-tertiary)', animationDelay: '200ms' }} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonHealthScore({ className }: { className?: string }) {
  return (
    <div className={cn('p-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 animate-pulse', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-slate-200 dark:bg-white/[0.06] rounded" />
        <div className="h-8 w-16 bg-slate-200 dark:bg-white/[0.06] rounded" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-4 w-24 bg-slate-200 dark:bg-white/[0.06] rounded" />
            <div className="h-2 flex-1 bg-slate-200 dark:bg-white/[0.06] rounded" />
            <div className="h-4 w-8 bg-slate-200 dark:bg-white/[0.06] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
