# AdZeta GTM Operating System — Complete Agent Team Architecture

## Executive Summary
A 25-agent federated system covering the full GTM spectrum from research to revenue operations.

---

## TIER 1: ORCHESTRATION LAYER (1 Agent)

### adzeta-gtm (Chief Orchestrator)
```yaml
role: Command & Control
responsibilities:
  - Intent parsing & classification
  - Workflow planning & sequencing
  - Resource allocation
  - Quality assurance
  - User preference learning
  - Autonomy escalation decisions
tools:
  - All specialist agents
  - Workflow engine
  - User memory store
  - Performance dashboards
autonomy_level: adaptive
triggers_escalation:
  - Cost > $1.00
  - Error rate > 10%
  - Novel/ambiguous request
  - User preference violation
```

---

## TIER 2: RESEARCH & INTELLIGENCE DIVISION (5 Agents)

### 1. icp-architect
```yaml
role: Ideal Customer Profile Expert
skills:
  - ICP definition refinement
  - Firmographic criteria design
  - Psychographic segmentation
  - Lookalike modeling
  - ICP validation scoring
  - Segment performance analysis
inputs:
  - Current customer data
  - Closed-lost analysis
  - Market positioning
  - User description of target
outputs:
  - Validated ICP definition
  - Scoring rubric
  - Enrichment requirements
  - Recommended prospecting filters
tools:
  - Supabase (customer data)
  - Apollo (prospect validation)
  - Web search (market context)
autonomy:
  can_auto_execute: true
  requires_approval_when: changing existing ICP used by active campaigns
```

### 2. prospect-researcher
```yaml
role: Lead Generation Specialist
skills:
  - Multi-source prospect discovery
  - Enrichment via Apollo + Clearbit + social
  - Duplicate detection & merging
  - Quality scoring (A-F)
  - Contact verification
  - Account mapping
inputs:
  - ICP criteria
  - Target account list (optional)
  - Exclusion lists
outputs:
  - Enriched prospect records
  - Quality scores
  - Research notes
  - Confidence intervals
tools:
  - Apollo.io MCP
  - Clearbit API
  - LinkedIn scraper
  - Company websites
  - GitHub API (for tech signals)
rate_limits:
  apollo_enrichment: 100/hour
  web_scraping: 10/minute
autonomy: high
```

### 3. signal-scout
```yaml
role: Buying Signal Monitor
skills:
  - Hiring signal detection (LinkedIn, job boards)
  - Funding news monitoring (Crunchbase, PitchBook)
  - Tech stack change detection (BuiltWith, GitHub)
  - Leadership change alerts
  - Conference attendance tracking
  - Intent data analysis (G2, Capterra)
inputs:
  - Target account list
  - Signal categories of interest
outputs:
  - Timely signal alerts
  - Signal strength scoring
  - Recommended action
  - Timing recommendations
tools:
  - Crunchbase API
  - LinkedIn Sales Navigator
  - BuiltWith API
  - G2 Intent API
  - Job board scrapers
notification_channels:
  - Real-time to orchestrator
  - Daily digest option
  - Alert on threshold (funding > $5M, etc.)
```

### 4. market-intelligence
```yaml
role: Market Landscape Analyzer
skills:
  - Market sizing (TAM/SAM/SOM)
  - Competitive intelligence
  - Pricing research
  - Trend analysis
  - Regulatory monitoring
  - Partnership opportunity scanning
inputs:
  - Industry/category
  - Competitor list
  - Geographic scope
outputs:
  - Market landscape report
  - Competitive battle cards
  - Pricing benchmarks
  - Opportunity heat map
  - Quarterly trend briefs
tools:
  - Web search
  - Industry reports
  - SEC filings
  - Job postings (tech stack trends)
  - Conference agendas
frequency:
  ad_hoc: on request
  continuous: quarterly reports
```

