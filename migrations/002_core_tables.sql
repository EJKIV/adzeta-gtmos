-- ================================================================
-- Migration 002: Core operational tables
-- feedback_signals, preference_models, autonomous_tasks, healing_events
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ==========================================
-- Shared trigger function (used by many tables)
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- feedback_signals
-- ==========================================

CREATE TABLE IF NOT EXISTS feedback_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('explicit_positive', 'explicit_negative', 'dwell', 'skip', 'dismiss')),
    card_type TEXT,
    section TEXT,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    evidence_ref TEXT,
    context TEXT,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_signals_user_id ON feedback_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_signals_created_at ON feedback_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_signals_metadata ON feedback_signals USING GIN(metadata);

ALTER TABLE feedback_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback" ON feedback_signals
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own feedback" ON feedback_signals
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Anon can insert feedback" ON feedback_signals
    FOR INSERT TO anon WITH CHECK (true);

-- ==========================================
-- preference_models
-- ==========================================

CREATE TABLE IF NOT EXISTS preference_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    card_order JSONB DEFAULT '["kpi", "objectives", "intelligence", "alerts"]',
    card_scores JSONB DEFAULT '{}',
    communication_style TEXT DEFAULT 'concise',
    autonomy_level TEXT DEFAULT 'medium' CHECK (autonomy_level IN ('low', 'medium', 'high')),
    working_hours_start TEXT DEFAULT '09:00',
    working_hours_end TEXT DEFAULT '17:00',
    timezone TEXT DEFAULT 'America/New_York',
    learned_patterns JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preference_models_user_id ON preference_models(user_id);

ALTER TABLE preference_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON preference_models
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own preferences" ON preference_models
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "System can insert preferences" ON preference_models
    FOR INSERT WITH CHECK (true);

-- ==========================================
-- autonomous_tasks
-- ==========================================

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'assigned', 'in_progress', 'blocked', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_type AS ENUM ('kpi_investigation', 'unblock_workflow', 'strategic_gap', 'blocker_mitigation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS autonomous_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    task_type task_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'pending',
    priority task_priority DEFAULT 'medium',
    assignee TEXT,
    due_date TIMESTAMPTZ,
    estimated_duration_minutes INTEGER,
    confidence_score NUMERIC(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    source_recommendation_id TEXT,
    blocker_pattern TEXT,
    metadata JSONB DEFAULT '{}',
    auto_execute_threshold NUMERIC(5,2) DEFAULT 80.00,
    healing_attempts INTEGER DEFAULT 0,
    max_healing_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_user_id ON autonomous_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_status ON autonomous_tasks(status);
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_pending ON autonomous_tasks(user_id, status) WHERE status = 'pending';

ALTER TABLE autonomous_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON autonomous_tasks
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "System can create tasks" ON autonomous_tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own tasks" ON autonomous_tasks
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE OR REPLACE VIEW pending_autonomous_tasks AS
SELECT * FROM autonomous_tasks
WHERE status = 'pending'
ORDER BY priority DESC, confidence_score DESC, created_at ASC;

-- ==========================================
-- healing_events
-- ==========================================

CREATE TABLE IF NOT EXISTS healing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    task_id UUID REFERENCES autonomous_tasks(id) ON DELETE CASCADE,
    error_id TEXT,
    status TEXT CHECK (status IN ('pending', 'retrying', 'healed', 'escalated', 'failed')) DEFAULT 'pending',
    strategy TEXT,
    attempts JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_healing_events_status ON healing_events(status);
CREATE INDEX IF NOT EXISTS idx_healing_events_task ON healing_events(task_id);
CREATE INDEX IF NOT EXISTS idx_healing_events_user ON healing_events(user_id);

ALTER TABLE healing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own healing events" ON healing_events
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "System can create healing events" ON healing_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update healing events" ON healing_events
    FOR UPDATE USING (true);

-- ==========================================
-- dwell_time_sessions
-- ==========================================

CREATE TABLE IF NOT EXISTS dwell_time_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    page TEXT NOT NULL,
    section TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dwell_time_sessions_user ON dwell_time_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_dwell_time_sessions_page ON dwell_time_sessions(page);
CREATE INDEX IF NOT EXISTS idx_dwell_time_sessions_start ON dwell_time_sessions(start_time DESC);

ALTER TABLE dwell_time_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dwell sessions" ON dwell_time_sessions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "System can insert dwell sessions" ON dwell_time_sessions
    FOR INSERT WITH CHECK (true);
