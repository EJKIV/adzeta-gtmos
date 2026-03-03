# Events Dashboard Documentation

## Overview

The Events Dashboard is a real-time analytics dashboard at `/admin/events-dashboard` that provides:
- Real-time event stream monitoring
- Event filtering by user, type, and date range
- Metrics visualization with charts
- Event detail inspection
- Data export capabilities

## Features

### 1. Event Stream Panel
- Displays last 100+ events in real-time
- Auto-scroll with pause on hover
- Color-coded event types:
  - Create (green)
  - Update (blue)
  - Delete (red)
  - Approve (indigo)
  - Reject (rose)
  - Login/Logout (cyan/grey)
  - Export/Import (amber/violet)
  - Sync (fuchsia)
  - Error/Warning (red/orange)

### 2. Filter Bar
- User dropdown (searchable)
- Event type multi-select (chips)
- Date range picker (15m, 1h, 24h, 7d, custom)
- Apply/Clear buttons

### 3. Metrics Cards
- **Events Count**: Total events in selected time range
- **Events/Min**: Event rate with sparkline chart
- **Unique Users**: Active users count
- **Top Event Types**: Pie chart showing event distribution

### 4. Event Detail Drawer
- Slide-in drawer on event click
- Full JSON details
- Copy JSON button
- Navigate to related user/task

### 5. Export
- Download as CSV
- Download as JSON
- Respects current filters

## API Endpoints

### GET `/api/admin/events`
Query parameters:
- `userId`: Filter by user
- `types`: Comma-separated event types
- `start`: ISO datetime start
- `end`: ISO datetime end
- `limit`: Max events to return (default: 100)
- `offset`: Pagination offset

Response:
```json
{
  "events": [...],
  "total": 500,
  "hasMore": true
}
```

### GET `/api/admin/events/stream`
Server-Sent Events endpoint for real-time updates.

### GET `/api/admin/metrics`
Query parameters:
- `timerange`: 15m | 1h | 24h | 7d

Response:
```json
{
  "events_count": 42,
  "events_per_minute": 3.5,
  "unique_users": 8,
  "top_types": [{"type": "create", "count": 20, "percentage": 48}]
}
```

## Component Structure

```
app/admin/events-dashboard/
├── page.tsx                    # Main page component
├── layout.tsx                  # Layout with admin auth (TODO)
└── components/
    ├── filter-bar.tsx          # Filter controls
    ├── event-stream.tsx        # Event table
    ├── metrics-cards.tsx       # Stats & charts
    └── event-detail-drawer.tsx # Detail panel

app/api/admin/
├── events/route.ts             # GET events list
├── events/stream/route.ts      # SSE endpoint
└── metrics/route.ts            # Metrics endpoint

lib/analytics/
├── mock-events.ts             # 500 sample events
└── export.ts                  # Export utilities

hooks/
└── use-events-stream.ts       # Real-time event subscription
```

## Performance

- DOM mount: <500ms
- Initial data load: <1s
- Real-time latency: <100ms
- Scroll: 60fps with 100+ items
- Total dashboard load: <2s

## Mock Data

500 realistic events across all types with timestamps relative to "now". Data resets on page reload (server restarts).

## Real-time Updates

Uses Server-Sent Events with fallback polling. New events appear automatically with a badge notification.

## Future Enhancements

1. Connect to real database (replace mock data)
2. Add admin auth guard
3. Event archiving/purging
4. Custom alert thresholds
5. Event replay capability