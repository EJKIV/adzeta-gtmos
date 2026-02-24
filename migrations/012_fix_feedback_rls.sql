-- Migration: Fix feedback_signals table and anon policy
-- Addresses 500 errors from missing columns and RLS issues

-- Ensure all required columns exist
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Check and add context column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feedback_signals' AND column_name = 'context'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE feedback_signals ADD COLUMN context JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Check and add timestamp column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feedback_signals' AND column_name = 'timestamp'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE feedback_signals ADD COLUMN timestamp TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Check and add processed column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feedback_signals' AND column_name = 'processed'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE feedback_signals ADD COLUMN processed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Fix RLS policies for anonymous feedback
DROP POLICY IF EXISTS "Allow anon inserts" ON feedback_signals;
DROP POLICY IF EXISTS "Allow anon select" ON feedback_signals;
DROP POLICY IF EXISTS "Allow anon all" ON feedback_signals;

-- Create a permissive policy for development (restrict in production later)
CREATE POLICY "Allow anon all" ON feedback_signals
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
