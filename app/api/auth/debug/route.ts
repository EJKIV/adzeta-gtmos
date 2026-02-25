import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
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
          set(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; sameSite?: 'lax' | 'strict' | 'none'; secure?: boolean }) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: { path?: string }) {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 });
          },
        },
      }
    );

    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return NextResponse.json({ error: 'Session error', details: sessionError.message }, { status: 500 });
    }

    if (!session?.user) {
      return NextResponse.json({ 
        authenticated: false,
        message: 'No active session'
      });
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_employee, role')
      .eq('id', session.user.id)
      .single();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      profile: profile || null,
      profileError: profileError ? profileError.message : null,
      isEmployee: profile?.is_employee === true,
    });

  } catch (err) {
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
