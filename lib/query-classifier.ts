/**
 * Query Classifier
 * Automatically determines task type based on query content
 * No user selection required - analyzed by intent, keywords, and context
 */

import type { TaskType, RiskLevel } from '@/types/adzeta';

interface ClassificationResult {
  task_type: TaskType;
  risk_level: RiskLevel;
  confidence: number; // 0-1, how confident we are in this classification
  reasoning: string;
  suggested_title: string;
}

// Keywords that indicate different task types
const KEYWORDS: Record<TaskType, string[]> = {
  research: [
    'find', 'look up', 'search', 'what is', 'who is', 'tell me about',
    'information about', 'research', 'learn about', 'get data on',
    'show me', 'list', 'compare', 'analyze data', 'review',
    'market research', 'competitor', 'industry', 'trends',
    'prospects', 'companies', 'contacts', 'people',
    'how much', 'how many', 'when was', 'where is'
  ],
  analytics: [
    'report', 'dashboard', 'metrics', 'KPI', 'performance',
    'conversion rate', 'open rate', 'click rate', 'response rate',
    'funnel', 'pipeline', 'forecast', 'trend', 'summary',
    'stats', 'statistics', 'measure', 'track', 'monitor',
    'how are we doing', 'progress', 'results', 'outcomes',
    'churn', 'retention', 'acquisition', 'revenue'
  ],
  recommendation: [
    'should I', 'recommend', 'suggest', 'advice', 'what should',
    'which', 'optimal', 'best', 'better', 'improve',
    'optimize', 'strategy', 'plan', 'approach', 'tactic',
    'prioritize', 'focus on', 'invest in', 'double down',
    'next steps', 'what to do', 'how to', 'guidance'
  ],
  action: [
    'send', 'email', 'call', 'schedule', 'book', 'create',
    'launch', 'start', 'stop', 'pause', 'resume',
    'delete', 'remove', 'update', 'change', 'modify',
    'deploy', 'publish', 'post', 'message', 'text',
    'invite', 'export', 'import', 'sync', 'connect',
    'enable', 'disable', 'configure', 'setup', 'build'
  ],
  proactive_alert: [
    'alert', 'notify', 'remind', 'warning', 'anomaly',
    'unusual', 'spike', 'drop', 'threshold', 'limit',
    'approaching', 'deadline', 'overdue', 'expired',
    'pattern', 'correlation', 'insight', 'opportunity'
  ]
};

// Risk indicators that elevate risk level
const RISK_INDICATORS: Record<RiskLevel, string[]> = {
  critical: [
    'delete', 'remove all', 'permanent', 'irreversible',
    'billing', 'payment', 'refund', 'cancel subscription',
    'send to all', 'blast', 'mass email'
  ],
  high: [
    'send email', 'schedule', 'launch', 'publish', 'deploy',
    'update', 'change', 'modify', 'configure'
  ],
  medium: [
    'recommend', 'suggest', 'optimize', 'improve'
  ],
  low: [
    'find', 'search', 'what is', 'show me', 'list'
  ]
};

/**
 * Classify a query into task type and risk level
 */
