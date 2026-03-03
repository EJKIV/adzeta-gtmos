# CLAUDE CODE: Frontend Implementation Guide
## AdZeta-GTM Autonomy System (Phase 1)

### Overview
Build the frontend for the AdZeta-GTM autonomy system. This system starts with approval-required workflows and gradually unlocks autonomous execution based on performance thresholds.

---

## Part 1: DATABASE SCHEMA (Apply First!)

**Migration file:** `supabase/migrations/20250302220253_adzeta_autonomy_system.sql`

**Tables created:**
1. `adzeta_work_queue` — Tasks awaiting approval or execution
2. `adzeta_autonomy_gates` — Thresholds for unlocking autonomy
3. `adzeta_user_feedback` — User feedback on tasks
4. `adzeta_agent_metrics` — Performance tracking
5. `adzeta_proactive_suggestions` — System-initiated suggestions
6. `adzeta_autonomy_config` — Configuration settings

**Apply to Supabase:**
```bash
supabase db push
# Or apply via Supabase Dashboard SQL Editor
```

**Verify creation:**
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'adzeta_%' 
ORDER BY tablename;
```

---

## Part 2: BACKEND API ROUTES (Already Complete)

**Backend routes built by orchestrator:**

### Available Endpoints

**Work Queue:**
- `POST /api/adzeta/work-queue` — Create new task
- `GET /api/adzeta/work-queue?state=pending_review` — List tasks
- `PATCH /api/adzeta/work-queue/[task_id]/approve` — Approve/reject/modify

**Autonomy:**
- `GET /api/adzeta/autonomy/gates` — Get all gates + progress
- `PATCH /api/adzeta/autonomy/gates/[gate_id]` — Manual unlock/lock
- `GET /api/adzeta/autonomy/config` — Get configuration
- `POST /api/adzeta/autonomy/config` — Update config

**Feedback:**
- `POST /api/adzeta/feedback` — Submit feedback/rating
- `GET /api/adzeta/feedback?task_id=xxx` — Get feedback

**Suggestions:**
- `GET /api/adzeta/suggestions?user_id=xxx` — Get proactive suggestions
- `POST /api/adzeta/suggestions` — Create suggestion (system use)
- `PATCH /api/adzeta/suggestions/[id]` — Accept/dismiss

**Metrics:**
- `GET /api/adzeta/metrics?days=30` — Performance summary
- `POST /api/adzeta/metrics` — Daily rollup (cron)

**Files located at:** `app/api/adzeta/*/route.ts`

---

## Part 3: FRONTEND COMPONENTS TO BUILD

### Component 1: WorkQueuePanel
**Location:** `app/components/adzeta/WorkQueuePanel.tsx`

**Purpose:** Display pending tasks requiring approval

**Features:**
- [ ] Fetch tasks via `GET /api/adzeta/work-queue?state=pending_review`
- [ ] Show task cards: title, task_type, confidence, suggested_action
- [ ] Approve/Reject/Modify buttons
- [ ] Expands to show: description, rationale, risk_assessment, payload
- [ ] Real-time refresh (poll every 10s or use SSE)

**UI Example:**
```tsx
<Card>
  <CardHeader>
    <Tag color={risk === 'high' ? 'red' : 'blue'}>{task_type}</Tag>
    <Title>{title}</Title>
    <ConfidenceBadge score={confidence_score} />
  </CardHeader>
  <CardBody>
    <Text>{description}</Text>
    <ActionPreview suggested_action={suggested_action} />
    <ExpandableSection>
      <Rationale>{rationale}</Rationale>
      <RiskAssessment>{risk_assessment}</RiskAssessment>
    </ExpandableSection>
  </CardBody>
  <CardFooter>
    <Button variant="primary" onClick={approve}>✓ Approve</Button>
    <Button variant="secondary" onClick={modify}>Modify</Button>
    <Button variant="danger" onClick={reject}>✗ Reject</Button>
  </CardFooter>
</Card>
```

---

### Component 2: AutonomyGateProgress
**Location:** `app/components/adzeta/AutonomyGateProgress.tsx`

**Purpose:** Visualize progress toward autonomous execution

**Features:**
- [ ] Fetch gates via `GET /api/adzeta/autonomy/gates`
- [ ] Show 4 gates: Research, Analytics, Recommendations, Actions
- [ ] Progress bars for: runs_count, success_rate, avg_confidence
- [ ] Lock/unlock indicators
- [ ] "Unlock" button (for manual override when eligible)
- [ ] Help text explaining each gate

**Gates to display:**
```
Gate 1: Research Queries [UNLOCKED] ✅
├─ Runs: 150/10 ✅
├─ Success: 100% (≥100%) ✅
└─ Confidence: 0.85 (≥0.70) ✅

Gate 2: Analytics Reports [ELIGIBLE]
├─ Runs: 18/20 ⚠️ (need 2 more)
├─ Success: 94% (≥95%) ⚠️
└─ Confidence: 0.78 (≥0.75) ✅
[Unlock Button] — requires approval
```

---

### Component 3: TaskFeedbackButtons
**Location:** `app/components/adzeta/TaskFeedbackButtons.tsx`

**Purpose:** Collect user feedback on completed tasks

**Features:**
- [ ] Star rating (1-5)
- [ ] Comment text area
- [ ] "This was helpful" / "This was wrong" toggle
- [ ] Success/failure report (for executed tasks)
- [ ] POST to `/api/adzeta/feedback`

---

### Component 4: ProactiveSuggestionsPanel
**Location:** `app/components/adzeta/ProactiveSuggestionsPanel.tsx`

**Purpose:** Display system-initiated suggestions

**Features:**
- [ ] Fetch suggestions via `GET /api/adzeta/suggestions?user_id=xxx`
- [ ] Show urgency levels (low/normal/high/urgent)
- [ ] Card per suggestion with title, description, confidence
- [ ] Accept/Dismiss buttons
- [ ] Dismiss reason dropdown (if dismissing)
- [ ] Auto-expire after expiration date

---

### Component 5: AutonomyMetricsDashboard
**Location:** `app/components/adzeta/AutonomyMetricsDashboard.tsx`

**Purpose:** Show agent performance over time

**Features:**
- [ ] Fetch metrics via `GET /api/adzeta/metrics?days=30`
- [ ] Summary cards: Total tasks, Success rate, Auto-execution rate, Avg rating
- [ ] Chart: Tasks by type over time
- [ ] Chart: Success rate trend
- [ ] Chart: Confidence score distribution
- [ ] Table: Recent tasks with outcomes

---

### Component 6: ChatIntegrationUpdates
**Location:** `app/components/chat/`

**Update existing chat components:**

**In `chat-thread.tsx`:**
- [ ] After agent response, check if task requires approval
- [ ] If requires_approval, show ApprovalCard instead of just text
- [ ] After approval, show "Task approved — executing..." status
- [ ] After execution, show FeedbackButtons

**In `chat-input.tsx`:**
- [ ] Add "Request Mode" dropdown: [Research, Analytics, Recommendation, Action]
- [ ] This sets task_type when posting to oracle

**New: SuggestionToast**
- [ ] Incoming proactive suggestions show as toasts
- [ ] Auto-dismiss after 30s if not interacted

---

## Part 4: PAGES TO BUILD/UPDATE

### New Page: `/autonomy`
**Location:** `app/autonomy/page.tsx`

**Sections:**
1. **Autonomy Progress** — `AutonomyGateProgress` component
2. **Work Queue** — `WorkQueuePanel` component
3. **Performance** — `AutonomyMetricsDashboard` component

**Navigation:**
- Link from main nav: "Autonomy" → `/autonomy`

---

### Update Page: `/`
**Location:** `app/page.tsx`

**Add:**
- [ ] `ProactiveSuggestionsPanel` in sidebar or header area
- [ ] Approval badge in header if pending tasks exist

---

## Part 5: HOOKS TO BUILD

**Location:** `app/hooks/use-adzeta-autonomy.ts`

**Features:**
- [ ] `useWorkQueue(state?)` — fetch and poll work queue
- [ ] `useAutonomyGates()` — fetch gates status
- [ ] `useProactiveSuggestions()` — fetch and poll suggestions
- [ ] `useAutonomyMetrics(days?)` — fetch metrics

---

## Part 6: TESTING CHECKLIST

**Test scenarios:**
- [ ] Create research task → should auto-execute (no approval needed)
- [ ] Create action task → should show in work queue requiring approval
- [ ] Approve task → should execute and show results
- [ ] Reject task → should move to rejected state
- [ ] Submit feedback on completed task → should save
- [ ] Check autonomy gates → should show progress bars updating
- [ ] Trigger proactive suggestion → should appear in panel
- [ ] Dismiss suggestion → should move to dismissed state

---

## DATABASE VIEWS AVAILABLE

**Use these in Supabase Dashboard for debugging:**
- `v_pending_approval` — see tasks needing review
- `v_agent_performance` — performance by task type
- `v_autonomy_status` — gate unlock eligibility

---

## IMPLEMENTATION ORDER

**Priority 1 (Core functionality):**
1. WorkQueuePanel — pending approvals UI
2. AutonomyGateProgress — gate visualization

**Priority 2 (Feedback loop):**
3. TaskFeedbackButtons — rating/feedback
4. ProactiveSuggestionsPanel — suggestion cards

**Priority 3 (Analytics):**
5. AutonomyMetricsDashboard — performance charts

**Priority 4 (Integration):**
6. Chat integration — approval flow inline
7. `/autonomy` page — main dashboard
8. Hooks — data fetching utilities

---

## QUESTIONS?

**Backend is DONE.** Focus on frontend components.

API documentation and backend routes are complete in `app/api/adzeta/`.

Ask about specific component behavior or API details.
