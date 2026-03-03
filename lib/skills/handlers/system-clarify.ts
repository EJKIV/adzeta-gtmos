/**
 * Skill: system.clarify_intent
 * 
 * Asks clarifying questions when task information is incomplete.
 * Analyzes intent components, identifies gaps, and guides user to complete plan.
 * 
 * Workflow:
 * 1. Receives task with incomplete intent
 * 2. Analyzes what's missing (required vs optional)
 * 3. Returns interactive clarification UI
 * 4. Pauses workflow until user responds
 * 5. Resumes with complete intent
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput, InsightBlock, TableBlock, ActionBlock } from '../types';

// Component types with validation rules
interface IntentComponent {
  name: string;
  key: string;
  required: boolean;
  extract: (intent: Record<string, unknown>) => unknown;
  validate: (value: unknown) => boolean;
  quickOptions?: { label: string; value: unknown }[];
  description?: string;
}

// Define all intent components for campaign/outreach tasks
const INTENT_COMPONENTS: IntentComponent[] = [
  {
    name: 'Job Titles',
    key: 'icp.titles',
    required: true,
    extract: (intent) => {
      const icp = (intent?.icp || intent?.targeting) as Record<string, unknown> | undefined;
      return icp?.titles;
    },
    validate: (v) => Array.isArray(v) && v.length > 0 && v.every(i => typeof i === 'string' && i.length > 0),
    description: 'What job titles are you targeting?',
    quickOptions: [
      { label: 'VP Sales', value: ['VP Sales'] },
      { label: 'CMO', value: ['CMO'] },
      { label: 'Head of Growth', value: ['Head of Growth'] },
      { label: 'VP Marketing', value: ['VP Marketing'] },
      { label: 'CEO', value: ['CEO'] },
      { label: 'CFO', value: ['CFO'] },
    ],
  },
  {
    name: 'Industries',
    key: 'icp.industries',
    required: false,
    extract: (intent) => {
      const icp = (intent?.icp || intent?.targeting) as Record<string, unknown> | undefined;
      return icp?.industries;
    },
    validate: (v) => v === undefined || (Array.isArray(v) && v.every(i => typeof i === 'string')),
    description: 'Which industries?',
    quickOptions: [
      { label: 'SaaS', value: ['SaaS'] },
      { label: 'Fintech', value: ['Fintech'] },
      { label: 'AI/ML', value: ['AI/ML'] },
      { label: 'eCommerce', value: ['eCommerce'] },
      { label: 'Healthcare', value: ['Healthcare'] },
      { label: 'All industries', value: undefined },
    ],
  },
  {
    name: 'Company Size',
    key: 'icp.companySize',
    required: false,
    extract: (intent) => {
      const icp = (intent?.icp || intent?.targeting) as Record<string, unknown> | undefined;
      return icp?.companySize;
    },
    validate: (v) => v === undefined || (typeof v === 'string' && v.length > 0),
    description: 'Company size range?',
    quickOptions: [
      { label: '10-50 employees', value: '10-50' },
      { label: '50-200', value: '50-200' },
      { label: '200-1000', value: '200-1000' },
      { label: '1000+', value: '1000+' },
      { label: 'Any size', value: undefined },
    ],
  },
  {
    name: 'Signal Criteria',
    key: 'icp.signals',
    required: false,
    extract: (intent) => {
      const icp = (intent?.icp || intent?.targeting) as Record<string, unknown> | undefined;
      return icp?.signals;
    },
    validate: (v) => v === undefined || Array.isArray(v),
    description: 'Any specific signals?',
    quickOptions: [
      { label: 'Recent funding', value: ['recent_funding'] },
      { label: 'Hiring', value: ['hiring'] },
      { label: 'New executives', value: ['new_executive'] },
      { label: 'High growth', value: ['high_growth'] },
      { label: 'No specific signals', value: undefined },
    ],
  },
  {
    name: 'Campaign Type',
    key: 'campaign.type',
    required: true,
    extract: (intent) => {
      const campaign = intent?.campaign as Record<string, unknown> | undefined;
      return campaign?.type || intent?.sequenceType || intent?.type;
    },
    validate: (v) => typeof v === 'string' && ['email', 'linkedin', 'multi_channel', 'call'].includes(v),
    description: 'What type of outreach?',
    quickOptions: [
      { label: 'Email sequence', value: 'email' },
      { label: 'LinkedIn outreach', value: 'linkedin' },
      { label: 'Multi-channel', value: 'multi_channel' },
      { label: 'Call campaign', value: 'call' },
    ],
  },
  {
    name: 'Sequence Steps',
    key: 'campaign.steps',
    required: false,
    extract: (intent) => {
      const campaign = intent?.campaign as Record<string, unknown> | undefined;
      return campaign?.steps || intent?.steps;
    },
    validate: (v) => v === undefined || (typeof v === 'number' && v >= 1 && v <= 10),
    description: 'How many touchpoints?',
    quickOptions: [
      { label: '3-step sequence', value: 3 },
      { label: '5-step sequence', value: 5 },
      { label: '7-step sequence', value: 7 },
      { label: 'Custom', value: undefined },
    ],
  },
];

interface ComponentStatus {
  component: IntentComponent;
  currentValue: unknown;
  isProvided: boolean;
  isValid: boolean;
}

/**
 * Analyze intent and return status of all components
 */