### 5. data-synthesizer
```yaml
role: Multi-Source Data Integrator
skills:
  - Cross-reference validation
  - Conflict resolution
  - Deduplication at scale
  - Data freshness prioritization
  - Source credibility scoring
  - Gap analysis
inputs:
  - Data from multiple sources
  - Confidence thresholds
outputs:
  - Unified, validated dataset
  - Confidence scores per field
  - Source attribution
  - Data quality report
tools:
  - Fuzzy matching algorithms
  - ML-based deduplication
  - Source reliability database
```

---

## TIER 3: CAMPAIGN & OUTREACH DIVISION (7 Agents)

### 6. campaign-strategist
```yaml
role: Multi-Channel Campaign Designer
skills:
  - Channel selection (email, LinkedIn, phone, direct mail)
  - Touch sequencing logic
  - Timing optimization
  - Personalization strategy
  - Objection anticipation
  - Competitive differentiation
inputs:
  - ICP definition
  - Value proposition
  - Campaign goals (MQL, SQL, meeting)
  - Timeline constraints
outputs:
  - Campaign architecture
  - Channel mix recommendation
  - Sequencing blueprint
  - Personalization framework
  - Risk assessment
tools:
  - Historical performance data
  - Industry benchmarks
  - Competitor campaign analysis
```

### 7. sequence-architect
```yaml
role: Outreach Sequence Engineer
skills:
  - Step-by-step touch design
  - Wait condition logic (time, behavior, signals)
  - Branching logic (if/then scenarios)
  - Personalization variable injection
  - Template selection & adaptation
  - Cadence optimization
inputs:
  - Campaign strategy
  - Number of touches
  - Goal per touch
outputs:
  - Sequence definition (JSON)
  - Step dependencies
  - Personalization map
  - Expected timeline
tools:
  - Template library
  - A/B test framework
  - Engagement prediction models
```

### 8. ab-test-designer
```yaml
role: Experimentation Scientist
skills:
  - Hypothesis formulation
  - Variant generation
  - Sample size calculation
  - Statistical test selection
  - Duration estimation
  - Success metric definition
  - Early stopping rules
inputs:
  - Element to test (subject, body, CTA, timing)
  - Number of variants
  - Primary success metric
  - Minimum detectable effect
outputs:
  - Test protocol
  - Variant specs
  - Traffic allocation
  - Statistical power analysis
  - Significance threshold
tools:
  - Statistics engine
  - Traffic router
  - Significance calculator
```

### 9. copywriter
```yaml
role: Message Craft Specialist
skills:
  - Subject line generation
  - Email body composition
  - LinkedIn message writing
  - Personalization insertion
  - Tone calibration (formal, casual, playful)
  - CTA optimization
  - Spam trigger avoidance
inputs:
  - Campaign angle
  - Persona
  - Personalization data
  - Brand voice guidelines
outputs:
  - Multiple copy variants
  - Subject line options
  - Personalization snippets
  - Spam score
  - Readability metrics
tools:
  - Hemingway/reading level checker
  - SpamAssassin integration
  - Sentiment analysis
variants_per_request: 3-5
```

### 10. personalization-engine
```yaml
role: Dynamic Content Personalizer
skills:
  - Variable extraction from data
  - Conditional content blocks
  - Image personalization
  - Industry-appropriate phrasing
  - Tech stack reference insertion
  - Signal-aware messaging
inputs:
  - Base template
  - Prospect data
  - Collected signals
outputs:
  - Personalized message
  - Relevance score
  - Variable substitution map
  - Fallback content (if data missing)
tools:
  - Liquid template engine
  - Image generation API
  - Dynamic field substitution
```

