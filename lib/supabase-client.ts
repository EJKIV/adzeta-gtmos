'use client';

import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

// Singleton pattern to prevent multiple Supabase client instances
// This resolves Navigator LockManager timeout errors
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseClient;
}

// Reset function for testing
export function resetSupabaseClient() {
  supabaseClient = null;
}
