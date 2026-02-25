'use client';

import { useState } from 'react';
import type { TableBlock } from '@/lib/skills/types';

function formatCell(value: unknown, format?: string): React.ReactNode {
  const str = String(value ?? '');
  if (format === 'badge') {
    const lower = str.toLowerCase();
    let bg = 'rgba(222, 52, 127, 0.08)';
    let fg = '#de347f';
    if (lower === 'stored') { bg = 'rgba(22, 163, 74, 0.08)'; fg = '#16a34a'; }
    else if (lower === 'enriched') { bg = 'rgba(59, 130, 246, 0.08)'; fg = '#3b82f6'; }
    else if (lower === 'sample') { bg = 'rgba(245, 158, 11, 0.08)'; fg = '#f59e0b'; }
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{
          backgroundColor: bg,
          color: fg,
        }}
      >
        {str}
      </span>
    );
  }
  if (format === 'currency') {
    const n = Number(value);
    return isNaN(n) ? str : `$${n.toLocaleString()}`;
  }
  if (format === 'percent') {
    return `${str}%`;
  }
  return str;
}

export function TableRenderer({ block }: { block: TableBlock }) {
  const pageSize = block.pageSize || 10;
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...block.rows].sort((a, b) => {
    if (!sortKey) return 0;
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
    return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {block.title && (
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {block.title}
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
              {block.columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-2.5 text-left text-xs font-semibold cursor-pointer select-none transition-colors"
                  style={{ color: 'var(--color-text-tertiary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1">{sortAsc ? '\u2191' : '\u2193'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, ri) => (
              <tr
                key={ri}
                className="border-b last:border-b-0 transition-colors"
                style={{ borderColor: 'var(--color-border-subtle)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(222,52,127,0.03)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {block.columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-2.5"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {formatCell(row[col.key], col.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 text-xs rounded-md border disabled:opacity-30 transition-colors"
              style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
            >
              Prev
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
              className="px-2.5 py-1 text-xs rounded-md border disabled:opacity-30 transition-colors"
              style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
