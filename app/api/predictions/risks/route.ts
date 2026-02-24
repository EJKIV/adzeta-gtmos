import { NextResponse } from 'next/server';

export async function GET() {
  // Return mock risk predictions
  const risks = {
    risks: [
      {
        id: '1',
        type: 'pipeline_gap',
        severity: 'medium',
        probability: 65,
        impact: 'Q1 forecast at risk',
        mitigation: 'Accelerate top 5 deals'
      }
    ],
    total_risk_score: 42,
    last_updated: new Date().toISOString()
  };

  return NextResponse.json(risks);
}