function analyzeIntent(intent: Record<string, unknown>): ComponentStatus[] {
  return INTENT_COMPONENTS.map(component => {
    const currentValue = component.extract(intent);
    const isProvided = currentValue !== undefined && currentValue !== null;
    const isValid = isProvided && component.validate(currentValue);
    
    return {
      component,
      currentValue,
      isProvided,
      isValid,
    };
  });
}

/**
 * Build the clarification message based on missing components
 */
function buildClarificationMessage(statuses: ComponentStatus[]): { title: string; description: string } {
  const missingRequired = statuses.filter(s => s.component.required && !s.isProvided);
  const missingOptional = statuses.filter(s => !s.component.required && !s.isProvided);
  
  if (missingRequired.length === 0) {
    return {
      title: 'Almost Ready',
      description: 'I have the required information. You can add optional details to refine your targeting.',
    };
  }
  
  const requiredNames = missingRequired.map(s => s.component.name).join(' and ');
  
  return {
    title: `Need ${missingRequired.length === 1 ? 'One More Thing' : 'More Information'}`,
    description: `To create your sequence, I need to know: ${requiredNames}. ` +
      (missingOptional.length > 0 
        ? `Optional: ${missingOptional.slice(0, 2).map(s => s.component.name).join(', ')}.` 
        : ''),
  };
}

/**
 * Build quick options for user selection
 */
function buildQuickOptions(statuses: ComponentStatus[]): { label: string; command: string }[] {
  const options: { label: string; command: string }[] = [];
  
  for (const status of statuses) {
    if (!status.isProvided && status.component.quickOptions) {
      for (const opt of status.component.quickOptions.slice(0, 2)) {
        options.push({
          label: `${status.component.name}: ${opt.label}`,
          command: `set ${status.component.key} to ${JSON.stringify(opt.value)} for sequence`,
        });
      }
    }
  }
  
  // Add a "Proceed with defaults" if we have required fields
  const missingRequired = statuses.filter(s => s.component.required && !s.isProvided);
  if (missingRequired.length === 0) {
    options.push({
      label: 'Create sequence with current settings',
      command: 'proceed with creating sequence',
    });
  }
  
  return options.slice(0, 6);
}

/**
 * Build the status table showing what we know vs what's missing
 */
function buildStatusTable(statuses: ComponentStatus[]): TableBlock {
  const rows = statuses.map(s => {
    let statusText: string;
    let statusIcon: string;
    
    if (s.isProvided && s.isValid) {
      statusText = '✓ Provided';
      statusIcon = 'success';
    } else if (s.isProvided && !s.isValid) {
      statusText = '⚠ Invalid';
      statusIcon = 'warning';
    } else if (s.component.required) {
      statusText = '❌ Required';
      statusIcon = 'error';
    } else {
      statusText = '○ Optional';
      statusIcon = 'neutral';
    }
    
    return {
      component: s.component.name,
      status: statusText,
      value: s.isProvided 
        ? (Array.isArray(s.currentValue) 
            ? s.currentValue.slice(0, 3).join(', ') + (s.currentValue.length > 3 ? '...' : '')
            : String(s.currentValue).slice(0, 30))
        : '—',
      importance: s.component.required ? 'Required' : 'Optional',
    };
  });
  
  return {
    type: 'table',
    title: 'Intent Status',
    columns: [
      { key: 'component', label: 'Component' },
      { key: 'value', label: 'Current Value' },
      { key: 'status', label: 'Status' },
      { key: 'importance', label: 'Type' },
    ],
    rows,
  };
}

/**
 * Determine if we should proceed or wait for more input
 */