### 11. deliverability-guard
```yaml
role: Email Health Monitor
skills:
  - Sender reputation monitoring
  - Inbox placement testing
  - Spam folder detection
  - Authentication monitoring (SPF/DKIM/DMARC)
  - List hygiene
  - Engagement scoring (positive/negative)
inputs:
  - Sending domain
  - Campaign stats
  - Bounce/complaint rates
outputs:
  - Reputation score
  - Placement predictions
  - Hygiene recommendations
  - Pause recommendations
tools:
  - GlockApps API
  - Mail-tester.com
  - Custom inbox monitors
thresholds:
  pause_sends_if:
    bounce_rate: "> 5%"
    spam_rate: "> 0.1%"
    open_rate_drop: "> 50% from baseline"
```

### 12. channel-coordinator
```yaml
role: Multi-Touch Orchestrator
skills:
  - Channel timing optimization
  - Response routing
  - LinkedIn/email/calendar coordination
  - Message thread continuity
  - Optimal channel selection per prospect
inputs:
  - Sequence steps
  - Prospect channel preferences
  - Response history
outputs:
  - Channel-optimized sequence
  - Fallback channel selection
  - Coordination timeline
tools:
  - LinkedIn API
  - Email delivery system
  - Calendar APIs
```

---

## TIER 4: ANALYTICS & OPTIMIZATION DIVISION (5 Agents)

### 13. performance-analyst
```yaml
role: Metrics Interpreter
skills:
  - KPI tracking (sent, opened, clicked, replied, booked)
  - Funnel analysis
  - Cohort analysis
  - Benchmark comparison
  - Anomaly detection
  - Root cause analysis
inputs:
  - Campaign data
  - Time range
  - Comparison baseline
outputs:
  - Performance report
  - Insights & observations
  - Trend identification
  - Recommendations
tools:
  - Supabase analytics
  - Visualization engine
  - Statistical analysis
reports:
  real_time: dashboard
  daily: campaign snapshot
  weekly: trend analysis
  monthly: deep analysis
```

### 14. forecasting-model
```yaml
role: Pipeline Predictor
skills:
  - Response rate prediction
  - Pipeline generation forecasting
  - Scenario modeling
  - Seasonal adjustment
  - ICP-specific predictions
  - Confidence intervals
inputs:
  - Historical campaign data
  - Planned campaigns
  - Market conditions
outputs:
  - 30/60/90-day projections
  - Scenario comparisons
  - Confidence intervals
  - Risk factors
tools:
  - Time-series models
  - Monte Carlo simulation
  - Machine learning models
models:
  short_term: 7-30 days
  medium_term: 1-3 months
  long_term: 3-6 months
```

### 15. attribution-scientist
```yaml
role: Multi-Touch Attribution Expert
skills:
  - Touchpoint tracking
  - Attribution model selection (first-touch, last-touch, linear, time-decay)
  - Influence scoring
  - Channel effectiveness analysis
  - Incrementality testing
inputs:
  - Sequence data
  - Conversion events
  - Contact history
outputs:
  - Attribution report
  - Channel ROI analysis
  - Sequence optimization suggestions
  - Influence scores
tools:
  - Tracking infrastructure
  - Statistical attribution models
supported_models:
  - first_touch
  - last_touch
  - linear
  - time_decay
  - position_based
```

### 16. cohort-analyst
```yaml
role: Segment Performance Deep-Diver
skills:
  - Cohort creation (by ICP, time, source, etc.)
  - Retention analysis
  - Behavior pattern identification
  - Segment comparison
  - Statistical significance testing
inputs:
  - Segment definitions
  - Success metrics
  - Time horizon
outputs:
  - Cohort performance matrix
  - Statistical comparisons
  - Actionable segment insights
tools:
  - Cohort analysis engine
  - Visualization tools
```

### 17. optimization-engine
```yaml
role: Continuous Improvement Driver
skills:
  - Performance gap identification
  - Automatic A/B test recommendations
  - Winning variant promotion
  - Strategy adjustment suggestions
  - Learning synthesis
inputs:
  - Campaign performance data
  - Test results
  - Historical learnings
outputs:
  - Optimization recommendations
  - Auto-generated tests
  - Strategy pivots
  - Learnings documentation
tools:
  - A/B test framework
  - Performance database
  - Recommendation engine
autonomy:
  can_auto_implement: minor_adjustments
  requires_approval: major_strategy_changes
```

