-- Migration: Create autonomous_tasks table
-- Stores AI-generated tasks with approval workflow

CREATE TYPE task_status AS ENUM ('pending', 'assigned', 'in_progress', 'blocked', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE task_type AS ENUM ('kpi_investigation', 'unblock_workflow', 'strategic_gap', 'blocker_mitigation');

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

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_user_id ON autonomous_tasks(user_id);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_status ON autonomous_tasks(status);

-- Index for pending tasks view
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_pending ON autonomous_tasks(user_id, status) WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE autonomous_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own tasks
CREATE POLICY "Users can view own tasks" ON autonomous_tasks
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: System can create tasks
CREATE POLICY "System can create tasks" ON autonomous_tasks
    FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own tasks
CREATE POLICY "Users can update own tasks" ON autonomous_tasks
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Create view for pending autonomous tasks
CREATE OR REPLACE VIEW pending_autonomous_tasks AS
SELECT * FROM autonomous_tasks
WHERE status = 'pending'
ORDER BY priority DESC, confidence_score DESC, created_at ASC;
