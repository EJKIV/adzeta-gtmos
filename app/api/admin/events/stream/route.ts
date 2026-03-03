import { NextRequest } from 'next/server';
import { addMockEvent, EventType } from '@/lib/analytics/mock-events';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/events/stream
// Server-Sent Events endpoint for real-time event updates
// Query params:
//   - userId: string (optional)
//   - types: comma-separated EventType[] (optional)
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

const USER_TYPES: EventType[] = ['create', 'update', 'delete', 'approve', 'reject', 'login', 'logout', 'export', 'import', 'sync', 'error', 'warning'];

export async function GET(request: NextRequest) {
  // Parse filter params
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const typesStr = searchParams.get('types');
  const typesFilter = typesStr ? typesStr.split(',') as EventType[] : null;

  // In production, verify admin role
  // const { user } = await getAuth(request);
  // if (!user || !user.roles?.includes('admin')) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initMessage = {
        type: 'connected',
        data: { timestamp: new Date().toISOString() },
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initMessage)}\n\n`));

      // Send periodic keepalive
      const keepaliveInterval = setInterval(() => {
        try {
          const pingMessage = { type: 'ping', data: {} };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(pingMessage)}\n\n`));
        } catch (e) {
          // Stream may be closed
          clearInterval(keepaliveInterval);
        }
      }, 30000);

      // Simulate new events every 2-8 seconds
      const eventInterval = setInterval(() => {
        try {
          // Generate a random event
          const randomType = USER_TYPES[Math.floor(Math.random() * USER_TYPES.length)];
          
          // Apply client filters
          if (typesFilter && !typesFilter.includes(randomType)) return;

          const newEvent = addMockEvent({
            type: randomType,
            timestamp: new Date().toISOString(),
          });

          // Apply user filter
          if (userId && newEvent.user.id !== userId) return;

          const message = {
            type: 'new_event',
            data: newEvent,
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
        } catch (e) {
          // Stream may be closed
          clearInterval(eventInterval);
        }
      }, Math.floor(Math.random() * 6000) + 2000);

      // Cleanup
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);
        clearInterval(eventInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}