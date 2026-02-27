/**
 * Skill: research.prospect_search
 *
 * Queries stored prospects from the database.
 * Live search (Apollo, etc.) is handled by the OpenClaw agent — the frontend
 * just displays whatever structured data comes back.
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput, TableBlock, InsightBlock } from '../types';
import { getServerSupabase } from '@/lib/supabase-server';

const QUERY_TIMEOUT_MS = 3_000;

const TABLE_COLUMNS = [
  { key: 'source', label: 'Source', format: 'badge' as const },
  { key: 'name', label: 'Name', format: 'text' as const },
  { key: 'title', label: 'Title', format: 'text' as const },
  { key: 'company', label: 'Company', format: 'text' as const },
  { key: 'industry', label: 'Industry', format: 'badge' as const },
  { key: 'score', label: 'Score', format: 'number' as const },
  { key: 'grade', label: 'Grade', format: 'badge' as const },
];

const MOCK_RESULTS = [
  { source: 'Sample', name: 'Sarah Chen', title: 'CMO', company: 'FinPay', industry: 'Fintech', score: 92, grade: 'A+', email: 'sarah@finpay.io' },
  { source: 'Sample', name: 'Marcus Johnson', title: 'VP Marketing', company: 'NexBank', industry: 'Fintech', score: 88, grade: 'A', email: 'marcus@nexbank.com' },
  { source: 'Sample', name: 'Emily Rodriguez', title: 'Head of Growth', company: 'PayStream', industry: 'Fintech', score: 85, grade: 'A', email: 'emily@paystream.co' },
  { source: 'Sample', name: 'David Kim', title: 'CMO', company: 'CoinVault', industry: 'Crypto', score: 81, grade: 'B+', email: 'david@coinvault.io' },
  { source: 'Sample', name: 'Lisa Thompson', title: 'VP Marketing', company: 'LendFlow', industry: 'Fintech', score: 79, grade: 'B+', email: 'lisa@lendflow.com' },
];

const FOLLOW_UPS = [
  { label: 'Enrich all', command: 'enrich these prospects' },
  { label: 'Create campaign', command: 'create campaign for these prospects' },
  { label: 'Export CSV', command: 'export results as csv' },
];

/** Build ILIKE filter for an array of values on a column */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildIlikeFilter(query: any, column: string, values: string[]) {
  const patterns = values.map((v) => `${column}.ilike.%${v}%`).join(',');
  return query.or(patterns);
}

async function handler(input: SkillInput): Promise<SkillOutput> {
  const intent = input.params.intent as Record<string, unknown> | undefined;
  const icp = (intent?.icp || input.params.icp) as Record<string, unknown> | undefined;
  const titles = (icp?.titles as string[]) || [];
  const industries = (icp?.industries as string[]) || [];

  const supabase = getServerSupabase();

  // Query stored prospects from database
  if (supabase) {
    try {
      let query = supabase
        .from('prospects')
        .select('id, person_name, person_title, company_name, company_industry, quality_score, source_provider_id')
        .order('quality_score', { ascending: false })
        .limit(50);

      if (titles.length) {
        query = buildIlikeFilter(query, 'person_title', titles) as typeof query;
      }
      if (industries.length) {
        query = buildIlikeFilter(query, 'company_industry', industries) as typeof query;
      }

      const { data } = await Promise.race([
        query,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase query timeout')), QUERY_TIMEOUT_MS)
        ),
      ]);

      if (data && data.length > 0) {
        const gradeMap: Record<string, string> = { a: 'A+', b: 'B+', c: 'C', d: 'D', f: 'F' };
        const rows = data.map((row) => ({
          id: row.id,
          source: 'Stored',
          name: row.person_name || '',
          title: row.person_title || '',
          company: row.company_name || '',
          industry: row.company_industry || '',
          score: 80,
          grade: gradeMap[row.quality_score as string] || 'B+',
        }));

        const table: TableBlock = {
          type: 'table',
          title: `${rows.length} prospects`,
          columns: TABLE_COLUMNS,
          rows,
          pageSize: 10,
        };

        return {
          skillId: 'research.prospect_search',
          status: 'success',
          blocks: [
            {
              type: 'insight',
              title: `Found ${rows.length} stored prospects`,
              description: 'Showing results from your database.',
              severity: 'success',
            } satisfies InsightBlock,
            table,
          ],
          followUps: FOLLOW_UPS,
          executionMs: 0,
          dataFreshness: 'live',
        };
      }
    } catch (err) {
      console.warn('[research.prospect_search] DB query failed:', err);
    }
  }

  // No stored data — return demo results
  return {
    skillId: 'research.prospect_search',
    status: 'partial',
    blocks: [
      {
        type: 'insight',
        title: 'No stored prospects found',
        description: 'Showing sample data. Ask Zetty to search for new prospects.',
        severity: 'info',
      } satisfies InsightBlock,
      {
        type: 'table',
        title: `Sample results (${MOCK_RESULTS.length} prospects)`,
        columns: TABLE_COLUMNS,
        rows: MOCK_RESULTS,
        pageSize: 10,
      } satisfies TableBlock,
    ],
    followUps: FOLLOW_UPS,
    executionMs: 0,
    dataFreshness: 'mock',
  };
}

skillRegistry.register({
  id: 'research.prospect_search',
  name: 'Prospect Search',
  description: 'Finds prospects matching ICP criteria — titles, industries, signals.',
  domain: 'research',
  inputSchema: { icp: { type: 'object', optional: true }, query: { type: 'string' } },
  responseType: ['table'],
  triggerPatterns: [
    '\\b(find|search|get|look for|prospect|identify|discover|hunt)\\b',
    '\\b(CMO|CTO|VP|director|head of)\\b',
  ],
  estimatedMs: 1000,
  examples: [
    'find CMOs at fintech companies',
    'search for VP Engineering at SaaS startups',
    'look for Head of Marketing in NYC',
  ],
  handler,
});
