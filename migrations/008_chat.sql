-- ================================================================
-- Migration 008: Chat system
-- Chat sessions, messages, and feedback for AI conversations
-- ================================================================

-- ==========================================
-- chat_sessions
-- ==========================================

CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New chat',
    context_type TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_archived ON chat_sessions(is_archived);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions(updated_at DESC);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON chat_sessions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own sessions" ON chat_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own sessions" ON chat_sessions
    FOR UPDATE USING (auth.uid()::text = user_id);

-- ==========================================
-- chat_messages
-- ==========================================

DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('user', 'assistant', 'system', 'tool_result', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    client_id TEXT,
    type message_type NOT NULL,
    text TEXT NOT NULL,
    output JSONB DEFAULT NULL,
    tokens_used INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_id ON chat_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_output ON chat_messages USING GIN(output);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view session messages" ON chat_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid()::text)
    );

CREATE POLICY "Users can insert session messages" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid()::text)
    );

-- Auto-update session timestamp on new message
CREATE OR REPLACE FUNCTION update_chat_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_sessions SET updated_at = NOW() WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_on_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_chat_session_timestamp();

-- ==========================================
-- chat_message_feedback
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_client_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_session ON chat_message_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON chat_message_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON chat_message_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_skill ON chat_message_feedback(skill_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON chat_message_feedback(created_at DESC);

ALTER TABLE chat_message_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback in own sessions" ON chat_message_feedback
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_message_feedback.session_id AND chat_sessions.user_id = auth.uid()::text)
    );

CREATE POLICY "Users can insert feedback in own sessions" ON chat_message_feedback
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_message_feedback.session_id AND chat_sessions.user_id = auth.uid()::text)
    );

CREATE POLICY "Users can update own feedback" ON chat_message_feedback
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_message_feedback.session_id AND chat_sessions.user_id = auth.uid()::text)
    );
