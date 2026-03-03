-- Add user_id to adzeta_work_queue to track who submitted the task
ALTER TABLE adzeta_work_queue
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_adzeta_work_queue_user
  ON adzeta_work_queue(user_id, approval_state);

NOTIFY pgrst, 'reload schema';
