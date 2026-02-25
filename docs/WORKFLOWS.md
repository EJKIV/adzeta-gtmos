# GTM Operating System — Complete Workflow Documentation

## Overview

The GTM Operating System is an **agentic outreach platform** that combines:
- **AI-powered research** (Apollo.io MCP integration)
- **Natural language command interface** (no forms)
- **Automated sequence execution** with A/B testing
- **Multi-channel orchestration** (email, LinkedIn, calendar)
- **Real-time feedback loops** for optimization

---

## Core Philosophy: Natural Language First

**Traditional CRM:** Click through forms, filters, dropdowns  
**GTM OS:** Speak to the system. The AI does the work.

### Command Bar Interface (Always Available ⌘K)

**Primary Input Method:** Natural language commands  
**Secondary:** Suggestion carousel (swipe to execute)  
**Tertiary:** Visual cards (prospects, campaigns, sequences)

---

## Workflow 1: Prospect Research & Discovery

### User Command
> "Find me CMOs at Series B fintech companies in NYC who are actively hiring for growth teams"

### System Execution Flow

```
1. COMMAND PARSER
   └── Intent detected: research
       ├── ICP Criteria:
       │   ├── Title: CMO
       │   ├── Industry: fintech
       │   ├── Funding: Series B
       │   ├── Location: NYC
       │   └── Signals: hiring (growth roles)
       └── Confidence: 94%

2. RESEARCH WORKER (Async)
   └── Create research_job in database
       └── Status: QUEUED → PROCESSING
   
   └── Poll Apollo.io MCP
       ├── Search: companies matching criteria
       ├── Enrich: contact data, funding, tech stack
       ├── Score: A-F quality grade
       └── Stream results in real-time
   
   └── Update progress every 5 seconds
       ├── "Found 47 companies..."
       ├── "Enriched 23 contacts..."
       └── "Scored 18 A+ prospects"

3. VISUAL OUTPUT
   └── Research Progress Card (live updates)
   └── Prospects Stream (card-based, swipeable)
   └── Map View (geographic distribution)
   └── Signals Timeline (hiring alerts, funding news)

4. SUGGESTION ENGINE
   └── "Create campaign for these 18 A+ prospects?"
   └── "Save search as 'NYC Fintech CMOs'?"
   └── "Share with sales team?"
```

### User Actions Available

| Action | Trigger | Result |
|--------|---------|--------|
| **Swipe Right** | Card gesture | Add to "selected prospects" |
| **Swipe Left** | Card gesture | Skip/dismiss prospect |
| **Tap Card** | Click | Full prospect view with signals |
| **⌘+Enter** | Keyboard | Execute suggestion |
| **"Refine"** | Voice/text | Modify search criteria |
| **"Start outreach"** | Voice/text | Create campaign from selection |

---

## Workflow 2: Campaign Creation (Agentic)

### User Command
> "Create a 3-touch hiring-themed campaign for the prospects I just found. A/B test the subject line between 'Join our growth' and 'Scale with us'"

### System Execution Flow

```
1. COMMAND PARSER
   └── Intent: create_campaign
       ├── Target: previous search results
       ├── Theme: hiring
       ├── Sequence: 3-touch
       └── A/B Test: subject lines
           ├── Variant A: "Join our growth"
           └── Variant B: "Scale with us"

2. CAMPAIGN BUILDER
   └── Create campaign record
       ├── Name: Auto-generated or user-specified
       ├── Status: DRAFT → ACTIVE
       ├── Target criteria: linked to prospect list
       └── Priority: based on ICP score

3. SEQUENCE GENERATOR
   └── Build 3-touch sequence
       ├── Touch 1 (Day 0): Email
       │   ├── Subject: A/B variants created
       │   ├── Body: AI-generated from template
       │   └── Personalization: {FirstName}, {Company}, {Signal}
       ├── Touch 2 (Day 3): LinkedIn Connect
       │   ├── Fallback: Email if no LinkedIn
       └── Touch 3 (Day 7): Email
           ├── Subject: Follow-up angle
           └── Reference: Previous touches

4. A/B TEST SETUP
   └── Create test configuration
       ├── Variants: A (50%), B (50%)
       ├── Primary metric: replyRate
       ├── Minimum sample: 100 per variant
       ├── Auto-promote threshold: 95% confidence
       └── Statistical engine: t-test for proportions

5. VISUAL OUTPUT
   └── Campaign Card
       ├── Status: ACTIVE
       ├── Target: 18 prospects
       ├── Timeline: 3-touch sequence visual
       └── A/B test: side-by-side comparison
   
   └── Sequence Visualizer
       ├── Day 1: Email [A/B]
       ├── Day 3: LinkedIn
       └── Day 7: Email

6. SUGGESTION ENGINE
   └── "Campaign active. First sends in 15 minutes."
   └── "Monitor live performance?"
   └── "Add variant C with different angle?"
```

