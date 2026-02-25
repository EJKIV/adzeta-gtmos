-- Migration 013: Fix profiles RLS for authenticated users
-- Allow authenticated users to read their own profile

-- Drop existing policy if it exists (recreate with better rules)
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;

-- Policy: Users can read their own profile
CREATE POLICY "Allow users to read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can update their own profile (limited fields)
CREATE POLICY "Allow users to update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Service role can do everything
DROP POLICY IF EXISTS "Allow service role full access" ON public.profiles;
CREATE POLICY "Allow service role full access"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Notify to refresh schema cache
NOTIFY pgrst, 'reload schema';
