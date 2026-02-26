# AdZeta GTM Agent Framework
## Autonomous Go-to-Market Operating System

---

## 1. Agent Identity & Persona

### Name
**adzeta-gtm** (Internal identifier: `gtm`)

### Role
Chief GTM Orchestrator — an autonomous agent that plans, executes, and optimizes all go-to-market activities through delegation to specialized sub-agents.

### Personality
- **Strategic**: Thinks in systems, not tasks
- **Adaptive**: Learns from outcomes, adjusts approach
- **Collaborative**: Works with the user, not for the user
- **Autonomous**: Seeks permission for high-cost, acts for low-cost
- **Self-Aware**: Knows its limits, delegates appropriately

### Core Loop
```
INTAKE → CONTEXT → STRATEGIZE → DELEGATE → SYNTHESIZE → LEARN
  │         │          │          │           │          │
  ▼         ▼          ▼          ▼           ▼          ▼
Command  User/Ideal   Plans      Sends to   Combines   Updates
Query    Customer     approach   specialist results    beliefs
         Profile                 agents      & next    about what
                                 (parallel)  steps      works
```

---

## 2. Skill Taxonomy & Specialization Tree

```
adzeta-gtm (Orchestrator)
│
├── Research & Intelligence
│   ├── icp-analyst          # Ideal Customer Profile refinement
│   ├── market-researcher    # Market sizing, trends, competitive intel
│   ├── prospect-researcher  # Company/contact research via Apollo
│   └── signal-scout         # Hiring signals, funding news, tech stack
│
├── Campaign & Outreach
│   ├── campaign-strategist  # Multi-channel campaign design
│   ├── sequence-architect   # Email/LinkedIn sequence building
│   ├── ab-test-designer     # Experiment design & statistical rigor
│   ├── copywriter           # Message variant generation
│   └── deliverability-guard # Email health & spam score monitoring
│
├── Analytics & Optimization
│   ├── performance-analyst  # Metrics interpretation & insights
│   ├── forecasting-model    # Pipeline projections & scenario planning
│   ├── anomaly-detector     # Alert on unusual patterns
│   └── attribution-scientist # Multi-touch attribution analysis
│
├── Operations & Execution
│   ├── workflow-engineer    # Queue management & job orchestration
│   ├── calendar-coordinator # Meeting scheduling automation
│   ├── crm-sync             # Data hygiene & sync management
│   └── compliance-guard     # GDPR, CAN-SPAM, legal constraints
│
└── Personalization & Intelligence
    ├── message-personalizer # Dynamic content per prospect
    ├── sentiment-reader     # Reply tone analysis
    ├── objection-handler    # Common objection responses
    └── escalation-manager   # When to loop in human SDR
```

Each specialization is a **sub-agent skill** with:
- Specific LLM configuration (temperature, context window)
- Defined tool access (Apollo, SendGrid, etc.)
- Isolated memory scope
- Success metrics

---

## 3. Delegation Protocol

### Decision Matrix

| Situation | Action | Example |
|-----------|--------|---------|
| Single-task, high-confidence | Delegate to specialist | "Research GitHub" → prospect-researcher |
| Multi-step workflow | Spawn workflow with dependencies | "Campaign for Series B fintechs" → 4 parallel specialist tasks |
| Novel/unclear | Ask clarifying questions | "Do something cool" → "What outcome are we optimizing for?" |
| Requires user judgment | Propose options, await confirmation | "Should we A/B test 3 variants or 2?" |
| External cost > $0.10 | Seek approval | "Apollo enrichment costs $0.05/contact, proceed with 100?" |
| External action (email send) | Queue for review or auto-send based on confidence | "Schedule 47 emails tonight" → review if list size > 50 |
| Error rate > 10% | Escalate to user | "5/50 emails bounced, pause and review?" |

### Workflow Parallelization

```typescript
// When user asks: "Create outbound campaign for new ICP"

const workflow = await adzetaGtm.planWorkflow({
  intent: "create_campaign",
  input: { icpDescription: "Series B fintech CMOs" },
  parallel: [
    { skill: "icp-analyst", task: "validate_and_enrich_icp" },
    { skill: "prospect-researcher", task: "build_target_list", dependsOn: "icp-analyst" },
    { skill: "campaign-strategist", task: "design_messaging_angles", dependsOn: "icp-analyst" },
    { skill: "sequence-architect", task: "build_sequence_steps", dependsOn: ["campaign-strategist", "prospect-researcher"] },
    { skill: "ab-test-designer", task: "create_variant_matrix", dependsOn: "campaign-strategist" }
  ],
  merge: "synthesize_campaign_package"
});

// Returns → Human-readable plan, estimated cost, ETA
// User: "Proceed" or "Change X constraint"
```

---

## 4. Tool Access Matrix

| Tool | Access Level | Conditions |
|------|--------------|------------|
| **Apollo.io** | Full | Research only, manual approval for enrichment at scale |
| **SendGrid** | Queue-only | Drafts ready, human review before send |
| **Supabase** | Read-write | All GTM data, audit trail |
| **Calendar (Google)** | Read, request-write | Meeting booking with availability check |
| **LinkedIn API** | Limited (if available) | Connection requests, message sending |
| **OpenClaw Gateway** | Self-invoke | Sub-agent spawning, tool invocation |
| **Web Search** | Full | Research, competitive intel |
| **GitHub** | Read | Forge integration, docs access |

---

## 5. Guardrails & Safety

### Operational Guardrails

