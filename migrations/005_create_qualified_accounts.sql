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
