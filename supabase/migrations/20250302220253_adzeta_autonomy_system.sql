-- AdZeta-GTM Autonomy System Schema
-- Migration: 20260302
-- Run with: supabase db push

-- ============================================
-- 1. WORK QUEUE WITH APPROVAL STATES
-- ============================================

CREATE TABLE IF NOT EXISTS adzeta_work_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Task identification
    task_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    task_type TEXT NOT NULL CHECK (task_type IN (
        'research',           -- Low risk: answer queries
        'analytics',          -- Medium risk: generate reports
        'recommendation',     -- Medium risk: suggest actions
        'action',             -- High risk: execute directly
        'proactive_alert'     -- System-initiated suggestions
    )),
    
    -- Task content
    title TEXT NOT NULL,
    description TEXT,
    raw_request TEXT NOT NULL,
    
    -- Agent metadata
    agent_id TEXT NOT NULL DEFAULT 'adzeta-gtm',
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Approval workflow
    approval_state TEXT NOT NULL DEFAULT 'pending_review' CHECK (
        approval_state IN (
            'pending_review',      -- Agent waiting for review
            'approved',            -- Approved, ready to execute
            'rejected',            -- Rejected
            'modified',            -- Modified during review
            'auto_executed',       -- Low risk, auto-approved
            'executing',             -- Currently running
            'completed',           -- Done
            'failed'               -- Error occurred
        )
    ),
    
    -- Approval metadata
    suggested_action TEXT,
    suggested_action_payload JSONB,
    rationale TEXT,
    risk_assessment JSONB,
    
    -- Approver info
    approver_id UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    
    -- Execution tracking
    executed_at TIMESTAMPTZ,
    execution_result JSONB,
    execution_error TEXT,
    
    -- Outcome tracking
    outcome TEXT CHECK (outcome IN ('success', 'failure', 'cancelled', 'pending')),
    outcome_metrics JSONB,
    
    -- Queue management
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    scheduled_for TIMESTAMPTZ,
    deadline TIMESTAMPTZ,
    
    -- Link to oracle commands
    oracle_command_id UUID REFERENCES oracle_commands(command_id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for work queue
CREATE INDEX IF NOT EXISTS idx_adzeta_work_queue_state 
    ON adzeta_work_queue(approval_state, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_adzeta_work_queue_agent 
    ON adzeta_work_queue(agent_id, approval_state);
CREATE INDEX IF NOT EXISTS idx_adzeta_work_queue_executor 
    ON adzeta_work_queue(approver_id, approval_state);

-- ============================================
-- 2. AUTONOMY THRESHOLDS/GATES
-- ============================================

CREATE TABLE IF NOT EXISTS adzeta_autonomy_gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Gate identification
    gate_id TEXT UNIQUE NOT NULL,
    gate_name TEXT NOT NULL,
    task_type TEXT NOT NULL,
    
    -- Thresholds for autonomy
    min_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.70,
    min_historical_runs INTEGER NOT NULL DEFAULT 10,
    min_success_rate DECIMAL(3,2) NOT NULL DEFAULT 0.95,
    max_error_rate DECIMAL(3,2) NOT NULL DEFAULT 0.05,
    
    -- Time-based thresholds
    min_days_since_first_run INTEGER DEFAULT 7,
    
    -- Current status
    current_status TEXT CHECK (current_status IN ('locked', 'unlocked', 'active')),
    unlocked_at TIMESTAMPTZ,
    
    -- Metrics snapshot
    runs_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_confidence DECIMAL(3,2),
    
    -- Override
    manually_unlocked BOOLEAN DEFAULT FALSE,
    manually_locked BOOLEAN DEFAULT FALSE,
    locked_reason TEXT,
    
    -- Audit
    last_evaluated_at TIMESTAMPTZ,
    evaluated_by TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default gates
INSERT INTO adzeta_autonomy_gates (gate_id, gate_name, task_type, min_confidence, min_historical_runs, min_success_rate, current_status)
VALUES 
    ('gate_1_research', 'Research Queries', 'research', 0.70, 10, 1.0, 'unlocked'),
    ('gate_2_analytics', 'Analytics Reports', 'analytics', 0.75, 20, 0.95, 'locked'),
    ('gate_3_recommendations', 'Action Recommendations', 'recommendation', 0.80, 50, 0.90, 'locked'),
    ('gate_4_actions', 'Direct Actions', 'action', 0.90, 100, 0.95, 'locked')
ON CONFLICT (gate_id) DO NOTHING;

-- ============================================
-- 3. USER FEEDBACK TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS adzeta_user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to task
    task_id UUID REFERENCES adzeta_work_queue(task_id),
    oracle_command_id UUID REFERENCES oracle_commands(command_id),
    
    -- Feedback type
    feedback_type TEXT NOT NULL CHECK (feedback_type IN (
        'approval',           -- Approved the suggestion
        'rejection',          -- Rejected
        'modification',       -- Modified before approving
        'rating',             -- Star rating
        'comment',            -- Free text
        'outcome_report'      -- Report on execution outcome
    )),
    
    -- Feedback content
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    modification_json JSONB, -- What was changed
    
    -- Context
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    session_id TEXT,
    
    -- For outcome reports
    outcome_success BOOLEAN,
    outcome_metrics JSONB,
    time_to_completion_seconds INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adzeta_feedback_task 
    ON adzeta_user_feedback(task_id);
CREATE INDEX IF NOT EXISTS idx_adzeta_feedback_user 
    ON adzeta_user_feedback(user_id, created_at);

-- ============================================
-- 4. AGENT PERFORMANCE METRICS
-- ============================================

CREATE TABLE IF NOT EXISTS adzeta_agent_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Metric identification
    metric_date DATE NOT NULL,
    agent_id TEXT NOT NULL DEFAULT 'adzeta-gtm',
    task_type TEXT NOT NULL,
    
    -- Count metrics
    total_queries INTEGER DEFAULT 0,
    approved_count INTEGER DEFAULT 0,
    rejected_count INTEGER DEFAULT 0,
    modified_count INTEGER DEFAULT 0,
    auto_executed_count INTEGER DEFAULT 0,
    
    -- Quality metrics
    avg_confidence DECIMAL(3,2),
    avg_response_time_seconds INTEGER,
    avg_user_rating DECIMAL(2,1),
    
    -- Success tracking
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    
    -- Calculated
    success_rate DECIMAL(3,2),
    approval_rate DECIMAL(3,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(metric_date, agent_id, task_type)
);

-- ============================================
-- 5. PROACTIVE SUGGESTIONS QUEUE
-- ============================================

CREATE TABLE IF NOT EXISTS adzeta_proactive_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Trigger
    suggestion_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'metric_anomaly',
        'opportunity_detected',
        'trend_change',
        'scheduled_check',
        'idle_prompt'
    )),
    
    -- Content
    title TEXT NOT NULL,
    description TEXT,
    urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
    
    -- Suggested action
    suggested_action TEXT,
    suggested_action_payload JSONB,
    confidence DECIMAL(3,2),
    
    -- User interaction
    user_id UUID REFERENCES auth.users(id),
    dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,
    dismissed_reason TEXT,
    
    accepted BOOLEAN DEFAULT FALSE,
    accepted_at TIMESTAMPTZ,
    
    -- Scheduling
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adzeta_suggestions_user 
    ON adzeta_proactive_suggestions(user_id, dismissed, accepted, urgency);

