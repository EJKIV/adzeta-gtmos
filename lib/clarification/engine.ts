import type { SupabaseClient } from '@supabase/supabase-js';

// Clarification result returned to API
export interface ClarificationResult {
  confidence: number; // 0-1, how confident we are in the intent
  ready: boolean; // true = can proceed, false = need more clarification
  message: string; // What to tell the user
  actions: ClarificationAction[]; // Dynamic buttons/questions
  nextStep?: {
    skill: string;
    action: string;
    description: string;
  };
}

// An action button or choice - NOT a form field
export interface ClarificationAction {
  id: string;
  type: 'button' | 'choice' | 'confirm' | 'text';
  label: string;
  description?: string;
  
  // For buttons: what happens when clicked
  command?: string; // Natural language command to execute
  
  // For choices: available options
  options?: { label: string; value: unknown; description?: string }[];
  
  // For text: what kind of input expected
  placeholder?: string;
  
  // Confidence boost if this action is taken
  confidenceDelta?: number;
  
  // What this action provides
  provides?: {
    key: string;
    value?: unknown;
  };
}

// Intent component that can be clarified
interface IntentProbe {
  key: string;
  label: string;
  
  // How to check if we have this info
  hasValue: (intent: Record<string, unknown>) => boolean;
  
  // Get current value
  getValue: (intent: Record<string, unknown>) => unknown;
  
  // Questions to ask if missing
  questions: {
    // Directed question
    question: string;
    
    // Action buttons to present
    actions: ClarificationAction[];
    
    // Expected confidence if answered
    expectedConfidence: number;
  }[];
}

// Define all probes for campaign intent
const CAMPAIGN_PROBES: IntentProbe[] = [
  {
    key: 'job_titles',
    label: 'Job Titles',
    hasValue: (i) => {
      const titles = (i?.icp?.titles || i?.targeting?.titles) as string[] | undefined;
      return titles?.length > 0 || false;
    },
    getValue: (i) => (i?.icp?.titles || i?.targeting?.titles) as string[] | undefined,
    questions: [
      {
        question: 'Who are we targeting? Pick the most important roles:',
        expectedConfidence: 0.3,
        actions: [
          {
            id: 'title_vpsales',
            type: 'button',
            label: 'VP Sales',
            description: 'Vice President of Sales and Chief Revenue Officers',
            command: 'target VP Sales and CROs',
            confidenceDelta: 0.15,
            provides: { key: 'icp.titles', value: ['VP Sales', 'CRO'] },
          },
          {
            id: 'title_cmo',
            type: 'button',
            label: 'CMO',
            description: 'Chief Marketing Officers and marketing leaders',
            command: 'target Chief Marketing Officers',
            confidenceDelta: 0.15,
            provides: { key: 'icp.titles', value: ['CMO', 'VP Marketing'] },
          },
          {
            id: 'title_growth',
            type: 'button',
            label: 'Head of Growth',
            description: 'Growth leaders and demand gen managers',
            command: 'target Head of Growth and demand gen leaders',
            confidenceDelta: 0.15,
            provides: { key: 'icp.titles', value: ['Head of Growth', 'VP Demand Gen'] },
          },
          {
            id: 'title_multiple',
            type: 'button',
            label: 'Multiple roles',
            description: 'I want to target several different titles',
            command: 'show all job title options',
            confidenceDelta: 0.1,
          },
          {
            id: 'title_other',
            type: 'text',
            label: 'Other',
            placeholder: 'e.g. VP Product, Director of Engineering',
            confidenceDelta: 0.15,
          },
        ],
      },
    ],
  },
  {
    key: 'industry',
    label: 'Industry',
    hasValue: (i) => {
      const ind = (i?.icp?.industries || i?.targeting?.industries) as string[] | undefined;
      return ind?.length > 0 || false;
    },
    getValue: (i) => (i?.icp?.industries || i?.targeting?.industries) as string[] | undefined,
    questions: [
      {
        question: 'Any specific industries?',
        expectedConfidence: 0.15,
        actions: [
          {
            id: 'ind_saas',
            type: 'button',
            label: 'SaaS',
            command: 'target SaaS companies',
            confidenceDelta: 0.1,
            provides: { key: 'icp.industries', value: ['SaaS'] },
          },
          {
            id: 'ind_fintech',
            type: 'button',
            label: 'Fintech',
            command: 'target Fintech companies',
            confidenceDelta: 0.1,
            provides: { key: 'icp.industries', value: ['Fintech'] },
          },
          {
            id: 'ind_any',
            type: 'button',
            label: 'Any industry',
            description: 'Open to all industries',
            command: 'target any industry',
            confidenceDelta: 0.05,
            provides: { key: 'icp.industries', value: undefined },
          },
        ],
      },
    ],
  },
  {
    key: 'company_size',
    label: 'Company Size',
    hasValue: (i) => {
      const size = (i?.icp?.companySize || i?.targeting?.companySize) as string | undefined;
      return size !== undefined || false;
    },
    getValue: (i) => (i?.icp?.companySize || i?.targeting?.companySize) as string | undefined,
    questions: [
      {
        question: 'Company size range?',
        expectedConfidence: 0.1,
        actions: [
          {
            id: 'size_startup',
            type: 'button',
            label: 'Startup (10-50)',
            command: 'target startups 10-50 employees',
            confidenceDelta: 0.05,
            provides: { key: 'icp.companySize', value: '10-50' },
          },
          {
            id: 'size_mid',
            type: 'button',
            label: 'Mid (50-200)',
            command: 'target mid-size companies 50-200 employees',
            confidenceDelta: 0.05,
            provides: { key: 'icp.companySize', value: '50-200' },
          },
          {
            id: 'size_growth',
            type: 'button',
            label: 'Growth (200-1000)',
            command: 'target growth companies 200-1000 employees',
            confidenceDelta: 0.05,
            provides: { key: 'icp.companySize', value: '200-1000' },
          },
          {
            id: 'size_any',
            type: 'button',
            label: 'Any size',
            command: 'target any company size',
            confidenceDelta: 0.02,
            provides: { key: 'icp.companySize', value: 'any' },
          },
        ],
      },
    ],
  },
  {
    key: 'campaign_type',
    label: 'Campaign Type',
    hasValue: (i) => {
      const type = (i?.campaign?.type || i?.type) as string | undefined;
      return type !== undefined || false;
    },
    getValue: (i) => (i?.campaign?.type || i?.type) as string | undefined,
    questions: [
      {
        question: 'What kind of outreach?',
        expectedConfidence: 0.25,
        actions: [
          {
            id: 'type_email',
            type: 'button',
            label: '📧 Email sequence',
            description: 'Multi-touch email campaign (recommended)',
            command: 'create email sequence campaign',
            confidenceDelta: 0.2,
            provides: { key: 'campaign.type', value: 'email_sequence' },
          },
          {
            id: 'type_linkedin',
            type: 'button',
            label: '💼 LinkedIn',
            description: 'LinkedIn connection + messaging campaign',
            command: 'create linkedin outreach campaign',
            confidenceDelta: 0.15,
            provides: { key: 'campaign.type', value: 'linkedin' },
          },
          {
            id: 'type_multi',
            type: 'button',
            label: '🔄 Multi-channel',
            description: 'Email + LinkedIn + voice combo',
            command: 'create multi-channel campaign',
            confidenceDelta: 0.15,
            provides: { key: 'campaign.type', value: 'multi_channel' },
          },
        ],
      },
    ],
  },
  {
    key: 'timing',
    label: 'Timing',
    hasValue: (i) => {
      const when = (i?.campaign?.timing || i?.when) as string | undefined;
      return when !== undefined || false;
    },
    getValue: (i) => (i?.campaign?.timing || i?.when) as string | undefined,
    questions: [
      {
        question: 'When should this launch?',
        expectedConfidence: 0.1,
        actions: [
          {
            id: 'time_now',
            type: 'button',
            label: 'Start now',
            command: 'launch campaign immediately',
            confidenceDelta: 0.05,
            provides: { key: 'campaign.timing', value: 'immediate' },
          },
          {
            id: 'time_schedule',
            type: 'button',
            label: 'Schedule',
            description: 'Pick a date/time',
            command: 'schedule campaign for later',
            confidenceDelta: 0.05,
          },
        ],
      },
    ],
  },
];

