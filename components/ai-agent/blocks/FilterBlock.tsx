'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FilterBlock as FilterBlockType } from '@/types/ai-agent';

interface FilterBlockProps extends FilterBlockType {
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => void;
}

export function FilterBlock({
  title,
  currentFilters,
  filters,
  changeSkillId,
  resultCount,
  resultLabel,
  onSkillInvoke,
}: FilterBlockProps) {
  const [values, setValues] = useState<Record<string, unknown>>(currentFilters);
  const [expanded, setExpanded] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submitFilters = useCallback((newValues: Record<string, unknown>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSkillInvoke(changeSkillId, newValues);
    }, 500);
  }, [changeSkillId, onSkillInvoke]);

  const updateFilter = (filterId: string, value: unknown) => {
    const newValues = { ...values, [filterId]: value };
    setValues(newValues);
    submitFilters(newValues);
  };

  const clearAll = () => {
    const newValues: Record<string, unknown> = {};
    setValues(newValues);
    submitFilters(newValues);
  };

  const removeFilter = (filterId: string) => {
    const newValues = { ...values };
    delete newValues[filterId];
    setValues(newValues);
    submitFilters(newValues);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const activeFilters = Object.entries(values).filter(([, v]) => v !== undefined && v !== '' && v !== null);

  return (
    <div className="space-y-3 rounded-lg border p-4" style={{ borderColor: 'var(--color-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {title && (
            <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </h4>
          )}
          {resultCount !== undefined && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {resultCount} {resultLabel || 'results'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilters.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
              Clear all
            </Button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(([key, value]) => {
            const filterDef = filters.find((f) => f.id === key);
            return (
              <Badge key={key} variant="secondary" className="gap-1 pr-1">
                {filterDef?.label}: {String(value)}
                <button onClick={() => removeFilter(key)} className="ml-1 rounded-full p-0.5 hover:bg-black/10">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Filter controls */}
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filters.map((filter) => (
            <div key={filter.id} className="space-y-1">
              <Label className="text-xs">{filter.label}</Label>
              {filter.type === 'text' && (
                <Input
                  placeholder={`Filter by ${filter.label.toLowerCase()}...`}
                  value={String(values[filter.id] || '')}
                  onChange={(e) => updateFilter(filter.id, e.target.value)}
                  className="h-8 text-sm"
                />
              )}
              {filter.type === 'select' && (
                <Select
                  value={String(values[filter.id] || '')}
                  onValueChange={(v) => updateFilter(filter.id, v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {filter.type === 'checkboxes' && filter.options && (
                <div className="space-y-1">
                  {filter.options.map((opt) => {
                    const checked = Array.isArray(values[filter.id])
                      ? (values[filter.id] as string[]).includes(opt.value)
                      : false;
                    return (
                      <div key={opt.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`${filter.id}-${opt.value}`}
                          checked={checked}
                          onCheckedChange={(c) => {
                            const current = (values[filter.id] as string[]) || [];
                            const next = c
                              ? [...current, opt.value]
                              : current.filter((v) => v !== opt.value);
                            updateFilter(filter.id, next);
                          }}
                        />
                        <Label htmlFor={`${filter.id}-${opt.value}`} className="text-xs">
                          {opt.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
              {filter.type === 'number_range' && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    className="h-8 text-sm"
                    onChange={(e) => {
                      const range = (values[filter.id] as { min?: number; max?: number }) || {};
                      updateFilter(filter.id, { ...range, min: e.target.value ? Number(e.target.value) : undefined });
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    className="h-8 text-sm"
                    onChange={(e) => {
                      const range = (values[filter.id] as { min?: number; max?: number }) || {};
                      updateFilter(filter.id, { ...range, max: e.target.value ? Number(e.target.value) : undefined });
                    }}
                  />
                </div>
              )}
              {filter.type === 'date_range' && (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    className="h-8 text-sm"
                    onChange={(e) => {
                      const range = (values[filter.id] as { from?: string; to?: string }) || {};
                      updateFilter(filter.id, { ...range, from: e.target.value });
                    }}
                  />
                  <Input
                    type="date"
                    className="h-8 text-sm"
                    onChange={(e) => {
                      const range = (values[filter.id] as { from?: string; to?: string }) || {};
                      updateFilter(filter.id, { ...range, to: e.target.value });
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
