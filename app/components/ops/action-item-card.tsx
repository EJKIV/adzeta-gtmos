'use client';

export function ActionItemCard({
  action,
}: {
  action: { id: string; title: string; status: string; priority: string; createdAt: string };
}) {
  const statusColors: Record<string, string> = {
    executed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    queued: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border"
      style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center gap-3">
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[action.status] || 'bg-slate-50 text-slate-600'}`}
        >
          {action.status}
        </span>
        <span
          className={`text-sm ${action.status === 'executed' ? 'line-through' : ''}`}
          style={{ color: action.status === 'executed' ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}
        >
          {action.title}
        </span>
      </div>
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {new Date(action.createdAt).toLocaleTimeString()}
      </span>
    </div>
  );
}
