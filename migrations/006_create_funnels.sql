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
