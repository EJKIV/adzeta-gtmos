-- Migration 017: Verify and fix RLS policies for production

-- First, ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Check existing policies
DO $$
DECLARE
    pol_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pol_count FROM pg_policies WHERE tablename = 'profiles';
    RAISE NOTICE 'Found % policies on profiles table', pol_count;
END $$;

-- Drop ALL existing policies to ensure clean state
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "service_role_all" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow service role full access" ON public.profiles;

-- Create fresh policies with unique names
CREATE POLICY "profiles_read_own_v2"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own_v2"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own_v2"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_service_all_v2"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify jim.kernan@adzeta.io profile
UPDATE public.profiles 
SET is_employee = true, role = 'admin', updated_at = NOW()
WHERE email = 'jim.kernan@adzeta.io'
AND (is_employee != true OR role != 'admin');
