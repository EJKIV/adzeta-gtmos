# AdZeta-GTM Application Plan
## Path to Full Autonomy — Comprehensive Work Plan

**Version:** 1.0  
**Last Updated:** 2026-03-02  
**Current Phase:** Phase 1 (Core UX & Data Pipeline)  
**Target:** Full Autonomy by Q3 2026

---

## Executive Summary

This document outlines the complete roadmap from our current B+ rated application to a fully autonomous GTM operating system. The plan is organized into 5 phases, each building on the previous, with clear milestones, integration requirements, data collection strategies, and autonomy progression gates.

### Current State (Snapshot)
- **Backend:** 95% complete — APIs, database, polling service functional
- **Frontend:** 90% complete — 6 autonomy components, 4 hooks, 43 routes
- **Integration:** 75% complete — Components wired, needs chat integration polish
- **Quality:** B+ (85%) — Ready for production, needs polish for scale
- **Autonomy Level:** Phase 0 — Approval-only mode (all gates locked)

---

## Phase 0: Foundation (COMPLETE)
**Timeline:** Dec 2025 - Feb 2026  
**Status:** ✅ DONE

### Deliverables
- [x] Oracle Command Queue system with polling architecture
- [x] Autonomy database (6 tables: work_queue, autonomy_gates, feedback, metrics, suggestions, config)
- [x] Work Queue UI (approve/reject/modify)
- [x] Gate Progress visualization
- [x] Proactive Suggestions panel
- [x] Metrics dashboard with charts
- [x] SSE streaming for real-time updates
- [x] Task feedback collection (⭐ ratings)

### Data Collection Baseline
- Command execution logs
- User approval/rejection rates
- Task type distribution
- Confidence scores at submission

---

## Phase 1: Core UX & Data Pipeline
**Timeline:** Mar 2026 - Apr 2026  
**Status:** 🔄 IN PROGRESS  
**Autonomy Level:** Approval-Assisted (Gate 1: Research unlocks after 10 runs)

### 1.1 Chat Integration Polish
**Priority:** P0 | **Effort:** 2 weeks | **Owner:** Frontend

#### Features
- [ ] Work queue cards appear inline in chat thread
- [ ] Real-time approval buttons in chat (no redirect to /autonomy)
- [ ] Suggestion toasts with quick accept/dismiss
- [ ] Task completion feedback inline

#### Technical Tasks
```
app/components/chat/
├── approval-card.tsx         ← New: Inline approval UI
├── suggestion-toast.tsx        ← New: Toast notifications
└── task-feedback-inline.tsx    ← Modify: Add to chat-thread.tsx

Integration:
- Modify use-chat-engine.ts to detect requires_approval
- Show ApprovalCard when task needs approval
- Poll work queue status in chat
```

#### Data Collection
- Response time: task created → user sees it
- Approval friction: # clicks to approve
- Chat vs /autonomy page usage split

---

### 1.2 Gate Auto-Unlock System
**Priority:** P0 | **Effort:** 1 week | **Owner:** Backend

#### Features
- [ ] Cron job: evaluate gate thresholds daily
- [ ] Automatic gate unlock when criteria met
- [ ] Email/notification when gate unlocks
- [ ] Manual override with reason logging

#### Technical Tasks
```
New API:
POST /api/adzeta/autonomy/evaluate-gates
  - Runs daily via Vercel cron
  - For each gate:
    - Calculate runs_count, success_rate, avg_confidence
    - If all thresholds met AND gate.locked == false
      - UPDATE gate SET status = 'unlocked', unlocked_at = NOW()
      - Notify user via notification

app/api/cron/daily-gate-eval/route.ts
lib/autonomy/gate-evaluator.ts
```

#### Data Collection
- Gate unlock events (timestamp, triggered metrics)
- Manual lock/unlock actions with reasons
- Time-to-unlock per gate milestone

---

### 1.3 Data Pipeline & Event Tracking
**Priority:** P0 | **Effort:** 2 weeks | **Owner:** Backend

#### Features
- [ ] Event stream for all user actions
- [ ] Analytics pipeline to Supabase
- [ ] Dashboard for admin visibility
- [ ] Export capabilities for analysis

