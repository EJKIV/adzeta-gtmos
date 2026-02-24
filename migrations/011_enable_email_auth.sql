-- Migration: Enable email authentication (magic links)
-- This allows users to sign in via email OTP instead of OAuth

-- Enable email auth provider (if not already enabled)
-- This is configured in Supabase Dashboard -> Authentication -> Providers -> Email

-- Add note about email configuration
COMMENT ON TABLE profiles IS 'User profiles with employee access control. Email auth enabled.';

-- Ensure the profiles table has email column (already exists from migration 010)
-- No schema changes needed - email auth is configured via Supabase Dashboard

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
