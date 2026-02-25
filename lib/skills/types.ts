/**
 * Skill System Type Definitions
 *
 * Core abstraction: each capability is a "skill" with standard I/O.
 * Both the UI command bar and OpenClaw's API use the same execution path.
 */

// ---------------------------------------------------------------------------
// Skill Definition (registered in the registry)
// ---------------------------------------------------------------------------

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  domain: 'analytics' | 'research' | 'intelligence' | 'workflow' | 'system';
  inputSchema: Record<string, unknown>;
  responseType: ResponseBlock['type'][];
  triggerPatterns: string[];
  estimatedMs: number;
  examples: string[];
  handler: (input: SkillInput) => Promise<SkillOutput>;
}

// ---------------------------------------------------------------------------
// Skill Execution I/O
// ---------------------------------------------------------------------------

export interface SkillInput {
  skillId: string;
  params: Record<string, unknown>;
  context: SkillContext;
}

export interface SkillContext {
  userId?: string;
  source: 'ui' | 'api' | 'autonomous';
  sessionId?: string;
}

export interface SkillOutput {
  skillId: string;
  status: 'success' | 'error' | 'partial';
  blocks: ResponseBlock[];
  followUps: FollowUp[];
  executionMs: number;
  dataFreshness: 'live' | 'cached' | 'mock';
}

export interface FollowUp {
  label: string;
  command: string;
}

// ---------------------------------------------------------------------------
// Response Block Union
// ---------------------------------------------------------------------------

export type ResponseBlock =
  | MetricsBlock
  | ChartBlock
  | TableBlock
  | InsightBlock
  | ConfirmationBlock
  | ProgressBlock
  | ErrorBlock;

// ---------------------------------------------------------------------------
// Individual Block Types
// ---------------------------------------------------------------------------

export interface MetricsBlock {
  type: 'metrics';
  metrics: MetricItem[];
}

export interface MetricItem {
  label: string;
  value: string | number;
  format?: 'currency' | 'percent' | 'number' | 'compact';
  delta?: number;
  deltaDirection?: 'up' | 'down' | 'flat';
}

export interface ChartBlock {
  type: 'chart';
  chartType: 'line' | 'bar' | 'area';
  title?: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
}

export interface TableBlock {
  type: 'table';
  title?: string;
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  pageSize?: number;
}

export interface TableColumn {
  key: string;
  label: string;
  format?: 'text' | 'badge' | 'number' | 'currency' | 'percent';
}

export interface InsightBlock {
  type: 'insight';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success' | 'critical';
  confidence?: number;
}

export interface ConfirmationBlock {
  type: 'confirmation';
  action: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  message: string;
  progress?: number;
}

export interface ProgressBlock {
  type: 'progress';
  label: string;
  current: number;
  total: number;
  status?: string;
}

export interface ErrorBlock {
  type: 'error';
  message: string;
  code?: string;
  suggestion?: string;
}
