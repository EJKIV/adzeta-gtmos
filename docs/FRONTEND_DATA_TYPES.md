# Frontend Data Types — AI Agent Integration

**For:** Claude Code (Frontend Build Agent)
**Scope:** All data types Zetty sends to the frontend
**Last Updated:** 2026-02-27

---

## Overview

Zetty responds with structured data that the frontend must render. This document defines every possible response type, its schema, and UI treatment.

---

## 1. Message Types

### 1.1 Text Response
Simple natural language from the AI.

```typescript
interface TextBlock {
  type: 'text';
  text: string;
  // Optional styling hints
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}
```

**UI:**
- Render as markdown (bold, italic, links)
- Support inline code: `backticks`
- Auto-link URLs
- Variant adds colored left border

---

### 1.2 Structured Data (Tables)
Tabular data (prospects, campaigns, metrics).

```typescript
interface TableBlock {
  type: 'table';
  title?: string;
  description?: string;
  headers: Array<{
    key: string;
    label: string;
    type?: 'text' | 'number' | 'currency' | 'percent' | 'date' | 'link' | 'badge';
    width?: 'auto' | 'small' | 'medium' | 'large';
    sortable?: boolean;
  }>;
  rows: Array<Record<string, string | number | boolean | {
    // For link/badges
    value: string;
    href?: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
    icon?: string;
  }>>;
  // Pagination
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  // Actions per row
  rowActions?: Array<{
    id: string;
    label: string;
    icon?: string;
    variant?: 'default' | 'primary' | 'danger';
  }>;
}
```

**UI:**
- Sortable column headers (click to sort)
- Format by type:
  - `currency`: `$12,345.67`
  - `percent`: `23.5%`
  - `date`: `Feb 27, 2026`
  - `badge`: colored pill
  - `link`: blue clickable text
- Row hover reveals action buttons
- Pagination at bottom
- Empty state when rows = 0

**Example:**
```json
{
  "type": "table",
  "title": "Top Prospects",
  "headers": [
    { "key": "name", "label": "Name", "type": "text", "sortable": true },
    { "key": "company", "label": "Company", "type": "text" },
    { "key": "score", "label": "Score", "type": "number" },
    { "key": "status", "label": "Status", "type": "badge" }
  ],
  "rows": [
    {
      "name": "Jane Smith",
      "company": "Acme Corp",
      "score": 95,
      "status": { "value": "Hot", "variant": "success" }
    }
  ],
  "rowActions": [
    { "id": "enrich", "label": "Enrich", "icon": "Search" },
    { "id": "add_to_campaign", "label": "Add to Campaign", "icon": "Plus" }
  ]
}
```

---

### 1.3 Cards (Key Metrics)
Dashboard-style metric cards.

```typescript
interface CardBlock {
  type: 'cards';
  layout: 'row' | 'grid';
  cards: Array<{
    id: string;
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: {
      direction: 'up' | 'down' | 'flat';
      value: string; // e.g., "+12.5%"
      period?: string; // e.g., "vs last week"
    };
    icon?: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
    // Drill-down action
    action?: {
      label: string;
      skillId: string;
      params: Record<string, unknown>;
    };
  }>;
}
```

**UI:**
- Grid: 2-4 cards per row
- Row: horizontal scroll
- Large value, small subtitle
- Trend arrow with color
- Clickable for drill-down

---

### 1.4 Charts
Visual data representation.

```typescript
interface ChartBlock {
  type: 'chart';
  chartType: 'line' | 'bar' | 'area' | 'pie' | 'funnel';
  title?: string;
  description?: string;
  data: Array<{
    label: string;
    value: number;
    // For multi-series
    series?: Record<string, number>;
    // Optional date for time series
    date?: string;
  }>;
  // Axis configuration (for line/bar/area)
  xAxis?: { label?: string; format?: 'date' | 'number' | 'text' };
  yAxis?: { label?: string; format?: 'number' | 'currency' | 'percent' };
  // Styling
  colors?: string[];
  height?: number; // pixels, default 300
}
```

**UI:**
- Line: time series trends
- Bar: category comparisons
- Area: cumulative/stacked
- Pie: proportion breakdown
- Funnel: conversion steps
- Tooltip on hover
- Legend for multi-series

---

### 1.5 Lists
Bullet or numbered lists with actions.

```typescript
interface ListBlock {
  type: 'list';
  style: 'bullet' | 'numbered' | 'checklist';
  title?: string;
  items: Array<{
    id: string;
    text: string;
    subtext?: string;
    icon?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'error';
    // Action for this item
    action?: {
      label: string;
      skillId: string;
      params: Record<string, unknown>;
    };
  }>;
}
```

