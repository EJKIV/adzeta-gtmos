-- Migration 015: Add RLS policies for profiles table

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;

-- Policy: Users can view their own profile
-- Uses auth.uid() to check current user's ID
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()));

-- Policy: Service role has full access
CREATE POLICY "Service role full access"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure the user jim.kernan@adzeta.io has a profile
INSERT INTO public.profiles (id, email, is_employee, role)
SELECT id, email, true, 'admin'
FROM auth.users
WHERE email = 'jim.kernan@adzeta.io'
ON CONFLICT (id) DO UPDATE SET is_employee = true, role = 'admin';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
