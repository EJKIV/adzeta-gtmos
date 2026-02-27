/**
 * Skill: research.enrich_prospects
 *
 * Reports enrichment status from the database.
 * Actual enrichment is handled by OpenClaw agent — the frontend
 * just displays the current state and lets the AI do the work.
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput } from '../types';
import { getServerSupabase } from '@/lib/supabase-server';

const QUERY_TIMEOUT_MS = 3_000;

const FOLLOW_UPS = [
  { label: 'Create campaign', command: 'create campaign for these prospects' },
  { label: 'Export CSV', command: 'export results as csv' },
  { label: 'Pipeline summary', command: 'show pipeline health' },
];

async function handler(input: SkillInput): Promise<SkillOutput> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      skillId: 'research.enrich_prospects',
      status: 'partial',
      blocks: [
        {
          type: 'insight',
          title: 'No database configured',
          description: 'Enrichment status requires a database connection. Ask Zetty to enrich prospects directly.',
          severity: 'info',
        },
      ],
      followUps: [{ label: 'Show help', command: 'help' }],
      executionMs: 0,
      dataFreshness: 'mock',
    };
  }

  try {
    // Get prospect IDs from follow-up context or query un-enriched prospects
    let prospectIds = input.params.prospectIds as string[] | undefined;

    if (!prospectIds || prospectIds.length === 0) {
      const { data } = await Promise.race([
        supabase
          .from('prospects')
          .select('id')
          .in('enrichment_status', ['raw', 'pending'])
          .order('created_at', { ascending: false })
          .limit(50),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase query timeout')), QUERY_TIMEOUT_MS)
        ),
      ]);

      prospectIds = data?.map((r) => r.id) || [];
    }

    if (prospectIds.length === 0) {
      // Check if we have any enriched prospects to report on
      const { count } = await Promise.race([
        supabase
          .from('prospects')
          .select('id', { count: 'exact', head: true })
          .eq('enrichment_status', 'enriched'),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase query timeout')), QUERY_TIMEOUT_MS)
        ),
      ]);

      if (count && count > 0) {
        return {
          skillId: 'research.enrich_prospects',
          status: 'success',
          blocks: [
            {
              type: 'insight',
              title: 'All prospects enriched',
              description: `${count} prospect${count !== 1 ? 's' : ''} have been enriched. No pending enrichments.`,
              severity: 'success',
            },
          ],
          followUps: FOLLOW_UPS,
          executionMs: 0,
          dataFreshness: 'live',
        };
      }

      return {
        skillId: 'research.enrich_prospects',
        status: 'partial',
        blocks: [
          {
            type: 'insight',
            title: 'No prospects to enrich',
            description: 'Run a search first to find prospects, then ask Zetty to enrich them.',
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

    // Report on enrichment status of these prospects
    const { data: prospects } = await Promise.race([
      supabase
        .from('prospects')
        .select('id, person_name, company_name, enrichment_status')
        .in('id', prospectIds),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase query timeout')), QUERY_TIMEOUT_MS)
      ),
    ]);

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

    const enriched = prospects.filter((p) => p.enrichment_status === 'enriched').length;
    const pending = prospects.filter((p) => p.enrichment_status === 'pending').length;
    const raw = prospects.filter((p) => p.enrichment_status === 'raw').length;

    const blocks: SkillOutput['blocks'] = [
      {
        type: 'insight',
        title: `${prospects.length} prospects found`,
        description: `Enriched: ${enriched} | Pending: ${pending} | Not enriched: ${raw}`,
        severity: raw > 0 ? 'info' : 'success',
      },
    ];

    if (raw > 0) {
      blocks.push({
        type: 'insight',
        title: `${raw} prospect${raw !== 1 ? 's' : ''} need enrichment`,
        description: 'Ask Zetty to enrich these prospects — it will handle the data enrichment automatically.',
        severity: 'info',
      });
    }

    return {
      skillId: 'research.enrich_prospects',
      status: 'success',
      blocks,
      followUps: FOLLOW_UPS,
      executionMs: 0,
      dataFreshness: 'live',
    };
  } catch (err) {
    console.warn('[research.enrich_prospects] DB query failed:', err);
    return {
      skillId: 'research.enrich_prospects',
      status: 'partial',
      blocks: [
        {
          type: 'insight',
          title: 'Database temporarily unavailable',
          description: 'Could not check enrichment status. Ask Zetty to enrich prospects directly.',
          severity: 'info',
        },
      ],
      followUps: [{ label: 'Show help', command: 'help' }],
      executionMs: 0,
      dataFreshness: 'mock',
    };
  }
}

skillRegistry.register({
  id: 'research.enrich_prospects',
  name: 'Enrich Prospects',
  description: 'Shows enrichment status for prospects. Actual enrichment is handled by Zetty.',
  domain: 'research',
  inputSchema: { prospectIds: { type: 'array', optional: true } },
  responseType: ['insight'],
  triggerPatterns: [
    '\\b(enrich|validate|verify|augment)\\b.*\\b(prospect|contact|lead|all)\\b',
    '\\benrich\\s+(all|these|them)\\b',
  ],
  estimatedMs: 1000,
  examples: [
    'enrich these prospects',
    'validate contacts',
    'enrich all',
  ],
  handler,
});