#### Technical Tasks
```
Database:
- events table (user_id, event_type, metadata, timestamp)
- event_types: task_created, task_approved, task_rejected, 
               suggestion_accepted, gate_unlocked, etc.

Code:
- lib/analytics/track.ts     ← Wrapper for all events
- Instrument all API routes
- Daily rollup to metrics tables

Dashboard:
/app/admin/events-dashboard
- Real-time event stream
- Filterable by user, event type, date range
```

#### Data Collection
**Primary Metrics (to track success):**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Task approval rate | >80% | approved / (approved + rejected) |
| Time to approve | <2 min | created_at → approved_at |
| Auto-execution rate | >30% | auto_executed / total |
| Suggestion acceptance | >40% | accepted / (accepted + dismissed) |
| Gate unlock velocity | 1 gate/month | gates going unlocked |
| User confidence | >4.2/5 | average rating across tasks |

---

### 1.4 Testing Infrastructure
**Priority:** P1 | **Effort:** 1 week | **Owner:** QA

#### Features
- [ ] Fix existing test imports (vitest)
- [ ] E2E tests for core flows
- [ ] Visual regression tests
- [ ] Load testing for API endpoints

#### Technical Tasks
```
Tests to fix:
- tests/autonomy-flow.test.ts
- tests/email-processor.test.ts
- tests/email-queue-integration.test.ts

New tests:
- tests/e2e/work-queue.spec.ts
- tests/e2e/gate-unlock.spec.ts
- tests/e2e/suggestions.spec.ts
```

---

## Phase 2: Intelligence & Feedback Loop
**Timeline:** May 2026 - Jun 2026  
**Autonomy Level:** Semi-Assisted (Gates 1-2 unlocked: Research + Analytics auto-execute)

### 2.1 Proactive Intelligence Engine
**Priority:** P0 | **Effort:** 3 weeks | **Owner:** AI/Backend

#### Features
- [ ] Metric anomaly detection (statistical thresholds)
- [ ] Opportunity detection (pattern matching)
- [ ] Trend change alerts (time-series analysis)
- [ ] Idle prompts (user behavior triggers)

#### Technical Tasks
```
lib/intelligence/
├── anomaly-detector.ts       ← Z-score + threshold alerts
├── opportunity-scanner.ts    ← Pattern matching on data
├── trend-analyzer.ts         ← Moving averages, change detection
└── idle-detector.ts          ← Last activity + context

Cron jobs:
- /api/cron/hourly-intelligence-scan
  - Query metrics for last hour
  - Detect anomalies
  - Generate suggestions if threshold breached

Scheduled:
- Daily opportunity scan
- Weekly trend reports
- Idle prompts after 24h inactivity
```

#### Data Collection
- Anomaly detection accuracy (true positives vs false positives)
- Suggestion relevance (acceptance rate by trigger type)
- Time saved by proactive vs reactive
- User engagement with suggestions

---

### 2.2 Confidence Calibration System
**Priority:** P0 | **Effort:** 2 weeks | **Owner:** AI/Data

#### Problem
Currently, agent confidence is self-reported. We need to calibrate against actual outcomes.

#### Features
- [ ] Confidence → Outcome tracking
- [ ] Calibration curve (predicted vs actual)
- [ ] Auto-adjust confidence thresholds
- [ ] Confidence explanation (why 0.85?)

#### Technical Tasks
```
Database:
ALTER TABLE adzeta_agent_metrics ADD COLUMN
  confidence_calibration JSONB;  -- { bucket: "0.8-0.9", predicted: 0.85, actual: 0.92 }

lib/ai/
├── confidence-calibrator.ts
│   - After task completion: compare predicted_confidence vs outcome
│   - Build calibration curve per task_type
│   - Suggest threshold adjustments
│
└── explain-confidence.ts
    - Why is confidence 0.85?
    - "Similar tasks: 12/15 successful (80%)"
    - "Data quality: High (all fields present)"

UI:
- Hover tooltip on confidence badge showing explanation
```

