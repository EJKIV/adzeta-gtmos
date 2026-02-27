'use client';

import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

type SupabaseClient = ReturnType<typeof createBrowserClient>;

// Singleton pattern to prevent multiple Supabase client instances
// This resolves Navigator LockManager timeout errors
let supabaseClient: SupabaseClient | null = null;

/**
 * Returns the Supabase browser client, or null if env vars are not configured.
 * In demo mode (no env vars), returns null — callers should handle gracefully.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return null;
    }

    supabaseClient = createBrowserClient(url, key);
  }
  return supabaseClient;
}

// Reset function for testing
export function resetSupabaseClient() {
  supabaseClient = null;
}
