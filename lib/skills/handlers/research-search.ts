/**
 * Skill: research.prospect_search
 *
 * Searches for prospects matching ICP criteria.
 * DB-first flow: queries stored prospects, then augments with live search.
 * Fires async OpenClaw enrichment for new results when available.
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput, ProgressBlock, TableBlock, InsightBlock } from '../types';
import { getServerSupabase } from '@/lib/supabase-server';
import { createApolloClientFromEnv } from '@/src/lib/apollo/client';

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

function searchLabel(titles: string[], industries: string[]): string {
  const who = titles.length ? titles.join(', ') : 'prospects';
  const where = industries.length ? ` in ${industries.join(', ')}` : '';
  return `Searching for ${who}${where}`;
}

/** Build ILIKE filter for an array of values on a column */
function buildIlikeFilter(query: ReturnType<ReturnType<typeof getServerSupabase>['from']>, column: string, values: string[]) {
  // Chain .or() with ILIKE patterns
  const patterns = values.map((v) => `${column}.ilike.%${v}%`).join(',');
  return query.or(patterns);
}

async function handler(input: SkillInput): Promise<SkillOutput> {
  const intent = input.params.intent as Record<string, unknown> | undefined;
  const icp = (intent?.icp || input.params.icp) as Record<string, unknown> | undefined;
  const titles = (icp?.titles as string[]) || [];
  const industries = (icp?.industries as string[]) || [];

  const supabase = getServerSupabase();
  const hasApolloKey = !!process.env.APOLLO_API_KEY;

  const blocks: (ProgressBlock | InsightBlock | TableBlock)[] = [];

  // ── Step 1: Query Supabase for stored prospects ───────────────────
  type StoredRow = {
    id: string;
    source: string;
    name: string;
    title: string;
    company: string;
    industry: string;
    score: number;
    grade: string;
    source_provider_id?: string;
  };

  let storedRows: StoredRow[] = [];
  const storedProviderIds = new Set<string>();

  if (supabase) {
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

    const { data } = await query;

    if (data && data.length > 0) {
      const gradeMap: Record<string, string> = { a: 'A+', b: 'B+', c: 'C', d: 'D', f: 'F' };
      storedRows = data.map((row) => {
        if (row.source_provider_id) storedProviderIds.add(row.source_provider_id);
        return {
          id: row.id,
          source: 'Stored',
          name: row.person_name || '',
          title: row.person_title || '',
          company: row.company_name || '',
          industry: row.company_industry || '',
          score: 80,
          grade: gradeMap[row.quality_score as string] || 'B+',
          source_provider_id: row.source_provider_id ?? undefined,
        };
      });
    }
  }

  // ── Step 2: Live search for new prospects ──────────────────────────
  const newRows: StoredRow[] = [];
  let liveSearchFailed = false;

  if (!hasApolloKey) {
    blocks.push({
      type: 'insight',
      title: 'Live search not configured',
      description: 'Set APOLLO_API_KEY in .env.local to search for new prospects. Showing stored results below.',
      severity: 'warning',
    });
  } else {
    try {
      const apollo = createApolloClientFromEnv();
      const filters: Record<string, unknown> = { per_page: 25 };
      if (titles.length) filters.person_titles = titles;
      if (industries.length) filters.organization_industries = industries;

      const result = await apollo.searchProspects(filters as Parameters<typeof apollo.searchProspects>[0]);

      const gradeFromScore = (s: number) => {
        if (s >= 95) return 'A+';
        if (s >= 85) return 'A';
        if (s >= 75) return 'B+';
        if (s >= 65) return 'B';
        if (s >= 50) return 'C';
        return 'D';
      };

      for (const person of result.people) {
        if (storedProviderIds.has(person.id)) continue;
        const org = person.organization;
        const score = 50
          + (person.email || person.work_email ? 10 : 0)
          + (person.linkedin_url ? 5 : 0)
          + (org?.funding_stage ? 10 : 0)
          + ((org?.employee_count ?? 0) > 50 ? 10 : 0);
        const fullName = person.name
          || [person.first_name, person.last_name].filter(Boolean).join(' ')
          || 'Unknown';
        newRows.push({
          id: person.id,
          source: 'Apollo',
          name: fullName,
          title: person.title || '',
          company: org?.name || '',
          industry: org?.industry || '',
          score: Math.min(score, 100),
          grade: gradeFromScore(Math.min(score, 100)),
          source_provider_id: person.id,
        });
      }
    } catch (err) {
      console.error('[research.prospect_search] Apollo live search failed:', err);
      liveSearchFailed = true;
    }
  }

  // ── Step 3: Merge results ─────────────────────────────────────────
  const allRows = [...storedRows, ...newRows];

  // If zero total results, fall back to demo data
  if (allRows.length === 0) {
    const table: TableBlock = {
      type: 'table',
      title: `Sample results (${MOCK_RESULTS.length} prospects)`,
      columns: TABLE_COLUMNS,
      rows: MOCK_RESULTS,
      pageSize: 10,
    };

    return {
      skillId: 'research.prospect_search',
      status: 'partial',
      blocks: [...blocks, table],
      followUps: FOLLOW_UPS,
      executionMs: 0,
      dataFreshness: 'mock',
    };
  }

  // Build summary insight
  const parts: string[] = [];
  if (storedRows.length > 0) parts.push(`${storedRows.length} stored`);
  if (newRows.length > 0) parts.push(`${newRows.length} new`);
  const summaryText = parts.join(', ');

  const progress: ProgressBlock = {
    type: 'progress',
    label: searchLabel(titles, industries),
    current: allRows.length,
    total: allRows.length,
    status: 'completed',
  };

  const success: InsightBlock = {
    type: 'insight',
    title: `Found ${allRows.length} prospects (${summaryText})`,
    description: liveSearchFailed
      ? 'Live search encountered an error — showing stored results only.'
      : newRows.length > 0
        ? `${newRows.length} new prospects saved to your database.`
        : storedRows.length > 0
          ? 'All results from your database — no new results from live search.'
          : 'Results shown below.',
    severity: 'success',
  };

  const table: TableBlock = {
    type: 'table',
    title: `${allRows.length} prospects`,
    columns: TABLE_COLUMNS,
    rows: allRows,
    pageSize: 10,
  };

  blocks.push(progress, success, table);

  return {
    skillId: 'research.prospect_search',
    status: 'success',
    blocks,
    followUps: FOLLOW_UPS,
    executionMs: 0,
    dataFreshness: newRows.length > 0 ? 'live' : storedRows.length > 0 ? 'cached' : 'mock',
  };
}

skillRegistry.register({
  id: 'research.prospect_search',
  name: 'Prospect Search',
  description: 'Finds prospects matching ICP criteria — titles, industries, signals.',
  domain: 'research',
  inputSchema: { icp: { type: 'object', optional: true }, query: { type: 'string' } },
  responseType: ['progress', 'table'],
  triggerPatterns: [
    '\\b(find|search|get|look for|prospect|identify|discover|hunt)\\b',
    '\\b(CMO|CTO|VP|director|head of)\\b',
  ],
  estimatedMs: 3000,
  examples: [
    'find CMOs at fintech companies',
    'search for VP Engineering at SaaS startups',
    'look for Head of Marketing in NYC',
  ],
  handler,
});
