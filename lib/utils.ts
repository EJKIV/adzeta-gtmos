import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | string | undefined): string {
  if (num === undefined || num === null) return '—';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

export function formatPercentage(num: number | string | undefined): string {
  if (num === undefined || num === null) return '—';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (!Number.isFinite(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(0)}%`;
}

export function formatCurrency(num: number | string | undefined): string {
  if (num === undefined || num === null) return '—';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPercent(num: number | string | undefined): string {
  if (num === undefined || num === null) return '—';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(1)}%`;
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function getDueDateColor(dueDate: string | Date | null): string {
  if (!dueDate) return 'text-slate-400';
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'text-red-500';
  if (diffDays <= 3) return 'text-amber-500';
  return 'text-emerald-500';
}

// Add format function for date-fns style formatting
export function format(date: Date, formatStr: string): string {
  const d = date;
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const tokens: Record<string, () => string> = {
    'yyyy': () => d.getFullYear().toString(),
    'MM': () => pad(d.getMonth() + 1),
    'dd': () => pad(d.getDate()),
    'HH': () => pad(d.getHours()),
    'mm': () => pad(d.getMinutes()),
    'ss': () => pad(d.getSeconds()),
  };
  
  return formatStr.replace(/yyyy|MM|dd|HH|mm|ss/g, (match) => tokens[match]?.() || match);
}

// Format distance to now (ago style)
export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 10) return 'just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}
