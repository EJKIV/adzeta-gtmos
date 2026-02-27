import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getServerSupabase } from '@/lib/supabase-server';
import type { AnomalyResponse, AnomalyResult } from '@/lib/predictions/types';

const DEMO_DATA: AnomalyResponse = {
  marker: 'anomaly_detection',
  generated_at: new Date().toISOString(),
  health: 'healthy',
  summary: { totalAnomalies: 0, criticalCount: 0, warningCount: 0, infoCount: 0, newAnomalies: 0 },
  anomalies: [],
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
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const { data: rows, error } = await supabase
      .from('channel_performance')
      .select('date, channel, messages_sent, replies, meetings_booked, reply_rate, meeting_rate, revenue_won')
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: true });

    if (error || !rows || rows.length < 2) {
      return NextResponse.json({ ...DEMO_DATA, generated_at: new Date().toISOString(), dataSource: 'demo' });
    }

    // Aggregate by date
    const byDate = new Map<string, { sent: number; replies: number; meetings: number; replyRate: number; count: number }>();
    for (const r of rows) {
      const d = byDate.get(r.date) ?? { sent: 0, replies: 0, meetings: 0, replyRate: 0, count: 0 };
      d.sent += r.messages_sent ?? 0;
      d.replies += r.replies ?? 0;
      d.meetings += r.meetings_booked ?? 0;
      d.replyRate += r.reply_rate ?? 0;
      d.count += 1;
      byDate.set(r.date, d);
    }

    const dates = [...byDate.keys()].sort();
    const todayData = byDate.get(today);
    const priorDates = dates.filter(d => d !== today);

    if (!todayData || priorDates.length < 3) {
      return NextResponse.json({ ...DEMO_DATA, generated_at: new Date().toISOString(), dataSource: 'demo' });
    }

    // Compute z-scores for today's metrics vs prior averages
    const anomalies: AnomalyResult[] = [];
    const now = new Date().toISOString();

    const metricsToCheck = [
      { key: 'reply_rate', label: 'Reply Rate', getValue: (d: typeof todayData) => d.sent > 0 ? (d.replies / d.sent) * 100 : 0 },
      { key: 'meetings', label: 'Meetings Booked', getValue: (d: { meetings: number }) => d.meetings },
      { key: 'messages_sent', label: 'Messages Sent', getValue: (d: { sent: number }) => d.sent },
    ];

    for (const m of metricsToCheck) {
      const priorValues = priorDates.map(d => m.getValue(byDate.get(d)!));
      const todayValue = m.getValue(todayData);

      const avg = priorValues.reduce((a, b) => a + b, 0) / priorValues.length;
      const stddev = Math.sqrt(priorValues.reduce((s, v) => s + (v - avg) ** 2, 0) / priorValues.length);

      if (stddev === 0) continue;

      const zScore = (todayValue - avg) / stddev;
      const absZ = Math.abs(zScore);

      if (absZ >= 2) {
        const severity: 'critical' | 'warning' | 'info' = absZ >= 3 ? 'critical' : 'warning';
        const type: 'spike' | 'drop' = zScore > 0 ? 'spike' : 'drop';

        anomalies.push({
          id: `anomaly-${m.key}-${today}`,
          metric: m.label,
          detectedAt: now,
          severity,
          type,
          value: Math.round(todayValue * 100) / 100,
          expectedRange: {
            min: Math.round((avg - 2 * stddev) * 100) / 100,
            max: Math.round((avg + 2 * stddev) * 100) / 100,
          },
          zScore: Math.round(zScore * 100) / 100,
          message: `${m.label} ${type === 'spike' ? 'spiked' : 'dropped'} to ${Math.round(todayValue * 10) / 10} (expected ${Math.round(avg * 10) / 10} ± ${Math.round(stddev * 10) / 10})`,
          display_message: `${m.label} is ${Math.round(Math.abs(zScore) * 10) / 10} standard deviations ${zScore > 0 ? 'above' : 'below'} normal`,
          recommendedAction: type === 'drop'
            ? `Investigate the ${m.label.toLowerCase()} decline — check for deliverability issues or audience changes`
            : `Review the ${m.label.toLowerCase()} spike — verify data quality and identify what's driving the increase`,
        });
      }
    }

    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    const warningCount = anomalies.filter(a => a.severity === 'warning').length;
    const infoCount = anomalies.filter(a => a.severity === 'info').length;

    const health: 'healthy' | 'degraded' | 'critical' =
      criticalCount > 0 ? 'critical' : warningCount > 0 ? 'degraded' : 'healthy';

    const response: AnomalyResponse & { dataSource: string } = {
      marker: 'anomaly_detection',
      generated_at: now,
      health,
      summary: {
        totalAnomalies: anomalies.length,
        criticalCount,
        warningCount,
        infoCount,
        newAnomalies: anomalies.length,
      },
      anomalies,
      dataSource: 'live',
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('predictions/anomalies error:', err);
    return NextResponse.json({ ...DEMO_DATA, generated_at: new Date().toISOString(), dataSource: 'demo' });
  }
}
