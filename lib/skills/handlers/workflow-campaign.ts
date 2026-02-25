/**
 * Skill: workflow.create_campaign
 *
 * Creates an outreach campaign from ICP criteria and prospect context.
 * Inserts into outreach_campaigns table; falls back to demo mode without Supabase.
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput } from '../types';
import { getServerSupabase } from '@/lib/supabase-server';

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

const FOLLOW_UPS = [
  { label: 'Enrich prospects', command: 'enrich these prospects' },
  { label: 'Pipeline summary', command: 'show pipeline health' },
  { label: 'Show all campaigns', command: 'show campaigns' },
];

function generateCampaignName(intent: Record<string, unknown> | undefined): string {
  const icp = intent?.icp as Record<string, unknown> | undefined;
  const parts: string[] = [];

  const titles = icp?.titles as string[] | undefined;
  const industries = icp?.industries as string[] | undefined;

  if (titles?.length) parts.push(titles[0]);
  if (industries?.length) parts.push(industries[0]);

  const dateStr = new Date().toISOString().slice(0, 10);
  if (parts.length > 0) return `${parts.join(' + ')} — ${dateStr}`;
  return `Outbound Campaign — ${dateStr}`;
}

async function handler(input: SkillInput): Promise<SkillOutput> {
  const intent = input.params.intent as Record<string, unknown> | undefined;
  const icp = (intent?.icp || input.params.icp) as Record<string, unknown> | undefined;
  const campaign = intent?.campaign as Record<string, unknown> | undefined;
  const prospectIds = input.params.prospectIds as string[] | undefined;

  const campaignName = (campaign?.name as string) || generateCampaignName(intent);
  const prospectCount = prospectIds?.length || 0;

  const targetingParams: Record<string, unknown> = {};
  if (icp?.titles) targetingParams.job_titles = icp.titles;
  if (icp?.industries) targetingParams.industries = icp.industries;
  if (icp?.companySize) targetingParams.company_size = icp.companySize;
  if (icp?.signals) targetingParams.signals = icp.signals;

  const supabase = getServerSupabase();

  if (!supabase) {
    // Demo mode
    return {
      skillId: 'workflow.create_campaign',
      status: 'success',
      blocks: [
        {
          type: 'confirmation',
          action: 'create_campaign',
          status: 'completed',
          message: `Campaign "${campaignName}" created (demo mode).`,
          progress: 100,
        },
        {
          type: 'metrics',
          metrics: [
            { label: 'Campaign', value: campaignName },
            { label: 'Type', value: 'Outbound Email' },
            { label: 'Prospects', value: prospectCount || 'TBD', format: 'number' },
            { label: 'Status', value: 'Draft' },
          ],
        },
        {
          type: 'insight',
          title: 'Demo mode',
          description: 'Supabase not configured — campaign was not persisted. Set database env vars to enable persistence.',
          severity: 'info',
        },
      ],
      followUps: FOLLOW_UPS,
      executionMs: 0,
      dataFreshness: 'mock',
    };
  }

  // Insert campaign into outreach_campaigns
  const { data, error } = await supabase
    .from('outreach_campaigns')
    .insert({
      name: campaignName,
      type: 'outbound_email',
      status: 'draft',
      targeting_params: targetingParams,
      audience_source: prospectIds?.length ? 'icp_match' : 'manual',
      goals: {
        target_prospects: prospectCount || 100,
        target_meetings: Math.max(Math.round((prospectCount || 100) * 0.1), 5),
        target_reply_rate: 0.15,
      },
      created_by: input.context.userId || ZERO_UUID,
    })
    .select('id, name')
    .single();

  if (error) {
    return {
      skillId: 'workflow.create_campaign',
      status: 'error',
      blocks: [
        {
          type: 'error',
          message: `Failed to create campaign: ${error.message}`,
          suggestion: 'Check that the outreach_campaigns table exists (run migrations).',
        },
      ],
      followUps: [{ label: 'Show help', command: 'help' }],
      executionMs: 0,
      dataFreshness: 'live',
    };
  }

  return {
    skillId: 'workflow.create_campaign',
    status: 'success',
    blocks: [
      {
        type: 'confirmation',
        action: 'create_campaign',
        status: 'completed',
        message: `Campaign "${data.name}" created successfully.`,
        progress: 100,
      },
      {
        type: 'metrics',
        metrics: [
          { label: 'Campaign', value: data.name },
          { label: 'Type', value: 'Outbound Email' },
          { label: 'Prospects', value: prospectCount || 'TBD', format: 'number' },
          { label: 'Status', value: 'Draft' },
        ],
      },
      {
        type: 'insight',
        title: 'Campaign ready',
        description: `Your campaign is saved as a draft. Add prospects and sequences, then activate when ready.`,
        severity: 'success',
      },
    ],
    followUps: FOLLOW_UPS,
    executionMs: 0,
    dataFreshness: 'live',
  };
}

skillRegistry.register({
  id: 'workflow.create_campaign',
  name: 'Create Campaign',
  description: 'Creates an outreach campaign from ICP criteria and prospect context.',
  domain: 'workflow',
  inputSchema: { campaignName: { type: 'string', optional: true }, prospectIds: { type: 'array', optional: true } },
  responseType: ['confirmation', 'metrics', 'insight'],
  triggerPatterns: [
    '\\b(create|build|launch|start|setup|make)\\s+(?:a\\s+)?(campaign|sequence|outreach)\\b',
  ],
  estimatedMs: 2000,
  examples: [
    'create campaign for these prospects',
    'launch email campaign',
    'build outreach sequence',
  ],
  handler,
});
