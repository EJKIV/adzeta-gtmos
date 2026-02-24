import { NextResponse } from 'next/server';

export async function GET() {
  // Return mock KPI data for now
  // In production, this would come from database or external service
  const kpis = {
    delegations: {
      current: 42,
      target: 50,
      trend: 5,
      change: 'up',
      last_updated: new Date().toISOString()
    },
    mqls: {
      current: 186,
      target: 200,
      trend: -3,
      change: 'down',
      last_updated: new Date().toISOString()
    },
    revenue: {
      current: 284000,
      target: 300000,
      trend: 12,
      change: 'up',
      last_updated: new Date().toISOString()
    },
    meetings: {
      current: 24,
      target: 30,
      trend: 8,
      change: 'up',
      last_updated: new Date().toISOString()
    }
  };

  return NextResponse.json(kpis);
}
