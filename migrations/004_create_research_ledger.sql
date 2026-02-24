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