---

## TIER 5: PERSONALIZATION & INTELLIGENCE DIVISION (4 Agents)

### 18. objection-handler
```yaml
role: Sales Resistance Navigator
skills:
  - Common objection identification
  - Response template matching
  - Context-aware objection handling
  - Competitive response generation
  - Conversation recovery
inputs:
  - Prospect objection text
  - Campaign context
  - Competitive landscape
outputs:
  - Recommended response
  - Alternative approaches
  - Escalation recommendation
  - Similar case studies
tools:
  - Objection library
  - Competitive response database
  - Response generator
objection_types:
  - timing
  - budget
  - authority
  - need
  - competition
  - features
priority: high_when: late_stage_prospect
```

### 19. sentiment-reader
```yaml
role: Reply Tone Analyzer
skills:
  - Email reply sentiment classification
  - Interest level scoring
  - Tone detection (excited, tentative, negative)
  - Intent extraction
  - Next action prediction
inputs:
  - Prospect reply text
  - Original message context
outputs:
  - Sentiment score (-1 to +1)
  - Interest level (hot, warm, cold)
  - Tone classification
  - Suggested next action
  - Urgency flag
tools:
  - NLP sentiment models
  - Intent classification
classification_categories:
  - interested_positive
  - interested_neutral
  - interested_tentative
  - not_interested_polite
  - not_interested_negative
  - out_of_office
  - referral
  - wrong_person
```

### 20. response-router
```yaml
role: Reply Triage Specialist
skills:
  - Autonomous reply handling (simple requests)
  - SDR handoff routing
  - Escalation to AE for high-value
  - Meeting booking automation
  - Information request fulfillment
inputs:
  - Prospect reply
  - Account value
  - Sentiment analysis
  - SDR availability
outputs:
  - Routing decision
  - Suggested response
  - Priority score
  - Next action schedule
tools:
  - Calendar availability
  - SDR queue
  - Email templates
  - Meeting booking system
routing_rules:
  auto_reply: ["meeting_confirmation", "basic_question", "acknowledgment"]
  route_to_sdr: ["interested", "demo_request", "pricing_inquiry"]
  escalate_to_ae: ["enterprise_inquiry", "procurement", "high_value"]
  no_action: ["unsubscribe", "bounce", "spam"]
```

### 21. meeting-booker
```yaml
role: Scheduler Automator
skills:
  - Calendly/Calendar API integration
  - Timezone handling
  - Buffer time management
  - Rescheduling management
  - No-show follow-up
  - Video conference link generation
inputs:
  - Prospect availability indication
  - SDR/AE availability
  - Meeting type (intro, demo, follow-up)
outputs:
  - Meeting scheduled
  - Calendar invites sent
  - Reminders set
  - Prep materials prepared
tools:
  - Google Calendar API
  - Zoom/Meet API
  - Calendly API
  - CRM logging
```

---

## TIER 6: OPERATIONS & INFRASTRUCTURE DIVISION (3 Agents)

### 22. workflow-engineer
```yaml
role: Job Orchestrator
skills:
  - Queue management
  - Job dependency resolution
  - Retry logic
  - Parallel processing
  - Resource allocation
  - Failure recovery
inputs:
  - Task definitions
  - Dependencies
  - Priority levels
  - Resource constraints
outputs:
  - Execution plan
  - Job scheduling
  - Progress monitoring
  - Failure alerts
tools:
  - BullMQ / job queue
  - Redis
  - Supabase
```

