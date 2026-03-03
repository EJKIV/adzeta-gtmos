# Progress Visibility System

Real-time progress tracking for long-running tasks and subagents in GTM Command Center.

## Overview

This system provides:
- **Frontend**: Animated progress indicators, heartbeat pulses, and status displays
- **Backend**: In-memory caching with SSE streaming to clients
- **API**: REST endpoints for progress reporting and status queries
- **Integration**: Automatic subtask progress aggregation with weighted calculations

## Quick Start

### 1. Database Setup

Run the migration:
```bash
psql -d your_db -f migrations/007_progress_tracking.sql
```

### 2. In a Subagent

Report progress using the reporter:

```typescript
import { reportProgress } from '@/lib/progress/reporter';

async function longRunningTask(taskId: string, runId: string) {
  const totalSteps = 5;
  
  for (let step = 1; step <= totalSteps; step++) {
    await reportProgress({
      taskId,
      runId,
      stepNumber: step,
      totalSteps,
      percentComplete: Math.round((step / totalSteps) * 100),
      message: `Processing step ${step} of ${totalSteps}...`,
      agentLabel: 'code-builder',
    });
    
    // Do work...
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Mark complete
  await completeTask(taskId, 'Build completed successfully');
}
```

### 3. In the UI

Display progress in chat:

```tsx
import { ProgressIndicator } from '@/app/components/chat/progress-indicator';

function TaskView({ taskId }: { taskId: string }) {
  return (
    <ProgressIndicator
      taskId={taskId}
      title="Building component..."
      showSteps
      showPercentage
      showTimeEstimate
      onRetry={() => handleRetry()}
      onEscalate={() => handleEscalate()}
    />
  );
}
```

### 4. Subscribe via SSE

```typescript
import { useProgress } from '@/hooks/use-progress';

function MyComponent({ taskId }: { taskId: string }) {
  const { progress, isConnected, error } = useProgress(taskId);
  
  if (progress?.status === 'completed') {
    return <TaskCompleted />;
  }
  
  return <Percent value={progress?.percentComplete || 0} />;
}
```

## API Reference

### POST /api/progress/report

Submit a progress update.

```typescript
POST /api/progress/report
Content-Type: application/json

{
  "taskId": "task-123",
  "runId": "run-456",
  "stepNumber": 3,
  "totalSteps": 5,
  "percentComplete": 60,
  "message": "Building frontend...",
  "agentLabel": "code-builder",
  "status": "running"
}
```

### GET /api/progress/stream/:taskId

Subscribe to real-time updates via SSE.
```javascript
const eventSource = new EventSource('/api/progress/stream/task-123');

eventSource.addEventListener('progress', (e) => {
  const data = JSON.parse(e.data);
  console.log(`Progress: ${data.percentComplete}%`);
});

eventSource.addEventListener('complete', () => {
  console.log('Task completed!');
});

eventSource.addEventListener('error', (e) => {
  console.error('Task failed:', e);
});
```

### GET /api/progress/status/:taskId

Get current status:
```typescript
const response = await fetch('/api/progress/status/task-123');
const data = await response.json();

// Response:
{
  "taskId": "task-123",
  "status": "running",
  "percentComplete": 60,
  "currentStep": 3,
  "totalSteps": 5,
  "message": "Building frontend...",
  "subtasks": [...],
  "estimatedTimeRemaining": "2m remaining"
}
```

## Design Spec

### Progress Bar
- Height: 8px
- Color gradient: gray → blue → green
- Animation: smooth width transition

### Steps Visualization
- Numbered circles (1, 2, 3, 4, 5)
- Connecting lines
- Completions show ✅ checkmarks

### Heartbeat
- Blue pulse animation, 1.5s cycle
- "Working..." text for active tasks
- "Last update: 2m ago" for stale tasks

### Error State
- Red background, white text
- Warning icon, Retry button
- Expandable logs section

## Performance

- In-memory cache with 1-hour TTL
- SSE broadcasts only to active subscribers
- Automatic cleanup of completed/failed tasks
- Weighted aggregation for accurate progress calculation with parallel subtasks

## Files

| File | Description |
|------|-------------|
| `types/progress.ts` | TypeScript type definitions |
| `lib/progress/reporter.ts` | Backend progress reporting |
| `lib/progress/aggregator.ts` | Subtask aggregation logic |
| `lib/progress/index.ts` | Public API exports |
| `hooks/use-progress.ts` | React hook for progress tracking |
| `app/components/chat/progress-indicator.tsx` | Main progress UI component |
| `app/components/chat/heartbeat-pulse.tsx` | Compact heartbeat indicator |
| `app/api/progress/report/route.ts` | POST endpoint |
| `app/api/progress/stream/[taskId]/route.ts` | SSE endpoint |
| `app/api/progress/status/[taskId]/route.ts` | Status query endpoint |
