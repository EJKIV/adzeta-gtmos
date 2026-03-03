// Block types
export interface TextBlock {
  type: 'text';
  text: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export interface TableBlock {
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
  rows: Array<Record<string, unknown>>;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  rowActions?: Array<{
    id: string;
    label: string;
    icon?: string;
    variant?: 'default' | 'primary' | 'danger';
  }>;
}

export interface CardBlock {
  type: 'cards';
  layout: 'row' | 'grid';
  cards: Array<{
    id: string;
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: {
      direction: 'up' | 'down' | 'flat';
      value: string;
      period?: string;
    };
    icon?: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
    action?: {
      label: string;
      skillId: string;
      params: Record<string, unknown>;
    };
  }>;
}

export interface ChartBlock {
  type: 'chart';
  chartType: 'line' | 'bar' | 'area' | 'pie' | 'funnel';
  title?: string;
  description?: string;
  data: Array<{
    label: string;
    value: number;
    series?: Record<string, number>;
    date?: string;
  }>;
  xAxis?: { label?: string; format?: 'date' | 'number' | 'text' };
  yAxis?: { label?: string; format?: 'number' | 'currency' | 'percent' };
  colors?: string[];
  height?: number;
}

export interface ListBlock {
  type: 'list';
  style: 'bullet' | 'numbered' | 'checklist';
  title?: string;
  items: Array<{
    id: string;
    text: string;
    subtext?: string;
    icon?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'error';
    action?: {
      label: string;
      skillId: string;
      params: Record<string, unknown>;
    };
  }>;
}

export interface ErrorBlock {
  type: 'error';
  message: string;
  code?: string;
  details?: string;
  suggestions?: string[];
  retryable?: boolean;
  retrySkillId?: string;
  retryParams?: Record<string, unknown>;
}

export interface CodeBlock {
  type: 'code';
  language: string;
  code: string;
  filename?: string;
  output?: string;
  exitCode?: number;
  actions?: Array<{
    id: string;
    label: string;
    action: 'copy' | 'download' | 'execute';
  }>;
}

export interface ButtonBlock {
  type: 'buttons';
  message?: string;
  buttons: Array<{
    id: string;
    label: string;
    variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'ghost';
    icon?: string;
    action: {
      type: 'skill' | 'url' | 'modal' | 'confirm';
      skillId?: string;
      params?: Record<string, unknown>;
      url?: string;
      modalContent?: Block[];
      confirmText?: string;
    };
  }>;
}

export interface FormBlock {
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
    options?: Array<{ value: string; label: string }>;
    min?: number;
    max?: number;
    pattern?: string;
  }>;
  submitLabel?: string;
  cancelLabel?: string;
  submitSkillId: string;
}

export interface SelectorBlock {
  type: 'selector';
  id: string;
  title?: string;
  description?: string;
  options: Array<{
    id: string;
    label: string;
    description?: string;
    icon?: string;
    metadata?: Record<string, unknown>;
  }>;
  layout: 'dropdown' | 'cards' | 'list';
  selectSkillId: string;
}

export interface FilterBlock {
  type: 'filters';
  id: string;
  title?: string;
  currentFilters: Record<string, unknown>;
  filters: Array<{
    id: string;
    label: string;
    type: 'text' | 'select' | 'date_range' | 'number_range' | 'checkboxes';
    options?: Array<{ value: string; label: string }>;
    defaultValue?: unknown;
  }>;
  changeSkillId: string;
  resultCount?: number;
  resultLabel?: string;
}

export interface RecommendationBlock {
  type: 'recommendations';
  title?: string;
  description?: string;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    confidenceScore: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    evidence?: Array<{
      label: string;
      value: string;
      trend?: 'up' | 'down' | 'flat';
    }>;
    action: {
      skillId: string;
      params: Record<string, unknown>;
      label: string;
    };
    dismissable?: boolean;
  }>;
}

export interface DecisionBlock {
  type: 'decision';
  id: string;
  title: string;
  description: string;
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
  options: {
    approve: {
      label: string;
      skillId: string;
      params: Record<string, unknown>;
    };
    reject: {
      label: string;
      feedbackForm?: FormBlock;
    };
    postpone?: {
      label: string;
      duration: string;
    };
  };
}

export interface ProgressBlock {
  type: 'progress';
  id: string;
  title?: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress?: number;
  steps?: Array<{
    id: string;
    label: string;
    status: 'pending' | 'running' | 'completed' | 'skipped' | 'error';
    details?: string;
  }>;
  startedAt?: string;
  estimatedCompletion?: string;
  elapsedMs?: number;
  actions?: Array<{
    id: string;
    label: string;
    icon?: string;
    action: 'pause' | 'resume' | 'cancel' | 'retry';
  }>;
}

export type Block =
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
  | ProgressBlock;

// Skill output
export interface SkillOutput {
  skillId: string;
  status: 'success' | 'partial_success' | 'error';
  blocks: Block[];
  followUps: Array<{
    text: string;
    skillId: string;
    params: Record<string, unknown>;
  }>;
  executionMs: number;
  dataFreshness: 'live' | 'cached' | 'mock' | 'offline';
  context?: {
    lastQuery?: string;
    entities?: Record<string, unknown>;
    intent?: string;
  };
}

// Message
export interface Message {
  id: string;
  sessionId: string;
  type: 'user' | 'assistant' | 'system' | 'tool_result' | 'error';
  text: string;
  clientId?: string;
  output?: SkillOutput;
  tokensUsed?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// SSE Events
export interface StatusEvent {
  phase: 'matching' | 'executing' | 'connecting' | 'streaming' | 'complete' | 'error';
  message: string;
  ts: number;
  skillId?: string;
  skillName?: string;
  progress?: number;
}

export interface DeltaEvent {
  content: string;
}

export interface DoneEvent {
  done: true;
}
