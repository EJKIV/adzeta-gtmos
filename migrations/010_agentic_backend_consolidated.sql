-- ================================================================
-- GTM-OS Agentic Backend: Consolidated Schema
-- Version: 1.0.0
-- Purpose: Orchestration layer for subagent execution, learning, reporting
-- Supports: User-scoped + Admin/Org-wide visibility
-- ================================================================

-- ==========================================
-- Extensions
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ==========================================
-- Enums
-- ==========================================
DO $$ BEGIN
    CREATE TYPE command_source AS ENUM ('webchat', 'discord', 'telegram', 'slack', 'signal', 'email', 'api', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE command_status AS ENUM ('pending', 'parsing', 'routing', 'executing', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('queued', 'running', 'paused', 'completed', 'failed', 'killed', 'timeout');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE learning_signal_type AS ENUM (
        'explicit_positive', 'explicit_negative', 'dwell', 'skip', 'dismiss',
        'reworded', 'escalated', 'praised', 'corrected'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- Core: Command History (User + Org Visibility)
-- ==========================================
CREATE TABLE IF NOT EXISTS command_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity & Scope
    user_id UUID NOT NULL,               -- auth.users.id reference
    session_key TEXT NOT NULL,           -- agent:adzeta-gtm:main
    organization_id UUID,                -- for multi-tenant orgs
    department_id UUID,                  -- for department filtering
    environment TEXT DEFAULT 'dev',      -- 'dev' or 'prod' for multi-DB routing
    
    -- Source
    source command_source DEFAULT 'webchat',
    external_chat_id TEXT,
    
    -- Request
    raw_command TEXT NOT NULL,
    normalized_command TEXT,
    
    -- Intent & Routing
    intent_category TEXT,
    intent_confidence NUMERIC(5,2),
    routed_to_agent TEXT,
    routed_to_agent_role TEXT,
    routing_reason TEXT,
    routing_decision_data JSONB DEFAULT '{}',  -- full routing logic for RLHF
    
    -- Execution
    status command_status DEFAULT 'pending',
    subagent_session_key TEXT,
    task_brief TEXT,
    
    -- Results
    result_summary TEXT,
    result_data JSONB DEFAULT '{}',
    output_artifacts JSONB DEFAULT '{}',   -- {files: [], urls: [], commits: []}
    user_visible_response TEXT,
    
    -- Error
    error_code TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- RLHF / Feedback
    user_feedback TEXT,
    user_feedback_rating INTEGER CHECK (user_feedback_rating >= 1 AND user_feedback_rating <= 5),
    user_feedback_categories TEXT[],     -- ['accuracy', 'speed', 'clarity', etc.]
    rlhf_training_eligible BOOLEAN DEFAULT false,
    feedback_at TIMESTAMPTZ,
    
    -- Cost / Performance
    token_usage_input INTEGER,
    token_usage_output INTEGER,
    estimated_cost NUMERIC(10,6),
    model_used TEXT,
    duration_ms INTEGER,
    
    -- Timing
    received_at TIMESTAMPTZ DEFAULT NOW(),
    parsed_at TIMESTAMPTZ,
    routed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cmd_user ON command_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cmd_org ON command_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_cmd_dept ON command_history(department_id);
CREATE INDEX IF NOT EXISTS idx_cmd_environment ON command_history(environment);
CREATE INDEX IF NOT EXISTS idx_cmd_status ON command_history(status);
CREATE INDEX IF NOT EXISTS idx_cmd_agent ON command_history(routed_to_agent);
CREATE INDEX IF NOT EXISTS idx_cmd_received ON command_history(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_cmd_rlhf ON command_history(rlhf_training_eligible) WHERE rlhf_training_eligible = true;

-- ==========================================
-- Core: Subagent Tasks (Execution Tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS subagent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links
    parent_command_id UUID REFERENCES command_history(id) ON DELETE SET NULL,
    user_id UUID NOT NULL,
    organization_id UUID,
    
    -- Agent Identity
    agent_id TEXT NOT NULL,
    agent_role TEXT,
    agent_model TEXT,
    
    -- Task Definition
    task_label TEXT NOT NULL,
    task_description TEXT,
    task_mode TEXT DEFAULT 'run',        -- 'run' or 'session'
    task_category TEXT,                  -- 'research', 'build', 'analyze'
    
    -- Status
    status task_status DEFAULT 'queued',
    priority task_priority DEFAULT 'medium',
    
    -- Timing
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    spawned_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    killed_at TIMESTAMPTZ,
    timeout_at TIMESTAMPTZ,
    
    -- Results
    result_summary TEXT,
    result_data JSONB DEFAULT '{}',
    output_artifacts JSONB DEFAULT '{}',
    
    -- Error
    error_message TEXT,
    error_stack TEXT,
    
    -- Cost
    token_usage_input INTEGER,
    token_usage_output INTEGER,
    estimated_cost NUMERIC(10,6),
    
    -- Interventions
    steer_commands JSONB DEFAULT '[]',
    was_intervened BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_parent ON subagent_tasks(parent_command_id);
CREATE INDEX IF NOT EXISTS idx_task_user ON subagent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_task_org ON subagent_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_agent ON subagent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_task_status ON subagent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_category ON subagent_tasks(task_category);

-- ==========================================
-- Core: Work Queue (Priority Management)
-- ==========================================
CREATE TABLE IF NOT EXISTS work_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    item_type TEXT NOT NULL,
    reference_id UUID,
    user_id UUID,
    organization_id UUID,
    
    category TEXT,
    priority INTEGER DEFAULT 50,
    
    status TEXT DEFAULT 'pending',
    assigned_agent TEXT,
    
    blocked_reason TEXT,
    blocked_since TIMESTAMPTZ,
    unblock_conditions TEXT,
    
    depends_on UUID[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    deadline_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}',
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON work_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_org ON work_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON work_queue(status, priority);

-- ==========================================
-- Core: Learning Signals (RLHF)
-- ==========================================
CREATE TABLE IF NOT EXISTS learning_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL,
    organization_id UUID,
    session_key TEXT,
    
    signal_type learning_signal_type NOT NULL,
    
    subject_type TEXT,                   -- 'command', 'agent_response', 'routing_decision'
    subject_id UUID,                     -- references command_history or other
    
    agent_id TEXT,
    agent_role TEXT,
    
    -- Signal Details
    duration_ms INTEGER,
    feedback_text TEXT,
    correction_data JSONB,               -- what it should have been
    proposed_better_response TEXT,       -- user's suggested improvement
    
    -- Processing
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    learned_adjustment JSONB,
    
    -- RLHF Metadata
    training_batch_id UUID,              -- groups signals for batch training
    model_version TEXT,                  -- which model version this trains
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learn_user ON learning_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_learn_org ON learning_signals(organization_id);
CREATE INDEX IF NOT EXISTS idx_learn_type ON learning_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_learn_processed ON learning_signals(processed);
CREATE INDEX IF NOT EXISTS idx_learn_batch ON learning_signals(training_batch_id);

-- ==========================================
-- Core: Agent Memory (Persistent State)
-- ==========================================
CREATE TABLE IF NOT EXISTS agent_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    agent_id TEXT NOT NULL,
    agent_role TEXT,
    memory_key TEXT NOT NULL,
    
    memory_value JSONB NOT NULL DEFAULT '{}',
    memory_type TEXT DEFAULT 'state',
    
    scope TEXT DEFAULT 'agent',
    scope_id TEXT,
    
    user_id UUID,
    organization_id UUID,
    
    expires_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    
    version INTEGER DEFAULT 1,
    access_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(agent_id, memory_key, scope, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_agent ON agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_user ON agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_org ON agent_memories(organization_id);
CREATE INDEX IF NOT EXISTS idx_memory_expires ON agent_memories(expires_at) WHERE expires_at IS NOT NULL;

-- ==========================================
-- Core: User Preferences (Learned)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_orchestrator_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL UNIQUE,
    organization_id UUID,
    
    -- Communication Style
    response_length TEXT DEFAULT 'concise',
    response_tone TEXT DEFAULT 'direct',
    include_metadata BOOLEAN DEFAULT false,
    
    -- Autonomy
    autonomy_level TEXT DEFAULT 'medium',
    confirm_before_spawn BOOLEAN DEFAULT false,
    confirm_before_external BOOLEAN DEFAULT true,
    
    -- Working Patterns
    timezone TEXT DEFAULT 'America/New_York',
    working_hours_start TEXT DEFAULT '09:00',
    working_hours_end TEXT DEFAULT '17:00',
    
    -- Learned Preferences
    preferred_agents JSONB DEFAULT '{}',
    feature_weights JSONB DEFAULT '{}',
    common_patterns JSONB DEFAULT '{}',
    
    -- Feedback Summary
    positive_signals INTEGER DEFAULT 0,
    negative_signals INTEGER DEFAULT 0,
    correction_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prefs_user ON user_orchestrator_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_prefs_org ON user_orchestrator_preferences(organization_id);

-- ==========================================
-- Core: Session Context (Continuity)
-- ==========================================
CREATE TABLE IF NOT EXISTS session_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    session_key TEXT NOT NULL UNIQUE,
    user_id UUID,
    organization_id UUID,
    
    current_focus TEXT,
    active_project TEXT,
    pending_items JSONB DEFAULT '[]',
    recent_commands JSONB DEFAULT '[]',
    recent_agents JSONB DEFAULT '[]',
    working_memory JSONB DEFAULT '{}',
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    command_count INTEGER DEFAULT 0,
    agent_spawn_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_session_user ON session_context(user_id);
CREATE INDEX IF NOT EXISTS idx_session_org ON session_context(organization_id);
CREATE INDEX IF NOT EXISTS idx_session_active ON session_context(last_active_at);

-- ==========================================
-- RLS Policies (Enable org-wide + user-scoped)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE command_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subagent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_orchestrator_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_context ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is admin/org viewer
CREATE OR REPLACE FUNCTION is_org_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has admin role in profiles or org_members table
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = check_user_id 
        AND role IN ('admin', 'employee')
    );
END;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Command History Policies
CREATE POLICY "Users can view own commands" ON command_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view org commands" ON command_history
    FOR SELECT USING (is_org_admin(auth.uid()));

CREATE POLICY "Service can insert commands" ON command_history
    FOR INSERT WITH CHECK (true);

-- Subagent Tasks Policies
CREATE POLICY "Users can view own tasks" ON subagent_tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view org tasks" ON subagent_tasks
    FOR SELECT USING (is_org_admin(auth.uid()));

-- Work Queue Policies
CREATE POLICY "Users can view org queue" ON work_queue
    FOR SELECT USING (true);  -- Queue is org-wide visible

-- Learning Signals Policies
CREATE POLICY "Users can view own signals" ON learning_signals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view org signals" ON learning_signals
    FOR SELECT USING (is_org_admin(auth.uid()));

-- Agent Memories Policies
CREATE POLICY "Users can view own memories" ON agent_memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage memories" ON agent_memories
    FOR ALL USING (true);

-- Preferences Policies
CREATE POLICY "Users can manage own preferences" ON user_orchestrator_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Session Policies
CREATE POLICY "Users can view own sessions" ON session_context
    FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- Analytics Views (RLHF + Reporting)
-- ==========================================

-- RLHF Training Dataset
CREATE OR REPLACE VIEW rlhf_training_dataset AS
SELECT 
    ch.id as command_id,
    ch.raw_command,
    ch.user_visible_response as generated_output,
    ch.routing_decision_data,
    ch.intent_category,
    ch.intent_confidence,
    ls.signal_type,
    ls.feedback_text,
    ls.proposed_better_response,
    ls.correction_data,
    ch.user_feedback_rating,
    ch.rlhf_training_eligible,
    ch.completed_at
FROM command_history ch
LEFT JOIN learning_signals ls ON ch.id = ls.subject_id
WHERE ch.rlhf_training_eligible = true
  AND ch.completed_at > NOW() - INTERVAL '30 days'
ORDER BY ch.completed_at DESC;

-- Agent Performance Metrics
CREATE OR REPLACE VIEW agent_performance_metrics AS
SELECT 
    st.agent_id,
    st.agent_role,
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE st.status = 'completed') as completed,
    COUNT(*) FILTER (WHERE st.status = 'failed') as failed,
    COUNT(*) FILTER (WHERE st.was_intervened = true) as intervened_count,
    ROUND(100.0 * COUNT(*) FILTER (WHERE st.status = 'completed') / NULLIF(COUNT(*), 0), 2) as success_rate,
    AVG(EXTRACT(EPOCH FROM (st.completed_at - st.started_at))) FILTER (WHERE st.completed_at IS NOT NULL AND st.started_at IS NOT NULL) as avg_duration_seconds,
    SUM(st.estimated_cost) as total_cost,
    AVG(CASE WHEN ls.signal_type = 'explicit_positive' THEN 1.0 ELSE 0.0 END) FILTER (WHERE ls.signal_type IS NOT NULL) as positive_feedback_rate,
    COUNT(*) FILTER (WHERE ls.signal_type IS NOT NULL) as feedback_count
FROM subagent_tasks st
LEFT JOIN learning_signals ls ON st.id = ls.subject_id
WHERE st.created_at > NOW() - INTERVAL '30 days'
GROUP BY st.agent_id, st.agent_role
ORDER BY total_tasks DESC;

-- Command Flow Analytics
CREATE OR REPLACE VIEW command_flow_analytics AS
SELECT 
    DATE_TRUNC('hour', ch.received_at) as hour,
    ch.intent_category,
    ch.routed_to_agent,
    ch.routed_to_agent_role,
    COUNT(*) as command_count,
    AVG(ch.duration_ms) FILTER (WHERE ch.duration_ms IS NOT NULL) as avg_duration_ms,
    AVG(ch.user_feedback_rating) FILTER (WHERE ch.user_feedback_rating IS NOT NULL) as avg_rating,
    COUNT(*) FILTER (WHERE ch.status = 'failed') as failed_count
FROM command_history ch
WHERE ch.received_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', ch.received_at), ch.intent_category, ch.routed_to_agent, ch.routed_to_agent_role
ORDER BY hour DESC, command_count DESC;

-- Work Queue Status
CREATE OR REPLACE VIEW work_queue_status AS
SELECT 
    status,
    category,
    assigned_agent,
    COUNT(*) as item_count,
    MIN(created_at) as oldest_item,
    COUNT(*) FILTER (WHERE deadline_at < NOW()) as overdue_count
FROM work_queue
GROUP BY status, category, assigned_agent;

-- ==========================================
-- Utility Functions
-- ==========================================

-- Log command and return ID
CREATE OR REPLACE FUNCTION log_command(
    p_user_id UUID,
    p_session_key TEXT,
    p_raw_command TEXT,
    p_source command_source DEFAULT 'webchat'
)
RETURNS UUID AS $$
DECLARE
    cmd_id UUID;
BEGIN
    INSERT INTO command_history (user_id, session_key, raw_command, source, status)
    VALUES (p_user_id, p_session_key, p_raw_command, p_source, 'pending')
    RETURNING id INTO cmd_id;
    RETURN cmd_id;
END;
$$ LANGUAGE plpgsql;

-- Complete command
CREATE OR REPLACE FUNCTION complete_command(
    p_command_id UUID,
    p_status command_status,
    p_result_summary TEXT DEFAULT NULL,
    p_result_data JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
    UPDATE command_history
    SET status = p_status,
        result_summary = COALESCE(p_result_summary, result_summary),
        result_data = result_data || p_result_data,
        completed_at = NOW(),
        duration_ms = EXTRACT(EPOCH FROM (NOW() - received_at)) * 1000
    WHERE id = p_command_id;
END;
$$ LANGUAGE plpgsql;

-- Queue work item
CREATE OR REPLACE FUNCTION queue_work(
    p_item_type TEXT,
    p_category TEXT,
    p_user_id UUID DEFAULT NULL,
    p_priority INTEGER DEFAULT 50,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    item_id UUID;
BEGIN
    INSERT INTO work_queue (item_type, category, user_id, priority, metadata)
    VALUES (p_item_type, p_category, p_user_id, p_priority, p_metadata)
    RETURNING id INTO item_id;
    RETURN item_id;
END;
$$ LANGUAGE plpgsql;

-- Mark for RLHF
CREATE OR REPLACE FUNCTION mark_for_rlhf(p_command_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE command_history
    SET rlhf_training_eligible = true
    WHERE id = p_command_id;
END;
$$ LANGUAGE plpgsql;

-- Record learning signal with RLHF batch
CREATE OR REPLACE FUNCTION record_learning_signal(
    p_user_id UUID,
    p_signal_type learning_signal_type,
    p_subject_id UUID,
    p_feedback_text TEXT DEFAULT NULL,
    p_better_response TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO learning_signals (
        user_id, signal_type, subject_id, 
        feedback_text, proposed_better_response
    ) VALUES (
        p_user_id, p_signal_type, p_subject_id,
        p_feedback_text, p_better_response
    );
END;
$$ LANGUAGE plpgsql;

-- Schema refresh
NOTIFY pgrst, 'reload schema';