function shouldAwaitInput(statuses: ComponentStatus[]): boolean {
  const missingRequired = statuses.filter(s => s.component.required && !s.isProvided);
  return missingRequired.length > 0;
}

/**
 * Main handler
 */
async function handler(input: SkillInput): Promise<SkillOutput> {
  const intent = (input.params.intent || input.params) as Record<string, unknown>;
  const mode = input.params.mode as 'check' | 'update' | undefined;
  const updates = input.params.updates as Record<string, unknown> | undefined;
  
  // Apply updates if provided (resuming from user input)
  let currentIntent = { ...intent };
  if (mode === 'update' && updates) {
    // Deep merge updates into intent
    for (const [key, value] of Object.entries(updates)) {
      const parts = key.split('.');
      let target: Record<string, unknown> = currentIntent;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!target[part] || typeof target[part] !== 'object') {
          target[part] = {};
        }
        target = target[part] as Record<string, unknown>;
      }
      
      target[parts[parts.length - 1]] = value;
    }
  }
  
  // Analyze current intent
  const statuses = analyzeIntent(currentIntent);
  const awaitsInput = shouldAwaitInput(statuses);
  const message = buildClarificationMessage(statuses);
  
  // If we're waiting for input, return awaiting status
  if (awaitsInput) {
    const blocks: (InsightBlock | TableBlock)[] = [
      {
        type: 'insight',
        title: message.title,
        description: message.description,
        severity: 'info',
      },
      buildStatusTable(statuses),
    ];
    
    const quickOptions = buildQuickOptions(statuses);
    
    return {
      skillId: 'system.clarify_intent',
      status: 'awaiting_input',
      blocks,
      quickOptions,
      followUps: quickOptions.slice(0, 3).map(o => ({ label: o.label, command: o.command })),
      executionMs: 0,
      dataFreshness: 'live',
      // Metadata for workflow resumption
      metadata: {
        await_stage: 'clarify_intent',
        await_reason: 'missing_required_fields',
        required_fields: statuses
          .filter(s => s.component.required && !s.isProvided)
          .map(s => s.component.key),
        remaining_optional: statuses
          .filter(s => !s.component.required && !s.isProvided)
          .map(s => s.component.key),
        current_intent: currentIntent,
        missing_count: statuses.filter(s => s.component.required && !s.isProvided).length,
      },
    };
  }
  
  // Intent is complete - proceed
  const incompleteOptionals = statuses.filter(s => 
    !s.component.required && !s.isProvided
  );
  
  const blocks: (InsightBlock | TableBlock)[] = [
    {
      type: 'insight',
      title: 'Ready to Create',
      description: 'All required information provided. ' +
        (incompleteOptionals.length > 0 
          ? `You can optionally add ${incompleteOptionals.slice(0, 2).map(s => s.component.name).join(' or ')} to refine targeting.` 
          : ''),
      severity: 'success',
    },
    buildStatusTable(statuses),
  ];
  
  return {
    skillId: 'system.clarify_intent',
    status: 'success',
    blocks,
    followUps: [
      { label: 'Create sequence now', command: 'proceed with creating sequence' },
      { label: 'Add more details', command: 'clarify sequence intent' },
    ],
    executionMs: 0,
    dataFreshness: 'live',
    // Pass complete intent forward
    result: {
      intent: currentIntent,
      is_complete: true,
      can_proceed: true,
    },
  };
}

// Register the skill
skillRegistry.register({
  id: 'system.clarify_intent',
  name: 'Clarify Intent',
  description: 'Asks clarifying questions when task information is incomplete. Analyzes intent components, identifies gaps (required vs optional), and guides user through completing the plan.',
  domain: 'system',
  inputSchema: {
    intent: {
      type: 'object',
      description: 'Current intent/partial configuration',
    },
    mode: {
      type: 'string',
      enum: ['check', 'update'],
      optional: true,
      description: 'Mode: check current state, or update with new values',
    },
    updates: {
      type: 'object',
      optional: true,
      description: 'Updates to apply to intent (for resume mode)',
    },
  },
  responseType: ['insight', 'table', 'action'],
  triggerPatterns: [
    // Triggers when campaign/sequence intent is incomplete
    '\\b(start|create|launch|setup|make)\s+(?:a\s+)?(sequence|campaign|outreach)\b',
  ],
  requiredContext: ['current_page', 'user'],
  estimatedMs: 500,
  examples: [
    'start a sequence', // will trigger clarification
    'create campaign for target customers', // will ask for titles/industries
    'set icp.titles to VP Sales', // updates intent
  ],
  handler,
});
