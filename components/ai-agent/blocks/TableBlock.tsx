'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from 'lucide-react';
import { cn, formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import type { TableBlock as TableBlockType } from '@/types/ai-agent';

interface TableBlockProps extends TableBlockType {
  onAction: (actionId: string, row: Record<string, unknown>) => void;
}

export function TableBlock({
  title,
  description,
  headers,
  rows,
  pagination,
  rowActions,
  onAction,
}: TableBlockProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortConfig) return 0;
    const aVal = String(a[sortConfig.key] ?? '');
    const bVal = String(b[sortConfig.key] ?? '');
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const renderCell = (value: unknown, cellType?: string) => {
    if (value && typeof value === 'object' && 'value' in value) {
      const { value: val, href, variant } = value as {
        value: string;
        href?: string;
        variant?: string;
      };

      if (href) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: 'var(--color-info)' }}
          >
            {val}
          </a>
        );
      }

      if (variant) {
        return <Badge variant={variant as 'default' | 'secondary' | 'destructive' | 'outline'}>{val}</Badge>;
      }

      return val;
    }

    switch (cellType) {
      case 'currency':
        return formatCurrency(value as number);
      case 'percent':
        return formatPercent(value as number);
      case 'date':
        return formatDate(value as string);
      default:
        return String(value ?? '');
    }
  };

  return (
    <div className="space-y-2">
      {title && (
        <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h4>
      )}
      {description && (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
      )}

      <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead
                  key={header.key}
                  className={cn(
                    header.sortable && 'cursor-pointer select-none',
                    header.width === 'small' && 'w-24',
                    header.width === 'medium' && 'w-32',
                    header.width === 'large' && 'w-48'
                  )}
                  onClick={() => header.sortable && handleSort(header.key)}
                >
                  <div className="flex items-center gap-1">
                    {header.label}
                    {header.sortable && sortConfig?.key === header.key && (
                      sortConfig.direction === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )
                    )}
                  </div>
                </TableHead>
              ))}
              {rowActions && rowActions.length > 0 && (
                <TableHead className="w-20">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={headers.length + (rowActions?.length ? 1 : 0)}
                  className="text-center py-8 text-sm"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              sortedRows.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="tr-hover">
                  {headers.map((header) => (
                    <TableCell key={header.key}>
                      {renderCell(row[header.key], header.type)}
                    </TableCell>
                  ))}
                  {rowActions && rowActions.length > 0 && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {rowActions.map((action) => (
                            <DropdownMenuItem
                              key={action.id}
                              onClick={() => onAction(action.id, row)}
                            >
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <span>
            Showing {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page * pagination.pageSize >= pagination.total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
