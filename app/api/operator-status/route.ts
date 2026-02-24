import { NextResponse } from 'next/server';

export async function GET() {
  // Return operator status
  const status = {
    overrides_today: 2,
    overrides_week: 8,
    target_override_rate: 5,
    current_override_rate: 4.2,
    status: 'healthy', // healthy, warning, critical
    last_updated: new Date().toISOString()
  };

  return NextResponse.json(status);
}
