'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronDown, RefreshCcw, AlertCircle, Check, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { eventTypeColors, AnalyticsEvent } from '@/lib/analytics/mock-events';
import { formatDistanceToNow } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EventStreamProps {
  events: AnalyticsEvent[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  newEventCount: number;
  onLoadMore: () => void;
  onRefresh: () => void;
  onEventClick: (event: AnalyticsEvent) => void;
  onClearNewCount: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function EventStream({
  events,
  loading,
  error,
  hasMore,
  total,
  newEventCount,
  onLoadMore,
  onRefresh,
  onEventClick,
  onClearNewCount,
}: EventStreamProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new events arrive
  useEffect(() => {
    if (autoScroll && !isHovering && scrollRef.current && newEventCount > 0) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events, autoScroll, isHovering, newEventCount]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    // Load more when near bottom
    if (isNearBottom && hasMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // Format timestamp
  const formatTimestamp = (timestamp: string): { full: string; relative: string } => {
    const date = new Date(timestamp);
    return {
      full: date.toISOString(),
      relative: formatDistanceToNow(date),
    };
  };

  // Truncate text helper
  const truncate = (text: string, maxLength: number = 40): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // Get initials for avatar
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Event Stream</h2>
          
          {loading && (
            <RefreshCcw className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          
          {newEventCount > 0 && (
            <Badge 
              variant="secondary" 
              className="animate-in fade-in zoom-in duration-300 cursor-pointer"
              onClick={onClearNewCount}
            >
              {newEventCount} new
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{total.toLocaleString()} events</span>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* New Events Indicator */}
      {newEventCount > 0 && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full animate-in slide-in-from-top-2"
          onClick={() => {
            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            onClearNewCount();
          }}
        >
          <ChevronDown className="mr-2 h-4 w-4" />
          {newEventCount} new event{newEventCount !== 1 && 's'} - Click to view
        </Button>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Retry
          </Button>
        </div>
      )}

      {/* Events Table */}
      <div 
        className="rounded-lg border overflow-hidden"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <ScrollArea 
          className="h-[500px]"
          onScroll={handleScroll}
          ref={scrollRef}
        >
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[150px]">User</TableHead>
                <TableHead className="w-[120px]">Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {events.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-[200px] text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Circle className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No events found</p>
                      <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event, index) => {
                  const { relative } = formatTimestamp(event.timestamp);
                  const colors = eventTypeColors[event.type];
                  const isNew = index < newEventCount;

                  return (
                    <TableRow
                      key={event.id}
                      className={`
                        cursor-pointer transition-colors
                        hover:bg-muted/50
                        ${isNew ? 'bg-primary/5' : ''}
                      `}
                      onClick={() => onEventClick(event)}
                    >
                      <TableCell className="font-mono text-xs">
                        <div className="flex flex-col">
                          <span>{formatTimestamp(event.timestamp).full.slice(11, 19)}</span>
                          <span className="text-muted-foreground">{relative}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {getInitials(event.user.name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium truncate max-w-[100px]">{event.user.name}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[100px]">{event.user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className={`${colors.bg} ${colors.text} border ${colors.border} capitalize`}
                        >
                          {event.type}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {truncate(event.summary)}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {event.type === 'error' ? (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          ) : event.type === 'warning' ? (
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                          ) : (
                            <Check className="h-5 w-5 text-emerald-500" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              
              
              {/* Loading Indicator */}
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-4">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading more events...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              
              <div ref={bottomRef} />
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Load More Indicator */}
      {hasMore && !loading && events.length > 0 && (
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={onLoadMore}>
            Load more events
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Loading skeleton
export function EventStreamSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      
      <div className="rounded-lg border">
        <div className="h-[500px] p-4 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EventStream;