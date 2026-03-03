-- ================================================================  
-- Migration 014b: Add classification columns to command_history
-- For auto-determined task types from query classification
-- ================================================================

-- Add task type column
ALTER TABLE command_history 
ADD COLUMN IF NOT EXISTS task_type TEXT CHECK (
    task_type IS NULL OR task_type IN (
        'research',
        'analytics', 
        'recommendation',
        'action',
        'proactive_alert'
    )
);

-- Add confidence score column
ALTER TABLE command_history 
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)
);

-- Add risk level column
ALTER TABLE command_history 
ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (
    risk_level IS NULL OR risk_level IN ('low', 'medium', 'high', 'critical')
);

-- Index for filtering by classification
CREATE INDEX IF NOT EXISTS idx_command_history_task_type 
    ON command_history(task_type) 
    WHERE task_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_command_history_risk_level 
    ON command_history(risk_level) 
    WHERE risk_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_command_history_classification 
    ON command_history(task_type, risk_level)
    WHERE task_type IS NOT NULL AND risk_level IS NOT NULL;

NOTIFY pgrst, 'reload schema';
