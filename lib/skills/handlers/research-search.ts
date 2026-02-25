/**
 * Skill: research.prospect_search
 *
 * Searches for prospects matching ICP criteria.
 * Uses Apollo API when configured, falls back to mock data.
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput, ProgressBlock, TableBlock } from '../types';
import { getServerSupabase } from '@/lib/supabase-server';

const MOCK_RESULTS = [
  { name: 'Sarah Chen', title: 'CMO', company: 'FinPay', industry: 'Fintech', score: 92, grade: 'A+', email: 'sarah@finpay.io' },
  { name: 'Marcus Johnson', title: 'VP Marketing', company: 'NexBank', industry: 'Fintech', score: 88, grade: 'A', email: 'marcus@nexbank.com' },
  { name: 'Emily Rodriguez', title: 'Head of Growth', company: 'PayStream', industry: 'Fintech', score: 85, grade: 'A', email: 'emily@paystream.co' },
  { name: 'David Kim', title: 'CMO', company: 'CoinVault', industry: 'Crypto', score: 81, grade: 'B+', email: 'david@coinvault.io' },
  { name: 'Lisa Thompson', title: 'VP Marketing', company: 'LendFlow', industry: 'Fintech', score: 79, grade: 'B+', email: 'lisa@lendflow.com' },
];

async function handler(input: SkillInput): Promise<SkillOutput> {
  const intent = input.params.intent as Record<string, unknown> | undefined;
  const icp = (intent?.icp || input.params.icp) as Record<string, unknown> | undefined;
  const titles = (icp?.titles as string[]) || [];
  const industries = (icp?.industries as string[]) || [];
  const query = (input.params.query as string) || 'prospects';

  const hasApolloKey = !!process.env.APOLLO_API_KEY;

  // Try live Apollo search
  if (hasApolloKey) {
    try {
      const { ApolloMCP } = await import('@/lib/research/apollo-client');

      const criteria: Record<string, unknown> = {};
      if (titles.length) criteria.person_titles = titles;
      if (industries.length) criteria.q_organization_keyword_tags = industries;

      const response = await ApolloMCP.searchProspects(criteria as any, { perPage: 25 });
      const people = response.people || [];

      // Store in Supabase if available
      const supabase = getServerSupabase();
      if (supabase && people.length > 0) {
        const rows = people.map((p) => ({
          person_name: p.name || `${p.first_name} ${p.last_name}`,
          person_first_name: p.first_name,
          person_last_name: p.last_name,
          person_email: p.email,
          person_title: p.title,
          person_seniority: p.seniority,
          company_name: p.organization?.name,
          company_domain: p.organization?.primary_domain,
          company_industry: p.organization?.industries?.[0],
          company_size: p.organization?.estimated_num_employees
            ? String(p.organization.estimated_num_employees)
            : undefined,
          source_type: 'apollo' as const,
          enrichment_status: 'raw' as const,
          quality_score: 'b' as const,
        }));

        await supabase.from('prospects').upsert(rows, { onConflict: 'person_email', ignoreDuplicates: true });
      }

      const tableRows = people.map((p) => ({
        name: p.name || `${p.first_name} ${p.last_name}`,
        title: p.title || '',
        company: p.organization?.name || '',
        industry: p.organization?.industries?.[0] || '',
        score: 80,
        grade: 'B+',
      }));

      const progress: ProgressBlock = {
        type: 'progress',
        label: `Searching for ${titles.join(', ') || 'prospects'}${industries.length ? ` in ${industries.join(', ')}` : ''}`,
        current: people.length,
        total: people.length,
        status: 'completed',
      };

      const table: TableBlock = {
        type: 'table',
        title: `Found ${people.length} prospects`,
        columns: [
          { key: 'name', label: 'Name', format: 'text' },
          { key: 'title', label: 'Title', format: 'text' },
          { key: 'company', label: 'Company', format: 'text' },
          { key: 'industry', label: 'Industry', format: 'badge' },
          { key: 'score', label: 'Score', format: 'number' },
          { key: 'grade', label: 'Grade', format: 'badge' },
        ],
        rows: tableRows,
        pageSize: 10,
      };

      return {
        skillId: 'research.prospect_search',
        status: 'success',
        blocks: [progress, table],
        followUps: [
          { label: 'Enrich all', command: 'enrich these prospects' },
          { label: 'Create campaign', command: 'create campaign for these prospects' },
          { label: 'Export CSV', command: 'export results as csv' },
        ],
        executionMs: 0,
        dataFreshness: 'live',
      };
    } catch (err) {
      console.error('Apollo search failed, falling back to mock:', err);
      // Fall through to mock data
    }
  }

  // Mock data fallback
  const progress: ProgressBlock = {
    type: 'progress',
    label: `Searching for ${titles.join(', ') || 'prospects'}${industries.length ? ` in ${industries.join(', ')}` : ''}`,
    current: 5,
    total: 5,
    status: 'completed',
  };

  const table: TableBlock = {
    type: 'table',
    title: `Found ${MOCK_RESULTS.length} prospects`,
    columns: [
      { key: 'name', label: 'Name', format: 'text' },
      { key: 'title', label: 'Title', format: 'text' },
      { key: 'company', label: 'Company', format: 'text' },
      { key: 'industry', label: 'Industry', format: 'badge' },
      { key: 'score', label: 'Score', format: 'number' },
      { key: 'grade', label: 'Grade', format: 'badge' },
    ],
    rows: MOCK_RESULTS,
    pageSize: 10,
  };

  return {
    skillId: 'research.prospect_search',
    status: 'success',
    blocks: [progress, table],
    followUps: [
      { label: 'Enrich all', command: 'enrich these prospects' },
      { label: 'Create campaign', command: 'create campaign for these prospects' },
      { label: 'Export CSV', command: 'export results as csv' },
    ],
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
