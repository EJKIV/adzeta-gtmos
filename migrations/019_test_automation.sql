-- Migration 019: Test GitHub Actions automation
-- This migration tests that production deployments are automated

-- Add a test column to profiles (will be removed later)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS migration_test_timestamp TIMESTAMPTZ DEFAULT NOW();

-- Update your profile to verify
UPDATE public.profiles 
SET migration_test_timestamp = NOW(), updated_at = NOW()
WHERE email = 'jim.kernan@adzeta.io';

-- Verify this migration ran
SELECT 
  'Test migration 019 ran successfully' as status,
  email,
  migration_test_timestamp
FROM public.profiles 
WHERE email = 'jim.kernan@adzeta.io';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
