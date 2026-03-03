-- ================================================================
-- Migration 011: Command notifications table for orchestrator polling
-- ================================================================

-- ==========================================
-- command_notifications
-- ==========================================

CREATE TABLE IF NOT EXISTS command_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id UUID NOT NULL REFERENCES command_history(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('command_created', 'command_updated', 'command_completed', 'command_failed', 'command_cancelled')),
    
    -- Processing state
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    processed_by TEXT, -- agent ID that processed this notification
    
    -- Retry tracking
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    
    -- Additional context
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient polling
CREATE INDEX IF NOT EXISTS idx_command_notifications_unprocessed 
    ON command_notifications(processed, created_at) 
    WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_command_notifications_command_id 
    ON command_notifications(command_id);

CREATE INDEX IF NOT EXISTS idx_command_notifications_created_at 
    ON command_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_command_notifications_next_retry 
    ON command_notifications(next_retry_at) 
    WHERE processed = false AND attempts < max_attempts;

-- Row Level Security
ALTER TABLE command_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "System can view all notifications" ON command_notifications
    FOR SELECT USING (true);

CREATE POLICY "System can insert notifications" ON command_notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update notifications" ON command_notifications
    FOR UPDATE USING (true);

-- Auto-update updated_at
CREATE TRIGGER trigger_update_command_notifications
    BEFORE UPDATE ON command_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Views for orchestrator polling
-- ==========================================

-- View for pending notifications (what Zetty polls)
CREATE OR REPLACE VIEW pending_command_notifications AS
SELECT 
    n.id as notification_id,
    n.command_id,
    n.event_type,
    n.attempts,
    n.metadata,
    n.created_at as notification_created_at,
    c.user_id,
    c.raw_command,
    c.intent_category,
    c.intent_confidence,
    c.status as command_status,
    c.routing_decision_data,
    c.received_at
FROM command_notifications n
JOIN command_history c ON n.command_id = c.id
WHERE n.processed = false
  AND n.attempts < n.max_attempts
  AND (n.next_retry_at IS NULL OR n.next_retry_at < NOW())
ORDER BY n.created_at ASC;

-- ==========================================
-- Function to mark notification as processed
-- ==========================================

CREATE OR REPLACE FUNCTION mark_notification_processed(
    p_notification_id UUID,
    p_processor_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_affected INTEGER;
BEGIN
    UPDATE command_notifications
    SET 
        processed = true,
        processed_at = NOW(),
        processed_by = p_processor_id,
        attempts = attempts + 1
    WHERE id = p_notification_id
      AND processed = false;
    
    GET DIAGNOSTICS v_affected = ROW_COUNT;
    RETURN v_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Function to increment retry with backoff
-- ==========================================

CREATE OR REPLACE FUNCTION increment_notification_retry(
    p_notification_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_notification RECORD;
    v_backoff_minutes INTEGER;
BEGIN
    -- Get current notification
    SELECT * INTO v_notification 
    FROM command_notifications 
    WHERE id = p_notification_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Exponential backoff: 1min, 2min, 4min
    v_backoff_minutes := POWER(2, v_notification.attempts);
    
    UPDATE command_notifications
    SET 
        attempts = attempts + 1,
        next_retry_at = NOW() + (v_backoff_minutes || ' minutes')::INTERVAL
    WHERE id = p_notification_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Notify schema refresh
-- ==========================================

NOTIFY pgrst, 'reload schema';
