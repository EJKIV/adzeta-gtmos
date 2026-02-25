-- Migration: Create outreach_sequences table
-- Multi-step email and touch point sequences

-- Sequence step type enum
CREATE TYPE sequence_step_type AS ENUM ('email', 'linkedin_connect', 'linkedin_message', 'call_task', 'wait', 'manual_task');

-- Sequence status enum
CREATE TYPE sequence_status AS ENUM ('draft', 'active', 'paused', 'archived');

CREATE TABLE IF NOT EXISTS outreach_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    
    -- Sequence basics
    name TEXT NOT NULL,
    description TEXT,
    status sequence_status DEFAULT 'draft',
    
    -- Steps configuration (ordered JSON array)
    steps JSONB DEFAULT '[]',
    -- e.g., [
    --   {
    --     "step_number": 1,
    --     "step_type": "email",
    --     "delay_hours": 0,
    --     "subject": "Quick question about {{company}}'s sales process",
    --     "body_template": "Hi {{first_name}}...",
    --     "personalization_tokens": ["first_name", "company", "title"]
    --   },
    --   {
    --     "step_number": 2,
    --     "step_type": "wait",
    --     "delay_hours": 72
    --   },
    --   {
    --     "step_number": 3,
    --     "step_type": "email",
    --     "delay_hours": 0,
    --     "subject": "Following up: {{company}}'s sales process",
    --     "body_template": "Hi {{first_name}}, just following up...",
    --     "condition": "no_reply_and_not_opened"
    --   }
    -- ]
    
    -- Template variables reference
    available_variables JSONB DEFAULT '{}',
    -- e.g., {
    --   "person": ["first_name", "last_name", "title", "company"],
    --   "company": ["name", "industry", "size", "location"],
    --   "custom": ["sender_name", "sender_title", "calendar_link"]
    -- }
    
    -- Sequence metrics
    total_steps INTEGER DEFAULT 0,
    expected_duration_hours INTEGER, -- Calculated from steps
    
    -- Variant for A/B testing
    is_variant BOOLEAN DEFAULT false,
    parent_sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE SET NULL,
    variant_name TEXT,
    -- e.g., "control", "short_subject", "personalized_opening"
    
    -- Performance tracking
    performance_metrics JSONB DEFAULT '{}',
    -- e.g., {
    --   "times_used": 15,
    --   "avg_reply_rate": 0.18,
    --   "best_performing_step": 3,
    --   "reply_by_step": {"1": 0.05, "2": 0.08, "3": 0.05}
    -- }
    
    -- Content tags
    tags TEXT[] DEFAULT '{}',
    category TEXT,
    -- e.g., "cold_outreach", "warm_intro", "follow_up", "event_invite"
    
    -- Settings
    settings JSONB DEFAULT '{}',
    -- e.g., {
    --   "exit_on_reply": true,
    --   "exit_on_meeting": true,
    --   "track_email_opens": true,
    --   "track_link_clicks": true,
    --   "stop_on_bounce": true,
    --   "max_follow_ups": 5
    -- }
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_user_id ON outreach_sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_status ON outreach_sequences(status);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_user_status ON outreach_sequences(user_id, status);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_is_variant ON outreach_sequences(is_variant);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_parent_sequence_id ON outreach_sequences(parent_sequence_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_category ON outreach_sequences(category);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_created_at ON outreach_sequences(created_at DESC);

-- GIN indexes for JSONB arrays
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_steps ON outreach_sequences USING GIN(steps);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_tags ON outreach_sequences USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_performance_metrics ON outreach_sequences USING GIN(performance_metrics);

-- Enable Row Level Security
ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own sequences
CREATE POLICY "Users can view own sequences" ON outreach_sequences
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own sequences
CREATE POLICY "Users can insert own sequences" ON outreach_sequences
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.uid()::text = 'system');

