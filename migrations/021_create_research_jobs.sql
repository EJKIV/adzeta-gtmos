-- Migration: Create research_jobs table
-- Queue for research tasks with Apollo.io integration

-- Research job status enum
CREATE TYPE research_job_status AS ENUM ('pending', 'queued', 'active', 'paused', 'completed', 'failed', 'cancelled');

CREATE TABLE IF NOT EXISTS research_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    
    -- Job definition
    job_type TEXT NOT NULL CHECK (job_type IN ('prospect_search', 'person_enrich', 'company_enrich', 'technographic_scan')),
    status research_job_status DEFAULT 'pending',
    
    -- Search criteria (for prospect search jobs)
    search_criteria JSONB DEFAULT '{}',
    -- e.g., {
    --   "person_titles": ["VP Sales", "Head of Revenue"],
    --   "industry": "fintech",
    --   "company_size": "51-200",
    --   "count": 50
    -- }
    
    -- Target for enrichment jobs
    enrichment_target TEXT,
    -- email for person_enrich, domain for company_enrich/technographic_scan
    
    -- Metadata
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    estimated_results INTEGER,
    
    -- Progress tracking
    total_requests INTEGER,
    completed_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    
    -- Results
    results_summary JSONB DEFAULT '{}',
    -- {
    --   "prospects_found": 50,
    --   "enriched": 45,
    --   "failed": 5,
    --   "avg_confidence": 0.92
    -- }
    
    -- Error tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    last_error_at TIMESTAMPTZ,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_completion TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_research_jobs_user_id ON research_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_research_jobs_status ON research_jobs(status);
CREATE INDEX IF NOT EXISTS idx_research_jobs_job_type ON research_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_research_jobs_user_status ON research_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_research_jobs_created_at ON research_jobs(created_at DESC);

-- GIN index for flexible metadata queries
CREATE INDEX IF NOT EXISTS idx_research_jobs_search_criteria ON research_jobs USING GIN(search_criteria);
CREATE INDEX IF NOT EXISTS idx_research_jobs_results_summary ON research_jobs USING GIN(results_summary);

-- Enable Row Level Security
ALTER TABLE research_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own research jobs
CREATE POLICY "Users can view own research jobs" ON research_jobs
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own research jobs
CREATE POLICY "Users can insert own research jobs" ON research_jobs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own research jobs
CREATE POLICY "Users can update own research jobs" ON research_jobs
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own research jobs
CREATE POLICY "Users can delete own research jobs" ON research_jobs
    FOR DELETE USING (auth.uid()::text = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_research_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_research_jobs
    BEFORE UPDATE ON research_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_research_jobs_updated_at();

-- View for active jobs (useful for monitoring)
CREATE OR REPLACE VIEW active_research_jobs AS
SELECT * FROM research_jobs
WHERE status IN ('pending', 'queued', 'active')
ORDER BY priority DESC, created_at ASC;