-- ================================================================
-- 011: Task Feedback Table
-- Stores inline task completion feedback with star ratings
-- ================================================================

-- Create enum for feedback source types (optional, could add later)
-- CREATE TYPE feedback_source_type AS ENUM ('webapp', 'mobile', 'extension', 'api');

CREATE TABLE IF NOT EXISTS task_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    worked_well TEXT,
    improvement TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    source TEXT DEFAULT 'webapp',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_task_feedback_task_id ON task_feedback(task_id);
CREATE INDEX IF NOT EXISTS idx_task_feedback_user_id ON task_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_task_feedback_rating ON task_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_task_feedback_timestamp ON task_feedback(timestamp);
CREATE INDEX IF NOT EXISTS idx_task_feedback_processed ON task_feedback(processed, created_at) WHERE processed = false;

-- View for calculating average rating by task
CREATE OR REPLACE VIEW task_feedback_summary AS
SELECT
    task_id,
    COUNT(*) as total_responses,
    AVG(rating) as avg_rating,
    MIN(rating) as min_rating,
    MAX(rating) as max_rating,
    COUNT(*) FILTER (WHERE rating = 5) as five_star_count,
    COUNT(*) FILTER (WHERE rating = 4) as four_star_count,
    COUNT(*) FILTER (WHERE rating = 3) as three_star_count,
    COUNT(*) FILTER (WHERE rating = 2) as two_star_count,
    COUNT(*) FILTER (WHERE rating = 1) as one_star_count,
    COUNT(*) FILTER (WHERE rating >= 4) as positive_ratings,
    ROUND(
        (COUNT(*) FILTER (WHERE rating >= 4)::numeric / COUNT(*)::numeric) * 100, 
        2
    ) as satisfaction_rate
FROM task_feedback
GROUP BY task_id;

-- Function to get user's feedback for a task
CREATE OR REPLACE FUNCTION get_user_task_feedback(p_task_id TEXT, p_user_id UUID)
RETURNS TABLE (
    id UUID,
    rating INTEGER,
    worked_well TEXT,
    improvement TEXT,
    timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tf.id,
        tf.rating,
        tf.worked_well,
        tf.improvement,
        tf.timestamp,
        tf.created_at
    FROM task_feedback tf
    WHERE tf.task_id = p_task_id
      AND tf.user_id = p_user_id
    ORDER BY tf.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE task_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own feedback
CREATE POLICY task_feedback_select_own ON task_feedback
    FOR SELECT
    USING (user_id = auth.uid() OR auth.check_organization_membership((SELECT organization_id FROM command_history WHERE id = task_id::uuid LIMIT 1)));

-- Users can insert their own feedback
CREATE POLICY task_feedback_insert_own ON task_feedback
    FOR INSERT
    WITH CHECK (
        (user_id IS NULL OR user_id = auth.uid()) AND
        NOT EXISTS (
            SELECT 1 FROM task_feedback 
            WHERE task_id = NEW.task_id 
              AND user_id = auth.uid()
              AND created_at > NOW() - INTERVAL '1 minute'
        )
    );

-- Admins can view all feedback
CREATE POLICY task_feedback_admin ON task_feedback
    FOR ALL
    USING (auth.check_organization_membership((SELECT organization_id FROM auth.users WHERE id = auth.uid())));

-- Comment explaining the table
COMMENT ON TABLE task_feedback IS 
'Task completion feedback collected inline in chat threads. Stores 1-5 star ratings with optional text feedback. Used to measure user confidence (target avg >4.2/5). Auto-retry on submission failure supported via client-side localStorage.';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