-- Policy: Users can update their own sequences
CREATE POLICY "Users can update own sequences" ON outreach_sequences
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own sequences
CREATE POLICY "Users can delete own sequences" ON outreach_sequences
    FOR DELETE USING (auth.uid()::text = user_id);

-- Trigger to update updated_at and calculate step count
CREATE OR REPLACE FUNCTION update_outreach_sequences()
RETURNS TRIGGER AS $$
DECLARE
    total_duration INTEGER := 0;
BEGIN
    NEW.updated_at = NOW();
    
    -- Calculate total steps
    NEW.total_steps = jsonb_array_length(NEW.steps);
    
    -- Calculate expected duration by summing delay_hours from all non-email steps
    -- and adding reasonable estimate for email steps
    SELECT COALESCE(SUM((step->>'delay_hours')::integer), 0)
    INTO total_duration
    FROM jsonb_array_elements(NEW.steps) AS step;
    
    NEW.expected_duration_hours := total_duration;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_outreach_sequences
    BEFORE INSERT OR UPDATE ON outreach_sequences
    FOR EACH ROW
    EXECUTE FUNCTION update_outreach_sequences();

-- Insert default sequences for new users
CREATE OR REPLACE FUNCTION create_default_sequences()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a basic cold outreach sequence
    INSERT INTO outreach_sequences (
        user_id,
        name,
        description,
        status,
        category,
        steps,
        available_variables
    ) VALUES (
        NEW.user_id,
        'Basic Cold Outreach (3-touch)',
        'Standard 3-email sequence with professional tone',
        'draft',
        'cold_outreach',
        '[
            {
                "step_number": 1,
                "step_type": "email",
                "delay_hours": 0,
                "subject": "Quick question about {{company}}",
                "body_template": "Hi {{first_name}},\n\nI noticed {{company}} is growing fast in the {{industry}} space. I help companies like yours streamline their go-to-market operations.\n\nWorth a brief conversation?\n\nBest,\n{{sender_name}}",
                "personalization_tokens": ["first_name", "company", "industry", "sender_name"]
            },
            {
                "step_number": 2,
                "step_type": "wait",
                "delay_hours": 72
            },
            {
                "step_number": 3,
                "step_type": "email",
                "delay_hours": 0,
                "subject": "Following up: {{company}}",
                "body_template": "Hi {{first_name}},\n\nJust following up on my note about helping {{company}} with GTM operations.\n\nI recently helped a similar {{industry}} company increase their sales velocity by 40%.\n\nOpen to a quick call?\n\nBest,\n{{sender_name}}",
                "personalization_tokens": ["first_name", "company", "industry", "sender_name"],
                "condition": "no_reply"
            },
            {
                "step_number": 4,
                "step_type": "wait",
                "delay_hours": 96
            },
            {
                "step_number": 5,
                "step_type": "email",
                "delay_hours": 0,
                "subject": "Should I close your file?",
                "body_template": "Hi {{first_name}},\n\nI haven't heard back, so I'll assume now isn't the right time.\n\nIf things change and you'd like to explore how we can help {{company}}, just reply and I'll send over some relevant case studies.\n\nBest,\n{{sender_name}}",
                "personalization_tokens": ["first_name", "company", "sender_name"],
                "condition": "no_reply"
            }
        ]'::jsonb,
        '{
            "person": ["first_name", "last_name", "title", "company"],
            "company": ["name", "industry", "size"],
            "custom": ["sender_name", "sender_title"]
        }'::jsonb
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: We won't attach this trigger automatically to avoid side effects
-- It can be called manually or attached to a user onboarding flow

-- View for popular sequences
CREATE OR REPLACE VIEW popular_sequences AS
SELECT 
    s.*,
    (s.performance_metrics->>'times_used')::integer as usage_count,
    (s.performance_metrics->>'avg_reply_rate')::numeric as avg_reply_rate
FROM outreach_sequences s
WHERE (s.performance_metrics->>'times_used')::integer > 5
ORDER BY (s.performance_metrics->>'avg_reply_rate')::numeric DESC;