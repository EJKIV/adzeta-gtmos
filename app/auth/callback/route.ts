import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle errors from OAuth/OTP provider
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    return NextResponse.redirect(
      `${requestUrl.origin}?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`
    );
  }

  if (!code) {
    console.error('No code provided in auth callback');
    return NextResponse.redirect(`${requestUrl.origin}?error=no_code`);
  }

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
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 });
          },
        },
      }
    );
    
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('Session exchange error:', exchangeError);
      return NextResponse.redirect(
        `${requestUrl.origin}?error=exchange_failed&details=${encodeURIComponent(exchangeError.message)}`
      );
    }
    
    console.log('Auth callback successful');
    
  } catch (err) {
    console.error('Unexpected error in auth callback:', err);
    return NextResponse.redirect(
      `${requestUrl.origin}?error=callback_error&details=${encodeURIComponent(err instanceof Error ? err.message : 'Unknown error')}`
    );
  }

  // Successful auth - redirect to home
  return NextResponse.redirect(requestUrl.origin);
}
