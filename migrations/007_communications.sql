-- ================================================================
-- Migration 007: Communications & channel performance
-- All touch points logging, email tracking, meeting outcomes,
-- and aggregated channel analytics
-- ================================================================

-- ==========================================
-- communications
-- ==========================================

CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES outreach_campaigns(id) ON DELETE SET NULL,
    sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE SET NULL,
    step_id VARCHAR(50),
    variant VARCHAR(10) DEFAULT 'A',

    -- Channel & Type
    channel VARCHAR(50) NOT NULL CHECK (channel IN (
        'email', 'linkedin', 'phone', 'sms', 'meeting', 'note', 'api', 'chat', 'direct_mail'
    )),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('outbound', 'inbound')),

    -- Message Content
    subject TEXT,
    body TEXT,
    body_html TEXT,
    notes TEXT,
    duration_seconds INTEGER,
    recording_url VARCHAR(500),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    status_details JSONB DEFAULT '{}'::jsonb,

    -- Engagement Tracking
    engagement_data JSONB DEFAULT '{}'::jsonb,
    reply_analysis JSONB DEFAULT '{}'::jsonb,

    -- Threading
    thread_id UUID REFERENCES communications(id),
    in_reply_to UUID REFERENCES communications(id),
    message_id VARCHAR(255),

    -- Sending
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    sent_by_user_id UUID,
    sent_by_system VARCHAR(50),

    -- Error/Retry
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    source VARCHAR(50),
    source_details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_communications_prospect ON communications(prospect_id);
CREATE INDEX IF NOT EXISTS idx_communications_campaign ON communications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_communications_sequence ON communications(sequence_id, step_id);
CREATE INDEX IF NOT EXISTS idx_communications_channel ON communications(channel);
CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_direction ON communications(direction);
CREATE INDEX IF NOT EXISTS idx_communications_sent_at ON communications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_thread ON communications(thread_id);
CREATE INDEX IF NOT EXISTS idx_communications_engagement ON communications USING GIN(engagement_data);
CREATE INDEX IF NOT EXISTS idx_communications_reply ON communications USING GIN(reply_analysis);

CREATE TRIGGER update_communications_updated_at
    BEFORE UPDATE ON communications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- email_tracking_log
-- ==========================================

CREATE TABLE IF NOT EXISTS email_tracking_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_tracking_comm ON email_tracking_log(communication_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_event ON email_tracking_log(event_type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_time ON email_tracking_log(occurred_at DESC);

-- ==========================================
-- meeting_outcomes
-- ==========================================

CREATE TABLE IF NOT EXISTS meeting_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ,
    actual_start_at TIMESTAMPTZ,
    actual_end_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'scheduled',
    outcome VARCHAR(50),
    attended_by JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    next_steps TEXT,
    opportunity_created BOOLEAN DEFAULT false,
    opportunity_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_outcomes_comm ON meeting_outcomes(communication_id);
CREATE INDEX IF NOT EXISTS idx_meeting_outcomes_status ON meeting_outcomes(status);
CREATE INDEX IF NOT EXISTS idx_meeting_outcomes_scheduled ON meeting_outcomes(scheduled_at);

CREATE TRIGGER update_meeting_outcomes_updated_at
    BEFORE UPDATE ON meeting_outcomes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- channel_performance
-- ==========================================

CREATE TABLE IF NOT EXISTS channel_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Dimensions
    date DATE NOT NULL,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'linkedin', 'phone', 'sms', 'multi_channel')),
    campaign_id UUID REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
    sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE CASCADE,
    step_id VARCHAR(50),
    variant VARCHAR(10) DEFAULT 'A',
    segment_name VARCHAR(100),

    -- Volume
    prospects_targeted INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,

    -- Delivery
    bounces INTEGER DEFAULT 0,
    unsubscribes INTEGER DEFAULT 0,
    spam_complaints INTEGER DEFAULT 0,

    -- Engagement
    opens INTEGER DEFAULT 0,
    unique_opens INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    positive_replies INTEGER DEFAULT 0,
    negative_replies INTEGER DEFAULT 0,
    neutral_replies INTEGER DEFAULT 0,

    -- Outcomes
    meetings_booked INTEGER DEFAULT 0,
    meetings_held INTEGER DEFAULT 0,
    opportunities_created INTEGER DEFAULT 0,
    closed_won INTEGER DEFAULT 0,
    closed_lost INTEGER DEFAULT 0,
    revenue_won DECIMAL(15, 2) DEFAULT 0,
    revenue_lost DECIMAL(15, 2) DEFAULT 0,

    -- Calculated rates
    delivery_rate DECIMAL(5, 2) DEFAULT 0,
    open_rate DECIMAL(5, 2) DEFAULT 0,
    click_rate DECIMAL(5, 2) DEFAULT 0,
    reply_rate DECIMAL(5, 2) DEFAULT 0,
    positive_rate DECIMAL(5, 2) DEFAULT 0,
    meeting_rate DECIMAL(5, 2) DEFAULT 0,
    opportunity_rate DECIMAL(5, 2) DEFAULT 0,
    conversion_rate DECIMAL(5, 2) DEFAULT 0,

    -- Costs
    cost_per_message DECIMAL(10, 4) DEFAULT 0,
    total_cost DECIMAL(10, 2) DEFAULT 0,
    cost_per_meeting DECIMAL(10, 2) DEFAULT 0,
    cost_per_opportunity DECIMAL(10, 2) DEFAULT 0,
    cost_per_deal DECIMAL(10, 2) DEFAULT 0,
    roi_percent DECIMAL(5, 2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(date, channel, campaign_id, sequence_id, step_id, variant, segment_name)
);