#### Data Collection
- Confidence calibration curve by task type
- Overconfidence/underconfidence patterns
- Threshold adjustment history and impact

---

### 2.3 Learning from Feedback
**Priority:** P0 | **Effort:** 2 weeks | **Owner:** AI

#### Features
- [ ] Feedback → Prompt improvement pipeline
- [ ] Error pattern recognition
- [ ] Success pattern extraction
- [ ] Automatic prompt versioning

#### Technical Tasks
```
lib/ai/learning/
├── feedback-analyzer.ts
│   - Cluster feedback by task_type + outcome
│   - Extract patterns: "When X, users rate 2 stars"
│   - Generate prompt improvement suggestions
│
├── prompt-versioner.ts
│   - Store prompt versions
│   - A/B test prompt variations
│   - Rollback if quality drops
│
└── success-pattern-miner.ts
    - High-rated tasks → What did they have in common?
    - Extract "positive indicators"
    - Incorporate into future prompts

app/api/cron/weekly-prompt-review/route.ts
  - Analyze last week's feedback
  - Suggest prompt improvements
  - Create PR with changes
```

#### Data Collection
- Feedback sentiment analysis
- Error pattern frequency
- Prompt version performance comparison
- Learning velocity (improvements per week)

---

### 2.4 Multi-Agent Orchestration
**Priority:** P1 | **Effort:** 3 weeks | **Owner:** AI/Backend

#### Features
- [ ] Sub-agent spawner for complex tasks
- [ ] Task decomposition: parent → sub-tasks
- [ ] Parallel execution where possible
- [ ] Result aggregation

#### Technical Tasks
```
Database:
- adzeta_work_queue ADD COLUMN parent_task_id
- New table: adzeta_subtasks

lib/orchestration/
├── task-decomposer.ts
│   - Complex task → Break into subtasks
│   - Assign to specialized agents
│
├── subtask-spawner.ts
│   - Spawn Claude Code for build tasks
│   - Spawn research agents for data gathering
│   - Track completion
│
└── result-aggregator.ts
    - Collect subtask results
    - Synthesize into unified response
    - Report back to parent task

Flow:
User: "Build me a competitor analysis"
Agent:
  1. Decompose: [research competitors, analyze pricing, build report]
  2. Spawn 3 parallel sub-agents
  3. Aggregate results
  4. Present unified analysis
```

#### Data Collection
- Decomposition success rate
- Subtask completion time
- Aggregation quality (user ratings)

---

## Phase 3: Marketing & Sales Infrastructure
**Timeline:** Jun 2026 - Jul 2026  
**Goal:** Product-market fit validation, first paying customers

### 3.1 Landing Page & Marketing Site
**Priority:** P0 | **Effort:** 2 weeks | **Owner:** Frontend/Design

#### Features
- [ ] Public landing page (/)
- [ ] Feature explainer sections
- [ ] Interactive demo (read-only)
- [ ] Pricing page
- [ ] Blog for SEO
- [ ] Case studies

#### Technical Tasks
```
app/
├── (marketing)/
│   ├── page.tsx              ← Landing
│   ├── features/page.tsx
│   ├── pricing/page.tsx
│   ├── demo/page.tsx         ← Interactive demo
│   └── blog/
│
└── layout-marketing.tsx      ← Different nav, no auth required

Components:
- Hero with CTA
- Feature grid (animated)
- Live demo (mock data)
- Testimonials section
- Pricing cards
- FAQ accordion
```

---

### 3.2 Self-Service Onboarding
**Priority:** P0 | **Effort:** 2 weeks | **Owner:** Frontend/Backend

#### Features
- [ ] Sign-up flow with email verification
- [ ] Team invitation system
- [ ] Role-based access (admin, operator, viewer)
- [ ] Setup wizard (connect data sources)
- [ ] Interactive tutorial

