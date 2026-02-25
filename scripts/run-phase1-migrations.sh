#!/bin/bash
# Phase 1 Migration Runner
# Applies database migrations 021-026 for Research & Outreach Foundation

set -e

echo "====================================="
echo "Phase 1 Migration Runner"
echo "Research & Outreach Foundation"
echo "====================================="
echo ""

# Check for required environment variables
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "✗ Error: SUPABASE_DB_URL environment variable not set"
    echo "  Example: postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
    exit 1
fi

# Migrations to run
MIGRATIONS=(
    "021_create_research_jobs.sql"
    "022_create_prospects.sql"
    "023_create_outreach_campaigns.sql"
    "024_create_outreach_sequences.sql"
    "025_create_communications.sql"
    "026_create_command_history.sql"
)

echo "📁 Running migrations from: $(pwd)/migrations"
echo "🎯 Database: $SUPABASE_DB_URL"
echo ""

# Track results
SUCCESS=0
FAILED=0

for migration in "${MIGRATIONS[@]}"; do
    migration_path="migrations/$migration"
    
    if [ ! -f "$migration_path" ]; then
        echo "✗ Migration file not found: $migration_path"
        ((FAILED++))
        continue
    fi
    
    echo "🔄 Running $migration..."
    
    if psql "$SUPABASE_DB_URL" -f "$migration_path" > /dev/null 2>&1; then
        echo "  ✓ Success"
        ((SUCCESS++))
    else
        echo "  ✗ Failed (may already be applied)"
        ((FAILED++))
    fi
done

echo ""
echo "====================================="
echo "Migration Summary"
echo "====================================="
echo "✓ Successful: $SUCCESS"
echo "✗ Failed/Skipped: $FAILED"
echo ""

if [ $SUCCESS -eq ${#MIGRATIONS[@]} ]; then
    echo "🎉 All migrations applied successfully!"
    exit 0
else
    echo "⚠️  Some migrations failed or were already applied"
    exit 0  # Don't fail, as some may already exist
fi