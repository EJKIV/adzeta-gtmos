'use client';

import { useState, useCallback } from 'react';
import { Search, Calendar, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { eventTypeColors, EventType, getMockUsers, EventUser } from '@/lib/analytics/mock-events';
import { EventsFilter } from '@/hooks/use-events-stream';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: EventsFilter;
  onFiltersChange: (filters: EventsFilter) => void;
}

type DateRange = '15m' | '1h' | '24h' | '7d' | 'custom';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_TYPES: EventType[] = [
  'create', 'update', 'delete', 'approve', 'reject', 
  'login', 'logout', 'export', 'import', 'sync', 'error', 'warning'
];

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: 'custom', label: 'Custom range' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [users] = useState<EventUser[]>(getMockUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<EventType>>(new Set(filters.types || []));
  const [dateRange, setDateRange] = useState<DateRange>('24h');
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  const getDateRangeBounds = (range: DateRange): { start?: string; end?: string } => {
    const now = new Date();
    const end = now.toISOString();
    
    switch (range) {
      case '15m':
        return { start: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), end };
      case '1h':
        return { start: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), end };
      case '24h':
        return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), end };
      case '7d':
        return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), end };
      case 'custom':
      default:
        return { 
          start: customStart ? new Date(customStart).toISOString() : undefined, 
          end: customEnd ? new Date(customEnd).toISOString() : end 
        };
    }
  };

  const toggleEventType = (type: EventType) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
  };

  const handleApplyFilters = useCallback(() => {
    const dateBounds = getDateRangeBounds(dateRange);
    
    onFiltersChange({
      userId: filters.userId,
      types: selectedTypes.size > 0 ? Array.from(selectedTypes) : undefined,
      start: dateBounds.start,
      end: dateBounds.end,
    });
  }, [filters.userId, selectedTypes, dateRange, customStart, customEnd, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    setSelectedTypes(new Set());
    setDateRange('24h');
    setShowCustomDates(false);
    setCustomStart('');
    setCustomEnd('');
    setSearchQuery('');
    onFiltersChange({});
  }, [onFiltersChange]);

  const handleUserChange = useCallback((userId: string) => {
    onFiltersChange({
      ...filters,
      userId: userId === 'all' ? undefined : userId,
    });
  }, [filters, onFiltersChange]);

  const handleDateRangeChange = useCallback((value: string) => {
    const range = value as DateRange;
    setDateRange(range);
    setShowCustomDates(range === 'custom');
  }, []);

  const activeFilterCount = (filters.types?.length || 0) + (filters.userId ? 1 : 0);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">{activeFilterCount} active</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          disabled={activeFilterCount === 0 && !dateRange}
        >
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* User Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">User</label>
          <Select 
            value={filters.userId || 'all'} 
            onValueChange={handleUserChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Date Range</label>
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger>
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range Inputs */}
        {showCustomDates && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Start Date</label>
              <Input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">End Date</label>
              <Input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-sm"
              />
            </div>
          </>
        )}
      </div>

      {/* Event Type Multi-Select */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Event Types</label>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((type) => {
            const isSelected = selectedTypes.has(type);
            const colors = eventTypeColors[type];
            
            return (
              <button
                key={type}
                onClick={() => toggleEventType(type)}
                className={`
                  inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
                  transition-all duration-200
                  border
                  ${isSelected 
                    ? `${colors.bg} ${colors.text} ${colors.border}` 
                    : 'bg-muted text-muted-foreground border-transparent hover:border-border'
                  }
                `}
              >
                <span className="capitalize">{type}</span>
                {isSelected && <span className="text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">Active:</span>
          {selectedTypes.size > 0 && (
            <Badge variant="outline" className="gap-1">
              {selectedTypes.size} type{selectedTypes.size !== 1 && 's'}
              <button 
                onClick={() => {
                  setSelectedTypes(new Set());
                  handleApplyFilters();
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.userId && (
            <Badge variant="outline" className="gap-1">
              {users.find(u => u.id === filters.userId)?.name || 'Unknown user'}
              <button 
                onClick={() => handleUserChange('all')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Apply Button */}
      <div className="flex justify-end">
        <Button onClick={handleApplyFilters} size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Apply Filters
        </Button>
      </div>
    </div>
  );
}

export default FilterBar;