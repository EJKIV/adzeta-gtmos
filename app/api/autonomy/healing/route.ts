import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Healing events table doesn't exist yet — return empty with demo fallback
  return NextResponse.json({
    events: [],
    dataSource: 'demo',
  });
}
