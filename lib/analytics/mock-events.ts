// ─────────────────────────────────────────────────────────────────────────────
// Mock Events Data for Events Dashboard
// 500 realistic events with relative timestamps for realistic display
// ─────────────────────────────────────────────────────────────────────────────

export type EventType = 
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'sync'
  | 'error'
  | 'warning';

export interface EventUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  user: EventUser;
  timestamp: string; // ISO timestamp
  details: Record<string, unknown>;
  summary: string;
  relatedEntity?: {
    type: 'task' | 'user' | 'prospect' | 'sequence' | 'campaign';
    id: string;
    name: string;
  };
}

// Color coding for event types
export const eventTypeColors: Record<EventType, { bg: string; text: string; border: string }> = {
  create: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  update: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  delete: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  approve: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  reject: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  login: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  logout: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  export: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  import: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  sync: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  error: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  warning: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

// Sample user data
const users: EventUser[] = [
  { id: 'user-1', name: 'Alex Chen', email: 'alex@company.com' },
  { id: 'user-2', name: 'Jordan Smith', email: 'jordan@company.com' },
  { id: 'user-3', name: 'Morgan Taylor', email: 'morgan@company.com' },
  { id: 'user-4', name: 'Casey Brown', email: 'casey@company.com' },
  { id: 'user-5', name: 'Riley Davis', email: 'riley@company.com' },
  { id: 'user-6', name: 'Quinn Wilson', email: 'quinn@company.com' },
  { id: 'user-7', name: 'Avery Martinez', email: 'avery@company.com' },
  { id: 'user-8', name: 'Blake Johnson', email: 'blake@company.com' },
];

// Event summary templates
const eventSummaries: Record<EventType, string[]> = {
  create: [
    'Created new prospect',
    'Created email sequence',
    'Created campaign',
    'Added team member',
    'Created custom field',
    'Created automation rule',
  ],
  update: [
    'Updated prospect status',
    'Modified sequence settings',
    'Changed campaign budget',
    'Updated user permissions',
    'Edited template content',
    'Adjusted targeting criteria',
  ],
  delete: [
    'Deleted prospect record',
    'Removed from sequence',
    'Deleted campaign draft',
    'Removed team member',
    'Cleared activity log',
  ],
  approve: [
    'Approved outreach sequence',
    'Approved campaign launch',
    'Approved team invitation',
    'Approved bulk import',
  ],
  reject: [
    'Rejected sequence proposal',
    'Denied campaign request',
    'Blocked user access',
  ],
  login: [
    'Logged in from Chrome',
    'Logged in from Safari',
    'Successful login',
    'Session refreshed',
  ],
  logout: [
    'Logged out manually',
    'Session expired',
    'Logged out from all devices',
  ],
  export: [
    'Exported prospect list',
    'Downloaded analytics report',
    'Exported campaign data',
    'Generated PDF summary',
  ],
  import: [
    'Imported CSV file',
    'Bulk imported prospects',
    'Synced with CRM',
    'Imported template library',
  ],
  sync: [
    'Synced with Salesforce',
    'HubSpot sync completed',
    'Calendar sync successful',
    'Email provider connected',
  ],
  error: [
    'API request failed',
    'Email delivery error',
    'Sync timeout',
    'Rate limit exceeded',
    'Database connection lost',
  ],
  warning: [
    'Low credit balance',
    'High bounce rate detected',
    'Sequence paused',
    'Daily limit approaching',
  ],
};

// Generate realistic event details
function generateEventDetails(type: EventType, index: number): Record<string, unknown> {
  const base = {
    requestId: `req-${Date.now()}-${index}`,
    ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  };

  const specifics: Record<EventType, Record<string, unknown>> = {
    create: {
      entityType: ['prospect', 'sequence', 'campaign', 'template'][Math.floor(Math.random() * 4)],
      entityId: `ent-${Math.random().toString(36).substring(7)}`,
      source: ['manual', 'import', 'api'][Math.floor(Math.random() * 3)],
    },
    update: {
      entityType: ['prospect', 'sequence', 'campaign', 'user'][Math.floor(Math.random() * 4)],
      entityId: `ent-${Math.random().toString(36).substring(7)}`,
      changedFields: ['status', 'name', 'budget', 'settings'],
      previousValues: { status: 'draft' },
      newValues: { status: 'active' },
    },
    delete: {
      entityType: ['prospect', 'sequence', 'campaign'][Math.floor(Math.random() * 3)],
      entityId: `ent-${Math.random().toString(36).substring(7)}`,
      permanent: Math.random() > 0.5,
    },
    approve: {
      requestId: `req-${Math.random().toString(36).substring(7)}`,
      approvedBy: users[Math.floor(Math.random() * users.length)].id,
      approvedAt: new Date().toISOString(),
      notes: 'Approved after review',
    },
    reject: {
      requestId: `req-${Math.random().toString(36).substring(7)}`,
      rejectedBy: users[Math.floor(Math.random() * users.length)].id,
      rejectedAt: new Date().toISOString(),
      reason: ['Policy violation', 'Incomplete data', 'Budget exceeded'][Math.floor(Math.random() * 3)],
    },
    login: {
      method: ['password', 'sso', 'magic_link'][Math.floor(Math.random() * 3)],
      mfa: Math.random() > 0.7,
      deviceId: `device-${Math.random().toString(36).substring(7)}`,
    },
    logout: {
      reason: ['manual', 'timeout', 'token_revoked'][Math.floor(Math.random() * 3)],
      sessionDuration: Math.floor(Math.random() * 3600),
    },
    export: {
      format: ['csv', 'json', 'pdf', 'xlsx'][Math.floor(Math.random() * 4)],
      recordCount: Math.floor(Math.random() * 1000) + 1,
      fileSize: Math.floor(Math.random() * 10000000),
    },
    import: {
      format: 'csv',
      recordCount: Math.floor(Math.random() * 500) + 1,
      successCount: 0,
      errorCount: 0,
    },
    sync: {
      provider: ['salesforce', 'hubspot', 'slack', 'calendar'][Math.floor(Math.random() * 4)],
      duration: Math.floor(Math.random() * 30),
      recordsSynced: Math.floor(Math.random() * 100),
    },
    error: {
      code: ['E001', 'E002', 'E003', 'TIMEOUT'][Math.floor(Math.random() * 4)],
      message: 'Operation failed due to network error',
      retryable: Math.random() > 0.3,
    },
    warning: {
      code: ['W001', 'W002', 'W003'][Math.floor(Math.random() * 3)],
      message: 'Resource utilization is high',
      threshold: 85,
      current: Math.floor(Math.random() * 20) + 85,
    },
  };

  return { ...base, ...specifics[type] };
}

// Generate related entity for some events
function generateRelatedEntity(type: EventType): AnalyticsEvent['relatedEntity'] | undefined {
  if (Math.random() > 0.6) return undefined;

  const types: Array<'task' | 'user' | 'prospect' | 'sequence' | 'campaign'> = ['task', 'user', 'prospect', 'sequence', 'campaign'];
  const entityType = types[Math.floor(Math.random() * types.length)];
  
  const names: Record<string, string[]> = {
    task: ['Review sequence', 'Approve email', 'Update template', 'Check analytics'],
    user: ['Alex Chen', 'Jordan Smith', 'Morgan Taylor', 'Casey Brown'],
    prospect: ['Acme Corp', 'TechStart Inc', 'Global Solutions', 'Beta Systems'],
    sequence: ['Welcome Series', 'Product Launch', 'Follow-up A', 'Re-engagement'],
    campaign: ['Q1 Outreach', 'Summer Promo', 'Webinar Series', 'Product Update'],
  };

  return {
    type: entityType,
    id: `${entityType}-${Math.random().toString(36).substring(7)}`,
    name: names[entityType][Math.floor(Math.random() * names[entityType].length)],
  };
}

// Generate 500 mock events
export function generateMockEvents(count: number = 500): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = [];
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const eventTypes = Object.keys(eventSummaries) as EventType[];

  for (let i = 0; i < count; i++) {
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const summaries = eventSummaries[type];
    const summary = summaries[Math.floor(Math.random() * summaries.length)];
    
    // Timestamp distributed over last 7 days, weighted toward recent
    const timeOffset = Math.pow(Math.random(), 2) * (now - sevenDaysAgo);
    const timestamp = new Date(now - timeOffset).toISOString();

    events.push({
      id: `evt-${Date.now()}-${i}`,
      type,
      user,
      timestamp,
      summary,
      details: generateEventDetails(type, i),
      relatedEntity: generateRelatedEntity(type),
    });
  }

  // Sort by timestamp descending
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Store for runtime-generated events
let mockEventsStore: AnalyticsEvent[] = generateMockEvents(500);

// Get events with optional filtering
export function getMockEvents(options?: {
  userId?: string;
  types?: EventType[];
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}): { events: AnalyticsEvent[]; total: number; hasMore: boolean } {
  let filtered = [...mockEventsStore];

  if (options?.userId) {
    filtered = filtered.filter(e => e.user.id === options.userId);
  }

  if (options?.types && options.types.length > 0) {
    filtered = filtered.filter(e => options.types?.includes(e.type));
  }

  if (options?.start) {
    const startDate = new Date(options.start);
    filtered = filtered.filter(e => new Date(e.timestamp) >= startDate);
  }

  if (options?.end) {
    const endDate = new Date(options.end);
    filtered = filtered.filter(e => new Date(e.timestamp) <= endDate);
  }

  const total = filtered.length;
  const offset = options?.offset || 0;
  const limit = options?.limit || 100;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    events: paginated,
    total,
    hasMore: offset + limit < total,
  };
}