### Campaign Lifecycle States

```
DRAFT → READY → ACTIVE → RUNNING → PAUSED/COMPLETED
  │        │        │         │           │
  │        │        │         │           └── Archive
  │        │        │         └── Stops sends
  │        │        └── First touch scheduled
  │        └── All validations pass
  └── Review/approval mode
```

---

## Workflow 3: A/B Testing & Optimization

### User Command
> "Show me how variant B is performing"

### System Execution Flow

```
1. ANALYTICS WORKER (Real-time)
   └── Webhook events received:
       ├── Email: sent → opened → clicked → replied
       ├── LinkedIn: connect request → accepted → replied
       └── Calendar: meeting booked

2. STATISTICAL ENGINE
   └── Calculate metrics every 15 minutes
       ├── Open rate: (opens / sends) * 100
       ├── Click rate: (clicks / sends) * 100
       ├── Reply rate: (replies / sends) * 100
       └── Meeting rate: (bookings / sends) * 100
   
   └── Statistical significance test
       ├── Sample size: N per variant
       ├── Z-test for proportions
       ├── P-value: < 0.05 (significant)
       └── Confidence interval: 95%

3. VISUAL OUTPUT
   └── A/B Test Dashboard
       ┌─────────────────────────────────────────┐
       │ Variant A        │ Variant B          │
       │ "Join our growth"│ "Scale with us"    │
       ├──────────────────┼────────────────────┤
       │ Sent: 142        │ Sent: 138          │
       │ Opened: 45 (32%) │ Opened: 67 (49%) ⭐│
       │ Replied: 8 (6%)  │ Replied: 19 (14%)⭐│
       │                  │                    │
       │ Confidence: 94%  │ Significance: ✅   │
       │ Lift: -12%       │ Lift: +142%        │
       └──────────────────┴────────────────────┘
       
   └── Winner Projection
       ├── "Variant B leads with 94% confidence"
       ├── "Projected final lift: +140% replies"
       └── "Recommend promoting to 100%"

4. AUTO-OPTIMIZATION
   └── When significance threshold hit:
       ├── Promote winning variant
       ├── Pause underperforming variant
       └── Notify: "Winner selected: Variant B"
   
   └── Suggest next test:
       ├── "Test sender name?"
       ├── "Test CTA button?"
       └── "Test send time?"
```

### A/B Test Metrics Tracked

| Metric | Description | Primary Use |
|--------|-------------|-------------|
| **Open Rate** | Subject line effectiveness | Email optimization |
| **Click Rate** | CTA/content engagement | Content quality |
| **Reply Rate** | Conversation started | Sales intent |
| **Meeting Rate** | Demo/booking conversion | Revenue impact |
| **Unsubscribe** | Fatigue/delist quality | List health |

---

## Workflow 4: Multi-Channel Orchestration

### System Execution Flow

