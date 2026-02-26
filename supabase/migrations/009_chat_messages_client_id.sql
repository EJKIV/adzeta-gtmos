-- ==========================================
-- Add client_id to chat_messages for feedback continuity
-- ==========================================
-- Client-generated IDs (cmd-xxx, res-xxx) need to survive DB round-trips
-- so feedback keyed by message_client_id remains valid after session reload.

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS client_id TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_messages_client_id ON chat_messages(client_id);
