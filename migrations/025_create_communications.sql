-- Migration: Create communications table
-- All touch points including email, social, calls, etc.

-- Communication channel enum
CREATE TYPE communication_channel AS ENUM ('email', 'linkedin', 'phone', 'sms', 'meeting', 'manual_note', 'system');

-- Communication direction enum
CREATE TYPE communication_direction AS ENUM ('outbound', 'inbound');

-- Communication status enum
CREATE TYPE communication_status AS ENUM (
    'pending',          -- Queued but not sent
    'scheduled',        -- Scheduled for future send
    'sending',          -- Currently being sent
    'sent',             -- Successfully sent
    'delivered',        -- Confirmed delivery (email opened tracking area)
    'opened',           -- Email opened
    'clicked',          -- Link clicked
    'replied',          -- Got a reply
    'bounced',          -- Email bounced
    'failed',           -- Failed to send
    'unsubscribed',     -- Lead unsubscribed
    'complaint',        -- Marked as spam
    'draft'             -- Saved as draft
);

CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    
    -- Linkages
    prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES outreach_campaigns(id) ON DELETE SET NULL,
    sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE SET NULL,
    sequence_step_number INTEGER,
    
    -- Communication details
    channel communication_channel NOT NULL,
    direction communication_direction NOT NULL,
    status communication_status DEFAULT 'pending',
    
    -- For emails
    subject TEXT,
    body TEXT,
    body_html TEXT,
    
    -- For LinkedIn
    linkedin_message_id TEXT,
    linkedin_conversation_id TEXT,
    
    -- For calls/meetings
    call_duration_minutes INTEGER,
    call_recording_url TEXT,
    meeting_notes TEXT,
    
    -- Sender/Recipient
    from_address TEXT,
    to_address TEXT,
    cc_addresses TEXT[],
    bcc_addresses TEXT[],
    
    -- Tracking
    message_id TEXT,           -- Provider message ID (Apollo, SendGrid, etc.)
    thread_id TEXT,            -- For threading conversations
    in_reply_to TEXT,          -- References parent message
    
    -- Engagement metrics
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    
    -- Engagement tracking details
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    last_opened_at TIMESTAMPTZ,
    last_clicked_at TIMESTAMPTZ,
    
    -- Link tracking
    link_clicks JSONB DEFAULT '{}',
    -- e.g., {
    --   "https://calendly.com/demo": {"clicks": 3, "first_clicked_at": "2024-01-15T10:30:00Z"},
    --   "https://case-study.pdf": {"clicks": 1, "first_clicked_at": "2024-01-15T14:20:00Z"}
    -- }
    
    -- Reply details
    reply_body_preview TEXT,
    reply_sentiment TEXT,      -- 'positive', 'neutral', 'negative', 'objection'
    reply_category TEXT,       -- 'interested', 'not_interested', 'timing', 'referral', 'ooo', 'other'
    ai_reply_analysis JSONB DEFAULT '{}',
    -- e.g., {
    --   "sentiment_score": 0.75,
    --   "intent": "interested_but_busy",
    --   "key_points": ["wants demo", "next month"],
    --   "action_items": ["schedule demo for february"],
    --   "objections": ["busy right now"]
    -- }
    
    -- Bounce details
    bounce_reason TEXT,
    bounce_type TEXT,          -- 'hard', 'soft'
    
    -- System/sentiment
    is_automated BOOLEAN DEFAULT true,
    approval_status TEXT DEFAULT 'not_required',  -- 'not_required', 'pending', 'approved', 'rejected'
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    
    -- Error tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Response time tracking
    response_time_hours NUMERIC,  -- Time between our send and their reply
    
    -- Raw data from provider
    raw_provider_data JSONB DEFAULT '{}',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_communications_user_id ON communications(user_id);
