import { NextRequest, NextResponse } from 'next/server';

function authenticate(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const apiKey = process.env.OPENCLAW_API_KEY;
    if (apiKey && token === apiKey) return true;
  }
  // Allow requests without auth in development
  if (process.env.NODE_ENV === 'development') return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const state = {
    kpis: {
      pipeline_value: { current: 1_247_000, delta: 12, direction: 'up' },
      meetings_booked: { current: 24, delta: 8, direction: 'up' },
      reply_rate: { current: 18.4, delta: -2.1, direction: 'down' },
      qualified_leads: { current: 186, delta: 5, direction: 'up' },
      active_sequences: { current: 7, delta: 0, direction: 'flat' },
    },
    health: 'healthy',
    recentCommands: [],
    activeJobs: [],
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(state);
}
