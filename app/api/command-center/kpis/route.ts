import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

const DEMO_DATA = {
  pipeline_value: {
    current: 1_247_000,
    previous: 1_113_000,
    delta: 12,
    change: 'up' as const,
    label: 'Pipeline Value',
    format: 'currency' as const,
    last_updated: '',
  },
  meetings_booked: {
    current: 24,
    previous: 22,
    delta: 8,
    change: 'up' as const,
    label: 'Meetings Booked',
    format: 'number' as const,
    last_updated: '',
  },
  reply_rate: {
    current: 18.4,
    previous: 18.8,
    delta: -2.1,
    change: 'down' as const,
    label: 'Reply Rate',
    format: 'percent' as const,
    last_updated: '',
  },
  qualified_leads: {
    current: 186,
    previous: 177,
    delta: 5,
    change: 'up' as const,
    label: 'Qualified Leads',
    format: 'number' as const,
    last_updated: '',
  },
  active_sequences: {
    current: 7,
    previous: 7,
    delta: 0,
    change: 'flat' as const,
    label: 'Active Sequences',
    format: 'number' as const,
    last_updated: '',
  },
};

function withTimestamps<T extends Record<string, { last_updated: string }>>(data: T): T {
  const now = new Date().toISOString();
  const result = { ...data };
  for (const key of Object.keys(result)) {
    result[key as keyof T] = { ...result[key as keyof T], last_updated: now };
  }
  return result;
}

export async function GET() {
  const supabase = getServerSupabase();

  if (!supabase) {
    return NextResponse.json({ ...withTimestamps(DEMO_DATA), dataSource: 'demo' });
  }

  try {
    const [prospectsRes, campaignsRes, commsReplied, commsSent, sequencesRes] = await Promise.all([
      supabase.from('prospects').select('id', { count: 'exact', head: true }).in('quality_score', ['a', 'b']),
      supabase.from('outreach_campaigns').select('metrics'),
      supabase.from('communications').select('id', { count: 'exact', head: true }).not('replied_at', 'is', null),
      supabase.from('communications').select('id', { count: 'exact', head: true }).not('sent_at', 'is', null),
      supabase.from('outreach_sequences').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    const qualifiedLeads = prospectsRes.count ?? 0;

    // If no prospects at all, fall back to demo
    if (qualifiedLeads === 0 && (prospectsRes.error || !prospectsRes.count)) {
      // Double-check: maybe there are prospects but none qualified
      const totalCheck = await supabase.from('prospects').select('id', { count: 'exact', head: true });
      if (!totalCheck.count || totalCheck.count === 0) {
        return NextResponse.json({ ...withTimestamps(DEMO_DATA), dataSource: 'demo' });
      }
    }

    // Aggregate meetings booked and pipeline value from campaign metrics
    let meetingsBooked = 0;
    let pipelineValue = 0;
    const campaignRows = campaignsRes.data || [];
    for (const row of campaignRows) {
      const m = row.metrics as Record<string, unknown> | null;
      if (m) {
        meetingsBooked += (typeof m.meetings === 'number' ? m.meetings : 0);
        pipelineValue += (typeof m.pipeline_value === 'number' ? m.pipeline_value : 0);
      }
    }
    // If no explicit pipeline_value in metrics, estimate from qualified leads
    if (pipelineValue === 0 && qualifiedLeads > 0) {
      pipelineValue = qualifiedLeads * 6_500; // average deal size estimate
    }

    const repliedCount = commsReplied.count ?? 0;
    const sentCount = commsSent.count ?? 0;
    const replyRate = sentCount > 0 ? Math.round((repliedCount / sentCount) * 1000) / 10 : 0;

    const activeSequences = sequencesRes.count ?? 0;

    const now = new Date().toISOString();
    const kpis = {
      pipeline_value: {
        current: pipelineValue,
        previous: DEMO_DATA.pipeline_value.previous,
        delta: pipelineValue > 0 ? Math.round(((pipelineValue - DEMO_DATA.pipeline_value.previous) / DEMO_DATA.pipeline_value.previous) * 100) : 0,
        change: pipelineValue > DEMO_DATA.pipeline_value.previous ? 'up' : pipelineValue < DEMO_DATA.pipeline_value.previous ? 'down' : 'flat',
        label: 'Pipeline Value',
        format: 'currency',
        last_updated: now,
      },
      meetings_booked: {
        current: meetingsBooked,
        previous: DEMO_DATA.meetings_booked.previous,
        delta: meetingsBooked > 0 ? Math.round(((meetingsBooked - DEMO_DATA.meetings_booked.previous) / DEMO_DATA.meetings_booked.previous) * 100) : 0,
        change: meetingsBooked > DEMO_DATA.meetings_booked.previous ? 'up' : meetingsBooked < DEMO_DATA.meetings_booked.previous ? 'down' : 'flat',
        label: 'Meetings Booked',
        format: 'number',
        last_updated: now,
      },
      reply_rate: {
        current: replyRate,
        previous: DEMO_DATA.reply_rate.previous,
        delta: Math.round((replyRate - DEMO_DATA.reply_rate.previous) * 10) / 10,
        change: replyRate > DEMO_DATA.reply_rate.previous ? 'up' : replyRate < DEMO_DATA.reply_rate.previous ? 'down' : 'flat',
        label: 'Reply Rate',
        format: 'percent',
        last_updated: now,
      },
      qualified_leads: {
        current: qualifiedLeads,
        previous: DEMO_DATA.qualified_leads.previous,
        delta: qualifiedLeads > 0 ? Math.round(((qualifiedLeads - DEMO_DATA.qualified_leads.previous) / DEMO_DATA.qualified_leads.previous) * 100) : 0,
        change: qualifiedLeads > DEMO_DATA.qualified_leads.previous ? 'up' : qualifiedLeads < DEMO_DATA.qualified_leads.previous ? 'down' : 'flat',
        label: 'Qualified Leads',
        format: 'number',
        last_updated: now,
      },
      active_sequences: {
        current: activeSequences,
        previous: DEMO_DATA.active_sequences.previous,
        delta: activeSequences !== DEMO_DATA.active_sequences.previous
          ? Math.round(((activeSequences - DEMO_DATA.active_sequences.previous) / Math.max(DEMO_DATA.active_sequences.previous, 1)) * 100)
          : 0,
        change: activeSequences > DEMO_DATA.active_sequences.previous ? 'up' : activeSequences < DEMO_DATA.active_sequences.previous ? 'down' : 'flat',
        label: 'Active Sequences',
        format: 'number',
        last_updated: now,
      },
      dataSource: 'live' as const,
    };

    return NextResponse.json(kpis);
  } catch (error) {
    console.error('KPI route error:', error);
    return NextResponse.json({ ...withTimestamps(DEMO_DATA), dataSource: 'demo' });
  }
}
