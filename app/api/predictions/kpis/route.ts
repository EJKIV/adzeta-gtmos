import { NextResponse } from 'next/server';

export async function GET() {
  // Return mock KPI predictions data
  const predictions = {
    trends: [
      {
        metric: 'delegations',
        current: 42,
        predicted: 48,
        confidence: 85,
        trend: 'up',
        change_percent: 14
      },
      {
        metric: 'mqls',
        current: 186,
        predicted: 175,
        confidence: 78,
        trend: 'down',
        change_percent: -6
      }
    ],
    forecast: {
      next_week: 52,
      next_month: 210,
      confidence: 82
    },
    last_updated: new Date().toISOString()
  };

  return NextResponse.json(predictions);
}
