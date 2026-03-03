/**
 * Progress Visibility Demo
 * 
 * Shows how to use the progress tracking system in subagents and UI.
 */

import { reportProgress, completeTask, failTask } from '@/lib/progress/reporter';

// Helper to create timestamp
const now = () => new Date().toISOString();

/**
 * Example: Long-running build task that reports progress
 */
export async function demoBuildTask(
  taskId: string,
  runId: string
): Promise<void> {
  const steps = [
    { label: 'Analyzing dependencies', duration: 15000 },
    { label: 'Compiling source files', duration: 45000 },
    { label: 'Optimizing bundle', duration: 30000 },
    { label: 'Generating types', duration: 20000 },
    { label: 'Finalizing build', duration: 10000 },
  ];

  const totalSteps = steps.length;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepNumber = i + 1;
    const percentComplete = Math.round((stepNumber / totalSteps) * 100);

    // Report progress
    await reportProgress({
      taskId,
      runId,
      stepNumber,
      totalSteps,
      percentComplete,
      message: step.label,
      agentLabel: 'build-agent',
      status: 'running',
      timestamp: now(),
    });

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, step.duration / 10)); // Faster for demo
  }

  // Mark complete
  await completeTask(taskId, 'Build completed successfully');
}

/**
 * Example: Task with subtasks
 */
export async function demoTaskWithSubtasks(
  taskId: string,
  runId: string
): Promise<void> {
  const subtasks = [
    { id: `${taskId}-1`, label: 'Research requirements', weight: 2 },
    { id: `${taskId}-2`, label: 'Design architecture', weight: 3 },
    { id: `${taskId}-3`, label: 'Implement code', weight: 5 },
    { id: `${taskId}-4`, label: 'Write tests', weight: 3 },
    { id: `${taskId}-5`, label: 'Documentation', weight: 1 },
  ];

  // Initialize main task
  await reportProgress({
    taskId,
    runId,
    stepNumber: 0,
    totalSteps: subtasks.length,
    percentComplete: 0,
    message: 'Starting multi-step task...',
    agentLabel: 'orchestrator',
    status: 'running',
    timestamp: now(),
  });

  // Process each subtask
  for (let i = 0; i < subtasks.length; i++) {
    const subtask = subtasks[i];
    const percentComplete = Math.round(((i + 1) / subtasks.length) * 100);

    // Report subtask progress (parentTaskId links it to the main task)
    await reportProgress({
      taskId,
      runId,
      subtaskId: subtask.id,
      parentTaskId: taskId,
      stepNumber: 1,
      totalSteps: 1,
      percentComplete: 100, // Subtask complete
      message: subtask.label,
      agentLabel: 'subagent-' + (i + 1),
      weight: subtask.weight,
      status: 'completed',
      timestamp: now(),
    });

    // Report main task progress
    await reportProgress({
      taskId,
      runId,
      stepNumber: i + 1,
      totalSteps: subtasks.length,
      percentComplete,
      message: `Completed: ${subtask.label}`,
      agentLabel: 'orchestrator',
      status: 'running',
      timestamp: now(),
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await completeTask(taskId, 'All subtasks completed');
}

/**
 * Example: Error handling
 */
export async function demoErrorTask(
  taskId: string,
  runId: string
): Promise<void> {
  await reportProgress({
    taskId,
    runId,
    stepNumber: 1,
    totalSteps: 3,
    percentComplete: 33,
    message: 'Starting task...',
    agentLabel: 'test-agent',
    status: 'running',
    timestamp: now(),
  });

  // Simulate work then fail
  await new Promise(resolve => setTimeout(resolve, 2000));

  await failTask(taskId, 'Network timeout during API call');
}

/**
 * Usage in component:
 * 
 * function DemoPage() {
 *   const [taskId] = useState(() => `demo-${Date.now()}`);
 *   
 *   const startDemo = async () => {
 *     const runId = crypto.randomUUID();
 *     demoBuildTask(taskId, runId);
 *   };
 *   
 *   return (
 *     <div>
 *       <ProgressIndicator taskId={taskId} />
 *       <button onClick={startDemo}>Start Demo</button>
 *     </div>
 *   );
 * }
 */
