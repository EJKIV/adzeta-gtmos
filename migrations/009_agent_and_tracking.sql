-- ================================================================
-- Migration 009: Agent memory, command history, schema refresh
-- ================================================================

-- ==========================================
-- command_history
-- ==========================================

DO $$ BEGIN
    CREATE TYPE command_status AS ENUM ('pending', 'validating', 'parsed', 'routing', 'executing', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE command_type AS ENUM (
        'research_prospects', 'enrich_person', 'enrich_company',
        'create_campaign', 'create_sequence', 'add_to_campaign',
        'view_results', 'view_analytics', 'help', 'unknown'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS command_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,

    -- Original command
    raw_command TEXT NOT NULL,
    normalized_command TEXT,

    -- Parsed understanding
    command_type command_type,
    confidence_score NUMERIC(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    parsed_entities JSONB DEFAULT '{}',
    nlp_metadata JSONB DEFAULT '{}',

    -- Execution routing
    routed_to TEXT,
    handler_name TEXT,

    -- Execution status
    status command_status DEFAULT 'pending',
    related_resources JSONB DEFAULT '{}',

    -- Results
    result_type TEXT,
    result_message TEXT,
    result_data JSONB DEFAULT '{}',

    -- Error tracking
    error_code TEXT,
    error_details JSONB DEFAULT '{}',

    -- Timing
    received_at TIMESTAMPTZ DEFAULT NOW(),
    parsed_at TIMESTAMPTZ,
    routed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- User feedback
    user_feedback TEXT,
    user_feedback_reason TEXT,
    user_feedback_at TIMESTAMPTZ,

    -- Session context
    session_id TEXT,
    conversation_context JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_command_history_user_id ON command_history(user_id);
CREATE INDEX IF NOT EXISTS idx_command_history_status ON command_history(status);
CREATE INDEX IF NOT EXISTS idx_command_history_command_type ON command_history(command_type);
CREATE INDEX IF NOT EXISTS idx_command_history_user_status ON command_history(user_id, status);
CREATE INDEX IF NOT EXISTS idx_command_history_received_at ON command_history(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_history_session_id ON command_history(session_id);
CREATE INDEX IF NOT EXISTS idx_command_history_parsed_entities ON command_history USING GIN(parsed_entities);
CREATE INDEX IF NOT EXISTS idx_command_history_related_resources ON command_history USING GIN(related_resources);
CREATE INDEX IF NOT EXISTS idx_command_history_raw_command_trgm ON command_history USING GIN(raw_command gin_trgm_ops);

ALTER TABLE command_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own command history" ON command_history
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own commands" ON command_history
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own commands" ON command_history
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Duration auto-calculation
CREATE OR REPLACE FUNCTION update_command_history()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.completed_at IS NOT NULL AND NEW.received_at IS NOT NULL THEN
        NEW.duration_ms := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.received_at)) * 1000;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_command_history
    BEFORE UPDATE ON command_history
    FOR EACH ROW EXECUTE FUNCTION update_command_history();

-- Analytics views
CREATE OR REPLACE VIEW command_analytics AS
SELECT
    DATE_TRUNC('day', received_at) as date,
    command_type,
    status,
    COUNT(*) as command_count,
    AVG(confidence_score) as avg_confidence,
    AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration_ms,
    COUNT(*) FILTER (WHERE result_type = 'success') as success_count,
    COUNT(*) FILTER (WHERE result_type = 'failure') as failure_count
FROM command_history
GROUP BY DATE_TRUNC('day', received_at), command_type, status
ORDER BY date DESC, command_count DESC;

CREATE OR REPLACE VIEW command_health_check AS
SELECT
    command_type,
    COUNT(*) as total_commands,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_commands,
    ROUND(COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*), 2) as failure_rate,
    AVG(confidence_score) as avg_confidence,
    AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration_ms,
    MAX(received_at) as last_command_at
FROM command_history
WHERE received_at > NOW() - INTERVAL '7 days'
GROUP BY command_type
ORDER BY total_commands DESC;

-- ==========================================
-- agent_memories
-- ==========================================

CREATE TABLE IF NOT EXISTS agent_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    memory JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_memories_user ON agent_memories(user_id);

ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories" ON agent_memories
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "System can upsert memories" ON agent_memories
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update memories" ON agent_memories
    FOR UPDATE USING (true);

-- ==========================================
-- Schema refresh
-- ==========================================

NOTIFY pgrst, 'reload schema';