```typescript
const GUARDRAILS = {
  // Send volume limits
  maxDailySendsPerUser: 100,
  maxDailySendsPerCampaign: 500,
  
  // Rate limiting
  minDelayBetweenSends: "2m",      // 2 minutes
  maxParallelOutbound: 10,
  
  // Quality gates
  minListQualityScore: 0.7,        // Don't send to D/F prospects
  maxBounceRateBeforePause: 0.05,  // 5%
  maxSpamRateBeforePause: 0.001,   // 0.1%
  
  // Cost approval thresholds (per action)
  autoApproveUnder: 0.10,          // $0.10
  notifyOnCost: 0.50,              // $0.50
  requireApprovalOver: 1.00,       // $1.00
  
  // Escalation triggers
  pauseOnErrorRate: 0.10,          // 10% failure
  escalateOnAnomaly: true,          // Unusual patterns
  
  // Time windows
  respectDoNotDisturb: true,        // No sends 22:00-07:00
  respectTimezone: true             // Send in prospect's TZ
};
```

### Learning Guardrails

- **Conservative by default**: New strategies tested at 10% traffic
- **Rollback**: Revert to prior strategy if metrics degrade
- **Human review**: All learnings summarized for user approval
- **Explanation**: Agent must explain why it made a change

---

## 6. Memory Architecture

### Ephemeral Context (Session)
- Current conversation thread
- User intent stack
- Pending delegations

### Persistent Memory (Per-User)
```typescript
interface AgentMemory {
  // ICP evolution
  icpSnapshots: Array<{ criteria: ICP, results: Score, date: Date }>;
  
  // What worked for this user
  successfulAngles: Array<{ angle: string, responseRate: number }>;
  avoidedAngles: Array<{ angle: string, negativeSignal: string }>;
  
  // User preferences
  riskTolerance: "conservative" | "balanced" | "aggressive";
  preferredIndustries: string[];
  avoidIndustries: string[];
  brandVoice: string;
  
  // Performance history
  predictionAccuracy: number;  // How often agent's forecasts were right
  delegationSatisfaction: number;  // User approval of delegated work
  
  // Autonomy level
  currentAutonomy: "supervised" | "assisted" | "autonomous";
  autonomyEarned: boolean;  // Gained via consistently good decisions
}
```

### Global Memory (All Users, Anonymized)
- Industry benchmarks
- Template effectiveness scores
- Strategy success rates

---

## 7. Autonomy Progression

### Phase 1: Supervised (Current)
- Agent proposes, user approves
- Every external action requires confirmation
- Maximum transparency, minimum risk

### Phase 2: Assisted (Target: Week 4)
- Agent executes low-cost actions automatically
- Proposes high-cost actions with context
- User can intervene retroactively

### Phase 3: Autonomous (Target: Week 12)
- Agent manages campaigns end-to-end
- User only sees summaries and exceptions
- Full delegation of routing tasks

### Phase 4: Predictive (Target: Month 6)
- Agent identifies opportunities before user asks
- Proactive suggestions: "ICP shifted, update campaign?"
- Self-optimizing workflows

---

## 8. Command Interface

### Core Commands

```
"Research [target]" 
→ Delegates to: prospect-researcher, signal-scout
→ Returns: Prospect cards with enrichment

"Create campaign for [list]"
→ Delegates to: icp-analyst, campaign-strategist, sequence-architect, ab-test-designer
→ Returns: Campaign preview with estimated performance

"Optimize [campaign]"
→ Analyzes: performance-analyst
→ Actions: ab-test-designer (new variants), sequence-architect (step adjustments)
→ Returns: Optimizations applied + projected lift

"Forecast [scenario]"
→ Delegates to: forecasting-model
→ Returns: 3 scenarios (conservative, expected, optimistic)

"What's working?"
→ Analyzes: performance across all active campaigns
→ Returns: Top 3 insights + recommendations

"Learn from [campaign]"
→ Analyzes: attribution-scientist, performance-analyst
→ Returns: Lessons learned, updates ICP/angles for next campaign
```

---

## 9. Implementation Plan

### Week 1: Foundation
- [ ] Define all specialist skills
- [ ] Create skill registration system
- [ ] Build delegation router
- [ ] Implement basic guardrails

### Week 2: Core Specialists
- [ ] prospect-researcher (Apollo integration)
- [ ] campaign-strategist (messaging angles)
- [ ] sequence-architect (touch sequences)
- [ ] Basic workflow orchestration

### Week 3: Optimization Loop
- [ ] performance-analyst (metrics interpretation)
- [ ] ab-test-designer (statistical rigor)
- [ ] Learning from outcomes
- [ ] Memory persistence

### Week 4: Assistant Mode
- [ ] Proactive suggestions
- [ ] Low-cost auto-execution
- [ ] User preference learning
- [ ] Autonomy elevation criteria

### Week 5+: Scale & Refine
- [ ] Additional specialists (forecasting, personalization)
- [ ] Multi-user coordination
- [ ] Predictive capabilities
- [ ] Self-improvement loops

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Delegation accuracy | >90% | User approval rate of agent decisions |
| Time-to-insight | <30s | Research-to-action latency |
| Campaign setup time | <5 min | User effort to launch campaign |
| Reply rate lift | +20% | Vs. non-agent-optimized campaigns |
| Prediction accuracy | >80% | Forecast vs. actual performance |
| User autonomy trust | >50% | % of actions auto-approved vs. manual |

---

**Ready to implement the skill registration system and first specialist agents?**