#### Technical Tasks
```
Auth:
- Supabase Auth integration (already there)
- Email templates (Postmark/SendGrid)

Onboarding:
app/
├── onboarding/
│   ├── [step]/page.tsx       ← Step 1, 2, 3
│   └── layout.tsx
│
├── invite/
│   └── [token]/page.tsx      ← Accept invitation

Setup wizard:
- Step 1: Connect Apollo (API key)
- Step 2: Connect Supabase (env vars)
- Step 3: Configure Slack/Email notifications
- Step 4: Team invites
- Step 5: First task (guided)

Tutorial:
- react-joyride or custom
- Highlight: "Try asking for competitor research"
- Walk through approval flow
```

#### Integrations
| Service | Purpose |
|---------|---------|
| Postmark/SendGrid | Transactional emails |
| Apollo.io | Data enrichment (already integrated) |
| Slack | Notifications, approvals |
| Vercel | Deployment |
| Supabase | Database, auth |

---

### 3.3 Multi-Channel Notifications
**Priority:** P1 | **Effort:** 1 week | **Owner:** Backend

#### Channels
- [ ] Email notifications (approvals needed, gate unlocked)
- [ ] Slack integration (approval buttons)
- [ ] Web push notifications
- [ ] SMS for urgent alerts

#### Technical Tasks
```
lib/notifications/
├── email.ts                  ← Postmark adapter
├── slack.ts                  ← Webhook-based
├── push.ts                   ← Web Push API
└── preference-manager.ts     ← User channel preferences

Notifications sent:
- TASK_AWAITING_APPROVAL: email + Slack + push
- GATE_UNLOCKED: email
- PROACTIVE_SUGGESTION: Slack (if urgent)
- DAILY_DIGEST: email
```

---

### 3.4 Analytics for Growth
**Priority:** P1 | **Effort:** 1 week | **Owner:** Data

#### Features
- [ ] Sign-up funnel tracking
- [ ] Activation metrics (Aha moment)
- [ ] Retention cohorts
- [ ] Feature usage analytics
- [ ] Revenue tracking (when we add pricing)

#### Technical Tasks
```
Integrations:
- PostHog or Mixpanel for product analytics
- Stripe for revenue tracking

Events to track:
- Signed up
- Completed onboarding
- First task approved
- First gate unlocked
- Invited team member
- Upgraded (when pricing)

Dashboards:
- /admin/growth-dashboard
  - Sign-ups by day
  - Activation rate
  - Retention (D1, D7, D30)
  - Feature adoption
```

---

## Phase 4: Semi-Autonomy
**Timeline:** Aug 2026 - Sep 2026  
**Autonomy Level:** Semi-Autonomous (Gates 1-3 unlocked, recommendations auto-execute)

### 4.1 Confidence-Based Auto-Execution
**Priority:** P0 | **Effort:** 1 week | **Owner:** Backend

#### Current
- Gate unlocked + confidence >= threshold = auto-execute (already works)

#### Enhancement
- [ ] Dynamic thresholds based on historical accuracy
- [ ] Risk-adjusted confidence (high value = higher threshold)
- [ ] Manual override with one click

---

### 4.2 Proactive Work Generation
**Priority:** P0 | **Effort:** 2 weeks | **Owner:** AI

#### Features
- [ ] Agent suggests work based on goals
- [ ] Campaign optimization recommendations
- [ ] Budget reallocation suggestions
- [ ] Timing optimization (when to send outreach)

#### Example
```
Agent observes: "Email open rates drop 20% on Fridays"
Suggestion: "Shift Friday campaigns to Tuesday?"
[Accept] [Modify] [Dismiss]

If accepted → Auto-creates task → Auto-executes
If rejected → Logs reasoning → Adjusts model
```

---

### 4.3 Multi-Tenant & Scale
**Priority:** P1 | **Effort:** 3 weeks | **Owner:** Backend

#### Features
- [ ] Organization isolation
- [ ] Per-org autonomy gates
- [ ] Resource limits (usage-based)
- [ ] Performance optimization

---

## Phase 5: Full Autonomy
**Timeline:** Oct 2026+  
**Autonomy Level:** Autonomous (Gate 4 unlocked, agent acts independently within bounds)

### 5.1 Autonomous Decision-Making
**Priority:** P0 | **Effort:** Ongoing | **Owner:** AI

#### Features
- [ ] Agent can execute actions without approval (within budget)
- [ ] Agent can adjust campaigns based on real-time data
- [ ] Agent reports on actions taken (transparency)
- [ ] Human escalation for edge cases

