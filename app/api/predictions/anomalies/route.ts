import { NextResponse } from 'next/server';

export async function GET() {
  // Return mock anomaly predictions
  const anomalies = {
    anomalies: [
      {
        id: '1',
        metric: 'MQL',
        severity: 'high',
        deviation: -15,
        trend: 'declining',
        detected_at: new Date().toISOString(),
        recommendation: 'Investigate lead source quality'
      }
    ],
    total: 1,
    high_priority: 1
  };

  return NextResponse.json(anomalies);
}