// Get current confidence level based on filled probes
function calculateConfidence(intent: Record<string, unknown>): number {
  let confidence = 0;
  
  for (const probe of CAMPAIGN_PROBES) {
    if (probe.hasValue(intent)) {
      // Add confidence for each completed probe
      confidence += 0.15;
    }
  }
  
  // Bonus for having multiple targeting criteria
  const titles = (intent?.icp?.titles || intent?.targeting?.titles) as string[] | undefined;
  if (titles && titles.length > 1) confidence += 0.05;
  
  // Cap at 1.0
  return Math.min(1, confidence);
}

// Find next question to ask
function findNextQuestion(intent: Record<string, unknown>): { probe: IntentProbe; question: IntentProbe['questions'][0] } | null {
  // Priority order for required vs optional
  const priorityOrder = ['job_titles', 'campaign_type', 'industry', 'company_size'];
  
  // Check required first
  for (const probe of CAMPAIGN_PROBES) {
    if (!probe.hasValue(intent)) {
      // Found missing probe, return its first question
      return { probe, question: probe.questions[0] };
    }
  }
  
  return null;
}

// Generate message based on current state
function generateMessage(intent: Record<string, unknown>, confidence: number): string {
  const missing = CAMPAIGN_PROBES.filter(p => !p.hasValue(intent));
  
  if (missing.length === 0) {
    return `Looks good! I'll target ${describeAudience(intent)}. Ready to build this campaign?`;
  }
  
  if (missing.length === CAMPAIGN_PROBES.length) {
    return "I'll help you build a targeted campaign. Let's start with who you're trying to reach.";
  }
  
  const nextMissing = missing[0];
  if (nextMissing.key === 'job_titles') {
    return "Who should we target? Pick the roles that matter most.";
  }
  if (nextMissing.key === 'campaign_type') {
    return "Got it. What type of outreach do you prefer?";
  }
  
  return `Almost there. ${nextMissing.label}?`;
}

