-- ================================================================
-- 010a: Enums + Upgrade command_history from 009 → 010 schema
-- ================================================================

-- Enums (safe: create if not exist)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
    CREATE TYPE command_source AS ENUM ('webchat', 'discord', 'telegram', 'slack', 'signal', 'email', 'api', 'internal');
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
-- ALTER command_history: add columns from 010 schema
-- ==========================================

-- Identity & Scope
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS session_key TEXT;
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'dev';

-- Source
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS source command_source DEFAULT 'webchat';
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS external_chat_id TEXT;

-- Intent & Routing
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS intent_category TEXT;
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS intent_confidence NUMERIC(5,2);
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS routed_to_agent TEXT;
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS routed_to_agent_role TEXT;
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS routing_reason TEXT;
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS routing_decision_data JSONB DEFAULT '{}';

-- Execution
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS subagent_session_key TEXT;
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS task_brief TEXT;

-- Results
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS result_summary TEXT;
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS output_artifacts JSONB DEFAULT '{}';
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS user_visible_response TEXT;

-- Error
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- RLHF / Feedback
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS user_feedback_rating INTEGER CHECK (user_feedback_rating >= 1 AND user_feedback_rating <= 5);
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS user_feedback_categories TEXT[];
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS rlhf_training_eligible BOOLEAN DEFAULT false;
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS user_feedback_id UUID;

-- Cost / Performance
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS token_usage_input INTEGER;
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS token_usage_output INTEGER;
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10,6);
ALTER TABLE command_history ADD COLUMN IF NOT EXISTS model_used TEXT;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_cmd_environment ON command_history(environment);
CREATE INDEX IF NOT EXISTS idx_cmd_agent ON command_history(routed_to_agent);
CREATE INDEX IF NOT EXISTS idx_cmd_rlhf ON command_history(rlhf_training_eligible) WHERE rlhf_training_eligible = true;

NOTIFY pgrst, 'reload schema';