#### Safeguards
- Budget limits per day/week
- Blocklist (never do X without approval)
- Rollback capability
- Full audit trail

---

### 5.2 Continuous Improvement Engine
**Priority:** P0 | **Effort:** Ongoing | **Owner:** AI

#### Features
- [ ] Self-monitoring (agent tracks its own performance)
- [ ] Auto-prompt optimization
- [ ] New pattern discovery
- [ ] A/B testing of strategies

---

## Data Collection Framework

### Event Schema
```typescript
interface Event {
  id: string;
  timestamp: string;
  user_id: string;
  organization_id: string;
  session_id: string;
  
  event_type: 
    | 'task_created' | 'task_approved' | 'task_rejected' 
    | 'task_modified' | 'task_completed' | 'task_failed'
    | 'suggestion_shown' | 'suggestion_accepted' | 'suggestion_dismissed'
    | 'gate_unlocked' | 'gate_locked'
    | 'feedback_submitted'
    | 'page_viewed' | 'feature_used'
    ;
  
  metadata: {
    task_type?: string;
    confidence_score?: number;
    risk_level?: string;
    approval_state?: string;
    duration_ms?: number;
    [key: string]: unknown;
  };
}
```

### Success Metrics Dashboard
```
┌─────────────────────────────────────────────────────────────┐
│ AUTONOMY PROGRESS                                           │
├─────────────────────────────────────────────────────────────┤
│ Gate 4 Unlocked?  [░░░░░░░░] 0% (Locked)                   │
│                                                             │
│ Gate 1: ████████████ 100% (Unlocked) - Research            │
│ Gate 2: ████████░░░░ 65% (Approaching) - Analytics         │
│ Gate 3: ████░░░░░░░░ 35% (In Progress) - Recommendations   │
│                                                             │
│ QUALITY METRICS                                             │
├─────────────────────────────────────────────────────────────┤
│ Task Approval Rate:     87%  Target: >80% ✅               │
│ Time to Approve:        1.4m  Target: <2m ✅                │
│ Auto-Execution Rate:    42%  Target: >30% ✅               │
│ Suggestion Acceptance:    38%  Target: >40% ⚠️               │
│ Avg User Rating:        4.3/5 Target: >4.2 ✅                │
│                                                             │
│ GROWTH METRICS                                              │
├─────────────────────────────────────────────────────────────┤
│ Weekly Active Users:      12                               │
│ Tasks Completed/Week:     45   (↑ 15% vs last week)        │
│ Activation Rate:          68%  Target: >50% ✅               │
│ D7 Retention:           45%  Target: >40% ✅               │
└─────────────────────────────────────────────────────────────┘
```

---

## Channel Strategy

### Marketing Channels
| Channel | Purpose | Phase |
|---------|---------|-------|
| **SEO Blog** | Organic acquisition | Phase 3 |
| **LinkedIn** | B2B thought leadership | Phase 3 |
| **Product Hunt** | Launch visibility | Phase 4 |
| **Twitter/X** | Community building | Phase 3 |
| **Email Newsletter** | Nurture leads | Phase 3 |
| **Paid Ads (LinkedIn)** | Scale acquisition | Phase 4 |
| **Webinars** | Education, demos | Phase 4 |
| **Partnerships** | Integrations (Apollo, etc.) | Phase 4 |

### Sales Channels
| Channel | Purpose | Phase |
|---------|---------|-------|
| **Self-Service** | <$500 MRR customers | Phase 3 |
| **Inside Sales** | $500-$5k MRR | Phase 4 |
| **Enterprise Sales** | >$5k MRR | Phase 5 |
| **Partner/Reseller** | Scale | Phase 5 |

### Communication Channels
| Channel | Use Case |
|---------|----------|
| **In-App** | Notifications, approvals, suggestions |
| **Email** | Daily digests, approvals, gate unlocks |
| **Slack** | Real-time approvals, urgent alerts |
| **SMS** | Critical alerts only |
| **Calendar** | Meeting suggestions, reminders |

---

