import { NextRequest, NextResponse } from 'next/server';
import { getMockMetrics } from '@/lib/analytics/mock-events';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/metrics
// Query params:
//   - timerange: '15m' | '1h' | '24h' | '7d' (default: '1h')
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // In production, verify admin role here
    // const { user } = await getAuth(request);
    // if (!user || !user.roles?.includes('admin')) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const timerange = (searchParams.get('timerange') as '15m' | '1h' | '24h' | '7d') || '1h';

    // Validate timerange
    const validRanges: Array<'15m' | '1h' | '24h' | '7d'> = ['15m', '1h', '24h', '7d'];
    if (!validRanges.includes(timerange)) {
      return NextResponse.json(
        { error: 'Invalid timerange. Must be one of: 15m, 1h, 24h, 7d' },
        { status: 400 }
      );
    }

    // Get metrics from mock data (replace with real aggregation query in production)
    const metrics = getMockMetrics(timerange);

    // Cache for short duration since metrics refresh frequently
    const response = NextResponse.json(metrics);
    response.headers.set('Cache-Control', 'max-age=10'); // 10 second cache
    
    return response;
  } catch (error) {
    console.error('[API /admin/metrics] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}