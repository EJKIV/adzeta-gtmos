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
-- Migration: Create preference_models table
-- Stores learned user preferences for personalization

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

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_preference_models_user_id ON preference_models(user_id);

-- Enable Row Level Security
ALTER TABLE preference_models ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own preferences
CREATE POLICY "Users can view own preferences" ON preference_models
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON preference_models
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: System can insert for new users
CREATE POLICY "System can insert preferences" ON preference_models
    FOR INSERT WITH CHECK (true);
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
-- Migration: Create research_ledger table
-- Stores research findings and decision evidence

CREATE TYPE research_status AS ENUM ('draft', 'under_review', 'validated', 'deprecated');

CREATE TABLE IF NOT EXISTS research_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    hypothesis TEXT NOT NULL,
    evidence TEXT,
    source_url TEXT,
    confidence NUMERIC(5,2) CHECK (confidence >= 0 AND confidence <= 100),
    recommended_action TEXT,
    status research_status DEFAULT 'draft',
    impact_scope TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    linked_account_id TEXT,
    linked_individual_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_research_ledger_user_id ON research_ledger(user_id);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_research_ledger_status ON research_ledger(status);

-- GIN index for tags
CREATE INDEX IF NOT EXISTS idx_research_ledger_tags ON research_ledger USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE research_ledger ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own research
CREATE POLICY "Users can view own research" ON research_ledger
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own research
CREATE POLICY "Users can insert own research" ON research_ledger
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own research
CREATE POLICY "Users can update own research" ON research_ledger
    FOR UPDATE USING (auth.uid()::text = user_id);
-- Migration: Create qualified_accounts table
-- Stores CRM accounts and prospects

CREATE TYPE spend_tier AS ENUM ('tier_1', 'tier_2', 'tier_3', 'unqualified');

CREATE TABLE IF NOT EXISTS qualified_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    website TEXT,
    employee_count INTEGER CHECK (employee_count >= 0),
    estimated_spend TEXT,
    spend_tier spend_tier,
    funding_stage TEXT,
    recent_signal TEXT,
    pain_point_indicators TEXT[],
    head_of_revops_name TEXT,
    vp_sales_name TEXT,
    cmo_name TEXT,
    status TEXT DEFAULT 'new',
    score INTEGER CHECK (score >= 1 AND score <= 5),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_qualified_accounts_user_id ON qualified_accounts(user_id);

-- Index for score queries
CREATE INDEX IF NOT EXISTS idx_qualified_accounts_score ON qualified_accounts(score DESC);

-- GIN index for pain points
CREATE INDEX IF NOT EXISTS idx_qualified_accounts_pain_points ON qualified_accounts USING GIN(pain_point_indicators);

-- Enable Row Level Security
ALTER TABLE qualified_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own accounts
CREATE POLICY "Users can view own accounts" ON qualified_accounts
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own accounts
CREATE POLICY "Users can insert own accounts" ON qualified_accounts
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own accounts
CREATE POLICY "Users can update own accounts" ON qualified_accounts
    FOR UPDATE USING (auth.uid()::text = user_id);
-- Migration: Create funnels table
-- Stores funnel stages and progress

CREATE TYPE funnel_status AS ENUM ('prospecting', 'qualified', 'opportunity', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'nurture');

CREATE TABLE IF NOT EXISTS funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    account_id UUID REFERENCES qualified_accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status funnel_status DEFAULT 'prospecting',
    stage_value NUMERIC(12,2),
    probability INTEGER CHECK (probability >= 0 AND probability <= 100),
    expected_close_date DATE,
    notes TEXT,
    dependencies TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_funnels_user_id ON funnels(user_id);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_funnels_status ON funnels(status);

-- Index for account linkage
CREATE INDEX IF NOT EXISTS idx_funnels_account_id ON funnels(account_id);

-- Enable Row Level Security
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own funnels
CREATE POLICY "Users can view own funnels" ON funnels
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own funnels
CREATE POLICY "Users can insert own funnels" ON funnels
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own funnels
CREATE POLICY "Users can update own funnels" ON funnels
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Only admin can delete
CREATE POLICY "Only admin can delete funnels" ON funnels
    FOR DELETE USING (auth.uid()::text = user_id);
-- Migration: Create research_jobs table
-- Queue for research tasks with Apollo.io integration
-- File: 021_create_research_jobs.sql
\ir 021_create_research_jobs.sql

-- Migration: Create prospects table  
-- Enriched prospect data from Apollo.io and other sources
-- File: 022_create_prospects.sql
\ir 022_create_prospects.sql

-- Migration: Create outreach_campaigns table
-- Campaign definitions for multi-channel outreach
-- File: 023_create_outreach_campaigns.sql
\ir 023_create_outreach_campaigns.sql

-- Migration: Create outreach_sequences table
-- Multi-step email and touch point sequences
-- File: 024_create_outreach_sequences.sql
\ir 024_create_outreach_sequences.sql

-- Migration: Create communications table
-- All touch points including email, social, calls, etc.
-- File: 025_create_communications.sql
\ir 025_create_communications.sql

-- Migration: Create command_history table
-- Natural language command log for audit and learning
-- File: 026_create_command_history.sql
\ir 026_create_command_history.sql
