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
