# Production Migration Guide

## Option 1: Supabase CLI (Recommended for Production)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your production project
supabase link --project-ref your-production-project-ref

# Push migrations to production
supabase db push
```

## Option 2: Supabase Dashboard (Manual)

1. Go to https://app.supabase.com
2. Select your **production** project
3. SQL Editor → New query
4. Copy contents of `all-migrations.sql`
5. Click Run

## Option 3: GitHub Actions (CI/CD)

Add to `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
      - name: Push migrations
        run: |
          supabase link --project-ref ${{ secrets.PROJECT_REF }}
          supabase db push
```

## Migration Files Included

| File | Tables Created |
|------|----------------|
| `001_create_feedback_signals.sql` | feedback_signals |
| `002_create_preference_models.sql` | preference_models |
| `003_create_autonomous_tasks.sql` | autonomous_tasks |
| `004_create_research_ledger.sql` | research_ledger |
| `005_create_qualified_accounts.sql` | qualified_accounts |
| `006_create_funnels.sql` | funnels |

## Post-Migration Verification

```bash
# Test connection
node scripts/verify-db.mjs
```

## Important Notes

- **Run migrations BEFORE deploying app**
- **Test on dev first**
- **Production migrations are irreversible** — backup first
- **Seed data is optional** — app has empty states
