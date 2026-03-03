import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api-auth';
import { getSupabaseClient, detectEnvironment } from '@/lib/supabase/environment';

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const env = detectEnvironment(req);
  const supabase = getSupabaseClient(env, true);
  const body: { newOrder: string[] } = await req.json();

  if (!Array.isArray(body.newOrder) || body.newOrder.length === 0) {
    return NextResponse.json({ error: 'newOrder must be a non-empty array of IDs' }, { status: 400 });
  }

  // Update each item's priority to match its position in the array
  const updates = body.newOrder.map((id, index) =>
    supabase
      .from('work_queue')
      .update({ priority: index + 1 })
      .eq('id', id)
  );

  const results = await Promise.all(updates);
  const failed = results.filter(r => r.error);

  if (failed.length > 0) {
    return NextResponse.json(
      { error: `${failed.length} updates failed`, details: failed.map(f => f.error?.message) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, reordered: body.newOrder.length });
}