CREATE INDEX IF NOT EXISTS idx_communications_prospect_id ON communications(prospect_id);
CREATE INDEX IF NOT EXISTS idx_communications_campaign_id ON communications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_communications_sequence_id ON communications(sequence_id);
CREATE INDEX IF NOT EXISTS idx_communications_channel ON communications(channel);
CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_status_sent ON communications(status) WHERE status = 'sent';
CREATE INDEX IF NOT EXISTS idx_communications_sent_at ON communications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_thread_id ON communications(thread_id);
CREATE INDEX IF NOT EXISTS idx_communications_replied_at ON communications(replied_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_message_id ON communications(message_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_communications_prospect_sent ON communications(prospect_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_campaign_status ON communications(campaign_id, status);

-- GIN indexes
CREATE INDEX IF NOT EXISTS idx_communications_link_clicks ON communications USING GIN(link_clicks);
CREATE INDEX IF NOT EXISTS idx_communications_ai_reply_analysis ON communications USING GIN(ai_reply_analysis);
CREATE INDEX IF NOT EXISTS idx_communications_raw_provider_data ON communications USING GIN(raw_provider_data);
CREATE INDEX IF NOT EXISTS idx_communications_metadata ON communications USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_communications_tags ON communications USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own communications
CREATE POLICY "Users can view own communications" ON communications
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own communications
CREATE POLICY "Users can insert own communications" ON communications
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own communications
CREATE POLICY "Users can update own communications" ON communications
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own communications
CREATE POLICY "Users can delete own communications" ON communications
    FOR DELETE USING (auth.uid()::text = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_communications_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_communications
    BEFORE UPDATE ON communications
    FOR EACH ROW
    EXECUTE FUNCTION update_communications_timestamp();

-- View for conversation threads
CREATE OR REPLACE VIEW conversation_threads AS
WITH thread_summary AS (
    SELECT 
        thread_id,
        prospect_id,
        campaign_id,
        COUNT(*) as message_count,
        COUNT(*) FILTER (WHERE direction = 'inbound') as replies_count,
        COUNT(*) FILTER (WHERE direction = 'outbound') as sends_count,
        MIN(sent_at) as thread_started_at,
        MAX(sent_at) as last_activity_at,
        MAX(sent_at) FILTER (WHERE direction = 'inbound') as last_reply_at
    FROM communications
    WHERE thread_id IS NOT NULL
    GROUP BY thread_id, prospect_id, campaign_id
)
SELECT 
    ts.*,
    p.person_name as prospect_name,
    p.person_email as prospect_email,
    c.name as campaign_name,
    CASE 
        WHEN ts.last_reply_at IS NULL THEN 'awaiting_reply'
        WHEN ts.last_reply_at > (SELECT MAX(sent_at) FROM communications ct WHERE ct.thread_id = ts.thread_id AND ct.direction = 'outbound') 
            THEN 'replied'
        ELSE 'follow_up_sent'
    END as thread_status
FROM thread_summary ts
LEFT JOIN prospects p ON p.id = ts.prospect_id
LEFT JOIN outreach_campaigns c ON c.id = ts.campaign_id;

-- View for engagement metrics by campaign
CREATE OR REPLACE VIEW campaign_engagement_metrics AS
SELECT 
    campaign_id,
    COUNT(*) as total_communications,
    COUNT(*) FILTER (WHERE direction = 'outbound') as total_sent,
    COUNT(*) FILTER (WHERE direction = 'outbound' AND status = 'delivered') as delivered,
    COUNT(*) FILTER (WHERE direction = 'outbound' AND status = 'opened') as opened,
    COUNT(*) FILTER (WHERE direction = 'outbound' AND status = 'clicked') as clicked,
    COUNT(*) FILTER (WHERE direction = 'inbound') as total_replies,
    COUNT(*) FILTER (WHERE direction = 'inbound' AND reply_sentiment = 'positive') as positive_replies,
    COUNT(*) FILTER (WHERE direction = 'inbound' AND reply_category = 'interested') as interested_replies,
    ROUND(COUNT(*) FILTER (WHERE direction = 'outbound' AND status IN ('opened', 'clicked', 'replied')) * 100.0 / NULLIF(COUNT(*) FILTER (WHERE direction = 'outbound' AND status = 'delivered'), 0), 2) as open_rate,
    ROUND(COUNT(*) FILTER (WHERE direction = 'outbound' AND status IN ('clicked', 'replied')) * 100.0 / NULLIF(COUNT(*) FILTER (WHERE direction = 'outbound' AND status = 'opened'), 0), 2) as click_rate,
    ROUND(COUNT(*) FILTER (WHERE direction = 'inbound') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE direction = 'outbound'), 0), 2) as reply_rate
FROM communications
WHERE campaign_id IS NOT NULL
GROUP BY campaign_id;