## Integration Requirements

### Core Integrations (Must Have)
| Service | Status | Purpose | Phase |
|---------|--------|---------|-------|
| **Supabase** | ✅ Live | Database, Auth | Complete |
| **Vercel** | ✅ Live | Hosting | Complete |
| **Apollo.io** | ✅ Integrated | Prospecting data | Complete |
| **OpenAI** | ✅ Live | AI responses | Complete |

### Marketing/Sales Integrations (Need)
| Service | Purpose | Phase |
|---------|---------|-------|
| **Postmark/SendGrid** | Transactional email | Phase 3 |
| **Slack** | Notifications, approvals | Phase 3 |
| **Stripe** | Billing, subscriptions | Phase 3 |
| **PostHog/Mixpanel** | Product analytics | Phase 3 |
| **HubSpot/Salesforce** | CRM sync | Phase 4 |
| **LinkedIn API** | Social selling | Phase 4 |
| **Google Calendar** | Meeting scheduling | Phase 4 |
| **Zoom** | Meeting automation | Phase 4 |

### Data Enrichment (Nice to Have)
| Service | Purpose | Phase |
|---------|---------|-------|
| **Clearbit** | Company enrichment | Phase 4 |
| **ZoomInfo** | Contact enrichment | Phase 4 |
| **Crunchbase** | Funding data | Phase 4 |
| **BuiltWith** | Tech stack | Phase 4 |

---

## Current Priorities (Next 2 Weeks)

### Immediate Actions (Week of Mar 3)
1. **Fix test file imports** (blocking CI)
2. **Add gate auto-eval cron** (enables autonomous unlocks)
3. **Wire approval cards to chat** (reduces friction)
4. **Add proactive intelligence cron** (generates first suggestions)

### Week of Mar 10
5. **Confidence calibration** (improves gate accuracy)
6. **Feedback → learning pipeline** (closes the loop)
7. **Landing page MVP** (starts marketing)
8. **Self-service onboarding draft** (scalability)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Gate unlock too slow** | Medium | High | Lower thresholds, manual override |
| **Suggestion quality low** | Medium | Medium | Start conservative, tune based on data |
| **User doesn't trust autonomy** | High | High | Transparency, rollback, gradual roll-out |
| **API rate limits** | Low | Medium | Caching, batching, fallback |
| **Data quality issues** | Medium | High | Validation, alerts, manual review |
| **Team bandwidth** | High | High | Prioritize ruthlessly, delay non-core |

---

## Success Criteria by Phase

### Phase 1 Success
- Gate 1 reaches 10 runs with >90% success rate → Unlocks
- Chat approval friction <3 clicks average
- Test suite passes, >70% coverage

### Phase 2 Success
- Proactive suggestions >30% acceptance rate
- Confidence calibration within 10% of actual
- 2 sub-agents successfully spawn and complete tasks

### Phase 3 Success
- First 10 paying customers
- Activation rate >50%
- Net Promoter Score >40

### Phase 4 Success
- Gates 1-3 unlocked for majority of users
- 50% of analytics tasks auto-execute
- $10k MRR

### Phase 5 Success
- Gate 4 unlocked
- Agent operates autonomously for 80% of tasks
- $50k MRR, 100+ customers

---

## Appendix: Feature Backlog

### P1 (After Phase 1)
- [ ] Mobile app (React Native)
- [ ] Voice input (Whisper API)
- [ ] Advanced scheduling (cron-like)
- [ ] Template library
- [ ] Team collaboration features
- [ ] Advanced permissions
- [ ] Custom integrations

### P2 (After Phase 2)
- [ ] GPT-5 integration (when available)
- [ ] Multi-language support
- [ ] White-label option
- [ ] API for external developers
- [ ] Marketplace for agents

### P3 (After Phase 3)
- [ ] AI phone calls
- [ ] Video generation
- [ ] Physical mail automation
- [ ] International expansion

---

**Next Review:** Weekly, Mondays  
**Document Owner:** @alaric  
**Stakeholders:** Engineering, Product, Design, Marketing

---

*This is a living document. Update as priorities shift and new learnings emerge.*
