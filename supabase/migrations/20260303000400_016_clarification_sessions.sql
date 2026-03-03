-- ================================================================  
-- Migration 016: Clarification Sessions Table
-- For tracking multi-turn clarification conversations
-- ================================================================

CREATE TABLE IF NOT EXISTS clarification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id UUID NOT NULL REFERENCES command_history(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Current intent state (accumulated from answers)
    intent JSONB DEFAULT '{}',
    
    -- Conversation state
    questions_asked INTEGER DEFAULT 0,
    answers_received JSONB DEFAULT '{}',
    
    -- Confidence tracking
    confidence DECIMAL(3,2) DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
    ready_to_proceed BOOLEAN DEFAULT FALSE,
    
    -- Status
    status TEXT DEFAULT 'in_progress' CHECK (
        status IN ('in_progress', 'completed', 'abandoned')
    ),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_clarification_sessions_command 
    ON clarification_sessions(command_id);
CREATE INDEX IF NOT EXISTS idx_clarification_sessions_user 
    ON clarification_sessions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clarification_sessions_status 
    ON clarification_sessions(status) WHERE status = 'in_progress';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_clarification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clarification_sessions_updated_at
    BEFORE UPDATE ON clarification_sessions
    FOR EACH ROW EXECUTE FUNCTION update_clarification_updated_at();

-- RLS policies
ALTER TABLE clarification_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clarification sessions"
    ON clarification_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own clarification sessions"
    ON clarification_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clarification sessions"
    ON clarification_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE clarification_sessions IS 
    'Tracks multi-turn clarification conversations for campaign/sequence intent gathering';
COMMENT ON COLUMN clarification_sessions.intent IS 
    'Accumulated intent state including icp, targeting, campaign config';
COMMENT ON COLUMN clarification_sessions.ready_to_proceed IS 
    'True when enough info gathered to proceed with campaign creation';

NOTIFY pgrst, 'reload schema';
