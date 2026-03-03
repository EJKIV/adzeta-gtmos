# Gate-Check Verification

## workflow.create_campaign — Gate-Check IS WIRED ✅

### Location in Code

**File:** `lib/skills/handlers/workflow-campaign.ts`

**Line 149-161 — Gate check call:**
```typescript
const gateResult = await checkActionGate(
  supabase,
  'create_sequence',  // ← Action type
  userId,
  {
    confidence: 0.75,  // ← From clarification
    riskLevel: prospectCount > 50 ? 'high' : 'medium',
    prospectCount,
  }
);
```

**Line 188-218 — If gate locked, create approval + return alternatives:**
```typescript
if (gateResult.requiresApproval) {
  // Create work queue entry
  const approvalEntry = await createActionApprovalEntry(...);
  
  // Return to user with alternatives
  blocks.push({
    type: 'confirmation',
    status: 'pending',
    message: gateResult.reason,
    approvalActions: { ... }
  });
  
  // Add gate alternatives as action buttons
  blocks.push({
    type: 'action',
    label: 'Alternatives',
    actions: [
      { label: 'Queue for approval', ... },
      { label: 'Preview first', ... },
      { label: 'Reduce scope', ... }
    ]
  });
}
```

**Line 222+ — If gate unlocked, proceed with creation:**
```typescript
// Gate unlocked — create campaign
const { data: campaign, error: campaignError } = await supabase
  .from('outreach_campaigns')
  .insert({ ... });
```

### Gate-Check Integration Points

| Integration | Status | File/Line |
|-------------|--------|-----------|
| Import gate-check | ✅ | `workflow-campaign.ts:10` |
| Call checkActionGate | ✅ | `workflow-campaign.ts:149` |
| Create approval entry | ✅ | `workflow-campaign.ts:192` |
| Return alternatives | ✅ | `workflow-campaign.ts:211` |
| Block creation if locked | ✅ | `workflow-campaign.ts:188-220` |
| Proceed if unlocked | ✅ | `workflow-campaign.ts:222+` |

### How It Works

```
User: "create sequence for VP Sales in SaaS"
  ↓
Skill: workflow.create_campaign.execute()
  ↓
Step 1: Query prospects (finds 47 matches)
  ↓
Step 2: GATE CHECK
  ┌─────────────────────────────────────────┐
  │ checkActionGate('create_sequence')      │
  │                                         │
  │ Looks up adzeta_autonomy_gates:         │
  │   gate_id: 'gate_3_recommendations'    │
  │   current_status: 'locked'             │
  │   required_runs: 50                      │
  │   current_runs: 0                        │
  │                                         │
  │ Returns:                                 │
  │   requiresApproval: true                 │
  │   reason: "Gate 3 is locked"            │
  └─────────────────────────────────────────┘
  ↓
Step 3: If locked → CREATE APPROVAL ENTRY
  INSERT INTO adzeta_work_queue
    task_type: 'action'
    title: 'Approve: create_sequence'
    approval_state: 'pending_review'
  ↓
Step 4: Return to user with alternatives
  ┌─────────────────────────────────────────┐
  │ Campaign Preview: Email Sequence        │
  │ Targeting 47 prospects: VP Sales in SaaS │
  │                                         │
  │ [Preview table of sequence steps]        │
  │                                         │
  │ ⚠️ Action requires approval             │
  │ Gate 3 is locked (0/50 runs)            │
  │                                         │
  │ [Queue for approval]                    │
  │ [Preview first]                         │
  │ [Test with 5 prospects]                │
  └─────────────────────────────────────────┘
```

### Testing the Gate-Check

**API Test (Clarification):**
```bash
curl -X POST http://localhost:3001/api/oracle/clarify \
  -H "Content-Type: application/json" \
  -d '{
    "command_id": "test-001",
    "intent": {
      "icp": { "titles": ["VP Sales"], "industries": ["SaaS"] },
      "campaign": { "type": "email_sequence" }
    },
    "depth": 3,
    "mode": "confirm"
  }'
```

**Expected Response:**
```json
{
  "confidence": 0.45,
  "ready": true,
  "message": "Good enough. I'll target VP Sales in SaaS.",
  "actions": [
    { "type": "confirm", "label": "Create campaign" },
    { "type": "button", "label": "Start over" }
  ],
  "next_step": {
    "skill": "workflow.create_campaign",
    "action": "create"
  }
}
```

**Command Flow:**
```bash
# 1. Create command
curl -X POST http://localhost:3001/api/oracle/command \
  -H "Content-Type: application/json" \
  -d '{"raw_command": "create sequence for VP Sales in SaaS"}'

# Returns: { "command_id": "...", "status": "processing" }

# 2. Poll or stream for result
curl http://localhost:3001/api/oracle/command/{command_id}

# When processed by oracle-poll service:
# - workflow.create_campaign runs
# - Gate check triggers
# - Returns locked status with alternatives
```

### Verification Commands

```bash
# Check if gate-check is imported in workflow-campaign
grep "checkActionGate" lib/skills/handlers/workflow-campaign.ts
# → Line 10: import { checkActionGate...
# → Line 149: const gateResult = await checkActionGate(...)

# Check if approval entry is created
grep "createActionApprovalEntry" lib/skills/handlers/workflow-campaign.ts
# → Line 10: import { ..., createActionApprovalEntry }
# → Line 192: const approvalEntry = await createActionApprovalEntry(...)

# Check gate handling logic
grep -n "gateResult.requiresApproval" lib/skills/handlers/workflow-campaign.ts
# → Line 188: if (gateResult.requiresApproval) {
```

### Status: FULLY WIRED ✅

All components are in place:
- ✅ Gate check called at action point
- ✅ Approval entry created when locked
- ✅ Alternatives returned to user
- ✅ Campaign creation blocked if locked
- ✅ Campaign created if unlocked
