/**
 * Skill: workflow.create_campaign
 * 
 * Creates outreach campaigns with sequences and touches.
 * Uses gate-check at action point (before sending/activating).
 * Returns alternatives if gate locked.
 */

import { skillRegistry } from '../registry';
import { checkActionGate, createActionApprovalEntry } from '@/lib/clarification/gate-check';
import type { SkillInput, SkillOutput, InsightBlock, ActionBlock, ConfirmationBlock, TableBlock } from '../types';

interface TouchTemplate {
  stepNumber: number;
  delayDays: number;
  channel: 'email' | 'linkedin' | 'call';
  subjectTemplate?: string;
  bodyTemplate: string;
}

// Campaign type configs
const CAMPAIGN_TEMPLATES: Record<string, { name: string; touches: TouchTemplate[] }> = {
  email_sequence: {
    name: 'Email Sequence',
    touches: [
      { stepNumber: 1, delayDays: 0, channel: 'email', subjectTemplate: 'Quick question about {{company.name}}', bodyTemplate: 'Hi {{first_name}},\n\nI noticed {{company.name}} is {{context}}. {{personalization}}\n\nWorth a conversation?\n\nBest' },
      { stepNumber: 2, delayDays: 3, channel: 'email', subjectTemplate: 'Re: {{company.name}} — following up', bodyTemplate: 'Hi {{first_name}},\n\nWanted to follow up on my note from a few days ago. {{personalization}}\n\nStill open to a quick chat?\n\nBest' },
      { stepNumber: 3, delayDays: 7, channel: 'email', subjectTemplate: '{{first_name}} — last try', bodyTemplate: 'Hi {{first_name}},\n\nI know you\'re busy. This is my last note, but wanted to make sure {{company.name}} isn\'t missing out on {{value_prop}}.\n\nIf now\'s not the time, totally get it.\n\nBest' },
    ],
  },
  linkedin: {
    name: 'LinkedIn Outreach',
    touches: [
      { stepNumber: 1, delayDays: 0, channel: 'linkedin', bodyTemplate: 'Hi {{first_name}},\n\nSaw your profile — impressive work at {{company.name}}. {{personalization}}\n\nWould love to connect.' },
      { stepNumber: 2, delayDays: 2, channel: 'linkedin', bodyTemplate: 'Thanks for connecting! {{personalization}}\n\nQuick question: is {{company.name}} actively looking at {{topic}} right now?' },
    ],
  },
  multi_channel: {
    name: 'Multi-Channel Campaign',
    touches: [
      { stepNumber: 1, delayDays: 0, channel: 'email', subjectTemplate: '{{first_name}} @ {{company.name}}', bodyTemplate: 'Hi {{first_name}},\n\n{{personalization}}\n\nQuick note about {{company.name}} and {{value_prop}}.' },
      { stepNumber: 2, delayDays: 3, channel: 'linkedin', bodyTemplate: 'Hi {{first_name}} — following up on my email. {{personalization}}' },
      { stepNumber: 3, delayDays: 7, channel: 'email', subjectTemplate: 'Trying one more time', bodyTemplate: '{{first_name}},\n\nWanted to make sure this didn\'t get buried. {{personalization}}\n\nOpen to 15 mins next week?' },
    ],
  },
};