```
PROSPECT JOURNEY MAP

Day 0: Research Complete
├── Entry: Added to campaign
└── Score: Adjusted based on signals

Day 1: Touch 1 (Email)
├── Send: Personalized email
├── Wait: Track opens/clicks
├── If opened: +1 signal score
├── If clicked: Priority boost
└── If no reply after 48h: Schedule Touch 2

Day 3: Touch 2 (LinkedIn)
├── Check: Connection status
├── If not connected:
│   ├── Send connection request
│   ├── Message: Reference email
│   └── Wait: 24h for acceptance
├── If connected:
│   └── Send direct message
└── Fallback: Email if blocked

Day 7: Touch 3 (Email)
├── Check: Previous engagement
├── If engaged: Soft reference
├── If not engaged: New angle
├── Include: "Worth a brief call?"
└── CTA: Calendar booking link

Day 8-14: Response Window
├── Positive reply:
│   ├── Categorize: "interested"
│   ├── Suggest: "Book meeting now"
│   └── Route: SDR queue
├── Negative reply:
│   ├── Categorize: "not interested"
│   ├── Response: Acknowledge
│   └── Pause: 90 days
├── Out-of-office:
│   ├── Detect: Auto-reply
│   ├── Pause: Until return date
│   └── Resume: Day after return
└── No reply:
    ├── Pause: Sequence complete
    ├── Tag: "Needs re-engagement"
    └── Suggest: New sequence angle
```

### Channel Priority & Fallbacks

| Priority | Channel | Condition | Fallback |
|----------|---------|-----------|----------|
| 1 | Email | Always available | None |
| 2 | LinkedIn | Profile found | Email |
| 3 | Calendar | Meeting CTA | Email |
| 4 | Call | High-value + no reply | Email link |

---

## Workflow 5: Real-Time Feedback Loop

### Analytics Worker (Every 15 minutes)

```
EVENT PROCESSING
Webhook → Categorize → Score → Suggest

Email Events:
├── Opened:
│   ├── Record: timestamp
│   ├── Score: +engagement
│   └── Trigger: Track time-to-open
├── Clicked:
│   ├── Record: link, UTM
│   ├── Score: +interest
│   └── Trigger: Priority boost
├── Replied:
│   ├── Parse: sentiment analysis
│   ├── Categorize: positive/negative/OOF
│   ├── Score: +conversion
│   └── Trigger: Alert SDR
└── Bounced:
    ├── Flag: bad email
    ├── Remove: from active
    └── Suggest: find new contact

LinkedIn Events:
├── Connection accepted:
│   ├── Status: Connected
│   └── Trigger: Schedule message
├── Message read:
│   └── Record: interest signal
└── Message replied:
    ├── Route: SDR inbox
    └── Analytics: +engagement

Calendar Events:
├── Meeting booked:
│   ├── Campaign status: SUCCESS
│   ├── Attribution: Sequence touch
│   └── Suggest: "Similar prospects?"
├── Cancelled:
│   └── Suggest: Re-engagement sequence
└── No-show:
    └── Suggest: Follow-up email
```

### Suggestion Engine (Context-Aware)

| Trigger | Suggestion | Action |
|---------|------------|--------|
| Open rate > 40% | "Subject line working—use as template?" | Save template |
| Reply rate drops | "Engagement fading. Try new angle?" | Create variant C |
| 3+ no replies | "Consider different channel?" | Switch to LinkedIn |
| Meeting booked | "Clone campaign for similar prospects?" | Duplicate campaign |
| A/B winner found | "Promote Variant B to 100%?" | Auto-promote |

---

## Workflow 6: Conversation Thread & Iteration

### User Interface: Right Panel Thread

```
┌─────────────────────────────────────────┐
│ CONVERSATION HISTORY                     │
├─────────────────────────────────────────┤
│                                         │
│ User: "Find Series B fintech CMOs"       │
│  ├─> 47 prospects found                 │
│  ├─> 23 enriched                        │
│  └─> 18 A+ scored                       │
│                                         │
│ System: "Create campaign?"              │
│  [Yes] [Refine] [Save]                  │
│                                         │
│ User: "Create 3-touch hiring campaign"  │
│  ├─> Campaign "NYC Fintech CMOs" created│
│  ├─> 3-touch sequence built             │
│  └─> A/B test active                    │
│                                         │
│ System: "Variant B winning (94%)"       │
│  [Promote] [Keep A/B] [Add Variant C]   │
│                                         │
│ User: "Promote B"                        │
│  └─> Variant B now 100% traffic          │
│                                         │
│ [Continue...]                            │
└─────────────────────────────────────────┘
```

