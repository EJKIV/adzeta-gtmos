import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authenticate } from '@/lib/api-auth';

type KpiKey = 'qualified_leads' | 'meetings_booked' | 'reply_rate' | 'active_sequences' | 'pipeline_value';

interface DetailResponse {
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows: Record<string, unknown>[];
  dataSource: 'live' | 'demo';
}

const DEMO_RECORDS: Record<KpiKey, DetailResponse> = {
  qualified_leads: {
    title: 'Qualified Leads (A/B Grade)',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'title', label: 'Title' },
      { key: 'company', label: 'Company' },
      { key: 'grade', label: 'Grade' },
      { key: 'last_contact', label: 'Last Contact' },
    ],
    rows: [
      { name: 'Sarah Chen', title: 'CMO', company: 'FinPay', grade: 'A+', last_contact: '2 days ago' },
      { name: 'Marcus Johnson', title: 'VP Marketing', company: 'NexBank', grade: 'A', last_contact: '1 day ago' },
      { name: 'Emily Rodriguez', title: 'Head of Growth', company: 'PayStream', grade: 'A', last_contact: '3 days ago' },
      { name: 'David Kim', title: 'CMO', company: 'CoinVault', grade: 'B+', last_contact: '5 days ago' },
      { name: 'Lisa Thompson', title: 'VP Marketing', company: 'LendFlow', grade: 'B', last_contact: '1 week ago' },
      { name: 'James Wilson', title: 'CRO', company: 'TradeFi', grade: 'A', last_contact: '4 days ago' },
    ],
    dataSource: 'demo',
  },
  meetings_booked: {
    title: 'Meetings Booked',
    columns: [
      { key: 'prospect', label: 'Prospect' },
      { key: 'company', label: 'Company' },
      { key: 'type', label: 'Type' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status' },
    ],
    rows: [
      { prospect: 'Sarah Chen', company: 'FinPay', type: 'Demo', date: 'Thu 2pm', status: 'Confirmed' },
      { prospect: 'Marcus Johnson', company: 'NexBank', type: 'Discovery', date: 'Fri 10am', status: 'Confirmed' },
      { prospect: 'Emily Rodriguez', company: 'PayStream', type: 'Follow-up', date: 'Mon 3pm', status: 'Pending' },
      { prospect: 'David Kim', company: 'CoinVault', type: 'Demo', date: 'Tue 11am', status: 'Confirmed' },
      { prospect: 'Priya Patel', company: 'WealthOS', type: 'Discovery', date: 'Wed 2pm', status: 'Confirmed' },
    ],
    dataSource: 'demo',
  },
  reply_rate: {
    title: 'Reply Rate Breakdown',
    columns: [
      { key: 'sequence', label: 'Sequence' },
      { key: 'sent', label: 'Sent' },
      { key: 'replied', label: 'Replied' },
      { key: 'rate', label: 'Rate' },
      { key: 'trend', label: 'Trend' },
    ],
    rows: [
      { sequence: 'Sequence #1 - Fintech CMOs', sent: 120, replied: 28, rate: '23.3%', trend: 'up' },
      { sequence: 'Sequence #2 - SaaS VPs', sent: 85, replied: 14, rate: '16.5%', trend: 'flat' },
      { sequence: 'Sequence #3 - Series B', sent: 64, replied: 8, rate: '12.5%', trend: 'down' },
      { sequence: 'Sequence #4 - Event follow-up', sent: 42, replied: 11, rate: '26.2%', trend: 'up' },
      { sequence: 'Sequence #5 - Re-engagement', sent: 30, replied: 3, rate: '10.0%', trend: 'down' },
    ],
    dataSource: 'demo',
  },
  active_sequences: {
    title: 'Active Sequences',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'prospects', label: 'Prospects' },
      { key: 'step', label: 'Current Step' },
      { key: 'reply_rate', label: 'Reply Rate' },
      { key: 'status', label: 'Status' },
    ],
    rows: [
      { name: 'Fintech CMO Outreach', prospects: 120, step: 'Step 3/5', reply_rate: '23.3%', status: 'Active' },
      { name: 'SaaS VP Growth', prospects: 85, step: 'Step 2/4', reply_rate: '16.5%', status: 'Active' },
      { name: 'Series B Founders', prospects: 64, step: 'Step 4/6', reply_rate: '12.5%', status: 'Active' },
      { name: 'Conference Follow-up', prospects: 42, step: 'Step 1/3', reply_rate: '26.2%', status: 'Active' },
      { name: 'Re-engagement Q1', prospects: 30, step: 'Step 2/3', reply_rate: '10.0%', status: 'Active' },
      { name: 'Partner Referral', prospects: 18, step: 'Step 1/4', reply_rate: '33.3%', status: 'Active' },
      { name: 'Inbound Warm Leads', prospects: 25, step: 'Step 2/3', reply_rate: '28.0%', status: 'Active' },
    ],
    dataSource: 'demo',
  },
  pipeline_value: {
    title: 'Pipeline Breakdown',
    columns: [
      { key: 'deal', label: 'Deal' },
      { key: 'company', label: 'Company' },
      { key: 'value', label: 'Value' },
      { key: 'stage', label: 'Stage' },
      { key: 'probability', label: 'Probability' },
    ],
    rows: [
      { deal: 'Enterprise Platform', company: 'FinPay', value: '$320k', stage: 'Negotiation', probability: '75%' },
      { deal: 'Growth Suite', company: 'NexBank', value: '$180k', stage: 'Proposal', probability: '50%' },
      { deal: 'Analytics Add-on', company: 'PayStream', value: '$95k', stage: 'Discovery', probability: '25%' },
      { deal: 'Full Stack', company: 'CoinVault', value: '$250k', stage: 'Demo', probability: '40%' },
      { deal: 'Starter Package', company: 'LendFlow', value: '$45k', stage: 'Negotiation', probability: '80%' },
      { deal: 'Platform Migration', company: 'TradeFi', value: '$210k', stage: 'Proposal', probability: '55%' },
      { deal: 'API Integration', company: 'WealthOS', value: '$147k', stage: 'Discovery', probability: '30%' },
    ],
    dataSource: 'demo',
  },
};

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = request.nextUrl.searchParams.get('key') as KpiKey | null;

  if (!key || !DEMO_RECORDS[key]) {
    return NextResponse.json({ error: 'Invalid KPI key' }, { status: 400 });
  }

  const supabase = getServerSupabase();

  if (!supabase) {
    return NextResponse.json(DEMO_RECORDS[key]);
  }

  try {
    if (key === 'qualified_leads') {
      const { data: prospects } = await supabase
        .from('prospects')
        .select('person_name, person_title, company_name, quality_score, last_contact_at')
        .in('quality_score', ['a', 'b'])
        .order('quality_score', { ascending: true })
        .limit(20);

      if (prospects && prospects.length > 0) {
        return NextResponse.json({
          title: 'Qualified Leads (A/B Grade)',
          columns: DEMO_RECORDS.qualified_leads.columns,
          rows: prospects.map((p) => ({
            name: p.person_name,
            title: p.person_title || '',
            company: p.company_name || '',
            grade: (p.quality_score || 'b').toUpperCase(),
            last_contact: p.last_contact_at
              ? `${Math.floor((Date.now() - new Date(p.last_contact_at).getTime()) / 86400000)}d ago`
              : 'Never',
          })),
          dataSource: 'live',
        });
      }
    }

    if (key === 'meetings_booked') {
      const { data: meetings } = await supabase
        .from('communications')
        .select('subject, to_address, sent_at, status, prospect_id')
        .eq('channel', 'meeting')
        .order('sent_at', { ascending: false })
        .limit(20);

      if (meetings && meetings.length > 0) {
        return NextResponse.json({
          title: 'Meetings Booked',
          columns: DEMO_RECORDS.meetings_booked.columns,
          rows: meetings.map((m) => ({
            prospect: m.to_address || 'Unknown',
            company: '',
            type: m.subject || 'Meeting',
            date: m.sent_at ? new Date(m.sent_at).toLocaleDateString() : '',
            status: m.status || 'Scheduled',
          })),
          dataSource: 'live',
        });
      }
    }

    if (key === 'reply_rate') {
      const { data: perf } = await supabase
        .from('channel_performance')
        .select('channel, messages_sent, replies, reply_rate')
        .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (perf && perf.length > 0) {
        // Aggregate by channel
        const byChannel = new Map<string, { sent: number; replied: number }>();
        for (const r of perf) {
          const ch = r.channel ?? 'unknown';
          const d = byChannel.get(ch) ?? { sent: 0, replied: 0 };
          d.sent += r.messages_sent ?? 0;
          d.replied += r.replies ?? 0;
          byChannel.set(ch, d);
        }

        const rows = [...byChannel.entries()].map(([channel, data]) => {
          const rate = data.sent > 0 ? ((data.replied / data.sent) * 100).toFixed(1) + '%' : '0%';
          return {
            sequence: channel.charAt(0).toUpperCase() + channel.slice(1),
            sent: data.sent,
            replied: data.replied,
            rate,
            trend: data.sent > 0 && (data.replied / data.sent) > 0.15 ? 'up' : 'flat',
          };
        }).sort((a, b) => b.sent - a.sent);

        return NextResponse.json({
          title: 'Reply Rate Breakdown',
          columns: DEMO_RECORDS.reply_rate.columns,
          rows,
          dataSource: 'live',
        });
      }
    }

    if (key === 'pipeline_value') {
      const { data: prospects } = await supabase
        .from('prospects')
        .select('company_name, person_name, status, quality_score, fit_score')
        .in('status', ['qualified', 'engaged', 'opportunity'])
        .order('quality_score', { ascending: true })
        .limit(20);

      if (prospects && prospects.length > 0) {
        const stageMap: Record<string, string> = {
          qualified: 'Discovery',
          engaged: 'Proposal',
          opportunity: 'Negotiation',
        };
        const probMap: Record<string, string> = {
          qualified: '25%',
          engaged: '50%',
          opportunity: '75%',
        };
        const valueMap: Record<string, number> = {
          a: 250000,
          b: 120000,
        };

        return NextResponse.json({
          title: 'Pipeline Breakdown',
          columns: DEMO_RECORDS.pipeline_value.columns,
          rows: prospects.map(p => {
            const estValue = valueMap[p.quality_score ?? 'b'] ?? 80000;
            return {
              deal: p.person_name || 'Unknown',
              company: p.company_name || 'Unknown',
              value: `$${(estValue / 1000).toFixed(0)}k`,
              stage: stageMap[p.status] || p.status,
              probability: probMap[p.status] || '20%',
            };
          }),
          dataSource: 'live',
        });
      }
    }

    if (key === 'active_sequences') {
      const { data: sequences } = await supabase
        .from('outreach_sequences')
        .select('name, total_steps, performance_metrics, status')
        .eq('status', 'active')
        .limit(20);

      if (sequences && sequences.length > 0) {
        return NextResponse.json({
          title: 'Active Sequences',
          columns: DEMO_RECORDS.active_sequences.columns,
          rows: sequences.map((s) => {
            const perf = s.performance_metrics as Record<string, unknown> | null;
            return {
              name: s.name,
              prospects: perf?.times_used ?? 0,
              step: `Step 1/${s.total_steps}`,
              reply_rate: perf?.avg_reply_rate ? `${perf.avg_reply_rate}%` : '0%',
              status: s.status,
            };
          }),
          dataSource: 'live',
        });
      }
    }

    // Fallback to demo for this key
    return NextResponse.json(DEMO_RECORDS[key]);
  } catch (error) {
    console.error('KPI detail route error:', error);
    return NextResponse.json(DEMO_RECORDS[key]);
  }
}
