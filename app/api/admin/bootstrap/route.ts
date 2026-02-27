import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authenticate } from '@/lib/api-auth';

/**
 * POST /api/admin/bootstrap
 *
 * First-user bootstrap: if no employees exist yet, promotes the requesting
 * authenticated user to is_employee = true. Returns 403 once any employee exists.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok || !auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  // Check if any employees already exist
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_employee', true);

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'Bootstrap already completed. An admin must promote new users.' },
      { status: 403 }
    );
  }

  // Promote the requesting user
  const { error } = await supabase
    .from('profiles')
    .update({ is_employee: true })
    .eq('id', auth.userId);

  if (error) {
    // Profile row may not exist yet — try upserting
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id: auth.userId, is_employee: true });

    if (upsertError) {
      return NextResponse.json(
        { error: 'Failed to bootstrap admin', detail: upsertError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    message: 'You are now an admin. Refresh the page to continue.',
    userId: auth.userId,
  });
}
