import { NextResponse } from 'next/server';

export async function GET() {
  // Return mock intelligence/recommendations data
  const intelligence = {
    recommendations: [
      {
        id: '1',
        type: 'kpi_investigation',
        title: 'Investigate MQL decline',
        description: 'MQL volume dropped 15% vs last week',
        confidence: 85,
        priority: 'high',
        status: 'pending',
        created_at: new Date().toISOString()
      }
    ],
    pending_count: 3,
    auto_executed_today: 5,
    total_decisions: 156
  };

  return NextResponse.json(intelligence);
}
