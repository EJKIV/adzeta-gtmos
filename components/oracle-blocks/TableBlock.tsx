'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { OracleTableBlock } from './types';

export function TableBlock({ title, headers, rows, sortable }: OracleTableBlock) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (colIndex: number) => {
    if (!sortable) return;
    if (sortCol === colIndex) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colIndex);
      setSortDir('asc');
    }
  };

  const sorted = sortCol != null
    ? [...rows].sort((a, b) => {
        const av = a[sortCol];
        const bv = b[sortCol];
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : rows;

  return (
    <div>
      {title && (
        <h3
          className="text-xs font-semibold uppercase tracking-wide mb-2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {title}
        </h3>
      )}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border-subtle, #e5e7eb)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-bg-sunken, rgba(0,0,0,0.04))' }}>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide ${sortable ? 'cursor-pointer select-none hover:opacity-80' : ''}`}
                  style={{ color: 'var(--color-text-tertiary)' }}
                  onClick={() => handleSort(i)}
                >
                  <span className="inline-flex items-center gap-1">
                    {h}
                    {sortable && sortCol === i && (
                      sortDir === 'asc'
                        ? <ChevronUp className="h-3 w-3" />
                        : <ChevronDown className="h-3 w-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, ri) => (
              <tr
                key={ri}
                className="border-t"
                style={{
                  borderColor: 'var(--color-border-subtle, #e5e7eb)',
                  backgroundColor: ri % 2 === 1 ? 'var(--color-bg-sunken, rgba(0,0,0,0.02))' : 'transparent',
                }}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="px-3 py-2 tabular-nums"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
