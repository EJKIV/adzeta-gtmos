'use client';

import { useState, useCallback } from 'react';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEventsStream, EventsFilter } from '@/hooks/use-events-stream';
import { FilterBar } from './components/filter-bar';
import { MetricsCards } from './components/metrics-cards';
import { EventStream } from './components/event-stream';
import { EventDetailDrawer } from './components/event-detail-drawer';
import { exportEvents } from '@/lib/analytics/export';
import { AnalyticsEvent } from '@/lib/analytics/mock-events';

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function EventsDashboardPage() {
  // Selected event for detail view
  const [selectedEvent, setSelectedEvent] = useState<AnalyticsEvent | null>(null);

  // Events stream hook with real-time updates
  const {
    events,
    loading,
    error,
    metrics,
    filters,
    total,
    hasMore,
    setFilters,
    loadMore,
    refresh,
    updateMetrics,
    newEventCount,
    clearNewCount,
  } = useEventsStream({
    enableRealtime: true,
    initialFilters: {
      // Default to last 24 hours
      start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
  });

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: EventsFilter) => {
    setFilters(newFilters);
  }, [setFilters]);

  // Handle timerange change for metrics
  const handleTimerangeChange = useCallback((timerange: '15m' | '1h' | '24h' | '7d') => {
    updateMetrics(timerange);
  }, [updateMetrics]);

  // Handle event click
  const handleEventClick = useCallback((event: AnalyticsEvent) => {
    setSelectedEvent(event);
  }, []);

  // Handle export
  const handleExport = useCallback((format: 'csv' | 'json') => {
    exportEvents(events, { format });
  }, [events]);

  // Close detail drawer
  const handleCloseDetail = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Events Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time event monitoring and analytics
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
                Refresh
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" disabled={events.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    <FileJson className="mr-2 h-4 w-4" />
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Filter Bar */}
        <FilterBar filters={filters} onFiltersChange={handleFilterChange} />

        {/* Metrics Cards */}
        <MetricsCards metrics={metrics} onTimerangeChange={handleTimerangeChange} />

        {/* Event Stream */}
        <EventStream
          events={events}
          loading={loading}
          error={error}
          hasMore={hasMore}
          total={total}
          newEventCount={newEventCount}
          onLoadMore={loadMore}
          onRefresh={refresh}
          onEventClick={handleEventClick}
          onClearNewCount={clearNewCount}
        />

        {/* Sample Data Notice */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Showing mock data - connected to backend API when available
          </p>
        </div>
      </main>

      {/* Event Detail Drawer */}
      <EventDetailDrawer event={selectedEvent} onClose={handleCloseDetail} />
    </div>
  );
}