**UI:**
- Bullet: unordered
- Numbered: ordered
- Checklist: with checkboxes (click to toggle)
- Status shows visual progress

---

### 1.6 Error Messages
Structured error display.

```typescript
interface ErrorBlock {
  type: 'error';
  message: string;
  code?: string;
  details?: string;
  // Actionable recovery
  suggestions?: string[];
  // Retry action
  retryable?: boolean;
  retrySkillId?: string;
  retryParams?: Record<string, unknown>;
}
```

**UI:**
- Red left border
- Error icon
- Expandable details
- "Try Again" button if retryable
- Suggestions as bullet list

---

### 1.7 Code Blocks
SQL, JSON, or configuration.

```typescript
interface CodeBlock {
  type: 'code';
  language: 'sql' | 'json' | 'javascript' | 'typescript' | 'yaml' | 'bash';
  code: string;
  filename?: string;
  // Execution output
  output?: string;
  exitCode?: number;
  // Actions
  actions?: Array<{
    id: string;
    label: string;
    // Copy to clipboard, download, run, etc.
    action: 'copy' | 'download' | 'execute';
  }>;
}
```

**UI:**
- Syntax highlighting
- Copy button top-right
- Expand/collapse for long code
- Show filename if provided
- Output section below (terminal style)

---

## 2. Interactive Elements

### 2.1 Buttons
Action triggers within response.

```typescript
interface ButtonBlock {
  type: 'buttons';
  message?: string;
  buttons: Array<{
    id: string;
    label: string;
    variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'ghost';
    icon?: string;
    // What happens on click
    action: {
      type: 'skill' | 'url' | 'modal' | 'confirm';
      skillId?: string;
      params?: Record<string, unknown>;
      url?: string;
      modalContent?: Block[]; // For modal type
      confirmText?: string; // For confirm type
    };
  }>;
}
```

**UI:**
- Horizontal row of buttons
- Primary button highlighted
- Icons optional (Lucide icon names)
- Loading state during execution
- Disabled state after click (prevent double-submit)

---

### 2.2 Forms
Input fields for data collection.

```typescript
interface FormBlock {
  type: 'form';
  id: string;
  title?: string;
  description?: string;
  fields: Array<{
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'email' | 'select' | 'multiselect' | 'date' | 'checkbox' | 'radio';
    placeholder?: string;
    required?: boolean;
    // For select/radio
    options?: Array<{ value: string; label: string }>;
    // Validation
    min?: number;
    max?: number;
    pattern?: string;
  }>;
  submitLabel?: string;
  cancelLabel?: string;
  // On submit, calls this skill
  submitSkillId: string;
}
```

**UI:**
- Vertical form layout
- Labels above inputs
- Validation errors inline
- Required fields marked with *
- Date picker for date fields
- Multi-select as tags
- Submit triggers skill with field values as params

---

### 2.3 Selectors
Pick one from options.

```typescript
interface SelectorBlock {
  type: 'selector';
  id: string;
  title?: string;
  description?: string;
  options: Array<{
    id: string;
    label: string;
    description?: string;
    icon?: string;
    // Metadata for chosen option
    metadata?: Record<string, unknown>;
  }>;
  // How to display
  layout: 'dropdown' | 'cards' | 'list';
  // On select, calls this skill
  selectSkillId: string;
}
```

**UI:**
- Dropdown: compact select
- Cards: visual grid with icons
- List: radio buttons
- Highlight selected option
- Auto-submit on selection (or show "Confirm" button)

---

### 2.4 Filters
Search and filter controls.

```typescript
interface FilterBlock {
  type: 'filters';
  id: string;
  title?: string;
  // Current filter state (round-tripped)
  currentFilters: Record<string, unknown>;
  // Available filters
  filters: Array<{
    id: string;
    label: string;
    type: 'text' | 'select' | 'date_range' | 'number_range' | 'checkboxes';
    options?: Array<{ value: string; label: string }>;
    defaultValue?: unknown;
  }>;
  // On change, calls this skill
  changeSkillId: string;
  // Results preview
  resultCount?: number;
  resultLabel?: string;
}
```

**UI:**
- Collapsible filter bar
- Inline chips for active filters
- "Clear all" button
- Live preview of result count
- Debounced auto-submit (500ms delay)

---

## 3. Recommendations & Decisions

### 3.1 Action Recommendations
Suggested actions with confidence.

