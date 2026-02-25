-- Migration: Create prospects table
-- Enriched prospect data from Apollo.io and other sources

-- Prospect enrichment status enum
CREATE TYPE prospect_enrichment_status AS ENUM ('raw', 'enriching', 'enriched', 'failed', 'stale');

-- Prospect quality score enum
CREATE TYPE prospect_quality AS ENUM ('a', 'b', 'c', 'd', 'f');

CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    
    -- Source tracking
    source_job_id UUID REFERENCES research_jobs(id) ON DELETE SET NULL,
    source_type TEXT DEFAULT 'apollo' CHECK (source_type IN ('apollo', 'manual', 'upload', 'api', 'linkedin')),
    source_url TEXT,
    
    -- Person data
    person_name TEXT NOT NULL,
    person_first_name TEXT,
    person_last_name TEXT,
    person_email TEXT,
    person_phone TEXT,
    person_title TEXT,
    person_seniority TEXT,
    person_department TEXT,
    person_linkedin_url TEXT,
    person_twitter_url TEXT,
    person_bio TEXT,
    person_location TEXT,
    
    -- Company data
    company_name TEXT,
    company_domain TEXT,
    company_website TEXT,
    company_linkedin_url TEXT,
    company_size TEXT,
    company_employee_count INTEGER,
    company_industry TEXT,
    company_subindustry TEXT,
    company_location TEXT,
    company_country TEXT,
    company_founded_year INTEGER,
    company_description TEXT,
    
    -- Technographics
    technologies TEXT[] DEFAULT '{}',
    -- e.g., ['Salesforce', 'HubSpot', 'Segment', 'Gong']
    
    -- Firmographics
    company_revenue TEXT,
    company_funding TEXT,
    company_funding_stage TEXT,
    company_raised TEXT,
    
    -- Intent signals
    intent_signals JSONB DEFAULT '{}',
    -- e.g., {
    --   "hiring_for": ["sales", "marketing"],
    --   "recent_news": "raised series B",
    --   "job_openings": 15
    -- }
    
    -- Enrichment status
    enrichment_status prospect_enrichment_status DEFAULT 'raw',
    enrichment_data JSONB DEFAULT '{}',
    -- Raw enrichment from Apollo.io or other sources
    
    -- Quality scoring
    quality_score prospect_quality,
    scoring_metadata JSONB DEFAULT '{}',
    -- e.g., {
    --   "title_match": 0.9,
    --   "company_fit": 0.8,
    --   "data_completeness": 0.75,
    --   "total_score": 0.82
    -- }
    
    -- Flags
    is_email_verified BOOLEAN DEFAULT false,
    is_do_not_contact BOOLEAN DEFAULT false,
    is_unsubscribed BOOLEAN DEFAULT false,
    is_bounced BOOLEAN DEFAULT false,
    
    -- Campaign tracking
    campaign_ids UUID[] DEFAULT '{}',
    last_contact_at TIMESTAMPTZ,
    contact_count INTEGER DEFAULT 0,
    
    -- Linked account (if exists in qualified_accounts)
    linked_account_id UUID REFERENCES qualified_accounts(id) ON DELETE SET NULL,
    
    -- Analytics
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_enriched_at TIMESTAMPTZ,
    
    -- Row versioning for optimistic locking
    version INTEGER DEFAULT 1
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_prospects_user_id ON prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_source_job_id ON prospects(source_job_id);
CREATE INDEX IF NOT EXISTS idx_prospects_linked_account_id ON prospects(linked_account_id);
CREATE INDEX IF NOT EXISTS idx_prospects_enrichment_status ON prospects(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_prospects_quality_score ON prospects(quality_score);
CREATE INDEX IF NOT EXISTS idx_prospects_person_email ON prospects(person_email);
CREATE INDEX IF NOT EXISTS idx_prospects_company_domain ON prospects(company_domain);
CREATE INDEX IF NOT EXISTS idx_prospects_company_name ON prospects(company_name);
CREATE INDEX IF NOT EXISTS idx_prospects_person_title ON prospects(person_title);
CREATE INDEX IF NOT EXISTS idx_prospects_company_industry ON prospects(company_industry);
CREATE INDEX IF NOT EXISTS idx_prospects_is_do_not_contact ON prospects(is_do_not_contact);
CREATE INDEX IF NOT EXISTS idx_prospects_search_user_company ON prospects(user_id, company_name);

-- GIN indexes for array and JSONB fields
CREATE INDEX IF NOT EXISTS idx_prospects_technologies ON prospects USING GIN(technologies);
CREATE INDEX IF NOT EXISTS idx_prospects_intent_signals ON prospects USING GIN(intent_signals);
CREATE INDEX IF NOT EXISTS idx_prospects_enrichment_data ON prospects USING GIN(enrichment_data);
CREATE INDEX IF NOT EXISTS idx_prospects_scoring_metadata ON prospects USING GIN(scoring_metadata);
CREATE INDEX IF NOT EXISTS idx_prospects_campaign_ids ON prospects USING GIN(campaign_ids);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_prospects_person_name_trgm ON prospects USING GIN(person_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_prospects_company_name_trgm ON prospects USING GIN(company_name gin_trgm_ops);

-- Enable pg_trgm extension for text search (if not exists)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable Row Level Security
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own prospects
CREATE POLICY "Users can view own prospects" ON prospects
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own prospects
CREATE POLICY "Users can insert own prospects" ON prospects
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own prospects
CREATE POLICY "Users can update own prospects" ON prospects
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own prospects
CREATE POLICY "Users can delete own prospects" ON prospects
    FOR DELETE USING (auth.uid()::text = user_id);

-- Trigger to update updated_at and version
CREATE OR REPLACE FUNCTION update_prospects_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prospects
    BEFORE UPDATE ON prospects
    FOR EACH ROW
    EXECUTE FUNCTION update_prospects_timestamp();

-- View for enriched prospects (ready for outreach)
CREATE OR REPLACE VIEW enriched_prospects AS
SELECT * FROM prospects
WHERE enrichment_status = 'enriched'
  AND is_do_not_contact = false
  AND person_email IS NOT NULL
ORDER BY quality_score ASC, created_at DESC;

-- View for prospects by quality tier
CREATE OR REPLACE VIEW prospects_by_tier AS
SELECT 
    quality_score,
    COUNT(*) as count,
    AVG(score.total_score) as avg_quality_score
FROM prospects
LEFT JOIN LATERAL (
    SELECT (scoring_metadata->>'total_score')::numeric as total_score
) score ON true
WHERE quality_score IS NOT NULL
GROUP BY quality_score
ORDER BY quality_score;