// Describe the current audience in natural language
function describeAudience(intent: Record<string, unknown>): string {
  const parts: string[] = [];
  
  const titles = ((intent?.icp?.titles || intent?.targeting?.titles) as string[] | undefined)?.slice(0, 2);
  if (titles) parts.push(titles.join(' and '));
  
  const industries = ((intent?.icp?.industries || intent?.targeting?.industries) as string[] | undefined)?.slice(0, 2);
  if (industries) parts.push(`in ${industries.join(' and ')}`);
  
  const size = (intent?.icp?.companySize || intent?.targeting?.companySize) as string | undefined;
  if (size && size !== 'any') parts.push(`(${size} employees)`);
  
  return parts.length > 0 ? parts.join(' ') : 'your criteria';
}

// Main function: generate clarification questions/actions
export async function generateClarificationQuestions(params: {
  intent: Record<string, unknown>;
  depth: number;
  mode: 'initial' | 'follow_up' | 'confirm';
  userId: string;
  supabase: SupabaseClient;
}): Promise<ClarificationResult> {
  const { intent, depth, mode } = params;
  
  // Don't ask forever - cap at 3 rounds
  if (depth >= 3) {
    const confidence = calculateConfidence(intent);
    
    return {
      confidence,
      ready: confidence >= 0.4, // Lower threshold after 3 tries
      message: confidence >= 0.4
        ? `Good enough. I'll target ${describeAudience(intent)}.`
        : "I'm not quite sure what you need. Want to try a different approach?",
      actions: [
        {
          id: 'proceed',
          type: 'confirm',
          label: confidence >= 0.4 ? 'Create campaign' : 'Try examples',
          command: confidence >= 0.4 ? 'proceed with campaign' : 'show campaign examples',
        },
        {
          id: 'restart',
          type: 'button',
          label: 'Start over',
          command: 'restart clarification',
        },
      ],
      nextStep: confidence >= 0.4 ? {
        skill: 'workflow.create_campaign',
        action: 'create',
        description: 'Create campaign with current intent',
      } : undefined,
    };
  }
  
  // Find next missing info
  const nextQ = findNextQuestion(intent);
  
  if (!nextQ) {
    // Everything filled - ready to proceed
    const confidence = calculateConfidence(intent);
    return {
      confidence,
      ready: true,
      message: `Perfect. Campaign targeting ${describeAudience(intent)}.`,
      actions: [
        {
          id: 'create',
          type: 'confirm',
          label: 'Create campaign now',
          command: 'create campaign with current settings',
          confidenceDelta: 0,
        },
        {
          id: 'review',
          type: 'button',
          label: 'Review details',
          command: 'show campaign details before creating',
        },
        {
          id: 'modify',
          type: 'button',
          label: 'Change something',
          command: 'modify campaign settings',
        },
      ],
      nextStep: {
        skill: 'workflow.create_campaign',
        action: 'create',
        description: 'Create full campaign with sequences',
      },
    };
  }
  
  // Still need more info - return question with actions
  const confidence = calculateConfidence(intent);
  const { question, probe } = nextQ;
  
  return {
    confidence,
    ready: false,
    message: question.question,
    actions: question.actions.map(action => ({
      ...action,
      // Include context about what this answers
      metadata: {
        answers: action.provides ? { [action.provides.key]: action.provides.value } : undefined,
      },
    })),
  };
}

// Apply user answers to intent
export function applyAnswers(
  intent: Record<string, unknown>,
  answers: Record<string, unknown>
): Record<string, unknown> {
  const updated = { ...intent };
  
  for (const [key, value] of Object.entries(answers)) {
    // Handle nested keys like 'icp.titles'
    const parts = key.split('.');
    let target: Record<string, unknown> = updated;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!target[part] || typeof target[part] !== 'object') {
        target[part] = {};
      }
      target = target[part] as Record<string, unknown>;
    }
    
    target[parts[parts.length - 1]] = value;
  }
  
  return updated;
}

// Determine if we should ask more questions or proceed
export function shouldContinueClarifying(
  intent: Record<string, unknown>,
  depth: number
): boolean {
  const confidence = calculateConfidence(intent);
  
  // Stop if confident enough
  if (confidence >= 0.6) return false;
  
  // Stop if asked too many times
  if (depth >= 3) return false;
  
  // Continue if missing required info
  const titles = ((intent?.icp?.titles || intent?.targeting?.titles) as string[] | undefined)?.length || 0;
  const campaignType = (intent?.campaign?.type || intent?.type) as string | undefined;
  
  // Must have at least titles OR campaign type
  if (titles === 0 && !campaignType) return true;
  
  // Otherwise we're good
  return confidence < 0.4;
}
