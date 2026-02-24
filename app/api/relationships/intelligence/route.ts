import { NextResponse } from 'next/server';

export async function GET() {
  // Return mock relationship intelligence
  const intelligence = {
    insights: [
      {
        id: '1',
        account: 'Qualified.io',
        signal: 'Recent funding announcement',
        action: 'Schedule outreach within 48h',
        priority: 'high'
      }
    ],
    opportunities: 3,
    last_updated: new Date().toISOString()
  };

  return NextResponse.json(intelligence);
}
