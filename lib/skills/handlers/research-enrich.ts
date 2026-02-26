/**
 * Skill: research.enrich_prospects
 *
 * Enriches prospects via OpenClaw Gateway.
 * Reads prospectIds from follow-up context or queries recent un-enriched prospects.
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput } from '../types';
import { getServerSupabase } from '@/lib/supabase-server';
import { invokeOpenClawTool, isOpenClawAvailable } from '@/src/lib/research/openclaw-client';

const FOLLOW_UPS = [
  { label: 'Create campaign', command: 'create campaign for these prospects' },
  { label: 'Export CSV', command: 'export results as csv' },
  { label: 'Pipeline summary', command: 'show pipeline health' },
];

async function handler(input: SkillInput): Promise<SkillOutput> {
  // Check OpenClaw availability
  if (!isOpenClawAvailable()) {
    return {
      skillId: 'research.enrich_prospects',
      status: 'partial',
      blocks: [
        {
          type: 'insight',
          title: 'OpenClaw Gateway not configured',
          description:
            'Set OPENCLAW_GATEWAY_TOKEN (and optionally OPENCLAW_GATEWAY_URL) in .env.local to enable prospect enrichment.',
          severity: 'warning',
        },
      ],
      followUps: [{ label: 'Show help', command: 'help' }],
      executionMs: 0,
      dataFreshness: 'mock',
    };
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      skillId: 'research.enrich_prospects',
      status: 'error',
      blocks: [
        {
          type: 'error',
          message: 'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.',
          suggestion: 'Enrichment requires a database to read/write prospect data.',
        },
      ],
      followUps: [{ label: 'Show help', command: 'help' }],
      executionMs: 0,
      dataFreshness: 'mock',
    };
  }

  // Get prospect IDs from follow-up context or query un-enriched prospects
  let prospectIds = input.params.prospectIds as string[] | undefined;

  if (!prospectIds || prospectIds.length === 0) {
    const { data } = await supabase
      .from('prospects')
      .select('id')
      .in('enrichment_status', ['raw', 'pending'])
      .order('created_at', { ascending: false })
      .limit(50);

    prospectIds = data?.map((r) => r.id) || [];
  }

  if (prospectIds.length === 0) {
    return {
      skillId: 'research.enrich_prospects',
      status: 'partial',
      blocks: [
        {
          type: 'insight',
          title: 'No prospects to enrich',
          description: 'Run a search first to find prospects, then try "Enrich all" again.',
          severity: 'info',
        },
      ],
      followUps: [
        { label: 'Find prospects', command: 'find CMOs at fintech' },
        { label: 'Show help', command: 'help' },
      ],
      executionMs: 0,
      dataFreshness: 'live',
    };
  }

  // Fetch prospect details
  const { data: prospects } = await supabase
    .from('prospects')
    .select('id, person_name, person_email, company_name')
    .in('id', prospectIds);

  if (!prospects || prospects.length === 0) {
    return {
      skillId: 'research.enrich_prospects',
      status: 'error',
      blocks: [{ type: 'error', message: 'Could not load prospect records.' }],
      followUps: FOLLOW_UPS,
      executionMs: 0,
      dataFreshness: 'live',
    };
  }

  // Enrich each prospect via OpenClaw
  let enrichedCount = 0;
  let failedCount = 0;

  for (const prospect of prospects) {
    try {
      const enrichment = await invokeOpenClawTool('enrich_person', {
        name: prospect.person_name,
        email: prospect.person_email,
        company: prospect.company_name,
      });

      await supabase
        .from('prospects')
        .update({ enrichment_data: enrichment, enrichment_status: 'enriched' })
        .eq('id', prospect.id);

      enrichedCount++;
    } catch {
      failedCount++;
    }
  }

  return {
    skillId: 'research.enrich_prospects',
    status: failedCount === prospects.length ? 'error' : 'success',
    blocks: [
      {
        type: 'progress',
        label: 'Enriching prospects via OpenClaw',
        current: enrichedCount,
        total: prospects.length,
        status: 'completed',
      },
      {
        type: 'confirmation',
        action: 'enrich_prospects',
        status: 'completed',
        message: `Enriched ${enrichedCount} of ${prospects.length} prospects.${failedCount > 0 ? ` ${failedCount} failed.` : ''}`,
        progress: 100,
      },
      {
        type: 'insight',
        title: 'Enrichment complete',
        description: `${enrichedCount} prospect${enrichedCount !== 1 ? 's' : ''} updated with enrichment data from OpenClaw.`,
        severity: enrichedCount > 0 ? 'success' : 'warning',
      },
    ],
    followUps: FOLLOW_UPS,
    executionMs: 0,
    dataFreshness: 'live',
  };
}

skillRegistry.register({
  id: 'research.enrich_prospects',
  name: 'Enrich Prospects',
  description: 'Enriches prospect data via OpenClaw Gateway (emails, socials, firmographics).',
  domain: 'research',
  inputSchema: { prospectIds: { type: 'array', optional: true } },
  responseType: ['progress', 'confirmation', 'insight'],
  triggerPatterns: [
    '\\b(enrich|validate|verify|augment)\\b.*\\b(prospect|contact|lead|all)\\b',
    '\\benrich\\s+(all|these|them)\\b',
  ],
  estimatedMs: 10000,
  examples: [
    'enrich these prospects',
    'validate contacts',
    'enrich all',
  ],
  handler,
});
