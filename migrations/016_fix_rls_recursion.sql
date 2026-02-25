-- Migration 016: Fix RLS recursion by using direct auth.uid() comparison

-- First, disable RLS temporarily to inspect/fix
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies on profiles
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Simple direct policies without subqueries
-- The key is using auth.uid() directly, not in a subquery
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "service_role_all"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Also ensure we have an insert policy for profile creation
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