export function classifyQuery(query: string): ClassificationResult {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  
  // Score each task type by keyword matches
  const scores: Record<TaskType, number> = {
    research: 0,
    analytics: 0,
    recommendation: 0,
    action: 0,
    proactive_alert: 0
  };
  
  // Check for action keywords first (highest priority for safety)
  for (const keyword of KEYWORDS.action) {
    if (lowerQuery.includes(keyword)) {
      scores.action += 2; // Weight actions more heavily
    }
  }
  
  // Check other keywords
  for (const [type, keywords] of Object.entries(KEYWORDS)) {
    if (type === 'action') continue; // Already counted
    
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        scores[type as TaskType] += 1;
      }
    }
  }
  
  // Check for question patterns (research)
  if (query.trim().endsWith('?')) {
    scores.research += 0.5;
  }
  
  // Check for imperative/action patterns
  const actionWords = ['send', 'create', 'update', 'delete', 'schedule', 'launch'];
  if (actionWords.some(w => words[0]?.toLowerCase() === w)) {
    scores.action += 1.5;
  }
  
  // Find highest scoring type
  let task_type: TaskType = 'research'; // default
  let maxScore = 0;
  
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      task_type = type as TaskType;
    }
  }
  
  // If no clear winner, use contextual clues
  if (maxScore < 1) {
    // Check if query is short and ends with ? -> research
    if (query.trim().endsWith('?') && words.length < 10) {
      task_type = 'research';
    }
    // Check if it starts with "should" or similar -> recommendation
    else if (/^(should|could|would|recommend|suggest)/i.test(query)) {
      task_type = 'recommendation';
    }
    // Default to action if it looks like a command
    else if (words.length <= 3) {
      task_type = 'action';
    }
  }
  
  // Determine risk level
  let risk_level: RiskLevel = 'low';
  
  // Check critical risk indicators
  if (RISK_INDICATORS.critical.some(ind => lowerQuery.includes(ind))) {
    risk_level = 'critical';
  }
  // Check high risk
  else if (RISK_INDICATORS.high.some(ind => lowerQuery.includes(ind)) || task_type === 'action') {
    risk_level = 'high';
  }
  // Check medium risk
  else if (RISK_INDICATORS.medium.some(ind => lowerQuery.includes(ind)) || task_type === 'recommendation') {
    risk_level = 'medium';
  }
  
  // Calculate classification confidence
  const confidence = Math.min(1, maxScore / 3); // Normalize to 0-1
  
  // Generate reasoning
  const reasoning = generateReasoning(task_type, risk_level, maxScore, lowerQuery);
  
  // Generate suggested title
  const suggested_title = generateTitle(query, task_type);
  
  return {
    task_type,
    risk_level,
    confidence: Math.max(0.5, confidence), // Minimum 50% confidence
    reasoning,
    suggested_title
  };
}

function generateReasoning(
  task_type: TaskType,
  risk_level: RiskLevel,
  score: number,
  query: string
): string {
  const reasons: string[] = [];
  
  reasons.push(`Classified as ${task_type} based on query patterns`);
  
  if (task_type === 'action') {
    reasons.push('Contains action-oriented keywords (send, create, update)');
  } else if (task_type === 'research') {
    reasons.push('Appears to be seeking information or data');
  } else if (task_type === 'analytics') {
    reasons.push('References metrics, reports, or performance data');
  } else if (task_type === 'recommendation') {
    reasons.push('Seeks strategic guidance or next steps');
  }
  
  if (risk_level === 'high' || risk_level === 'critical') {
    reasons.push('Contains high-impact action keywords requiring approval');
  }
  
  return reasons.join('. ') + '.';
}

function generateTitle(query: string, task_type: TaskType): string {
  // Clean up query for title
  let title = query.trim();
  
  // Remove question marks for title
  title = title.replace(/\?$/, '');
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Truncate if too long
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }
  
  // Add task type prefix
  const prefixes: Record<TaskType, string> = {
    research: 'Research:',
    analytics: 'Analytics:',
    recommendation: 'Recommendation:',
    action: 'Action:',
    proactive_alert: 'Alert:'
  };
  
  return `${prefixes[task_type]} ${title}`;
}

/**
 * Analyze if this query is asking for something that should trigger approval
 * based on current autonomy gate settings
 */
export function shouldRequireApproval(
  classification: ClassificationResult,
  gateStatus?: { current_status?: string; min_confidence?: number }
): boolean {
  // Always require approval for high/critical risk
  if (classification.risk_level === 'high' || classification.risk_level === 'critical') {
    return true;
  }
  
  // If gate isn't unlocked, require approval
  if (!gateStatus || gateStatus.current_status !== 'unlocked') {
    return true;
  }
  
  // If confidence is below gate threshold, require approval
  if (classification.confidence < (gateStatus.min_confidence ?? 0.7)) {
    return true;
  }
  
  // Otherwise, can auto-execute
  return false;
}

/**
 * Get suggested action text based on classification
 */
export function getSuggestedAction(classification: ClassificationResult): string {
  switch (classification.task_type) {
    case 'research':
      return 'Execute research query and return findings';
    case 'analytics':
      return 'Generate and return analytics report';
    case 'recommendation':
      return 'Analyze context and provide strategic recommendations';
    case 'action':
      return 'Execute requested action and confirm completion';
    case 'proactive_alert':
      return 'Review and take suggested action';
    default:
      return 'Process request and return results';
  }
}
