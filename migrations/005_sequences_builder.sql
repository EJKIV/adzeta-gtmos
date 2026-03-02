-- ================================================================
-- Migration 005: Sequence Builder tables
-- Used by src/lib/sequences/builder.ts for creating sequences
-- from natural language or templates
-- ================================================================

-- ==========================================
-- sequences (builder-managed sequences)
-- ==========================================

CREATE TABLE IF NOT EXISTS sequences (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived', 'completed')),
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    template_id TEXT,
    ab_test_id TEXT,
    metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sequences_user ON sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_sequences_workspace ON sequences(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sequences_status_builder ON sequences(status);

CREATE TRIGGER update_sequences_builder_updated_at
    BEFORE UPDATE ON sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sequences" ON sequences
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own sequences" ON sequences
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own sequences" ON sequences
    FOR UPDATE USING (auth.uid()::text = user_id);

-- ==========================================
-- sequence_touches
-- ==========================================

CREATE TABLE IF NOT EXISTS sequence_touches (
    id TEXT PRIMARY KEY,
    sequence_id TEXT NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    day INTEGER DEFAULT 1,
    delay_hours INTEGER,
    channel VARCHAR(50) NOT NULL DEFAULT 'email',
    status VARCHAR(50) DEFAULT 'draft',
    auto_send BOOLEAN DEFAULT true,
    condition_type TEXT,
    condition_logic TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sequence_touches_sequence ON sequence_touches(sequence_id);

CREATE TRIGGER update_sequence_touches_updated_at
    BEFORE UPDATE ON sequence_touches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE sequence_touches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sequence touches" ON sequence_touches
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM sequences WHERE sequences.id = sequence_touches.sequence_id AND sequences.user_id = auth.uid()::text)
    );

CREATE POLICY "Users can insert sequence touches" ON sequence_touches
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM sequences WHERE sequences.id = sequence_touches.sequence_id AND sequences.user_id = auth.uid()::text)
    );

-- ==========================================
-- sequence_variants
-- ==========================================

CREATE TABLE IF NOT EXISTS sequence_variants (
    id TEXT PRIMARY KEY,
    sequence_id TEXT NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    variant_key VARCHAR(10) NOT NULL,
    name TEXT,
    description TEXT,
    weight DECIMAL(5, 4) DEFAULT 0.5,
    touch_variants JSONB DEFAULT '{}'::jsonb,
    is_control BOOLEAN DEFAULT false,
    is_winner BOOLEAN DEFAULT false,
    confidence DECIMAL(5, 4),
    metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sequence_variants_sequence ON sequence_variants(sequence_id);

CREATE TRIGGER update_sequence_variants_updated_at
    BEFORE UPDATE ON sequence_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE sequence_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sequence variants" ON sequence_variants
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM sequences WHERE sequences.id = sequence_variants.sequence_id AND sequences.user_id = auth.uid()::text)
    );

CREATE POLICY "Users can insert sequence variants" ON sequence_variants
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM sequences WHERE sequences.id = sequence_variants.sequence_id AND sequences.user_id = auth.uid()::text)
    );
