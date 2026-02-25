# Outreach Platform Design v1.0

## Phase 1: Research & Outreach Foundation

### Overview

This document outlines the design and implementation of Phase 1 of the Research & Outreach Platform, which provides autonomous prospecting, enrichment, and outreach capabilities.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ CommandInput │  │ ResearchJobs │  │ ProspectsList│       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Processing Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │Command Parser│  │Command Router│  │ ResearchQueue│       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Integration Layer                         │
│  ┌──────────────┐                     ┌──────────────┐      │
│  │ Apollo MCP   │                     │  Supabase    │      │
│  │  - Search    │                     │  - DB        │      │
│  │  - Enrich    │                     │  - Realtime  │      │
│  │  - Techno    │                     │  - Auth      │      │
│  └──────────────┘                     └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

#### Tables Created

1. **research_jobs** - Queue for research tasks
   - Tracks status: pending, queued, active, completed, failed
   - Stores search criteria in JSONB
   - Progress tracking with percent and counts

2. **prospects** - Enriched prospect data
   - Person and company data
   - Technographics and intent signals
   - Quality scoring (A-F tier)

3. **outreach_campaigns** - Campaign definitions
   - Targeting criteria
   - Sequence references
   - Performance metrics

4. **outreach_sequences** - Multi-step sequences
   - Step configurations
   - A/B test variants
   - Performance tracking

5. **communications** - All touch points
   - Email, LinkedIn, calls
   - Status tracking
   - Engagement metrics

6. **command_history** - Natural language command log
   - Parsed entities
   - Execution results
   - User feedback

### Natural Language Commands

#### Supported Commands

| Command Pattern | Description | Example |
|----------------|-------------|---------|
| `research [N] [title] in [industry]` | Search for prospects | "research 50 VP Sales in fintech" |
| `enrich [email]` | Enrich person data | "enrich john@example.com" |
| `enrich [domain]` | Enrich company data | "enrich company stripe.com" |
| `create campaign for [name]` | Create new campaign | "create campaign for Q1 outreach" |
| `help` | Show help | "help" |

#### Entity Extraction

The command parser extracts:
- **Count**: Number of results (e.g., "50")
- **Titles**: Job titles (e.g., "VP Sales", "Head of Revenue")
- **Industry**: Industry sector (e.g., "fintech", "SaaS")
- **Company Size**: Size range (e.g., "51-200")
- **Location**: Geographic location
- **Email**: Email addresses
- **Domain**: Company domains

### Rate Limiting

Apollo.io API: 10 requests per minute on free tier

```typescript
const RATE_LIMIT = {
  requestsPerMinute: 10,
  minDelayMs: 6000, // 6 seconds between requests
};
```

Queue processing enforces rate limits automatically.

### Error Handling

#### Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelayMs: 1000,
};
```

#### Error Types

- **API_KEY_MISSING**: Apollo API key not configured
- **API_ERROR**: Apollo API returned error
- **RATE_LIMITED**: Too many requests
- **INVALID_COMMAND**: Could not parse user input
- **ENCRYPTION_ERROR**: Data encryption failed

### Security Considerations

1. **Row Level Security (RLS)**: All tables have RLS policies restricting access to user's own data
2. **API Keys**: Stored in environment variables, never in client code
3. **Email Security**: Verified email status tracked, bounced emails flagged
4. **Do Not Contact**: Global flag to prevent outreach to opted-out contacts

### Performance Targets

| Metric | Target |
|--------|--------|
| Command Parse Time | < 100ms |
| Job Queue Latency | < 5 seconds |
| Real-time Updates | < 500ms |
| Page Load Time | < 2 seconds |

### Usage Examples

#### Research Prospects

```typescript
// Execute natural language command
const result = await commandRouter.execute(
  'research 50 VP Sales in fintech',
  userId
);

// Response:
// {
//   success: true,
//   type: 'research_prospects',
//   message: 'Research job queued! Looking for 50 VP Sales in fintech...',
//   resources: { research_job_id: 'uuid' }
// }
```

#### Enrich Person

```typescript
const result = await commandRouter.execute(
  'enrich john@example.com',
  userId
);
```

#### Subscribe to Updates

```typescript
const subscription = supabase
  .channel('research_jobs')
  .on('postgres_changes', 
    { event: '*', table: 'research_jobs' },
    (payload) => handleUpdate(payload)
  )
  .subscribe();
```

### Deployment

1. Run database migrations (021-026)
2. Set environment variables:
   - `APOLLO_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Start the application

### Monitoring

Key metrics to track:
- Command success rate
- Average command parsing confidence
- Research job completion rate
- Queue processing latency
- Apollo API rate limit utilization

### Next Steps (Phase 2)

- Email sending integration (SendGrid/Resend)
- LinkedIn automation
- A/B testing engine
- AI-powered reply classification
- Meeting scheduling integration