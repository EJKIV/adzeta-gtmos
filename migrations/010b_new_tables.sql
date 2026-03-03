-- ================================================================
-- 010b: New tables (subagent_tasks, work_queue, learning_signals, etc.)
-- ================================================================

CREATE TABLE IF NOT EXISTS subagent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_command_id UUID REFERENCES command_history(id) ON DELETE SET NULL,
    user_id UUID NOT NULL,
    organization_id UUID,
    agent_id TEXT NOT NULL,
    agent_role TEXT,
    agent_model TEXT,
    task_label TEXT NOT NULL,
    task_description TEXT,
    task_mode TEXT DEFAULT 'run',
    task_category TEXT,
    status task_status DEFAULT 'queued',
    priority task_priority DEFAULT 'medium',
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    spawned_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    killed_at TIMESTAMPTZ,
    timeout_at TIMESTAMPTZ,
    result_summary TEXT,
    result_data JSONB DEFAULT '{}',
    output_artifacts JSONB DEFAULT '{}',
    error_message TEXT,
    error_stack TEXT,
    token_usage_input INTEGER,
    token_usage_output INTEGER,
    estimated_cost NUMERIC(10,6),
    steer_commands JSONB DEFAULT '[]',
    was_intervened BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_parent ON subagent_tasks(parent_command_id);
CREATE INDEX IF NOT EXISTS idx_task_user ON subagent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_task_org ON subagent_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_agent ON subagent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_task_status ON subagent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_category ON subagent_tasks(task_category);

CREATE TABLE IF NOT EXISTS work_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type TEXT NOT NULL,
    reference_id UUID,
    user_id UUID,
    organization_id UUID,
    category TEXT,
    priority INTEGER DEFAULT 50,
    status TEXT DEFAULT 'pending',
    assigned_agent TEXT,
    blocked_reason TEXT,
    blocked_since TIMESTAMPTZ,
    unblock_conditions TEXT,
    depends_on UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    deadline_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON work_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_org ON work_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON work_queue(status, priority);

CREATE TABLE IF NOT EXISTS learning_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    organization_id UUID,
    session_key TEXT,
    signal_type learning_signal_type NOT NULL,
    subject_type TEXT,
    subject_id UUID,
    agent_id TEXT,
    agent_role TEXT,
    duration_ms INTEGER,
    feedback_text TEXT,
    correction_data JSONB,
    proposed_better_response TEXT,
    rating_value INTEGER,
    categories TEXT[],
    source TEXT,
    metadata JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    learned_adjustment JSONB,
    training_batch_id UUID,
    model_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learn_user ON learning_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_learn_org ON learning_signals(organization_id);
CREATE INDEX IF NOT EXISTS idx_learn_type ON learning_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_learn_processed ON learning_signals(processed);
CREATE INDEX IF NOT EXISTS idx_learn_batch ON learning_signals(training_batch_id);

CREATE TABLE IF NOT EXISTS agent_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    agent_role TEXT,
    memory_key TEXT NOT NULL,
    memory_value JSONB NOT NULL DEFAULT '{}',
    memory_type TEXT DEFAULT 'state',
    scope TEXT DEFAULT 'agent',
    scope_id TEXT,
    user_id UUID,
    organization_id UUID,
    expires_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, memory_key, scope, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_agent ON agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_user ON agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_org ON agent_memories(organization_id);
CREATE INDEX IF NOT EXISTS idx_memory_expires ON agent_memories(expires_at) WHERE expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_orchestrator_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    organization_id UUID,
    response_length TEXT DEFAULT 'concise',
    response_tone TEXT DEFAULT 'direct',
    include_metadata BOOLEAN DEFAULT false,
    autonomy_level TEXT DEFAULT 'medium',
    confirm_before_spawn BOOLEAN DEFAULT false,
    confirm_before_external BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'America/New_York',
    working_hours_start TEXT DEFAULT '09:00',
    working_hours_end TEXT DEFAULT '17:00',
    preferred_agents JSONB DEFAULT '{}',
    feature_weights JSONB DEFAULT '{}',
    common_patterns JSONB DEFAULT '{}',
    positive_signals INTEGER DEFAULT 0,
    negative_signals INTEGER DEFAULT 0,
    correction_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prefs_user ON user_orchestrator_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_prefs_org ON user_orchestrator_preferences(organization_id);

CREATE TABLE IF NOT EXISTS session_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_key TEXT NOT NULL UNIQUE,
    user_id UUID,
    organization_id UUID,
    current_focus TEXT,
    active_project TEXT,
    pending_items JSONB DEFAULT '[]',
    recent_commands JSONB DEFAULT '[]',
    recent_agents JSONB DEFAULT '[]',
    working_memory JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    command_count INTEGER DEFAULT 0,
    agent_spawn_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_session_user ON session_context(user_id);
CREATE INDEX IF NOT EXISTS idx_session_org ON session_context(organization_id);
CREATE INDEX IF NOT EXISTS idx_session_active ON session_context(last_active_at);

NOTIFY pgrst, 'reload schema';
