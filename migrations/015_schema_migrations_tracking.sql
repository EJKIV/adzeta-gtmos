-- ================================================================  
-- Migration 015: Schema Migrations Tracking Table
-- For migration watcher service to track applied migrations
-- ================================================================

-- Table to track which migrations have been applied
CREATE TABLE IF NOT EXISTS schema_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    checksum TEXT,
    environment TEXT DEFAULT 'dev',
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
    ON schema_migrations(version);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_environment 
    ON schema_migrations(environment);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
    ON schema_migrations(applied_at);

-- Helper function to check if migration exists
CREATE OR REPLACE FUNCTION has_migration(version text) 
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM schema_migrations 
        WHERE schema_migrations.version = has_migration.version
    );
END;
$$ LANGUAGE plpgsql;

-- Helper function to exec SQL (for migration watcher)
CREATE OR REPLACE FUNCTION exec_sql(sql text) 
RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT ON schema_migrations TO authenticated;
GRANT SELECT, INSERT ON schema_migrations TO anon;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION has_migration(text) TO authenticated;

-- Comment for documentation
COMMENT ON TABLE schema_migrations IS 
    'Tracks applied database migrations for the migration watcher service';
COMMENT ON FUNCTION exec_sql(text) IS 
    'Executes arbitrary SQL - requires service role';

NOTIFY pgrst, 'reload schema';
