# Running Migrations

Since `psql` is not available locally, you have two options:

## Option 1: Supabase Dashboard (Recommended)

1. Go to https://app.supabase.com
2. Select your project
3. Go to SQL Editor
4. Copy and paste the contents of `all-migrations.sql`
5. Click "Run"

## Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

## Option 3: Node.js Script

Run the provided script (requires service role key):

```bash
cd ~/projects/gtm-os
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
node scripts/run-migrations.mjs
```

## Migrations Included

1. `001_create_feedback_signals.sql` - User feedback storage
2. `002_create_preference_models.sql` - User preferences
3. `003_create_autonomous_tasks.sql` - AI-generated tasks
4. `004_create_research_ledger.sql` - Research findings
5. `005_create_qualified_accounts.sql` - CRM accounts
6. `006_create_funnels.sql` - Sales funnels

## After Migrations

Run the seed script to populate with sample data:

```bash
node scripts/seed-data.mjs
```
