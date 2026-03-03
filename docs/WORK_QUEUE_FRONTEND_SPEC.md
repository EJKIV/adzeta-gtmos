# Work Queue Frontend Specification

## User Story
As a user, I want to see all pending work, understand blockers, and reprioritize tasks by voice or UI so that I control what my agents work on.

---

## Core Principle

**Agents check tool availability before executing.** If missing:
1. Explain what is needed
2. Ask user: "Add to queue or provide now?"
3. Queue items are always visible and mutable

---

## Work Queue Data Model

```typescript
interface WorkQueueItem {
  id: string;
  priority: number;           // 1 = highest
  status: 'blocked' | 'ready' | 'in_progress' | 'completed';
  title: string;
  description: string;
  
  // Tool requirements
  requested_agent: string;
  requires_tools: string[];
  missing_tools?: string[];   // Why it's blocked
  
  // User interaction
  queued_at: string;
  user_notes?: string;       // User-added context
  user_priority?: number;    // User override of my priority
  
  // Execution
  assigned_to?: string;
  started_at?: string;
  completed_at?: string;
  result?: string;
}
```

---

## Frontend Views

### View 1: Main Queue (`/work-queue`)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Work Queue                          [+ Add Task] [Refresh]         │
├─────────────────────────────────────────────────────────────────────┤
│ Priority | Task                    | Status     | Blocker | Actions│
├─────────────────────────────────────────────────────────────────────┤
│ 1        | AdZeta UI Frontend      | IN_PROGRESS| -       | [View] │
│ 2        | Supabase Auth Setup    | BLOCKED    | Keys    | [Edit] │
│ 3        | Payment Integration    | BLOCKED    | Stripe  | [Edit] │
│ 4        | Documentation          | READY      | -       | [Start]│
└─────────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Drag-drop to reorder priority
- Click task → expand details
- Click blocker → show tool requirements
- Edit button → add notes, change priority

---

### View 2: Task Detail

```
┌─────────────────────────────────────────────────────────────────────┐
│ Task: Payment Integration                              [Close]       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Priority: [########## 3 ##########] ← [▼] [▲]                    │
│                                                                     │
│ Status: BLOCKED (waiting on user) 🔴                             │
│                                                                     │
│ Description:                                                        │
│ Implement Stripe Connect for marketplace payouts.                   │
│                                                                     │
│ Required Tools:                                                       │
│ ⛔ STRIPE_SECRET_KEY            - Not provided                    │
│ ⛔ STRIPE_WEBHOOK_SECRET        - Not configured                   │
│                                                                     │
│ What I need:                                                        │
│ 1. Stripe Dashboard access (production or test mode)               │
│ 2. Create stripe account, provide keys                            │
│ 3. Estimated time: 4 hours                                         │
│                                                                     │
│ [Provide Keys Now]     or     [Keep in Queue]                     │
│                                                                     │
│ Your Notes:                                                         │
│ [Text area: "This is urgent for launch"]                           │
│                                                                     │
│ [Save Notes] [Move to #1 Priority] [Cancel Task]                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

### View 3: Quick Add (Voice/Text → Queue)

**Voice/Text:**
```
User: "Queue up adding Apple Pay"

Response: "Added to queue as #5. Priority?"
User: "Make it #2"

Action: Reorder queue
```

**UI:**
```
[+ New Task] button → Modal

Title: ________________
Description: ___________
Priority: [Normal] [High] [Urgent]

[Add to Queue]
```

---

## Voice/UI Reprioritization Commands

| User says | Action |
|-----------|--------|
| "Move payment integration to #1" | Update priority, reorder queue |
| "What's blocking #2?" | Show blockers for item #2 |
| "Bump everything down, new task is #1" | Insert at top, increment others |
| "Clear completed tasks" | Archive done items |
| "What's my next task?" | Show highest priority ready item |
| "Skip to #3" | Mark #1,#2 as paused/resume later |

---

## API Endpoints Needed

```typescript
// GET /api/work-queue
// Returns: { items: WorkQueueItem[], total: number }

// PATCH /api/work-queue/[id]
// Body: { priority?: number, user_notes?: string, status?: 'paused' }

// POST /api/work-queue/reorder
// Body: { newOrder: string[] } // array of task IDs

// DELETE /api/work-queue/[id] (or archive)

// POST /api/work-queue
// Body: Omit(required fields)
// Creates new queue item, assigns priority + 1
```

---

## Agent Behavior

**Before delegating:**
```typescript
function shouldDelegate(task: Task): boolean {
  const missingTools = checkToolRequirements(task);
  
  if (missingTools.length === 0) {
    return true; // Execute immediately
  }
  
  // Explain to user
  const message = `
I need ${missingTools.join(', ')} to ${task.title}.

This task requires:
${missingTools.map(t => `- ${t}`).join('\n')}

Options:
1. Provide tools now → I'll start immediately
2. Queue it → I'll add visible to your work queue

Current position: #${workQueue.length + 1}
  `;
  
  // Ask user
  return false; // Don't auto-delegate
}
```

**Never:**
- ❌ Queue silently without telling user
- ❌ "I'll handle it" without tool check
- ❌ Create invisible tasks

**Always:**
- ✅ Explain blocker clearly
- ✅ Give options (now vs queue)
- ✅ Show queue position and priority

---

## Integration with Chat

**In chat thread:**
```
User: "Build Apple Pay integration"

Agent: "I need Stripe keys + Apple Developer account. 
Estimated: 6 hours.

Options:
1. [Add to Queue] → Position #3
2. [Provide Keys] → Start now

What's in queue now:
#1: AdZeta UI (in progress)
#2: Supabase auth (blocked: keys)
```

Clicking opens work queue detail view.

---

## File Structure

```
app/
├── work-queue/
│   ├── page.tsx              # Main queue view
│   ├── [id]/
│   │   └── page.tsx          # Task detail
│   └── new/
│       └── page.tsx          # New task modal
├── components/
│   └── work-queue/
│       ├── QueueTable.tsx    # Sortable table
│       ├── TaskCard.tsx      # Expandable card
│       ├── BlockerPanel.tsx  # Tool requirements
│       └── PrioritySlider.tsx # Drag/number input
└── hooks/
    └── use-work-queue.ts     # CRUD operations
```

---

## Priority vs Status

| Priority | Meaning |
|----------|---------|
| 1 | Execute first when ready |
| 2-5 | Normal backlog |
| 6+ | Deprioritized |

| Status | State |
|--------|--------|
| ready | Tools available, can execute |
| blocked | Missing tools, needs user |
| in_progress | Agent working on it |
| paused | User-paused, can resume |
| completed | Done |

**Priority is user-mutable.**
**Status is system-determined.**

---

## Summary

The work queue is:
- Always visible to users
- Self-documenting (shows why things are blocked)
- User-controllable (reprioritize via voice or UI)
- Collaborative (agents ask, users decide)

**No invisible work. No silent deferral. Always explain, always ask.**
