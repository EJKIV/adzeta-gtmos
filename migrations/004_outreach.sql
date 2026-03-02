-- ================================================================
-- Migration 004: Outreach campaigns & sequences
-- Campaign definitions, multi-step sequences with A/B testing
-- ================================================================

-- ==========================================
-- outreach_campaigns
-- ==========================================

CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'outbound_email', 'linkedin_sequence', 'multi_channel',
        'event_follow_up', 'nurture', 'reactivation', 'account_based'
    )),

    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_approval', 'scheduled', 'active', 'paused', 'completed', 'archived'
    )),

    -- Schedule
    start_date DATE,
    end_date DATE,
    timezone VARCHAR(50) DEFAULT 'America/New_York',

    -- Targeting Parameters
    targeting_params JSONB DEFAULT '{}'::jsonb,

    -- Audience Definition
    audience_source VARCHAR(50) DEFAULT 'manual' CHECK (audience_source IN (
        'manual', 'segment', 'icp_match', 'research_job', 'list_upload', 'crm_sync'
    )),
    audience_segment_id UUID,

    -- Sequence Assignment
    primary_sequence_id UUID,
    variant_test_enabled BOOLEAN DEFAULT false,

    -- Goal & Tracking
    goals JSONB DEFAULT '{}'::jsonb,

    -- Volume Controls
    daily_limit INTEGER DEFAULT 100,
    total_limit INTEGER,
    sending_window JSONB DEFAULT '{
        "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "start_time": "09:00",
        "end_time": "17:00",
        "batch_size": 10,
        "batch_delay_minutes": 5
    }'::jsonb,

    -- Performance Tracking
    performance_summary JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL,
    organization_id UUID,

    -- Approval Flow
    approved_by UUID,
    approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON outreach_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON outreach_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON outreach_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_targeting ON outreach_campaigns USING GIN(targeting_params);
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON outreach_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON outreach_campaigns(created_at DESC);

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON outreach_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view campaigns" ON outreach_campaigns
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert campaigns" ON outreach_campaigns
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update campaigns" ON outreach_campaigns
    FOR UPDATE TO authenticated USING (true);

-- ==========================================
-- outreach_sequences
-- ==========================================

CREATE TABLE IF NOT EXISTS outreach_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'email' CHECK (type IN (
        'email', 'linkedin', 'phone', 'multi_channel', 'mixed'
    )),

    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),

    -- A/B Testing Configuration
    ab_test_enabled BOOLEAN DEFAULT false,
    ab_test_config JSONB DEFAULT '{}'::jsonb,

    -- Sequence Steps (ordered array)
    steps JSONB DEFAULT '[]'::jsonb,
    tokens JSONB DEFAULT '[]'::jsonb,
    exit_conditions JSONB DEFAULT '[]'::jsonb,

    -- Performance Stats
    stats JSONB DEFAULT '{}'::jsonb,

    -- Variants for A/B testing
    variants JSONB DEFAULT '[]'::jsonb,
    winning_variant_id VARCHAR(50),
    winner_selected_at TIMESTAMPTZ,
    winner_selection_method VARCHAR(50),

    -- Template References
    email_template_ids UUID[],

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL,
    organization_id UUID,

    -- Usage
    campaign_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ
);

-- Step performance tracking (granular daily metrics)
CREATE TABLE IF NOT EXISTS sequence_step_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES outreach_sequences(id) ON DELETE CASCADE,
    step_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    variant VARCHAR(10) DEFAULT 'A',

    -- Volume
    enrolled INTEGER DEFAULT 0,
    sent INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,

    -- Engagement
    opened INTEGER DEFAULT 0,
    clicked INTEGER DEFAULT 0,
    replied INTEGER DEFAULT 0,
    positive_replied INTEGER DEFAULT 0,
    forwarded INTEGER DEFAULT 0,

    -- Outcomes
    meetings_booked INTEGER DEFAULT 0,
    meetings_held INTEGER DEFAULT 0,
    opportunities_created INTEGER DEFAULT 0,
    won_deals INTEGER DEFAULT 0,
    revenue DECIMAL(15, 2) DEFAULT 0,

    -- Bounces
    bounced INTEGER DEFAULT 0,
    unsubscribed INTEGER DEFAULT 0,
    marked_spam INTEGER DEFAULT 0,

    -- Rates
    open_rate DECIMAL(5, 2),
    click_rate DECIMAL(5, 2),
    reply_rate DECIMAL(5, 2),
    positive_rate DECIMAL(5, 2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(sequence_id, step_id, date, variant)
);

CREATE INDEX IF NOT EXISTS idx_sequences_status ON outreach_sequences(status);
CREATE INDEX IF NOT EXISTS idx_sequences_type ON outreach_sequences(type);
CREATE INDEX IF NOT EXISTS idx_sequences_org ON outreach_sequences(organization_id);
CREATE INDEX IF NOT EXISTS idx_sequences_created ON outreach_sequences(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sequences_ab_test ON outreach_sequences(ab_test_enabled) WHERE ab_test_enabled = true;

CREATE INDEX IF NOT EXISTS idx_step_perf_sequence ON sequence_step_performance(sequence_id);
CREATE INDEX IF NOT EXISTS idx_step_perf_date ON sequence_step_performance(date DESC);
CREATE INDEX IF NOT EXISTS idx_step_perf_variant ON sequence_step_performance(variant);

CREATE TRIGGER update_sequences_updated_at
    BEFORE UPDATE ON outreach_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_step_perf_updated_at
    BEFORE UPDATE ON sequence_step_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- A/B test results view
CREATE OR REPLACE VIEW sequence_ab_test_results AS
SELECT
    s.id as sequence_id,
    s.name as sequence_name,
    s.ab_test_config,
    s.winning_variant_id,
    v.variant,
    COUNT(*) as sample_size,
    SUM(sp.sent) as total_sent,
    ROUND(AVG(sp.open_rate), 2) as avg_open_rate,
    ROUND(AVG(sp.reply_rate), 2) as avg_reply_rate,
    ROUND(AVG(sp.positive_rate), 2) as avg_positive_rate,
    SUM(sp.meetings_booked) as total_meetings,
    SUM(sp.revenue) as total_revenue
FROM outreach_sequences s
CROSS JOIN LATERAL jsonb_array_elements_text(s.ab_test_config->'variants') as v(variant)
LEFT JOIN sequence_step_performance sp ON sp.sequence_id = s.id AND sp.variant = v.variant
WHERE s.ab_test_enabled = true
GROUP BY s.id, s.name, s.ab_test_config, s.winning_variant_id, v.variant;

ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_step_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sequences" ON outreach_sequences
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert sequences" ON outreach_sequences
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update sequences" ON outreach_sequences
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can view step perf" ON sequence_step_performance
    FOR SELECT TO authenticated USING (true);

-- Campaign performance view (depends on both campaigns + communications from migration 006)
-- Deferred to migration 006 where communications is created
