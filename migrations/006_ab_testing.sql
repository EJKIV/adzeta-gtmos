-- ================================================================
-- Migration 006: A/B Testing engine
-- Used by src/lib/testing/ab-engine.ts and tracker.ts
-- ================================================================

-- ==========================================
-- ab_tests
-- ==========================================

CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('sequence', 'touch')),
    sequence_id TEXT NOT NULL,
    touch_id TEXT,
    split DECIMAL(3, 2) DEFAULT 0.5,
    min_sample INTEGER DEFAULT 100,
    max_sample INTEGER,
    confidence_threshold DECIMAL(3, 2) DEFAULT 0.95,
    primary_metric VARCHAR(50) DEFAULT 'replyRate' CHECK (primary_metric IN ('openRate', 'clickRate', 'replyRate', 'bookRate')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'winner_selected')),
    winning_variant_id UUID,
    confidence DECIMAL(5, 4),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_sequence ON ab_tests(sequence_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_created_by ON ab_tests(created_by);

CREATE TRIGGER update_ab_tests_updated_at
    BEFORE UPDATE ON ab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ab tests" ON ab_tests
    FOR SELECT USING (auth.uid()::text = created_by);

CREATE POLICY "Users can insert own ab tests" ON ab_tests
    FOR INSERT WITH CHECK (auth.uid()::text = created_by);

CREATE POLICY "Users can update own ab tests" ON ab_tests
    FOR UPDATE USING (auth.uid()::text = created_by);

-- ==========================================
-- ab_test_variants
-- ==========================================

CREATE TABLE IF NOT EXISTS ab_test_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_key VARCHAR(10) NOT NULL,
    name TEXT NOT NULL,
    weight DECIMAL(5, 4) DEFAULT 0.5,
    touch_variants JSONB,
    sample_size INTEGER DEFAULT 0,
    metrics JSONB DEFAULT '{"openRate": 0, "clickRate": 0, "replyRate": 0, "bookRate": 0}'::jsonb,
    is_control BOOLEAN DEFAULT false,
    is_winner BOOLEAN DEFAULT false,
    confidence_vs_control DECIMAL(5, 4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_test_variants_test ON ab_test_variants(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_control ON ab_test_variants(test_id) WHERE is_control = true;

CREATE TRIGGER update_ab_test_variants_updated_at
    BEFORE UPDATE ON ab_test_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ab test variants" ON ab_test_variants
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM ab_tests WHERE ab_tests.id = ab_test_variants.test_id AND ab_tests.created_by = auth.uid()::text)
    );

CREATE POLICY "Users can insert ab test variants" ON ab_test_variants
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM ab_tests WHERE ab_tests.id = ab_test_variants.test_id AND ab_tests.created_by = auth.uid()::text)
    );

CREATE POLICY "Users can update ab test variants" ON ab_test_variants
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM ab_tests WHERE ab_tests.id = ab_test_variants.test_id AND ab_tests.created_by = auth.uid()::text)
    );

-- ==========================================
-- ab_test_events
-- ==========================================

CREATE TABLE IF NOT EXISTS ab_test_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    prospect_id TEXT NOT NULL,
    sequence_id TEXT NOT NULL,
    touch_id TEXT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('sent', 'opened', 'clicked', 'replied', 'meeting_booked', 'unsubscribed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_test_events_test ON ab_test_events(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_variant ON ab_test_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_type ON ab_test_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_created ON ab_test_events(created_at DESC);

ALTER TABLE ab_test_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ab test events" ON ab_test_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM ab_tests WHERE ab_tests.id = ab_test_events.test_id AND ab_tests.created_by = auth.uid()::text)
    );

CREATE POLICY "System can insert ab test events" ON ab_test_events
    FOR INSERT WITH CHECK (true);