```typescript
interface RecommendationBlock {
  type: 'recommendations';
  title?: string;
  description?: string;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    type: 'investigate_decline' | 'double_down_growth' | 'reorder_dashboard' |
          'address_anomaly' | 'review_blocked_tasks' | 'pause_underperforming';
    confidenceScore: number; // 0-100
    priority: 'low' | 'medium' | 'high' | 'critical';
    // Supporting evidence
    evidence?: Array<{
      label: string;
      value: string;
      trend?: 'up' | 'down' | 'flat';
    }>;
    // Execute this recommendation
    action: {
      skillId: string;
      params: Record<string, unknown>;
      label: string;
    };
    // Dismiss
    dismissable?: boolean;
  }>;
}
```

**UI:**
- Cards with confidence badge (e.g., "85% confidence")
- Priority color (critical = red, high = orange, etc.)
- Evidence as small metrics
- Primary action button
- Dismiss (X) if dismissable
- Sort by priority/confidence

---

### 3.2 Decision Confirmation
User must approve/reject.

```typescript
interface DecisionBlock {
  type: 'decision';
  id: string;
  title: string;
  description: string;
  // What will happen
  impact: {
    summary: string;
    details?: string[];
    affectedResources?: Array<{
      type: string;
      name: string;
      currentValue: string;
      newValue: string;
    }>;
  };
  // Options
  options: {
    approve: {
      label: string;
      skillId: string;
      params: Record<string, unknown>;
    };
    reject: {
      label: string;
      // Optional: why rejected (form)
      feedbackForm?: FormBlock;
    };
    postpone?: {
      label: string;
      duration: string; // e.g., "1hour", "1day", "1week"
    };
  };
}
```

**UI:**
- Modal or prominent card
- Impact preview with before/after
- Approve (green) / Reject (red) buttons
- Postpone dropdown if provided
- Require explicit confirmation

---

## 4. Progress & Status

### 4.1 Progress Indicators
Long-running operations.

```typescript
interface ProgressBlock {
  type: 'progress';
  id: string;
  title?: string;
  // Current state
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress?: number; // 0-100
  // Step breakdown
  steps?: Array<{
    id: string;
    label: string;
    status: 'pending' | 'running' | 'completed' | 'skipped' | 'error';
    details?: string;
  }>;
  // Time estimates
  startedAt?: string;
  estimatedCompletion?: string;
  elapsedMs?: number;
  // Actions
  actions?: Array<{
    id: string;
    label: string;
    icon?: string;
    // pause, resume, cancel, retry
    action: 'pause' | 'resume' | 'cancel' | 'retry';
  }>;
}
```

**UI:**
- Progress bar with percentage
- Step indicators (checkmarks for done)
- Elapsed/ETA time
- Cancel button while running
- Retry button on failure

---

## 5. Streaming Events

### 5.1 Status Events
Real-time progress updates.

```typescript
// Sent as SSE frames
type StatusEvent = {
  phase: 'matching' | 'executing' | 'connecting' | 'streaming' | 'complete' | 'error';
  message: string;
  ts: number;
  // Phase-specific data
  skillId?: string;
  skillName?: string;
  progress?: number;
};
```

**UI:**
- Show in message bubble (gray text)
- Animate during active phases
- Hide when complete
- Error phase shows red

---

### 5.2 Delta Events
AI response chunks.

```typescript
// Sent as SSE frames
type DeltaEvent = {
  content: string; // Text chunk
};
```

**UI:**
- Append to message text (typewriter effect)
- Markdown rendering as it arrives
- Cursor animation while streaming

---

## 6. Complete Skill Output

### 6.1 Full Response Schema

```typescript
interface SkillOutput {
  skillId: string;
  status: 'success' | 'partial_success' | 'error';
  // UI blocks (render in order)
  blocks: Array<
    | TextBlock
    | TableBlock
    | CardBlock
    | ChartBlock
    | ListBlock
    | ErrorBlock
    | CodeBlock
    | ButtonBlock
    | FormBlock
    | SelectorBlock
    | FilterBlock
    | RecommendationBlock
    | DecisionBlock
    | ProgressBlock
  >;
  // Follow-up suggestions
  followUps: Array<{
    text: string;
    skillId: string;
    params: Record<string, unknown>;
  }>;
  // Metadata
  executionMs: number;
  dataFreshness: 'live' | 'cached' | 'mock' | 'offline';
  // Context for next turn
  context?: {
    lastQuery?: string;
    entities?: Record<string, unknown>;
    intent?: string;
  };
}
```

---

## 7. Component Implementation Guide

