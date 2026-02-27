import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getServerSupabase } from '@/lib/supabase-server';
import type { RiskResponse, DealRiskScore } from '@/lib/predictions/types';

const DEMO_DATA: RiskResponse = {
  marker: 'risk_assessment',
  generated_at: new Date().toISOString(),
  summary: {
    totalDeals: 0, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0,
    atRiskPipelineValue: 0, averageRiskScore: 0,
  },
  top_risks: [],
  improving_deals: [],
};

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ...DEMO_DATA, generated_at: new Date().toISOString(), dataSource: 'demo' });
  }

  try {
    // Get qualified prospects with their last contact
    const { data: prospects, error: pErr } = await supabase
      .from('prospects')
      .select('id, company_name, contact_first_name, contact_last_name, quality_score, status, fit_score, intent_score, engagement_score, last_contact_at, updated_at')
      .in('quality_score', ['a', 'b'])
      .in('status', ['qualified', 'contacted', 'engaged', 'opportunity'])
      .order('quality_score', { ascending: true })
      .limit(50);

    if (pErr || !prospects || prospects.length === 0) {
      return NextResponse.json({ ...DEMO_DATA, generated_at: new Date().toISOString(), dataSource: 'demo' });
    }

    const now = Date.now();
    const risks: DealRiskScore[] = [];

    for (const p of prospects) {
      const lastContact = p.last_contact_at ? new Date(p.last_contact_at).getTime() : 0;
      const daysSinceContact = lastContact > 0 ? Math.floor((now - lastContact) / 86400000) : 999;

      // Score factors
      const contactStaleness = Math.min(100, daysSinceContact * 5); // 20 days = 100
      const engagementGap = 100 - (p.engagement_score ?? 50);
      const intentWeakness = 100 - (p.intent_score ?? 50);

      const totalScore = Math.round(contactStaleness * 0.4 + engagementGap * 0.35 + intentWeakness * 0.25);

      const level: 'low' | 'medium' | 'high' | 'critical' =
        totalScore >= 80 ? 'critical' : totalScore >= 60 ? 'high' : totalScore >= 40 ? 'medium' : 'low';

      const emoji = { low: '🟢' as const, medium: '🟡' as const, high: '🟠' as const, critical: '🔴' as const }[level];
      const color = { low: 'green' as const, medium: 'yellow' as const, high: 'orange' as const, critical: 'red' as const }[level];

      const factors = [
        { name: 'Contact Staleness', weight: 0.4, score: contactStaleness, rawValue: daysSinceContact, description: `${daysSinceContact} days since last contact` },
        { name: 'Engagement Gap', weight: 0.35, score: engagementGap, rawValue: p.engagement_score ?? 0, description: `Engagement score: ${p.engagement_score ?? 'N/A'}` },
        { name: 'Intent Weakness', weight: 0.25, score: intentWeakness, rawValue: p.intent_score ?? 0, description: `Intent score: ${p.intent_score ?? 'N/A'}` },
      ];

      const topReasons = factors
        .filter(f => f.score > 50)
        .sort((a, b) => b.score - a.score)
        .map(f => f.description);

      const recommendedActions = [];
      if (daysSinceContact > 14) recommendedActions.push('Re-engage with personalized outreach');
      if ((p.engagement_score ?? 0) < 30) recommendedActions.push('Send high-value content to boost engagement');
      if ((p.intent_score ?? 0) < 30) recommendedActions.push('Qualify intent with discovery call');
      if (recommendedActions.length === 0) recommendedActions.push('Continue current cadence');

      risks.push({
        dealId: String(p.id),
        dealName: `${p.contact_first_name ?? ''} ${p.contact_last_name ?? ''}`.trim() || p.company_name,
        accountName: p.company_name ?? 'Unknown',
        totalScore,
        level,
        emoji,
        color,
        factors,
        topReasons,
        recommendedActions,
        lastUpdated: p.updated_at ?? new Date().toISOString(),
        trend: daysSinceContact < 7 ? 'improving' : daysSinceContact > 21 ? 'worsening' : 'stable',
        daysInStage: daysSinceContact,
        display_message: `${p.company_name}: ${level} risk (score ${totalScore}) — ${topReasons[0] || 'Monitor'}`,
      });
    }

    risks.sort((a, b) => b.totalScore - a.totalScore);

    const criticalCount = risks.filter(r => r.level === 'critical').length;
    const highCount = risks.filter(r => r.level === 'high').length;
    const mediumCount = risks.filter(r => r.level === 'medium').length;
    const lowCount = risks.filter(r => r.level === 'low').length;

    const response: RiskResponse & { dataSource: string } = {
      marker: 'risk_assessment',
      generated_at: new Date().toISOString(),
      summary: {
        totalDeals: risks.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        atRiskPipelineValue: (criticalCount + highCount) * 6500,
        averageRiskScore: risks.length > 0 ? Math.round(risks.reduce((s, r) => s + r.totalScore, 0) / risks.length) : 0,
      },
      top_risks: risks.filter(r => r.level === 'critical' || r.level === 'high').slice(0, 10),
      improving_deals: risks.filter(r => r.trend === 'improving').slice(0, 5),
      dataSource: 'live',
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('predictions/risks error:', err);
    return NextResponse.json({ ...DEMO_DATA, generated_at: new Date().toISOString(), dataSource: 'demo' });
  }
}
