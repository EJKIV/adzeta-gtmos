import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getServerSupabase } from '@/lib/supabase-server';
import type { ForecastResponse, ForecastResult } from '@/lib/predictions/types';

const DEMO_DATA: ForecastResponse = {
  marker: 'kpi_forecasts',
  generated_at: new Date().toISOString(),
  forecasts: [
    {
      metric: 'reply_rate', horizon: '7d', currentValue: 18.4, predictedValue: 19.1,
      confidenceInterval: { lower: 16.5, upper: 21.7 }, changePercent: 3.8,
      trend: 'up', confidence: 78, trajectoryChanged: false,
      generatedAt: new Date().toISOString(), display_message: 'Reply rate steady at ~18%',
    },
    {
      metric: 'meetings_booked', horizon: '7d', currentValue: 24, predictedValue: 27,
      confidenceInterval: { lower: 20, upper: 34 }, changePercent: 12.5,
      trend: 'up', confidence: 72, trajectoryChanged: false,
      generatedAt: new Date().toISOString(), display_message: 'Meetings trending up',
    },
  ],
  summary: { totalPredictions: 2, trendChanges: 0, overallTrajectory: 'stable' },
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
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

    const { data: rows, error } = await supabase
      .from('channel_performance')
      .select('date, messages_sent, replies, meetings_booked, reply_rate, meeting_rate, revenue_won')
      .gte('date', fourteenDaysAgo)
      .order('date', { ascending: true });

    if (error || !rows || rows.length < 2) {
      return NextResponse.json({ ...DEMO_DATA, generated_at: new Date().toISOString(), dataSource: 'demo' });
    }

    // Group by date and aggregate
    const byDate = new Map<string, { sent: number; replies: number; meetings: number; revenue: number }>();
    for (const r of rows) {
      const d = byDate.get(r.date) ?? { sent: 0, replies: 0, meetings: 0, revenue: 0 };
      d.sent += r.messages_sent ?? 0;
      d.replies += r.replies ?? 0;
      d.meetings += r.meetings_booked ?? 0;
      d.revenue += r.revenue_won ?? 0;
      byDate.set(r.date, d);
    }

    const dates = [...byDate.keys()].sort();
    const metrics = [
      { key: 'reply_rate', extract: (d: typeof byDate extends Map<string, infer V> ? V : never) => d.sent > 0 ? (d.replies / d.sent) * 100 : 0 },
      { key: 'meetings_booked', extract: (d: { meetings: number }) => d.meetings },
      { key: 'revenue', extract: (d: { revenue: number }) => d.revenue },
      { key: 'messages_sent', extract: (d: { sent: number }) => d.sent },
    ];

    const forecasts: ForecastResult[] = [];
    const now = new Date().toISOString();

    for (const m of metrics) {
      const values = dates.map(d => m.extract(byDate.get(d)!));
      if (values.length < 2) continue;

      const recent7 = values.slice(-7);
      const prior7 = values.slice(-14, -7);

      const recentAvg = recent7.reduce((a, b) => a + b, 0) / recent7.length;
      const priorAvg = prior7.length > 0 ? prior7.reduce((a, b) => a + b, 0) / prior7.length : recentAvg;

      const changePct = priorAvg !== 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : 0;
      const trend: 'up' | 'down' | 'stable' = changePct > 3 ? 'up' : changePct < -3 ? 'down' : 'stable';

      // Simple linear extrapolation for predicted value
      const current = values[values.length - 1];
      const predicted = Math.round((current * (1 + changePct / 100)) * 100) / 100;
      const stddev = Math.sqrt(recent7.reduce((s, v) => s + (v - recentAvg) ** 2, 0) / recent7.length);

      forecasts.push({
        metric: m.key,
        horizon: '7d',
        currentValue: Math.round(current * 100) / 100,
        predictedValue: predicted,
        confidenceInterval: {
          lower: Math.round((predicted - 1.96 * stddev) * 100) / 100,
          upper: Math.round((predicted + 1.96 * stddev) * 100) / 100,
        },
        changePercent: Math.round(changePct * 10) / 10,
        trend,
        confidence: Math.max(50, Math.min(95, Math.round(85 - Math.abs(changePct) * 0.5))),
        trajectoryChanged: (changePct > 3 && priorAvg > recentAvg) || (changePct < -3 && priorAvg < recentAvg),
        generatedAt: now,
        display_message: `${m.key.replace(/_/g, ' ')} ${trend === 'up' ? 'trending up' : trend === 'down' ? 'trending down' : 'stable'} (${changePct > 0 ? '+' : ''}${Math.round(changePct)}%)`,
      });
    }

    const trendChanges = forecasts.filter(f => f.trajectoryChanged).length;
    const upCount = forecasts.filter(f => f.trend === 'up').length;
    const downCount = forecasts.filter(f => f.trend === 'down').length;

    const response: ForecastResponse & { dataSource: string } = {
      marker: 'kpi_forecasts',
      generated_at: now,
      forecasts,
      summary: {
        totalPredictions: forecasts.length,
        trendChanges,
        overallTrajectory: upCount > downCount ? 'accelerating' : downCount > upCount ? 'decelerating' : 'stable',
      },
      dataSource: 'live',
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('predictions/kpis error:', err);
    return NextResponse.json({ ...DEMO_DATA, generated_at: new Date().toISOString(), dataSource: 'demo' });
  }
}
