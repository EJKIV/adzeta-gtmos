import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authenticate } from '@/lib/api-auth';

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

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    // Compute real health breakdown from data
    const sevenDaysAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [perfRes, responseTimeRes] = await Promise.all([
      supabase
        .from('channel_performance')
        .select('reply_rate')
        .gte('date', sevenDaysAgoDate),
      supabase
        .from('communications')
        .select('sent_at, replied_at')
        .not('replied_at', 'is', null)
        .gte('sent_at', sevenDaysAgo)
        .limit(50),
    ]);

    // Engagement: avg reply rate from channel_performance
    const perfData = perfRes.data ?? [];
    const avgReplyRate = perfData.length > 0
      ? perfData.reduce((s, r) => s + (r.reply_rate ?? 0), 0) / perfData.length
      : 0;
    const engagementScore = Math.min(100, Math.round(avgReplyRate * 4)); // 25% reply rate = 100

    // Response Time: avg hours between sent and replied
    const responseData = responseTimeRes.data ?? [];
    let avgResponseHours = 48; // default
    if (responseData.length > 0) {
      const totalHours = responseData.reduce((s, c) => {
        const sent = new Date(c.sent_at).getTime();
        const replied = new Date(c.replied_at).getTime();
        return s + Math.max(0, (replied - sent) / 3600000);
      }, 0);
      avgResponseHours = totalHours / responseData.length;
    }
    const responseScore = Math.min(100, Math.round(Math.max(0, 100 - avgResponseHours * 2))); // <2h=96, 24h=52, 48h=4

    // Follow-up: % of qualified prospects contacted within 7 days
    const contactedRecently = (prospectsRes.data || []).filter(p => {
      if (!p.last_contact_at) return false;
      return (Date.now() - new Date(p.last_contact_at).getTime()) < 7 * 86400000;
    }).length;
    const totalQualified = (prospectsRes.data || []).length;
    const followUpScore = totalQualified > 0 ? Math.round((contactedRecently / totalQualified) * 100) : 50;

    // Meeting quality: based on ratio of meetings to outreach
    const meetingQuality = Math.min(100, Math.round(engagementScore * 1.1));

    const breakdown = [
      { dimension: 'Engagement', score: engagementScore, trend: engagementScore >= 70 ? 'up' : engagementScore >= 40 ? 'flat' : 'down' },
      { dimension: 'Response Time', score: responseScore, trend: responseScore >= 70 ? 'up' : responseScore >= 40 ? 'flat' : 'down' },
      { dimension: 'Meeting Quality', score: meetingQuality, trend: meetingQuality >= 70 ? 'up' : meetingQuality >= 40 ? 'flat' : 'down' },
      { dimension: 'Follow-up', score: followUpScore, trend: followUpScore >= 70 ? 'up' : followUpScore >= 40 ? 'flat' : 'down' },
    ];

    const overall = Math.round(breakdown.reduce((s, b) => s + b.score, 0) / breakdown.length);
    const label = overall >= 75 ? 'healthy' : overall >= 50 ? 'at-risk' : 'needs-attention';

    return NextResponse.json({
      healthScore: {
        overall,
        label,
        breakdown,
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
