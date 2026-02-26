-- ==========================================
-- Chat Message Feedback (for training analysis)
-- ==========================================

CREATE TABLE IF NOT EXISTS chat_message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  message_client_id TEXT NOT NULL,
  rating VARCHAR(10) NOT NULL CHECK (rating IN ('positive', 'negative')),
  comment TEXT,
  user_query TEXT,
  ai_output JSONB,
  skill_id VARCHAR(100),
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(message_client_id, user_id)
);

CREATE INDEX idx_feedback_session ON chat_message_feedback(session_id);
CREATE INDEX idx_feedback_user ON chat_message_feedback(user_id);
CREATE INDEX idx_feedback_rating ON chat_message_feedback(rating);
CREATE INDEX idx_feedback_skill ON chat_message_feedback(skill_id);
CREATE INDEX idx_feedback_created ON chat_message_feedback(created_at DESC);

-- RLS
ALTER TABLE chat_message_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback in own sessions"
  ON chat_message_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_message_feedback.session_id
        AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert feedback in own sessions"
  ON chat_message_feedback FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_message_feedback.session_id
        AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own feedback"
  ON chat_message_feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_message_feedback.session_id
        AND chat_sessions.user_id = auth.uid()
    )
  );

COMMENT ON TABLE chat_message_feedback IS 'User thumbs-up/down feedback on AI responses for training analysis';
