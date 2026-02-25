import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

const DEMO_INTELLIGENCE = {
  healthScore: {
    overall: 78,
    label: 'healthy',
    breakdown: [
      { dimension: 'Engagement', score: 82, trend: 'up' },
      { dimension: 'Response Time', score: 75, trend: 'flat' },
      { dimension: 'Meeting Quality', score: 88, trend: 'up' },
      { dimension: 'Follow-up', score: 68, trend: 'down' },
    ],
  },
  recentActivity: [
    { id: '1', type: 'meeting', title: 'Discovery call with Acme Corp', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), account: 'Acme Corp' },
    { id: '2', type: 'email', title: 'Follow-up sent to TechStart', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), account: 'TechStart' },
    { id: '3', type: 'task', title: 'Prepare demo for Beta Labs', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), account: 'Beta Labs' },
  ],
  qualifiedAccounts: [
    { id: '1', name: 'Acme Corp', stage: 'discovery', health: 85, lastContact: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
    { id: '2', name: 'TechStart', stage: 'qualified', health: 72, lastContact: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
    { id: '3', name: 'Beta Labs', stage: 'pilot', health: 91, lastContact: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() },
  ],
  pendingActions: [
    { id: '1', type: 'follow-up', description: 'Send proposal to Acme Corp', priority: 'high', dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() },
    { id: '2', type: 'meeting', description: 'Schedule demo with new prospect', priority: 'medium' },
  ],
};

export async function GET() {
  const supabase = getServerSupabase();

  if (!supabase) {
    return NextResponse.json({ ...DEMO_INTELLIGENCE, dataSource: 'demo' });
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [recentCommsRes, prospectsRes, pendingRes] = await Promise.all([
      supabase
        .from('communications')
        .select('id, channel, subject, sent_at, prospect_id')
        .gte('sent_at', sevenDaysAgo)
        .order('sent_at', { ascending: false })
        .limit(10),
      supabase
        .from('prospects')
        .select('id, person_name, company_name, quality_score, last_contact_at')
        .in('quality_score', ['a', 'b'])
        .order('last_contact_at', { ascending: false })
        .limit(10),
      supabase
        .from('communications')
        .select('id, subject, prospect_id, channel')
        .eq('approval_status', 'pending')
        .limit(10),
    ]);

    // Check if we have any real data
    const hasComms = (recentCommsRes.data?.length ?? 0) > 0;
    const hasProspects = (prospectsRes.data?.length ?? 0) > 0;

    if (!hasComms && !hasProspects) {
      return NextResponse.json({ ...DEMO_INTELLIGENCE, dataSource: 'demo' });
    }

    // Build recent activity from communications
    const recentActivity = (recentCommsRes.data || []).map((comm, i) => ({
      id: comm.id || String(i),
      type: comm.channel === 'email' ? 'email' : comm.channel === 'meeting' ? 'meeting' : 'task',
      title: comm.subject || `${comm.channel} communication`,
      timestamp: comm.sent_at || new Date().toISOString(),
      account: undefined as string | undefined,
    }));

    // Build qualified accounts from prospects
    const qualifiedAccounts = (prospectsRes.data || []).map((p) => ({
      id: p.id,
      name: p.company_name || p.person_name,
      stage: p.quality_score === 'a' ? 'qualified' : 'discovery',
      health: p.quality_score === 'a' ? 85 : 70,
      lastContact: p.last_contact_at || new Date().toISOString(),
    }));

    // Build pending actions
    const pendingActions = (pendingRes.data || []).map((c) => ({
      id: c.id,
      type: 'approval' as const,
      description: `Approve: ${c.subject || c.channel + ' message'}`,
      priority: 'high' as const,
    }));

    // Compute a simple health score
    const replyCount = recentActivity.length;
    const overall = Math.min(100, Math.max(30, 50 + replyCount * 5));
    const label = overall >= 75 ? 'healthy' : overall >= 50 ? 'at-risk' : 'needs-attention';

    return NextResponse.json({
      healthScore: {
        overall,
        label,
        breakdown: DEMO_INTELLIGENCE.healthScore.breakdown, // keep demo breakdown for now
      },
      recentActivity: recentActivity.length > 0 ? recentActivity : DEMO_INTELLIGENCE.recentActivity,
      qualifiedAccounts: qualifiedAccounts.length > 0 ? qualifiedAccounts : DEMO_INTELLIGENCE.qualifiedAccounts,
      pendingActions: pendingActions.length > 0 ? pendingActions : DEMO_INTELLIGENCE.pendingActions,
      dataSource: 'live',
    });
  } catch (error) {
    console.error('Intelligence route error:', error);
    return NextResponse.json({ ...DEMO_INTELLIGENCE, dataSource: 'demo' });
  }
}
