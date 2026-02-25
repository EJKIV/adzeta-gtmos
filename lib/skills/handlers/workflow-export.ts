/**
 * Skill: workflow.export_results
 *
 * Exports prospect data as CSV.
 * Reads prospectIds from follow-up context or queries recent prospects.
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput } from '../types';
import { getServerSupabase } from '@/lib/supabase-server';

const FOLLOW_UPS = [
  { label: 'Create campaign', command: 'create campaign for these prospects' },
  { label: 'Enrich prospects', command: 'enrich these prospects' },
];

const SAMPLE_CSV = `name,title,email,company,industry,domain
Sarah Chen,CMO,sarah@finpay.io,FinPay,Fintech,finpay.io
Marcus Johnson,VP Marketing,marcus@nexbank.com,NexBank,Fintech,nexbank.com
Emily Rodriguez,Head of Growth,emily@paystream.co,PayStream,Fintech,paystream.co
David Kim,CMO,david@coinvault.io,CoinVault,Crypto,coinvault.io
Lisa Thompson,VP Marketing,lisa@lendflow.com,LendFlow,Fintech,lendflow.com`;

async function handler(input: SkillInput): Promise<SkillOutput> {
  const prospectIds = input.params.prospectIds as string[] | undefined;
  const supabase = getServerSupabase();

  // Demo mode — no Supabase
  if (!supabase) {
    return {
      skillId: 'workflow.export_results',
      status: 'success',
      blocks: [
        {
          type: 'confirmation',
          action: 'export_csv',
          status: 'completed',
          message: 'CSV export ready (sample data).',
          progress: 100,
        },
        {
          type: 'insight',
          title: 'CSV Export (demo)',
          description: `\`\`\`\n${SAMPLE_CSV}\n\`\`\``,
          severity: 'info',
        },
      ],
      followUps: FOLLOW_UPS,
      executionMs: 0,
      dataFreshness: 'mock',
    };
  }

  // Build query
  let query = supabase
    .from('prospects')
    .select('person_name, person_title, person_email, company_name, company_industry, company_domain')
    .order('created_at', { ascending: false })
    .limit(200);

  if (prospectIds && prospectIds.length > 0) {
    query = query.in('id', prospectIds);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return {
      skillId: 'workflow.export_results',
      status: 'partial',
      blocks: [
        {
          type: 'insight',
          title: 'No prospects to export',
          description: error ? `Database error: ${error.message}` : 'Run a search first, then try exporting.',
          severity: 'warning',
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

  // Build CSV
  const header = 'name,title,email,company,industry,domain';
  const rows = data.map((r) => {
    const escape = (v: string | null) => {
      const s = (v || '').replace(/"/g, '""');
      return s.includes(',') ? `"${s}"` : s;
    };
    return [
      escape(r.person_name),
      escape(r.person_title),
      escape(r.person_email),
      escape(r.company_name),
      escape(r.company_industry),
      escape(r.company_domain),
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');

  return {
    skillId: 'workflow.export_results',
    status: 'success',
    blocks: [
      {
        type: 'confirmation',
        action: 'export_csv',
        status: 'completed',
        message: `Exported ${data.length} prospects as CSV.`,
        progress: 100,
      },
      {
        type: 'insight',
        title: `CSV Export (${data.length} rows)`,
        description: `\`\`\`\n${csv}\n\`\`\``,
        severity: 'success',
      },
    ],
    followUps: FOLLOW_UPS,
    executionMs: 0,
    dataFreshness: 'live',
  };
}

skillRegistry.register({
  id: 'workflow.export_results',
  name: 'Export Results',
  description: 'Exports prospect data as CSV for use in other tools.',
  domain: 'workflow',
  inputSchema: { prospectIds: { type: 'array', optional: true } },
  responseType: ['confirmation', 'insight'],
  triggerPatterns: [
    '\\b(export|download|save)\\b.*\\b(csv|spreadsheet|results|prospects)\\b',
    '\\bcsv\\b',
  ],
  estimatedMs: 1000,
  examples: [
    'export results as csv',
    'download prospects',
    'save to spreadsheet',
  ],
  handler,
});
