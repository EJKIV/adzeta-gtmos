-- Migration: Create healing_events table
-- Tracks self-healing attempts for failed autonomous tasks

CREATE TABLE IF NOT EXISTS healing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  task_id UUID REFERENCES autonomous_tasks(id) ON DELETE CASCADE,
  error_id TEXT,
  status TEXT CHECK (status IN ('pending', 'retrying', 'healed', 'escalated', 'failed')) DEFAULT 'pending',
  strategy TEXT,
  attempts JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_healing_events_status ON healing_events(status);
CREATE INDEX IF NOT EXISTS idx_healing_events_task ON healing_events(task_id);
CREATE INDEX IF NOT EXISTS idx_healing_events_user ON healing_events(user_id);

-- Enable Row Level Security
ALTER TABLE healing_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own healing events
CREATE POLICY "Users can view own healing events" ON healing_events
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: System can create healing events
CREATE POLICY "System can create healing events" ON healing_events
    FOR INSERT WITH CHECK (true);

-- Policy: System can update healing events
CREATE POLICY "System can update healing events" ON healing_events
    FOR UPDATE USING (true);
