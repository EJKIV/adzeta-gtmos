import { NextRequest, NextResponse } from 'next/server';
import { getMockEvents, EventType } from '@/lib/analytics/mock-events';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/events
// Query params:
//   - userId: string (optional)
//   - types: comma-separated EventType[] (optional)
//   - start: ISO date string (optional)
//   - end: ISO date string (optional)
//   - limit: number (default: 100)
//   - offset: number (default: 0)
// ─────────────────────────────────────────────────────────────────────────────

export interface EventsQueryParams {
  userId?: string;
  types?: EventType[];
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

function parseQueryParams(searchParams: URLSearchParams): EventsQueryParams {
  const userId = searchParams.get('userId') || undefined;
  
  const typesStr = searchParams.get('types');
  const types = typesStr ? typesStr.split(',').filter(Boolean) as EventType[] : undefined;
  
  const start = searchParams.get('start') || undefined;
  const end = searchParams.get('end') || undefined;
  
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');

  return {
    userId,
    types,
    start,
    end,
    limit: limit ? parseInt(limit, 10) : 100,
    offset: offset ? parseInt(offset, 10) : 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    // In production, verify admin role here
    // const { user } = await getAuth(request);
    // if (!user || !user.roles?.includes('admin')) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const params = parseQueryParams(searchParams);

    // Get events from mock data (replace with real database query in production)
    const result = getMockEvents({
      userId: params.userId,
      types: params.types,
      start: params.start,
      end: params.end,
      limit: params.limit,
      offset: params.offset,
    });

    // Add cache headers for performance
    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'no-cache'); // Real-time data shouldn't cache
    
    return response;
  } catch (error) {
    console.error('[API /admin/events] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// Optional: POST to create test events (admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    // const { user } = await getAuth(request);
    // if (!user || !user.roles?.includes('admin')) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    
    // In production, create actual event in database
    // For now, return success
    return NextResponse.json({ 
      success: true, 
      message: 'Event created (mock)' 
    });
  } catch (error) {
    console.error('[API /admin/events] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}