-- ================================================================
-- Migration 003: Prospects & Research Jobs
-- Core prospect data with full-text search, and async research queue
-- ================================================================

-- ==========================================
-- prospects
-- ==========================================

CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Company Information
    company_name VARCHAR(255) NOT NULL,
    company_domain VARCHAR(255),
    company_industry VARCHAR(100),
    company_size VARCHAR(50),
    company_annual_revenue VARCHAR(50),
    company_funding_stage VARCHAR(50),
    company_funding_amount DECIMAL(15, 2),
    company_location VARCHAR(255),
    company_website VARCHAR(255),
    company_linkedin_url VARCHAR(255),
    company_description TEXT,
    company_tech_stack JSONB DEFAULT '[]'::jsonb,

    -- Contact Information
    contact_first_name VARCHAR(100),
    contact_last_name VARCHAR(100),
    contact_title VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_linkedin_url VARCHAR(255),
    contact_department VARCHAR(100),
    contact_seniority VARCHAR(50),

    -- Quality & Scoring
    quality_score CHAR(1) CHECK (quality_score IN ('A', 'B', 'C', 'D', 'E', 'F')),
    fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
    intent_score INTEGER CHECK (intent_score >= 0 AND intent_score <= 100),
    engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),

    -- Signal Detection
    signals JSONB DEFAULT '[]'::jsonb,
    signal_count INTEGER DEFAULT 0,
    last_signal_at TIMESTAMPTZ,

    -- Enrichment Data
    enrichment_source VARCHAR(50),
    enrichment_data JSONB DEFAULT '{}'::jsonb,
    enriched_at TIMESTAMPTZ,

    -- Status & Campaign
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'qualified', 'contacted', 'engaged', 'opportunity', 'nurture', 'unqualified', 'blacklisted')),
    assigned_to UUID,
    campaign_id UUID,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    CONSTRAINT valid_email CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT unique_company_contact UNIQUE (company_domain, contact_email)
);

CREATE INDEX IF NOT EXISTS idx_prospects_quality_score ON prospects(quality_score);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_industry ON prospects(company_industry);
CREATE INDEX IF NOT EXISTS idx_prospects_funding_stage ON prospects(company_funding_stage);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON prospects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_signals ON prospects USING GIN(signals);
CREATE INDEX IF NOT EXISTS idx_prospects_tech_stack ON prospects USING GIN(company_tech_stack);
CREATE INDEX IF NOT EXISTS idx_prospects_campaign ON prospects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospects_assigned ON prospects(assigned_to);

-- Full-text search
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(company_name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(company_industry, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(contact_first_name, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(contact_last_name, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(contact_title, '')), 'D')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_prospects_search ON prospects USING GIN(search_vector);

CREATE TRIGGER update_prospects_updated_at
    BEFORE UPDATE ON prospects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view prospects" ON prospects
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert prospects" ON prospects
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update prospects" ON prospects
    FOR UPDATE TO authenticated USING (true);

-- ==========================================
-- research_jobs
-- ==========================================

CREATE TABLE IF NOT EXISTS research_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Job Configuration
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'prospect_search', 'company_enrichment', 'bulk_import',
        'signal_detection', 'list_building', 'data_cleansing', 'competitor_research'
    )),

    -- Search Parameters
    search_params JSONB DEFAULT '{}'::jsonb,
    sources JSONB DEFAULT '["apollo"]'::jsonb,

    -- Progress Tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'queued', 'running', 'paused', 'completed', 'failed', 'cancelled'
    )),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

    -- Job Statistics
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    skip_count INTEGER DEFAULT 0,

    -- Results
    result_summary JSONB DEFAULT '{}'::jsonb,

    -- Target Configuration
    assign_to_campaign_id UUID,
    assign_to_user_id UUID,
    tags JSONB DEFAULT '[]'::jsonb,

    -- Error Handling
    last_error TEXT,
    error_details JSONB DEFAULT '{}'::jsonb,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Timing
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_completion_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ownership
    created_by UUID NOT NULL,
    organization_id UUID,

    -- Job Grouping
    batch_id UUID,
    parent_job_id UUID REFERENCES research_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_research_jobs_status ON research_jobs(status);
CREATE INDEX IF NOT EXISTS idx_research_jobs_type ON research_jobs(type);
CREATE INDEX IF NOT EXISTS idx_research_jobs_created_at ON research_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_jobs_batch ON research_jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_research_jobs_status_created ON research_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_jobs_progress ON research_jobs(id, progress_percentage, status)
    WHERE status IN ('running', 'paused');

CREATE TRIGGER update_research_jobs_updated_at
    BEFORE UPDATE ON research_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for active jobs monitoring
CREATE OR REPLACE VIEW active_research_jobs AS
SELECT
    *,
    CASE
        WHEN status = 'running' AND started_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (now() - started_at))::INTEGER
        ELSE NULL
    END as running_seconds,
    CASE
        WHEN processed_records > 0 AND started_at IS NOT NULL THEN
            (processed_records::DECIMAL / NULLIF(EXTRACT(EPOCH FROM (now() - started_at)), 0))::DECIMAL(10,2)
        ELSE 0
    END as records_per_second
FROM research_jobs
WHERE status IN ('pending', 'queued', 'running', 'paused');

-- RPC function for queue stats
CREATE OR REPLACE FUNCTION get_research_queue_stats()
RETURNS TABLE (
    status VARCHAR(50),
    count BIGINT,
    avg_progress DECIMAL,
    oldest_job TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rj.status,
        COUNT(*)::BIGINT,
        AVG(rj.progress_percentage)::DECIMAL(5,2),
        MIN(rj.created_at)
    FROM research_jobs rj
    GROUP BY rj.status
    ORDER BY
        CASE rj.status
            WHEN 'running' THEN 1
            WHEN 'queued' THEN 2
            WHEN 'pending' THEN 3
            ELSE 4
        END;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE research_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view research jobs" ON research_jobs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert research jobs" ON research_jobs
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update research jobs" ON research_jobs
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete research jobs" ON research_jobs
    FOR DELETE TO authenticated USING (true);
