-- ================================================================
-- Migration 012: Oracle commands table
-- ================================================================

CREATE TABLE IF NOT EXISTS oracle_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id UUID UNIQUE NOT NULL,
    raw_input TEXT NOT NULL,
    environment TEXT DEFAULT 'dev',
    user_id UUID,
    status TEXT DEFAULT 'pending',
    response TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_oracle_commands_status ON oracle_commands(status);
CREATE INDEX IF NOT EXISTS idx_oracle_commands_created_at ON oracle_commands(created_at);

ALTER TABLE oracle_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage oracle commands" ON oracle_commands
    FOR ALL USING (true);

NOTIFY pgrst, 'reload schema';
