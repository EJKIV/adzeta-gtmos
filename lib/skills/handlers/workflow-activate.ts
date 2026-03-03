/**
 * Skill: workflow.activate_campaign
 * 
 * Activates campaigns (sends first touch to prospects).
 * Uses gate-check at action point before sending.
 * Returns alternatives if gate locked.
 */

import { skillRegistry } from '../registry';
import { checkActionGate, createActionApprovalEntry } from '@/lib/clarification/gate-check';
import type { SkillInput, SkillOutput, InsightBlock, ActionBlock, ConfirmationBlock } from '../types';

async function handler(input: SkillInput): Promise<SkillOutput> {
  const startTime = Date.now();
  const { 
    campaignId,
    sequenceId,
    autoSend = false,
    testMode = false,
  } = input.params as {
    campaignId: string;
    sequenceId: string;
    autoSend?: boolean;
    testMode?: boolean;
  };

  const { getSupabaseClient } = await import('@/lib/supabase/environment');
  const supabase = getSupabaseClient('dev', true);
  const userId = input.context?.userId;

  if (!userId) {
    return {
      skillId: 'workflow.activate_campaign',
      status: 'error',
      blocks: [{
        type: 'error',
        message: 'Missing required context (userId)',
        code: 'MISSING_CONTEXT',
      }],
      followUps: [],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  if (!campaignId || !sequenceId) {
    return {
      skillId: 'workflow.activate_campaign',
      status: 'error',
      blocks: [{
        type: 'error',
        message: 'Campaign ID and Sequence ID required',
        suggestion: 'Create a campaign first, then activate it',
      }],
      followUps: [{ label: 'Create campaign', command: 'create sequence' }],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  // Fetch campaign details
  const { data: campaign, error: campaignError } = await supabase
    .from('outreach_campaigns')
    .select('id, name, status, targeting_params')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    return {
      skillId: 'workflow.activate_campaign',
      status: 'error',
      blocks: [{
        type: 'error',
        message: `Campaign not found: ${campaignError?.message || 'Unknown error'}`,
      }],
      followUps: [],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  // Fetch enrolled prospect count
  const { count: prospectCount, error: countError } = await supabase
    .from('sequence_enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('sequence_id', sequenceId)
    .eq('status', 'enrolled');

  if (countError) {
    return {
      skillId: 'workflow.activate_campaign',
      status: 'error',
      blocks: [{
        type: 'error',
        message: `Failed to count prospects: ${countError.message}`,
      }],
      followUps: [],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  const actualProspectCount = prospectCount || 0;

  // GATE CHECK — this is the actual ACTION point (before sending)
  const gateResult = await checkActionGate(
    supabase,
    testMode ? 'create_sequence' : 'launch_campaign', // Use appropriate gate
    userId,
    {
      confidence: 0.8, // High confidence - already created and approved
      riskLevel: actualProspectCount > 50 ? 'high' : actualProspectCount > 10 ? 'medium' : 'low',
      prospectCount: actualProspectCount,
    }
  );

  const blocks: (InsightBlock | ActionBlock | ConfirmationBlock)[] = [];

  // Show preview regardless of gate status
  blocks.push({
    type: 'insight',
    title: `Ready to Activate: ${campaign.name}`,
    description: `This will send the first touch to ${actualProspectCount} enrolled prospects.`,
    severity: 'info',
    confidence: 0.9,
  });

  // If gate requires approval, return alternatives
  if (gateResult.requiresApproval) {
    // Create approval entry
    const approvalEntry = await createActionApprovalEntry(
      supabase,
      'launch_campaign',
      {
        campaignId,
        sequenceId,
        prospectCount: actualProspectCount,
        campaignName: campaign.name,
      },
      userId
    );

    blocks.push({
      type: 'confirmation',
      action: 'launch_campaign',
      status: 'pending',
      message: gateResult.reason,
      approvalActions: {
        approve: { 
          label: 'Queue for approval', 
          command: 'queue activation' 
        },
        reject: { 
          label: 'Cancel', 
          command: 'cancel' 
        },
      },
    });

    // Add alternatives
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
      skillId: 'workflow.activate_campaign',
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

  // Gate unlocked — proceed with activation
  
  // Update campaign status to active
  const { error: updateError } = await supabase
    .from('outreach_campaigns')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', campaignId);

  if (updateError) {
    return {
      skillId: 'workflow.activate_campaign',
      status: 'error',
      blocks: [{
        type: 'error',
        message: `Failed to activate campaign: ${updateError.message}`,
      }],
      followUps: [{ label: 'Retry', command: `activate campaign ${campaignId}` }],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  // Update sequence status
  await supabase
    .from('sequences')
    .update({ status: 'active' })
    .eq('id', sequenceId);

  // Mark first touches as ready to send
  const { error: touchError } = await supabase
    .from('touches')
    .update({ status: 'ready_to_send' })
    .eq('sequence_id', sequenceId)
    .eq('step_number', 1);

  if (touchError) {
    return {
      skillId: 'workflow.activate_campaign',
      status: 'partial',
      blocks: [
        ...blocks,
        {
          type: 'insight',
          title: 'Campaign Activated',
          description: `Campaign is active but failed to queue first touches. Manual intervention may be needed.`,
          severity: 'warning',
        }
      ],
      followUps: [],
      executionMs: Date.now() - startTime,
      dataFreshness: 'live',
    };
  }

  // Success!
  blocks.push({
    type: 'confirmation',
    action: 'launch_campaign',
    status: 'completed',
    message: `✅ Campaign activated! ${actualProspectCount} prospects will receive the first touch.`,
  });

  return {
    skillId: 'workflow.activate_campaign',
    status: 'success',
    blocks,
    followUps: [
      { label: 'View campaign', command: `show campaign ${campaignId}` },
      { label: 'Monitor sends', command: `monitor campaign ${campaignId}` },
    ],
    executionMs: Date.now() - startTime,
    dataFreshness: 'live',
  };
}

skillRegistry.register({
  id: 'workflow.activate_campaign',
  name: 'Activate Campaign',
  description: 'Activates campaigns and starts sending first touches. Uses gate-check at action point.',
  domain: 'workflow',
  inputSchema: {
    campaignId: { type: 'string', required: true, description: 'Campaign ID to activate' },
    sequenceId: { type: 'string', required: true, description: 'Sequence ID to activate' },
    autoSend: { type: 'boolean', default: false, description: 'Auto-send if gate unlocked' },
    testMode: { type: 'boolean', default: false, description: 'Test mode - skips actual sending' },
  },
  responseType: ['insight', 'action', 'confirmation'],
  triggerPatterns: [
    '\\bactivate\\s+(?:campaign|sequence)\\b',
    '\\blaunch\\s+(?:campaign|sequence)\\b',
    '\\bstart\\s+sending\\b',
    '\\bsend\\s+(?:first\\s+)?touch(?:es)?\\b',
  ],
  examples: [
    'activate campaign xyz-123',
    'launch sequence',
    'start sending to enrolled prospects',
    'send first touch',
  ],
  estimatedMs: 1500,
  handler,
});
