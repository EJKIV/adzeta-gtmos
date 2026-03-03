-- Task Progress Tracking Table
-- Stores real-time progress for long-running tasks and subagents

CREATE TABLE IF NOT EXISTS task_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL UNIQUE,
  run_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'running', 'completed', 'failed', 'cancelled')),
  current_step INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 0,
  percent_complete INTEGER NOT NULL DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
  message TEXT NOT NULL DEFAULT 'Task initialized',
  agent_label TEXT NOT NULL DEFAULT 'unknown',
  subtasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_task_id TEXT REFERENCES task_progress(task_id) ON DELETE SET NULL,
  error_message TEXT,
  estimated_duration_ms INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_task_progress_task_id ON task_progress(task_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_status ON task_progress(status);
CREATE INDEX IF NOT EXISTS idx_task_progress_updated_at ON task_progress(updated_at);
CREATE INDEX IF NOT EXISTS idx_task_progress_expires_at ON task_progress(expires_at);
CREATE INDEX IF NOT EXISTS idx_task_progress_parent ON task_progress(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Function to auto-delete expired records
CREATE OR REPLACE FUNCTION cleanup_expired_progress()
RETURNS void AS $$
BEGIN
  DELETE FROM task_progress WHERE expires_at < now() OR (status IN ('completed', 'failed', 'cancelled') AND updated_at < now() - interval '1 hour');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-cleanup on insert (run periodically via cron or manually)
-- Could also use pg_cron extension if available

-- Row Level Security (RLS) policies
ALTER TABLE task_progress ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read progress
CREATE POLICY task_progress_select_policy
  ON task_progress
  FOR SELECT
  USING (true);

-- Allow service role to insert/update progress
CREATE POLICY task_progress_insert_policy
  ON task_progress
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY task_progress_update_policy
  ON task_progress
  FOR UPDATE
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE task_progress IS 'Real-time task progress tracking for long-running operations';
COMMENT ON COLUMN task_progress.task_id IS 'Unique identifier for the task (command ID or work queue item ID)';
COMMENT ON COLUMN task_progress.run_id IS 'Unique run identifier for this execution';
COMMENT ON COLUMN task_progress.subtasks IS 'JSON array of subtask progress records';
COMMENT ON COLUMN task_progress.expires_at IS 'Record expiration time for cleanup (default 1 hour after update)';
