'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AnalyticsEvent, EventType } from '@/lib/analytics/mock-events';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EventsFilter {
  userId?: string;
  types?: EventType[];
  start?: string;
  end?: string;
}

export interface EventsMetrics {
  events_count: number;
  events_per_minute: number;
  unique_users: number;
  top_types: Array<{ type: EventType; count: number; percentage: number }>;
}

export interface EventsResponse {
  events: AnalyticsEvent[];
  total: number;
  hasMore: boolean;
}

export interface UseEventsStreamOptions {
  /** Initial filter state */
  initialFilters?: EventsFilter;
  /** Enable real-time SSE updates (default: true) */
  enableRealtime?: boolean;
  /** Initial data fetch limit (default: 100) */
  limit?: number;
}

export interface UseEventsStreamReturn {
  events: AnalyticsEvent[];
  loading: boolean;
  error: string | null;
  metrics: EventsMetrics | null;
  filters: EventsFilter;
  total: number;
  hasMore: boolean;
  /** Apply new filters and refetch */
  setFilters: (filters: EventsFilter) => void;
  /** Load more events (pagination) */
  loadMore: () => Promise<void>;
  /** Refresh events with current filters */
  refresh: () => Promise<void>;
  /** Update metrics for a specific time range */
  updateMetrics: (timerange: '15m' | '1h' | '24h' | '7d') => Promise<void>;
  /** Last update timestamp */
  lastUpdated: Date | null;
  /** Number of new events since last fetch */
  newEventCount: number;
  /** Clear the new event counter */
  clearNewCount: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 100;
const POLLING_INTERVAL = 5000; // Fallback polling
const SSE_RECONNECT_DELAY = 3000;
const METRICS_REFRESH_INTERVAL = 60000; // 1 minute

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useEventsStream(options: UseEventsStreamOptions = {}): UseEventsStreamReturn {
  const {
    initialFilters = {},
    enableRealtime = true,
    limit = DEFAULT_LIMIT,
  } = options;

  // State
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<EventsMetrics | null>(null);
  const [filters, setFiltersState] = useState<EventsFilter>(initialFilters);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newEventCount, setNewEventCount] = useState(0);

  // Refs
  const offsetRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isMountedRef = useRef(true);
  const lastEventIdRef = useRef<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────

  const buildQueryString = (filterParams: EventsFilter, offset: number, limitNum: number): string => {
    const params = new URLSearchParams();
    params.append('limit', limitNum.toString());
    params.append('offset', offset.toString());
    
    if (filterParams.userId) params.append('userId', filterParams.userId);
    if (filterParams.types?.length) params.append('types', filterParams.types.join(','));
    if (filterParams.start) params.append('start', filterParams.start);
    if (filterParams.end) params.append('end', filterParams.end);
    
    return params.toString();
  };

  const fetchEvents = useCallback(async (filterParams: EventsFilter, offset: number = 0, append: boolean = false) => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const query = buildQueryString(filterParams, offset, limit);
      const response = await fetch(`/api/admin/events?${query}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: EventsResponse = await response.json();

      if (!isMountedRef.current) return;

      if (append) {
        setEvents(prev => [...prev, ...data.events]);
      } else {
        setEvents(data.events);
        // Reset new event count when doing a full refresh
        setNewEventCount(0);
      }
      
      setTotal(data.total);
      setHasMore(data.hasMore);
      setLastUpdated(new Date());
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(errorMessage);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [limit]);

  const fetchMetrics = useCallback(async (timerange: '15m' | '1h' | '24h' | '7d' = '1h') => {
    if (!isMountedRef.current) return;

    try {
      const response = await fetch(`/api/admin/metrics?timerange=${timerange}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: EventsMetrics = await response.json();

      if (!isMountedRef.current) return;
      setMetrics(data);
    } catch (err) {
      console.error('[useEventsStream] Failed to fetch metrics:', err);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // SSE Connection
  // ─────────────────────────────────────────────────────────────────────────

  const connectSse = useCallback(() => {
    if (!enableRealtime || !isMountedRef.current) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Build SSE URL with current filters
    const params = new URLSearchParams();
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.types?.length) params.append('types', filters.types.join(','));
    
    const url = `/api/admin/events/stream?${params.toString()}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      if (!isMountedRef.current) return;

      try {
        const { type, data } = JSON.parse(event.data);

        if (type === 'new_event') {
          const newEvent: AnalyticsEvent = data;
          
          // Check if event matches current filters
          const matchesFilters = checkEventMatchesFilters(newEvent, filters);
          
          if (matchesFilters) {
            setEvents(prev => {
              // Avoid duplicates
              if (prev.some(e => e.id === newEvent.id)) return prev;
              return [newEvent, ...prev];
            });
            setNewEventCount(prev => prev + 1);
            setLastUpdated(new Date());
          }
        } else if (type === 'ping') {
          // Keep-alive, do nothing
        }
      } catch (err) {
        console.error('[useEventsStream] Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = () => {
      if (!isMountedRef.current) return;
      
      // Close connection and retry after delay
      eventSource.close();
      eventSourceRef.current = null;
      
      setTimeout(() => {
        if (isMountedRef.current && enableRealtime) {
          connectSse();
        }
      }, SSE_RECONNECT_DELAY);
    };

    eventSource.onopen = () => {
      // Connection established
    };
  }, [enableRealtime, filters]);

  // Helper: Check if event matches current filters
  const checkEventMatchesFilters = (event: AnalyticsEvent, filterParams: EventsFilter): boolean => {
    if (filterParams.userId && event.user.id !== filterParams.userId) return false;
    if (filterParams.types?.length && !filterParams.types.includes(event.type)) return false;
    if (filterParams.start && new Date(event.timestamp) < new Date(filterParams.start)) return false;
    if (filterParams.end && new Date(event.timestamp) > new Date(filterParams.end)) return false;
    return true;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Public Actions
  // ─────────────────────────────────────────────────────────────────────────

  const setFilters = useCallback((newFilters: EventsFilter) => {
    setFiltersState(newFilters);
    offsetRef.current = 0;
    // Events will be fetched by effect
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    offsetRef.current = events.length;
    await fetchEvents(filters, offsetRef.current, true);
  }, [events.length, filters, fetchEvents, hasMore, loading]);

  const refresh = useCallback(async () => {
    offsetRef.current = 0;
    await fetchEvents(filters, 0, false);
  }, [fetchEvents, filters]);

  const updateMetrics = useCallback(async (timerange: '15m' | '1h' | '24h' | '7d') => {
    await fetchMetrics(timerange);
  }, [fetchMetrics]);

  const clearNewCount = useCallback(() => {
    setNewEventCount(0);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    fetchEvents(filters);
    fetchMetrics('1h');

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch when filters change
  useEffect(() => {
    if (!isMountedRef.current) return;
    offsetRef.current = 0;
    fetchEvents(filters, 0, false);
  }, [filters, fetchEvents]);

  // Setup SSE
  useEffect(() => {
    if (!enableRealtime) return;

    connectSse();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [enableRealtime, connectSse]);

  // Metrics auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics('1h');
    }, METRICS_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
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
    lastUpdated,
    newEventCount,
    clearNewCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Additional utility hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useEventDetail(eventId: string | null) {
  const [event, setEvent] = useState<AnalyticsEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      return;
    }

    const fetchEvent = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/events/${eventId}`, {
          headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setEvent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch event');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  return { event, loading, error };
}

export default useEventsStream;