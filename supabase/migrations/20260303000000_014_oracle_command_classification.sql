-- ================================================================  
-- Migration 014: Add classification columns to oracle_commands
-- For auto-determined task types (no user dropdown)
-- ================================================================

-- Add task type column (matches adzeta_work_queue task_type enum)
ALTER TABLE oracle_commands 
ADD COLUMN IF NOT EXISTS task_type TEXT CHECK (
    task_type IS NULL OR task_type IN (
        'research',
        'analytics', 
        'recommendation',
        'action',
        'proactive_alert'
    )
);

-- Add confidence score column (0-1 scale, 2 decimal places)
ALTER TABLE oracle_commands 
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)
);

-- Add risk level column
ALTER TABLE oracle_commands 
ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (
    risk_level IS NULL OR risk_level IN ('low', 'medium', 'high', 'critical')
);

-- Index for filtering by task type
CREATE INDEX IF NOT EXISTS idx_oracle_commands_task_type 
    ON oracle_commands(task_type) 
    WHERE task_type IS NOT NULL;

-- Index for confidence-based queries
CREATE INDEX IF NOT EXISTS idx_oracle_commands_confidence 
    ON oracle_commands(confidence_score) 
    WHERE confidence_score IS NOT NULL;

-- Index for composite queries (task type + confidence)
CREATE INDEX IF NOT EXISTS idx_oracle_commands_classification 
    ON oracle_commands(task_type, confidence_score)
    WHERE task_type IS NOT NULL AND confidence_score IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN oracle_commands.task_type IS 
    'Auto-classified task type (research/analytics/recommendation/action/proactive_alert)';
COMMENT ON COLUMN oracle_commands.confidence_score IS 
    'Classification confidence (0.00-1.00) - higher = more confident';
COMMENT ON COLUMN oracle_commands.risk_level IS 
    'Risk assessment (low/medium/high/critical) - influences approval requirement';

NOTIFY pgrst, 'reload schema';
