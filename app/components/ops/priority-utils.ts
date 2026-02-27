export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'high':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'medium':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getConfidenceColor(score: number): string {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 60) return 'bg-blue-100 text-blue-700';
  if (score >= 40) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}