CREATE INDEX IF NOT EXISTS idx_channel_perf_date_channel ON channel_performance(date DESC, channel);
CREATE INDEX IF NOT EXISTS idx_channel_perf_campaign ON channel_performance(campaign_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_channel_perf_sequence ON channel_performance(sequence_id, step_id);
CREATE INDEX IF NOT EXISTS idx_channel_perf_variant ON channel_performance(variant) WHERE variant IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_perf_segment ON channel_performance(segment_name);

-- Auto-calculate rates on insert/update
CREATE OR REPLACE FUNCTION calculate_channel_rates()
RETURNS TRIGGER AS $$
BEGIN
    NEW.delivery_rate := CASE WHEN NEW.messages_sent > 0 THEN ROUND((NEW.messages_delivered::DECIMAL / NEW.messages_sent) * 100, 2) ELSE 0 END;
    NEW.open_rate := CASE WHEN NEW.messages_delivered > 0 THEN ROUND((NEW.unique_opens::DECIMAL / NEW.messages_delivered) * 100, 2) ELSE 0 END;
    NEW.click_rate := CASE WHEN NEW.messages_delivered > 0 THEN ROUND((NEW.unique_clicks::DECIMAL / NEW.messages_delivered) * 100, 2) ELSE 0 END;
    NEW.reply_rate := CASE WHEN NEW.messages_sent > 0 THEN ROUND((NEW.replies::DECIMAL / NEW.messages_sent) * 100, 2) ELSE 0 END;
    NEW.positive_rate := CASE WHEN NEW.replies > 0 THEN ROUND((NEW.positive_replies::DECIMAL / NEW.replies) * 100, 2) ELSE 0 END;
    NEW.meeting_rate := CASE WHEN NEW.messages_sent > 0 THEN ROUND((NEW.meetings_booked::DECIMAL / NEW.messages_sent) * 100, 2) ELSE 0 END;
    NEW.total_cost := NEW.messages_sent * NEW.cost_per_message;
    NEW.cost_per_meeting := CASE WHEN NEW.meetings_booked > 0 THEN NEW.total_cost / NEW.meetings_booked ELSE 0 END;
    NEW.roi_percent := CASE WHEN NEW.total_cost > 0 THEN ROUND(((NEW.revenue_won - NEW.total_cost) / NEW.total_cost) * 100, 2) ELSE 0 END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_rates_on_insert_update
    BEFORE INSERT OR UPDATE ON channel_performance
    FOR EACH ROW EXECUTE FUNCTION calculate_channel_rates();

-- ==========================================
-- RLS for all tables in this migration
-- ==========================================

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view communications" ON communications
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert communications" ON communications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated can view tracking" ON email_tracking_log
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert tracking" ON email_tracking_log
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated can view meeting outcomes" ON meeting_outcomes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert meeting outcomes" ON meeting_outcomes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated can view channel perf" ON channel_performance
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert channel perf" ON channel_performance
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update channel perf" ON channel_performance
    FOR UPDATE USING (true);

-- ==========================================
-- Views (depend on tables from this + prior migrations)
-- ==========================================

-- Engagement score function
CREATE OR REPLACE FUNCTION calculate_engagement_score(p_prospect_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
BEGIN
    SELECT v_score + (COUNT(*) * 5) INTO v_score
    FROM email_tracking_log etl
    JOIN communications c ON c.id = etl.communication_id
    WHERE c.prospect_id = p_prospect_id AND etl.event_type = 'open';

    SELECT v_score + (COUNT(*) * 15) INTO v_score
    FROM email_tracking_log etl
    JOIN communications c ON c.id = etl.communication_id
    WHERE c.prospect_id = p_prospect_id AND etl.event_type = 'click';

    SELECT v_score + (COUNT(*) * 25) INTO v_score
    FROM communications WHERE prospect_id = p_prospect_id AND direction = 'inbound';

    SELECT v_score + (COUNT(*) * 50) INTO v_score
    FROM communications WHERE prospect_id = p_prospect_id AND channel = 'meeting' AND status = 'completed';

    RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Auto-update engagement on tracking events
CREATE OR REPLACE FUNCTION update_prospect_engagement()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE prospects
    SET engagement_score = calculate_engagement_score(
        (SELECT prospect_id FROM communications WHERE id = NEW.communication_id)
    )
    WHERE id = (SELECT prospect_id FROM communications WHERE id = NEW.communication_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_engagement_on_tracking
    AFTER INSERT ON email_tracking_log
    FOR EACH ROW EXECUTE FUNCTION update_prospect_engagement();

-- Campaign performance view
CREATE OR REPLACE VIEW campaign_performance_summary AS
SELECT
    c.id,
    c.name,
    c.type,
    c.status,
    COUNT(DISTINCT p.id) as total_prospects,
    COUNT(DISTINCT CASE WHEN com.channel = 'email' THEN com.id END) as emails_sent,
    COUNT(DISTINCT CASE WHEN com.channel = 'email' AND com.status = 'opened' THEN com.id END) as emails_opened,
    COUNT(DISTINCT CASE WHEN com.channel = 'email' AND com.status IN ('replied', 'positive_reply') THEN com.id END) as emails_replied,
    COUNT(DISTINCT CASE WHEN com.channel = 'meeting' THEN com.id END) as meetings_booked
FROM outreach_campaigns c
LEFT JOIN prospects p ON p.campaign_id = c.id
LEFT JOIN communications com ON com.prospect_id = p.id
GROUP BY c.id, c.name, c.type, c.status;

-- Communication timeline view
CREATE OR REPLACE VIEW prospect_communication_timeline AS
SELECT
    c.id,
    c.prospect_id,
    c.channel,
    c.direction,
    c.subject,
    c.status,
    c.sent_at,
    c.created_at,
    c.reply_analysis,
    c.engagement_data,
    p.company_name,
    p.contact_first_name,
    p.contact_last_name,
    p.contact_email,
    camp.name as campaign_name,
    seq.name as sequence_name
FROM communications c
LEFT JOIN prospects p ON p.id = c.prospect_id
LEFT JOIN outreach_campaigns camp ON camp.id = c.campaign_id
LEFT JOIN outreach_sequences seq ON seq.id = c.sequence_id
ORDER BY c.sent_at DESC NULLS LAST;