-- ============================================
-- 6. AUTONOMY CONFIGURATION
-- ============================================

CREATE TABLE IF NOT EXISTS adzeta_autonomy_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Config keys
    config_key TEXT UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    
    -- Metadata
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Audit
    change_reason TEXT
);

-- Seed default config
INSERT INTO adzeta_autonomy_config (config_key, config_value, description)
VALUES 
    ('auto_approve_threshold', '{"research": true, "analytics": false, "recommendation": false, "action": false}', 'Which task types can be auto-approved'),
    ('min_confidence_for_suggestion', '0.70', 'Minimum confidence to show proactive suggestion'),
    ('proactive_check_interval_minutes', '60', 'How often to run proactive checks'),
    ('max_queue_depth_alert', '20', 'Alert if pending queue exceeds this'),
    ('default_task_priority', '5', 'Default priority for new tasks')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_adzeta_work_queue_updated_at 
    BEFORE UPDATE ON adzeta_work_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adzeta_autonomy_gates_updated_at 
    BEFORE UPDATE ON adzeta_autonomy_gates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adzeta_autonomy_config_updated_at 
    BEFORE UPDATE ON adzeta_autonomy_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR CONVENIENCE
-- ============================================

-- View: Pending tasks needing review
CREATE OR REPLACE VIEW v_pending_approval AS
SELECT 
    task_id,
    task_type,
    title,
    confidence_score,
    risk_level,
    suggested_action,
    rationale,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM adzeta_work_queue
WHERE approval_state = 'pending_review'
ORDER BY priority DESC, created_at ASC;

-- View: Agent performance summary
CREATE OR REPLACE VIEW v_agent_performance AS
SELECT 
    task_type,
    COUNT(*) as total_tasks,
    SUM(CASE WHEN approval_state = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN approval_state = 'auto_executed' THEN 1 ELSE 0 END) as auto_executed,
    AVG(confidence_score) as avg_confidence,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60) as avg_completion_minutes
FROM adzeta_work_queue
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY task_type;

-- View: Unlocked gates status
CREATE OR REPLACE VIEW v_autonomy_status AS
SELECT 
    gate_id,
    gate_name,
    task_type,
    current_status,
    runs_count,
    success_count,
    CASE 
        WHEN runs_count >= min_historical_runs 
             AND (success_count::decimal / NULLIF(runs_count, 0)) >= min_success_rate
        THEN 'Eligible for unlock'
        ELSE 'Locked'
    END as unlock_eligibility
FROM adzeta_autonomy_gates;

-- ============================================
-- NOTIFICATIONS SETUP (Optional)
-- ============================================
-- Uncomment if you want PostgreSQL notifications on new tasks
-- CREATE OR REPLACE FUNCTION notify_new_task() RETURNS TRIGGER AS $$
-- BEGIN
--     PERFORM pg_notify('adzeta_work_queue', jsonb_build_object(
--         'task_id', NEW.task_id,
--         'task_type', NEW.task_type,
--         'title', NEW.title
--     )::text);
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- 
-- CREATE TRIGGER task_created_notification
--     AFTER INSERT ON adzeta_work_queue
--     FOR EACH ROW EXECUTE FUNCTION notify_new_task();

-- ============================================
-- COMPLETION VERIFY
-- ============================================
-- Run this to verify all tables were created:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'adzeta_%' ORDER BY tablename;