### 7.1 Message Renderer
```tsx
interface MessageRendererProps {
  blocks: Block[];
  onAction: (actionId: string, params: Record<string, unknown>) => void;
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => void;
}

function MessageRenderer({ blocks, onAction, onSkillInvoke }: MessageRendererProps) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <BlockRenderer
          key={index}
          block={block}
          onAction={onAction}
          onSkillInvoke={onSkillInvoke}
        />
      ))}
    </div>
  );
}
```

### 7.2 Action Handler Pattern
```tsx
function handleAction(action: BlockAction) {
  switch (action.type) {
    case 'skill':
      // Call API route with skillId and params
      invokeSkill(action.skillId!, action.params);
      break;
    case 'url':
      // Open in new tab
      window.open(action.url, '_blank');
      break;
    case 'modal':
      // Show modal with content
      openModal(action.modalContent);
      break;
    case 'confirm':
      // Show confirmation dialog
      if (confirm(action.confirmText)) {
        invokeSkill(action.skillId!, action.params);
      }
      break;
  }
}
```

---

## 8. Example Scenarios

### 8.1 "Find me prospects"
**Response blocks:**
1. `text`: "Found 23 prospects matching your criteria"
2. `table`: Prospect list with enrich/add actions
3. `buttons`: ["Create Campaign"] ["Export CSV"]
4. `followUps`: ["Show more", "Filter by industry"]

### 8.2 "Create a sequence"
**Response blocks:**
1. `selector`: Choose sequence template
2. `form`: Customize subject, timing, etc.
3. `code`: Preview generated sequence (yaml/json)
4. `buttons`: ["Approve & Create"] ["Edit"]

### 8.3 "What's my performance?"
**Response blocks:**
1. `cards`: Reply rate, Meetings booked, Revenue
2. `chart`: Trend over last 30 days
3. `recommendations`: Actions to improve
4. `buttons`: ["Drill down"] ["Compare to last month"]

### 8.4 "The system found an anomaly"
**Response blocks:**
1. `decision`: Approve/reject alert
2. `table`: Anomalous records
3. `text`: Explanation of what changed
4. `buttons`: ["Mark as Expected"] ["Create Task"]

---

## 9. Error Handling

### 9.1 Network Error
```json
{
  "type": "error",
  "status": "error",
  "blocks": [{
    "type": "error",
    "message": "Cannot connect to AI agent",
    "suggestions": ["Check your internet connection", "Try again in a moment"],
    "retryable": true
  }],
  "followUps": []
}
```

### 9.2 Skill Execution Error
```json
{
  "skillId": "research_prospects",
  "status": "error",
  "blocks": [{
    "type": "error",
    "message": "API rate limit exceeded",
    "code": "RATE_LIMIT",
    "details": "Apollo API allows 100 requests per minute. Please wait 60 seconds.",
    "retryable": true,
    "retrySkillId": "research_prospects",
    "retryParams": { "delay": 60 }
  }]
}
```

### 9.3 Partial Success
```json
{
  "skillId": "enrich_batch",
  "status": "partial_success",
  "blocks": [
    { "type": "text", "text": "Enriched 45 of 50 prospects" },
    { "type": "table", "title": "Failed Enrichments", ... },
    { "type": "buttons", "buttons": [{ "id": "retry_failed", "label": "Retry Failed" }] }
  ]
}
```

---

## 10. Accessibility

### 10.1 Requirements
- ARIA labels on all interactive elements
- Keyboard navigation (Tab, Enter, Escape)
- Focus indicators
- Screen reader announcements for:
  - New messages
  - Loading states
  - Errors
  - Completion

### 10.2 Loading States
```tsx
// Skeleton for table
<TableSkeleton rows={5} columns={4} />

// Skeleton for cards
<CardSkeleton count={3} />

// Skeleton for text
<TextSkeleton lines={3} />
```

---

## Summary

| Block Type | Use For | Key Props |
|------------|---------|-----------|
| `text` | Explanations, summaries | markdown, variant |
| `table` | Lists of prospects, campaigns | headers, rows, pagination |
| `cards` | KPIs, metrics | value, trend, icon |
| `chart` | Trends, comparisons | type, data |
| `list` | Action items, steps | style, status |
| `buttons` | Actions | id, label, variant |
| `form` | Data input | fields, validation |
| `recommendations` | Suggested actions | confidence, priority |
| `decision` | Approvals | impact, options |
| `error` | Failures | message, retry |
| `progress` | Long operations | status, steps |

**Claude Code: Build components for each block type, then a MessageRenderer that switches on `block.type`.**