async function handler(input: SkillInput): Promise<SkillOutput> {
  const startTime = Date.now();
  const { 
    intent = {},
    autoActivate = false,
    testProspects = [],
  } = input.params as {
    intent: Record<string, unknown>;
    autoActivate?: boolean;
    testProspects?: string[];
  };

  const supabase = input.context?.supabase;
  const userId = input.context?.userId;

  if (!supabase || !userId) {
    return {
      skillId: 'workflow.create_campaign',
      status: 'error',
      blocks: [{
        type: 'error',
        message: 'Missing required context (supabase or userId)',
        code: 'MISSING_CONTEXT',
      }],
      followUps: [],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  // Extract intent components
  const titles = (intent.icp?.titles || intent.targeting?.titles || []) as string[];
  const industries = (intent.icp?.industries || intent.targeting?.industries || []) as string[] | undefined;
  const companySize = (intent.icp?.companySize || intent.targeting?.companySize) as string | undefined;
  const campaignType = (intent.campaign?.type || intent.type || 'email_sequence') as string;
  const signals = (intent.icp?.signals || intent.signals || []) as string[];

  // Validate minimum required fields
  if (titles.length === 0) {
    return {
      skillId: 'workflow.create_campaign',
      status: 'error',
      blocks: [{
        type: 'error',
        message: 'Job titles required to create campaign',
        suggestion: 'Try: "create sequence for VP Sales at SaaS companies"',
      }],
      followUps: [{ label: 'Clarify targeting', command: 'clarify campaign targeting' }],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  const template = CAMPAIGN_TEMPLATES[campaignType] || CAMPAIGN_TEMPLATES.email_sequence;

  // Step 1: Find matching prospects
  const { data: prospects, error: prospectError } = await supabase
    .from('prospects')
    .select('id, first_name, last_name, email, company_name, title, industry, company_size')
    .ilike('title', `%${titles[0]}%`)
    .limit(testProspects.length > 0 ? testProspects.length : 100);

  if (prospectError) {
    return {
      skillId: 'workflow.create_campaign',
      status: 'error',
      blocks: [{
        type: 'error',
        message: `Failed to query prospects: ${prospectError.message}`,
      }],
      followUps: [],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  const targetProspects = testProspects.length > 0 
    ? prospects?.filter(p => testProspects.includes(p.id)) 
    : prospects;

  const prospectCount = targetProspects?.length || 0;

  if (prospectCount === 0) {
    return {
      skillId: 'workflow.create_campaign',
      status: 'error',
      blocks: [{
        type: 'error',
        message: 'No prospects match your criteria',
        suggestion: `Try broader titles or add prospects matching: ${titles.join(', ')}`,
      }],
      followUps: [{ label: 'Adjust targeting', command: 'clarify sequence intent' }],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  // Step 2: GATE CHECK before creating
  const gateResult = await checkActionGate(
    supabase,
    'create_sequence',
    userId,
    {
      confidence: 0.75, // From clarification
      riskLevel: prospectCount > 50 ? 'high' : 'medium',
      prospectCount,
    }
  );

  // Build campaign preview (even if gated)
  const blocks: (InsightBlock | ActionBlock | ConfirmationBlock | TableBlock)[] = [];

  blocks.push({
    type: 'insight',
    title: `Campaign Preview: ${template.name}`,
    description: `Targeting ${prospectCount} prospects: ${titles.join(', ')}${industries ? ` in ${industries.join(', ')}` : ''}`,
    severity: 'info',
    confidence: 0.85,
  });

  // Show sequence outline
  blocks.push({
    type: 'table',
    title: 'Sequence Steps',
    columns: [
      { key: 'step', label: 'Step' },
      { key: 'channel', label: 'Channel' },
      { key: 'delay', label: 'Delay' },
      { key: 'preview', label: 'Preview' },
    ],
    rows: template.touches.map(t => ({
      step: t.stepNumber,
      channel: t.channel,
      delay: t.delayDays === 0 ? 'Immediate' : `${t.delayDays} days`,
      preview: t.subjectTemplate || t.bodyTemplate.slice(0, 50) + '...',
    })),
  });

  // If gate requires approval, create work queue entry and return alternatives
  if (gateResult.requiresApproval) {
    // Create approval entry
    const approvalEntry = await createActionApprovalEntry(
      supabase,
      'create_sequence',
      {
        intent,
        prospectCount,
        template: template.name,
        estimatedReach: prospectCount,
      },
      userId
    );

    blocks.push({
      type: 'confirmation',
      action: 'create_sequence',
      status: 'pending',
      message: gateResult.reason,
      approvalActions: {
        approve: { 
          label: 'Queue for approval', 
          command: 'queue created' 
        },
        reject: { 
          label: 'Cancel', 
          command: 'cancel' 
        },
      },
    });

    // Add alternatives as action buttons
    const alternatives = gateResult.alternatives || [];
    if (alternatives.length > 0) {
      blocks.push({
        type: 'action',
        label: 'Alternatives',
        actions: alternatives.map(alt => ({
          id: `alt_${alt.action}`,
          type: 'button',
          label: alt.label,
          description: alt.description,
          command: alt.action,
        })),
      });
    }

    return {
      skillId: 'workflow.create_campaign',
      status: 'partial',
      blocks,
      followUps: [
        { label: 'Check approval status', command: `check approval ${approvalEntry?.taskId || ''}` },
        ...alternatives.map(a => ({ label: a.label, command: a.action })),
      ],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  // Step 3: Gate unlocked - create campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('outreach_campaigns')
    .insert({
      name: `${template.name} - ${titles[0]}`,
      description: `Auto-generated campaign targeting ${titles.join(', ')}`,
      targeting_params: {
        titles,
        industries,
        companySize,
        signals,
      },
      sequence_config: {
        type: campaignType,
        steps: template.touches.length,
      },
      status: 'draft',
      user_id: userId,
    })
    .select('id')
    .single();

  if (campaignError || !campaign) {
    return {
      skillId: 'workflow.create_campaign',
      status: 'error',
      blocks: [{
        type: 'error',
        message: `Failed to create campaign: ${campaignError?.message || 'Unknown error'}`,
      }],
      followUps: [{ label: 'Try again', command: 'create sequence' }],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  // Step 4: Create sequence and touches
  const { data: sequence, error: sequenceError } = await supabase
    .from('sequences')
    .insert({
      campaign_id: campaign.id,
      name: `${template.name} Sequence`,
      status: 'draft',
      user_id: userId,
    })
    .select('id')
    .single();

  if (sequenceError || !sequence) {
    return {
      skillId: 'workflow.create_campaign',
      status: 'error',
      blocks: [{
        type: 'error',
        message: `Failed to create sequence: ${sequenceError?.message}`,
      }],
      followUps: [{ label: 'Retry', command: `retry sequence for campaign ${campaign.id}` }],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  // Create touches
  const touchInserts = template.touches.map(t => ({
    sequence_id: sequence.id,
    step_number: t.stepNumber,
    channel: t.channel,
    delay_days: t.delayDays,
    subject_template: t.subjectTemplate,
    body_template: t.bodyTemplate,
    status: 'draft',
    user_id: userId,
  }));

  const { error: touchesError } = await supabase
    .from('touches')
    .insert(touchInserts);

  if (touchesError) {
    return {
      skillId: 'workflow.create_campaign',
      status: 'error',
      blocks: [{
        type: 'error',
        message: `Failed to create touches: ${touchesError.message}`,
      }],
      followUps: [{ label: 'Review sequence', command: `show sequence ${sequence.id}` }],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  // Step 5: Enroll prospects
  const enrollments = targetProspects?.map(p => ({
    sequence_id: sequence.id,
    prospect_id: p.id,
    status: 'enrolled',
    current_step: 0,
    user_id: userId,
  })) || [];

  const { error: enrollmentError } = await supabase
    .from('sequence_enrollments')
    .insert(enrollments);

  if (enrollmentError) {
    return {
      skillId: 'workflow.create_campaign',
      status: 'partial',
      blocks: [
        ...blocks,
        {
          type: 'insight',
          title: 'Partial Success',
          description: `Campaign created but failed to enroll ${enrollments.length} prospects. Manual enrollment may be needed.`,
          severity: 'warning',
        }
      ],
      followUps: [{ label: 'Manual enrollment', command: `enroll prospects in ${sequence.id}` }],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  // Success!
  blocks.push({
    type: 'confirmation',
    action: 'create_sequence',
    status: 'completed',
    message: `Campaign created with ${prospectCount} enrolled prospects. Ready to activate?`,
  });

  blocks.push({
    type: 'action',
    label: 'Next Steps',
    actions: [
      { id: 'activate', type: 'button', label: 'Activate Campaign', command: `activate campaign ${campaign.id}` },
      { id: 'review', type: 'button', label: 'Review Touches', command: `show sequence ${sequence.id}` },
      { id: 'preview', type: 'button', label: 'Preview Emails', command: `preview sequence ${sequence.id}` },
    ],
  });

  return {
    skillId: 'workflow.create_campaign',
    status: 'success',
    blocks,
    followUps: [
      { label: 'Activate', command: `activate campaign ${campaign.id}` },
      { label: 'Review', command: `show sequence ${sequence.id}` },
    ],
    executionMs: Date.now() - startTime,
    dataFreshness: 'live',
    result: {
      campaignId: campaign.id,
      sequenceId: sequence.id,
      enrolledCount: prospectCount,
    },
  };
}

skillRegistry.register({
  id: 'workflow.create_campaign',
  name: 'Create Campaign',
  description: 'Creates outreach campaigns with sequences and touches. Uses gate-check at action point before activating.',
  domain: 'workflow',
  inputSchema: {
    intent: { type: 'object', required: true, description: 'Complete intent from clarification' },
    autoActivate: { type: 'boolean', default: false, description: 'Auto-activate if gate unlocked' },
    testProspects: { type: 'array', optional: true, description: 'Specific prospect IDs for testing' },
  },
  responseType: ['insight', 'action', 'confirmation', 'table'],
  triggerPatterns: [
    '\bcreate\s+(?:a\s+)?(campaign|sequence|outreach)\b',
    '\b(set\s+up|start|launch)\s+(?:a\s+)?(campaign|sequence)\b',
  ],
  examples: [
    'create sequence for VP Sales',
    'set up outreach campaign targeting CMOs',
    'launch email sequence for SaaS companies',
  ],
  estimatedMs: 2000,
  handler,
});
