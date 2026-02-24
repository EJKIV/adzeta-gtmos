-- Migration: Add missing columns to feedback_signals
-- Aligns with preference-service.ts FeedbackSignalRow type

-- Add context column (JSONB for flexibility)
ALTER TABLE feedback_signals 
ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb;

-- Add timestamp column (prefer created_at, but service uses timestamp)
ALTER TABLE feedback_signals 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

-- Add processed flag for queue tracking
ALTER TABLE feedback_signals 
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false;

-- Index for processed/unprocessed queries
CREATE INDEX IF NOT EXISTS idx_feedback_signals_processed 
ON feedback_signals(processed) 
WHERE processed = false;

-- Update existing rows to have sane defaults
UPDATE feedback_signals SET
    context = '{}'::jsonb,
    timestamp = created_at,
    processed = false
WHERE context IS NULL;

-- Comment: Notify PostgREST to refresh schema cache
COMMENT ON TABLE feedback_signals IS 'User feedback signals with context tracking';

-- IMPORTANT: Refresh PostgREST schema cache after adding columns
-- This ensures new columns are immediately available via REST API
NOTIFY pgrst, 'reload schema';