### Thread Features
- **Branchable:** Click any point to modify
- **Referenceable:** "Add Variant C like the last test"
- **Exportable:** Share thread with team
- **Resumable:** Pick up where you left off

---

## Technical Architecture

### Frontend (Next.js 16 + TypeScript)
```
src/
├── app/
│   ├── layout.tsx           # Root + Navigation wrapper
│   ├── page.tsx             # Dashboard
│   └── outreach/
│       ├── page.tsx         # Research command center
│       ├── prospects/       # Prospect cards
│       ├── campaigns/       # Campaign dashboard
│       └── sequences/       # A/B visualizer
├── components/
│   ├── Navigation.tsx       # Collapsible sidebar
│   ├── CommandBar.tsx       # Natural language input
│   ├── ProspectStream.tsx   # Swipeable cards
│   ├── SequenceVisualizer.tsx # A/B timeline
│   ├── ResearchCards.tsx    # Progress cards
│   └── ThreadPanel.tsx      # Conversation history
├── lib/
│   ├── mcp/apollo.ts        # Apollo MCP client
│   ├── sequences/builder.ts # Sequence generator
│   ├── testing/ab-engine.ts # A/B testing engine
│   └── nlp/command-parser.ts # Intent parser
└── types/
    └── sequences.ts         # TypeScript definitions
```

### Backend (Supabase + Queue Workers)
```
supabase/
├── migrations/
│   ├── 001_prospects.sql
│   ├── 002_research_jobs.sql
│   ├── 003_outreach_campaigns.sql
│   ├── 004_outreach_sequences.sql
│   ├── 005_communications.sql
│   ├── 006_channel_performance.sql
│   └── 007_sequence_variants.sql

workers/ (Vercel Cron)
├── research.ts      # Apollo polling, enrichment
├── sequence.ts      # Touch scheduling, sending
└── analytics.ts     # Event processing, optimization

webhooks/
├── email.ts         # SendGrid/Resend events
├── linkedin.ts      # LinkedIn events
└── calendar.ts      # Calendar events
```

---

## User Journeys Summary

### Journey A: First-Time Research
1. Opens `/outreach`
2. Types: "Find decision-makers at companies..."
3. Sees: Live research progress card
4. Gets: Prospect cards as found
5. Swipes: Right to select prospects
6. Receives: "Create campaign?" suggestion
7. Confirms: Campaign created with AI sequence
8. Monitors: A/B test dashboard

### Journey B: Existing Campaign Optimization
1. Opens `/outreach/campaigns`
2. Sees: Active campaign card
3. Clicks: "View performance"
4. Opens: A/B test visualizer
5. Sees: Variant B winning with 94% confidence
6. Clicks: "Promote winner"
7. System: Updates to 100% traffic
8. Suggests: "Test new subject line?"

### Journey C: Re-engagement
1. Opens `/outreach/prospects`
2. Filters: "No reply after 14 days"
3. Selects: 12 prospects
4. Commands: "Create re-engagement campaign"
5. System: Suggests new angle based on signals
6. Reviews: Generated sequence
7. Launches: 2-touch gentle re-engagement
8. Monitors: Reply rates in thread

---

## Design Principles Applied

1. **Agentic First:** AI does the work, user provides goals
2. **Natural Language:** Speak, don't click
3. **Beautiful Outputs:** Cards, sparklines, animations
4. **No Forms:** Everything via command or suggestion
5. **Real-Time:** Live progress, instant feedback
6. **Feedback Loops:** Every action teaches the system
7. **Unified:** One entry point, multiple capabilities
