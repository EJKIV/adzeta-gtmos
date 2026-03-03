-- ================================================================
-- 010c: RLS policies, views, and utility functions
-- ================================================================

-- Enable RLS on new tables
ALTER TABLE subagent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_orchestrator_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_context ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION is_org_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = check_user_id
        AND role IN ('admin', 'employee')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Command History: add new policies (drop old ones first to avoid conflicts)
DROP POLICY IF EXISTS "Admins can view org commands" ON command_history;
DROP POLICY IF EXISTS "Service can insert commands" ON command_history;

CREATE POLICY "Admins can view org commands" ON command_history
    FOR SELECT USING (is_org_admin(auth.uid()));

CREATE POLICY "Service can insert commands" ON command_history
    FOR INSERT WITH CHECK (true);

-- Subagent Tasks Policies
CREATE POLICY "Users can view own tasks" ON subagent_tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view org tasks" ON subagent_tasks
    FOR SELECT USING (is_org_admin(auth.uid()));

-- Work Queue Policies
CREATE POLICY "Users can view org queue" ON work_queue
    FOR SELECT USING (true);

-- Learning Signals Policies
CREATE POLICY "Users can view own signals" ON learning_signals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view org signals" ON learning_signals
    FOR SELECT USING (is_org_admin(auth.uid()));

CREATE POLICY "Service can insert signals" ON learning_signals
    FOR INSERT WITH CHECK (true);

-- Agent Memories Policies
CREATE POLICY "Users can view own memories" ON agent_memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage memories" ON agent_memories
    FOR ALL USING (true);

-- Preferences Policies
CREATE POLICY "Users can manage own preferences" ON user_orchestrator_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Session Policies
CREATE POLICY "Users can view own sessions" ON session_context
    FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- Views
-- ==========================================

CREATE OR REPLACE VIEW rlhf_training_dataset AS
SELECT
    ch.id as command_id,
    ch.raw_command,
    ch.user_visible_response as generated_output,
    ch.routing_decision_data,
    ch.intent_category,
    ch.intent_confidence,
    ls.signal_type,
    ls.feedback_text,
    ls.proposed_better_response,
    ls.correction_data,
    ch.user_feedback_rating,
    ch.rlhf_training_eligible,
    ch.completed_at
FROM command_history ch
LEFT JOIN learning_signals ls ON ch.id = ls.subject_id
WHERE ch.rlhf_training_eligible = true
  AND ch.completed_at > NOW() - INTERVAL '30 days'
ORDER BY ch.completed_at DESC;

CREATE OR REPLACE VIEW agent_performance_metrics AS
SELECT
    st.agent_id,
    st.agent_role,
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE st.status = 'completed') as completed,
    COUNT(*) FILTER (WHERE st.status = 'failed') as failed,
    COUNT(*) FILTER (WHERE st.was_intervened = true) as intervened_count,
    ROUND(100.0 * COUNT(*) FILTER (WHERE st.status = 'completed') / NULLIF(COUNT(*), 0), 2) as success_rate,
    AVG(EXTRACT(EPOCH FROM (st.completed_at - st.started_at))) FILTER (WHERE st.completed_at IS NOT NULL AND st.started_at IS NOT NULL) as avg_duration_seconds,
    SUM(st.estimated_cost) as total_cost,
    AVG(CASE WHEN ls.signal_type = 'explicit_positive' THEN 1.0 ELSE 0.0 END) FILTER (WHERE ls.signal_type IS NOT NULL) as positive_feedback_rate,
    COUNT(*) FILTER (WHERE ls.signal_type IS NOT NULL) as feedback_count
FROM subagent_tasks st
LEFT JOIN learning_signals ls ON st.id = ls.subject_id
WHERE st.created_at > NOW() - INTERVAL '30 days'
GROUP BY st.agent_id, st.agent_role
ORDER BY total_tasks DESC;

CREATE OR REPLACE VIEW command_flow_analytics AS
SELECT
    DATE_TRUNC('hour', ch.received_at) as hour,
    ch.intent_category,
    ch.routed_to_agent,
    ch.routed_to_agent_role,
    COUNT(*) as command_count,
    AVG(ch.duration_ms) FILTER (WHERE ch.duration_ms IS NOT NULL) as avg_duration_ms,
    AVG(ch.user_feedback_rating) FILTER (WHERE ch.user_feedback_rating IS NOT NULL) as avg_rating,
    COUNT(*) FILTER (WHERE ch.status = 'failed') as failed_count
FROM command_history ch
WHERE ch.received_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', ch.received_at), ch.intent_category, ch.routed_to_agent, ch.routed_to_agent_role
ORDER BY hour DESC, command_count DESC;

CREATE OR REPLACE VIEW work_queue_status AS
SELECT
    status,
    category,
    assigned_agent,
    COUNT(*) as item_count,
    MIN(created_at) as oldest_item,
    COUNT(*) FILTER (WHERE deadline_at < NOW()) as overdue_count
FROM work_queue
GROUP BY status, category, assigned_agent;

-- ==========================================
-- Utility Functions
-- ==========================================

CREATE OR REPLACE FUNCTION log_command(
    p_user_id UUID,
    p_session_key TEXT,
    p_raw_command TEXT,
    p_source command_source DEFAULT 'webchat'
)
RETURNS UUID AS $$
DECLARE
    cmd_id UUID;
BEGIN
    INSERT INTO command_history (user_id, session_key, raw_command, source, status)
    VALUES (p_user_id, p_session_key, p_raw_command, p_source, 'pending')
    RETURNING id INTO cmd_id;
    RETURN cmd_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION complete_command(
    p_command_id UUID,
    p_status command_status,
    p_result_summary TEXT DEFAULT NULL,
    p_result_data JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
    UPDATE command_history
    SET status = p_status,
        result_summary = COALESCE(p_result_summary, result_summary),
        result_data = result_data || p_result_data,
        completed_at = NOW(),
        duration_ms = EXTRACT(EPOCH FROM (NOW() - received_at)) * 1000
    WHERE id = p_command_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION queue_work(
    p_item_type TEXT,
    p_category TEXT,
    p_user_id UUID DEFAULT NULL,
    p_priority INTEGER DEFAULT 50,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    item_id UUID;
BEGIN
    INSERT INTO work_queue (item_type, category, user_id, priority, metadata)
    VALUES (p_item_type, p_category, p_user_id, p_priority, p_metadata)
    RETURNING id INTO item_id;
    RETURN item_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_for_rlhf(p_command_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE command_history
    SET rlhf_training_eligible = true
    WHERE id = p_command_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_learning_signal(
    p_user_id UUID,
    p_signal_type learning_signal_type,
    p_subject_id UUID,
    p_feedback_text TEXT DEFAULT NULL,
    p_better_response TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO learning_signals (
        user_id, signal_type, subject_id,
        feedback_text, proposed_better_response
    ) VALUES (
        p_user_id, p_signal_type, p_subject_id,
        p_feedback_text, p_better_response
    );
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';