### 23. quality-assurance
```yaml
role: Output Validator
skills:
  - Message quality scoring
  - Data accuracy verification
  - Brand voice compliance
  - Legal/compliance checking
  - Hallucination detection
  - Bias detection
inputs:
  - Generated content
  - Quality criteria
outputs:
  - Quality score
  - Issues flagged
  - Correction suggestions
  - Approve/reject decision
tools:
  - Style guide checker
  - Compliance database
  - Fact-checking sources
thresholds:
  reject_if_score_below: 0.7
  flag_for_review_if_below: 0.85
```

### 24. data-guardian
```yaml
role: Privacy & Compliance Guardian
skills:
  - GDPR compliance checking
  - Unsubscribe management
  - Data retention enforcement
  - PII handling protocols
  - Consent tracking
  - Audit trail maintenance
inputs:
  - Data processing requests
  - Contact records
  - Jurisdiction info
outputs:
  - Compliance check results
  - Required actions
  - Audit reports
  - Risk flags
tools:
  - Consent database
  - Jurisdiction rules engine
  - Audit logging
compliance_frameworks:
  - GDPR
  - CAN-SPAM
  - CCPA
  - CASL
```

---

## AGENT INTERACTION PATTERNS

### Workflow Example: New Campaign Launch

```
User: "Create campaign targeting Series B fintech CMOs"
        │
        ▼
  ┌─────────────┐
  │ adzeta-gtm  │ ← Parse intent, plan workflow
  │ Orchestrator│
  └──────┬──────┘
         │ Parallel delegation
         ├────┬────┬────┬────┐
         ▼    ▼    ▼    ▼    ▼
    ┌────┐┌────┐┌────┐┌────┐┌────┐
    │icp-││pro-││cam-││mar-││seq-│
    │arch││spect││paign││ket  │uence│
    │itect││resea││-str ││int  ││-arch│
    └────┘│rcher││ategi││ellig││itect│
          └────┘│st   ││ence │└────┘
                └─────┘│└─────┘
                       ▼
                ┌──────────┐
                │synthesis │
                │results  │
                └────┬─────┘
                     │
                     ▼
              ┌──────────────┐
              │ adzeta-gtm   │ ← Present plan, get approval
              │ Approver     │
              └──────┬───────┘
                     │
              ┌──────┴──────┐
              │ User        │
              │ "Proceed"   │
              └──────┬──────┘
                     ▼
              ┌──────────────┐
              │ Execute      │
              │ Save to DB   │
              └──────────────┘
```

---

## IMPLEMENTATION PRIORITIES

### Phase 1: Foundation (Week 1-2)
- [ ] adzeta-gtm (orchestrator)
- [ ] icp-architect
- [ ] prospect-researcher
- [ ] campaign-strategist
- [ ] workflow-engineer

### Phase 2: Campaign Execution (Week 3-4)
- [ ] sequence-architect
- [ ] copywriter
- [ ] personalization-engine
- [ ] ab-test-designer

### Phase 3: Intelligence (Week 5-6)
- [ ] performance-analyst
- [ ] signal-scout
- [ ] sentiment-reader
- [ ] objection-handler

### Phase 4: Automation (Week 7-8)
- [ ] response-router
- [ ] meeting-booker
- [ ] optimization-engine
- [ ] data-guardian

### Phase 5: Advanced Features (Month 3+)
- [ ] forecasting-model
- [ ] attribution-scientist
- [ ] market-intelligence
- [ ] cohort-analyst
- [ ] deliverability-guard
- [ ] quality-assurance

---

## SUCCESS METRICS

| Agent | Primary Metric | Target |
|-------|----------------|--------|
| prospect-researcher | Prospect quality score | >0.75 |
| campaign-strategist | Reply rate vs benchmark | +15% |
| sequences | Time to 1st touch | < 2 hours |
| ab-test-designer | Statistically significant tests | >90% |
| copywriter | Spam score | <2/10 |
| sentiment-reader | Accuracy vs human | >85% |
| forecasting-model | Prediction accuracy | >80% |
| deliverability-guard | Inbox placement | >95% |

---

**Full architecture documentation complete. Beginning implementation of core infrastructure...**