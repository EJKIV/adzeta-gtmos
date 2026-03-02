-- ================================================================
-- GTM-OS: Database Nuke Script
-- Run this in the Supabase SQL Editor on BOTH dev and prod
-- before applying the new consolidated migrations.
--
-- WARNING: This drops ALL tables, types, functions, views, and
-- triggers in the public schema. All data will be lost.
-- ================================================================

-- Drop all views first (they depend on tables)
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
  END LOOP;
END $$;

-- Drop all tables (CASCADE handles FKs, triggers, policies)
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Drop all custom enum types
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT typname FROM pg_type
    WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
  ) LOOP
    EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
  END LOOP;
END $$;

-- Drop all custom functions in public schema (skip extension-owned)
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT p.oid::regprocedure AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid
          AND d.deptype = 'e'
      )
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
  END LOOP;
END $$;

-- Drop the auth trigger (profile creation on signup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify everything is clean
SELECT 'Tables remaining:' AS check_type, count(*) AS count FROM pg_tables WHERE schemaname = 'public'
UNION ALL
SELECT 'Views remaining:', count(*) FROM pg_views WHERE schemaname = 'public'
UNION ALL
SELECT 'Types remaining:', count(*) FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e';
