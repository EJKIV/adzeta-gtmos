import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Authenticate the request via:
 * 1. Bearer token (for OpenClaw / API callers)
 * 2. Supabase session cookie (for browser requests)
 * 3. Development bypass
 */
export async function authenticate(req: NextRequest): Promise<{ ok: boolean; userId?: string }> {
  // 1. Bearer token (machine-to-machine)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const apiKey = process.env.OPENCLAW_API_KEY;
    if (apiKey && token === apiKey) return { ok: true };
  }

  // 2. Supabase session cookie (browser)
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return { ok: true, userId: user.id };
    }
  } catch {
    // Cookie parsing failed — fall through
  }

  // 3. Development bypass — use a stable UUID so DB inserts (sessions etc.) work
  if (process.env.NODE_ENV === 'development') return { ok: true, userId: '00000000-0000-0000-0000-000000000000' };

  return { ok: false };
}
