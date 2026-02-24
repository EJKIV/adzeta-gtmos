-- Migration: Add anonymous insert policy for feedback_signals
-- Allows development/testing without user authentication
-- NOTE: In production, this should be removed or restricted

-- Policy: Allow anonymous inserts (for development)
-- This allows the anon key to insert feedback without requiring auth.uid()
DROP POLICY IF EXISTS "Allow anon inserts" ON feedback_signals;

CREATE POLICY "Allow anon inserts" ON feedback_signals
    FOR INSERT WITH CHECK (true);

-- Policy: Allow anonymous selects (for development/views)
-- This allows reading feedback data without auth
DROP POLICY IF EXISTS "Allow anon select" ON feedback_signals;

CREATE POLICY "Allow anon select" ON feedback_signals
    FOR SELECT USING (true);

-- Refresh schema cache after policy changes
NOTIFY pgrst, 'reload schema';