// Add a new event to the store (for simulating real-time updates)
export function addMockEvent(event: Partial<AnalyticsEvent>): AnalyticsEvent {
  const type = event.type || 'create';
  const user = event.user || users[Math.floor(Math.random() * users.length)];
  const summaries = eventSummaries[type];
  const summary = event.summary || summaries[Math.floor(Math.random() * summaries.length)];

  const newEvent: AnalyticsEvent = {
    id: event.id || `evt-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    type,
    user,
    timestamp: event.timestamp || new Date().toISOString(),
    summary,
    details: event.details || generateEventDetails(type, mockEventsStore.length),
    relatedEntity: event.relatedEntity || generateRelatedEntity(type),
  };

  mockEventsStore.unshift(newEvent);
  // Keep store at reasonable size
  if (mockEventsStore.length > 1000) {
    mockEventsStore = mockEventsStore.slice(0, 1000);
  }

  return newEvent;
}

// Get metrics for dashboard
export function getMockMetrics(timerange: '15m' | '1h' | '24h' | '7d' = '1h'): {
  events_count: number;
  events_per_minute: number;
  unique_users: number;
  top_types: Array<{ type: EventType; count: number; percentage: number }>;
} {
  const now = Date.now();
  const ranges = {
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };
  
  const cutoff = new Date(now - ranges[timerange]).toISOString();
  const recentEvents = mockEventsStore.filter(e => e.timestamp >= cutoff);
  
  const events_count = recentEvents.length;
  const minutes = ranges[timerange] / (60 * 1000);
  const events_per_minute = parseFloat((events_count / minutes).toFixed(2));
  
  const uniqueUsers = new Set(recentEvents.map(e => e.user.id)).size;
  
  // Calculate top event types
  const typeCounts: Record<string, number> = {};
  recentEvents.forEach(e => {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
  });
  
  const top_types = Object.entries(typeCounts)
    .map(([type, count]) => ({
      type: type as EventType,
      count,
      percentage: Math.round((count / events_count) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    events_count,
    events_per_minute,
    unique_users: uniqueUsers,
    top_types,
  };
}

// Get unique users for filter dropdown
export function getMockUsers(): EventUser[] {
  return users;
}

// Reset mock data
export function resetMockEvents(): void {
  mockEventsStore = generateMockEvents(500);
}

// Export for SSE stream simulation
export function* mockEventStream(): Generator<AnalyticsEvent, never, unknown> {
  while (true) {
    // Simulate new event every 2-10 seconds
    const delay = Math.floor(Math.random() * 8000) + 2000;
    
    // Return an event (caller should handle delay)
    yield addMockEvent({});
  }
}

export default generateMockEvents;