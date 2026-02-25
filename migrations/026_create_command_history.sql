-- Migration: Create command_history table
-- Natural language command log for audit and learning

-- Command status enum
CREATE TYPE command_status AS ENUM ('pending', 'validating', 'parsed', 'routing', 'executing', 'completed', 'failed', 'cancelled');

-- Command type enum (for known command patterns)
CREATE TYPE command_type AS ENUM (
    'research_prospects',
    'enrich_person',
    'enrich_company',
    'create_campaign',
    'create_sequence',
    'add_to_campaign',
    'view_results',
    'view_analytics',
    'help',
    'unknown'
);

CREATE TABLE IF NOT EXISTS command_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    
    -- Original command
    raw_command TEXT NOT NULL,
    normalized_command TEXT,  -- Lowercase, trimmed
    
    -- Parsed understanding
    command_type command_type,
    confidence_score NUMERIC(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    
    -- Parsed entities (extracted from command)
    parsed_entities JSONB DEFAULT '{}',
    -- e.g., {
    --   "action": "research",
    --   "count": 50,
    --   "title": "VP Sales",
    --   "industry": "fintech",
    --   "company_size": "51-200",
    --   "location": "United States",
    --   "technology": "Salesforce"
    -- }
    
    -- NLP parsing details
    nlp_metadata JSONB DEFAULT '{}',
    -- e.g., {
    --   "parser_version": "1.0.0",
    --   "tokens": ["research", "50", "vp", "sales", "in", "fintech"],
    --   "entities": [
    --     {"type": "number", "value": 50, "start": 9, "end": 11},
    --     {"type": "title", "value": "VP Sales", "start": 12, "end": 22},
    --     {"type": "industry", "value": "fintech", "start": 26, "end": 33}
    --   ],
    --   "intent": "search_prospects"
    -- }
    
    -- Execution routing
    routed_to TEXT,           -- e.g., 'research_queue', 'campaign_service', 'help_system'
    handler_name TEXT,        -- Function or service that handled it
    
    -- Execution status
    status command_status DEFAULT 'pending',
    
    -- Linked resources created/modified
    related_resources JSONB DEFAULT '{}',
    -- e.g., {
    --   "research_job_id": "uuid",
    --   "campaign_id": "uuid",
    --   "prospect_ids": ["uuid1", "uuid2"]
    -- }
    
    -- Execution results
    result_type TEXT,         -- 'success', 'partial_success', 'failure', 'invalid_command'
    result_message TEXT,
    result_data JSONB DEFAULT '{}',
    
    -- Error tracking
    error_code TEXT,
    error_details JSONB DEFAULT '{}',
    -- e.g., {
    --   "missing_required_field": "industry",
    --   "ambiguous_entity": "title could be VP Sales or VP Marketing"
    -- }
    
    -- Timing
    received_at TIMESTAMPTZ DEFAULT NOW(),
    parsed_at TIMESTAMPTZ,
    routed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,      -- Total processing time
    
    -- User feedback
    user_feedback TEXT,       -- User's reaction (thumbs up/down or comment)
    user_feedback_reason TEXT,
    user_feedback_at TIMESTAMPTZ,
    
    -- Session context
    session_id TEXT,
    conversation_context JSONB DEFAULT '{}',
    -- Previous commands in this session for context
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_command_history_user_id ON command_history(user_id);
CREATE INDEX IF NOT EXISTS idx_command_history_status ON command_history(status);
CREATE INDEX IF NOT EXISTS idx_command_history_command_type ON command_history(command_type);
CREATE INDEX IF NOT EXISTS idx_command_history_user_status ON command_history(user_id, status);
CREATE INDEX IF NOT EXISTS idx_command_history_received_at ON command_history(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_history_session_id ON command_history(session_id);
CREATE INDEX IF NOT EXISTS idx_command_history_confidence_score ON command_history(confidence_score);

-- GIN indexes for flexible queries
CREATE INDEX IF NOT EXISTS idx_command_history_parsed_entities ON command_history USING GIN(parsed_entities);
CREATE INDEX IF NOT EXISTS idx_command_history_related_resources ON command_history USING GIN(related_resources);
CREATE INDEX IF NOT EXISTS idx_command_history_conversation_context ON command_history USING GIN(conversation_context);
CREATE INDEX IF NOT EXISTS idx_command_history_nlp_metadata ON command_history USING GIN(nlp_metadata);

-- Text search index on raw command
CREATE INDEX IF NOT EXISTS idx_command_history_raw_command_trgm ON command_history USING GIN(raw_command gin_trgm_ops);

-- Enable Row Level Security
ALTER TABLE command_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own command history
CREATE POLICY "Users can view own command history" ON command_history
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own commands
CREATE POLICY "Users can insert own commands" ON command_history
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own commands
CREATE POLICY "Users can update own commands" ON command_history
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own commands
CREATE POLICY "Users can delete own commands" ON command_history
    FOR DELETE USING (auth.uid()::text = user_id);

-- Trigger to update updated_at and calculate duration
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
    FOR EACH ROW
    EXECUTE FUNCTION update_command_history();

-- View for command analytics
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

-- View for recent commands with error rates
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

-- View for user command patterns
CREATE OR REPLACE VIEW user_command_patterns AS
SELECT 
    user_id,
    DATE_TRUNC('day', received_at) as date,
    command_type,
    COUNT(*) as count,
    AVG(confidence_score) as avg_confidence,
    STRING_AGG(DISTINCT(parsed_entities->>'industry'), ', ') as industries_used
FROM command_history
WHERE received_at > NOW() - INTERVAL '30 days'
GROUP BY user_id, DATE_TRUNC('day', received_at), command_type
ORDER BY date DESC, count DESC;