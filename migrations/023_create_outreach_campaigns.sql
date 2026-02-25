-- Migration: Create outreach_campaigns table
-- Campaign definitions for multi-channel outreach

-- Campaign status enum
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'completed', 'archived');

-- Campaign type enum
CREATE TYPE campaign_type AS ENUM ('email', 'linkedin', 'sequence', 'ab_test', 'event', 'retargeting');

CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    
    -- Campaign basics
    name TEXT NOT NULL,
    description TEXT,
    campaign_type campaign_type DEFAULT 'email',
    status campaign_status DEFAULT 'draft',
    
    -- Targeting criteria
    targeting_criteria JSONB DEFAULT '{}',
    -- e.g., {
    --   "quality_tiers": ["a", "b"],
    --   "industries": ["fintech", "saas"],
    --   "titles": ["VP Sales", "Head of Revenue"],
    --   "company_size": ["51-200", "201-500"],
    --   "exclude_existing_customers": true
    -- }
    
    -- Linked prospect filter (if pre-defined)
    target_prospect_ids UUID[] DEFAULT '{}',
    
    -- Sequence reference
    sequence_id UUID,
    -- References outreach_sequences (created in next migration)
    
    -- Content
    sender_name TEXT,
    sender_email TEXT,
    sender_title TEXT,
    reply_to_email TEXT,
    
    -- Campaign settings
    settings JSONB DEFAULT '{}',
    -- e.g., {
    --   "send_hours_start": "09:00",
    --   "send_hours_end": "17:00",
    --   "send_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    --   "max_contacts_per_day": 50,
    --   "throttle_delay_hours": 24,
    --   "track_opens": true,
    --   "track_clicks": true
    -- }
    
    -- Scheduling
    scheduled_start_date DATE,
    scheduled_end_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Goals
    goals JSONB DEFAULT '{}',
    -- e.g., {
    --   "target_contacts": 500,
    --   "target_meetings": 20,
    --   "target_reply_rate": 0.15
    -- }
    
    -- Performance metrics
    metrics JSONB DEFAULT '{}',
    -- e.g., {
    --   "contacts_added": 500,
    --   "emails_sent": 1500,
    --   "emails_delivered": 1420,
    --   "emails_opened": 350,
    --   "emails_clicked": 120,
    --   "replies": 45,
    --   "meetings": 10,
    --   "unsubscribes": 5,
    --   "bounces": 15
    -- }
    
    -- A/B Test configuration (if applicable)
    ab_test_config JSONB DEFAULT '{}',
    -- e.g., {
    --   "is_active": true,
    --   "variants": ["control", "variant_a"],
    --   "split_ratio": [0.5, 0.5],
    --   "test_subject_line": true
    -- }
    
    -- Pause reason (if paused)
    pause_reason TEXT,
    paused_at TIMESTAMPTZ,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_user_id ON outreach_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_status ON outreach_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_campaign_type ON outreach_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_user_status ON outreach_campaigns(user_id, status);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_scheduled_start ON outreach_campaigns(scheduled_start_date);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_created_at ON outreach_campaigns(created_at DESC);

-- GIN indexes for flexible metadata queries
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_targeting_criteria ON outreach_campaigns USING GIN(targeting_criteria);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_settings ON outreach_campaigns USING GIN(settings);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_metrics ON outreach_campaigns USING GIN(metrics);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_target_prospect_ids ON outreach_campaigns USING GIN(target_prospect_ids);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_tags ON outreach_campaigns USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own campaigns
CREATE POLICY "Users can view own campaigns" ON outreach_campaigns
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own campaigns
CREATE POLICY "Users can insert own campaigns" ON outreach_campaigns
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own campaigns
CREATE POLICY "Users can update own campaigns" ON outreach_campaigns
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own campaigns
CREATE POLICY "Users can delete own campaigns" ON outreach_campaigns
    FOR DELETE USING (auth.uid()::text = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_outreach_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Auto-update status timestamps
    IF NEW.status = 'active' AND OLD.status != 'active' THEN
        NEW.started_at = NOW();
    END IF;
    
    IF NEW.status IN ('completed', 'archived') AND OLD.status NOT IN ('completed', 'archived') THEN
        NEW.completed_at = NOW();
    END IF;
    
    IF NEW.status = 'paused' AND OLD.status != 'paused' THEN
        NEW.paused_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_outreach_campaigns
    BEFORE UPDATE ON outreach_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_outreach_campaigns_updated_at();

-- View for active campaigns
CREATE OR REPLACE VIEW active_campaigns AS
SELECT * FROM outreach_campaigns
WHERE status = 'active'
ORDER BY scheduled_start_date ASC, created_at DESC;

-- View for campaign performance summary
CREATE OR REPLACE VIEW campaign_performance_summary AS
SELECT 
    id,
    name,
    campaign_type,
    status,
    goals->>'target_contacts' as target_contacts,
    metrics->>'contacts_added' as contacts_added,
    metrics->>'emails_sent' as emails_sent,
    metrics->>'emails_opened' as emails_opened,
    metrics->>'emails_clicked' as emails_clicked,
    metrics->>'replies' as replies,
    metrics->>'meetings' as meetings,
    CASE 
        WHEN (metrics->>'emails_sent')::integer > 0 
        THEN ROUND((metrics->>'replies')::numeric / (metrics->>'emails_sent')::numeric * 100, 2)
        ELSE 0 
    END as reply_rate,
    CASE 
        WHEN (metrics->>'emails_opened')::integer > 0 
        THEN ROUND((metrics->>'emails_clicked')::numeric / (metrics->>'emails_opened')::numeric * 100, 2)
        ELSE 0 
    END as click_rate,
    created_at,
    started_at,
    completed_at
FROM outreach_campaigns
ORDER BY created_at DESC;