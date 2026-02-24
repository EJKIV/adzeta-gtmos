-- Migration: Create feedback_signals table
-- Stores user feedback signals for preference learning

CREATE TABLE IF NOT EXISTS feedback_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('explicit_positive', 'explicit_negative', 'dwell', 'skip', 'dismiss')),
    card_type TEXT,
    section TEXT,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    evidence_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_feedback_signals_user_id ON feedback_signals(user_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_feedback_signals_created_at ON feedback_signals(created_at DESC);

-- GIN index for metadata queries
CREATE INDEX IF NOT EXISTS idx_feedback_signals_metadata ON feedback_signals USING GIN(metadata);

-- Enable Row Level Security
ALTER TABLE feedback_signals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own feedback
CREATE POLICY "Users can view own feedback" ON feedback_signals
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON feedback_signals
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);
