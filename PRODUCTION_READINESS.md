# Production Deployment Guide

## Status: ✅ READY FOR PRODUCTION

Last updated: 2026-02-24 21:10 EST

---

## ⚠️ CRITICAL: Migration Workflow

**Migrations DO NOT run automatically in production!**

### Pre-Commit Flow (Husky Hooks)

The following now runs automatically before each commit:

1. ✅ Check for staged migration files
2. ✅ Run `scripts/run-migrations.mjs` against local database
3. ✅ Block commit if migrations fail

### Pre-Push Flow

Before pushing to GitHub:
1. ⚠️ Warns about any migration files being pushed
2. ⚠️ Reminds you to run migrations in production
3. ⏸️ Asks for confirmation to continue

---

## Production Migration Steps

**ALWAYS run migrations BEFORE deploying code:**

### Option A: Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.io)
2. Select your project
3. Go to **SQL Editor** → **New Query**
4. Copy SQL from migration files (e.g., `migrations/018_*.sql`)
5. Run the SQL
6. Verify via `SELECT * FROM public.profiles`

### Option B: Supabase CLI

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link to production
supabase link --project-ref hqhliqjpovtncrwbhlpx

# Push migrations
supabase db push
```

### Option C: REST API (Service Role)

```bash
# Run migrations via API (requires .env.local)
cd ~/projects/gtm-os
source .env.local
node scripts/run-migrations.mjs
```

**Note**: This runs against whatever `SUPABASE_SERVICE_ROLE_KEY` is pointing to.

---

## Pre-Deployment Verification

### 1. Database Migrations ✅

All migrations applied successfully:
- `001-016` - Core schema + RLS policies + profile fixes

**Verify in Supabase SQL Editor:**
```sql
-- Check profiles table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Check RLS policies
SELECT policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'profiles';

-- Verify jim.kernan@adzeta.io access
SELECT id, email, is_employee, role 
FROM profiles 
WHERE email = 'jim.kernan@adzeta.io';
```

### 2. Auth Configuration ✅

**Supabase Auth Settings:**
- Email provider: ENABLED
- Magic links: ENABLED
- Confirm email: DISABLED (for magic links)

**Site URL:** https://app.adzeta.io
**Redirect URLs:**
- https://gtm.adzeta.io/auth/callback
- http://localhost:3001/auth/callback (dev)

### 3. RLS Policies ✅

Verified working policies:
```sql
-- Users can read their own profile
profiles_select_own: id = auth.uid()

-- Users can update their own profile  
profiles_update_own: id = auth.uid()

-- Service role has full access
service_role_all: true
```

### 4. Environment Variables Check ✅

Required in Vercel:
```
NEXT_PUBLIC_SUPABASE_URL=https://hqhliqjpovtncrwbhlpx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
```

### 5. Admin User Setup ✅

**jim.kernan@adzeta.io:**
- Auth user: ✅ Created
- Profile: ✅ Created with is_employee=true, role=admin
- RLS access: ✅ Verified

---

## Deployment Steps

### Step 1: Push to Production
```bash
# Already done - commit 57faeb6
git log --oneline -1
# Should show: 57faeb6 Fix: Split auth into two effects...
```

### Step 2: Vercel Deploy
1. Go to https://vercel.com/dashboard
2. Select `adzeta-gtmos` project
3. Check deployment status
4. If needed: "Redeploy" with "Use existing Build Cache" = OFF

### Step 3: Verify Production

**Test Login Flow:**
1. Visit https://gtm.adzeta.io
2. Enter: jim.kernan@adzeta.io
3. Check email for magic link
4. Click link → should redirect to dashboard
5. Should see: "Employee" badge in header

**Console should show:**
```
[Auth] User signed in: jim.kernan@adzeta.io
[Auth] Profile loaded: {is_employee: true, role: "admin"}
[Auth] Render - isLoading: false user: jim.kernan@adzeta.io isEmployee: true
```

### Step 4: Add Additional Employees

Via Supabase SQL:
```sql
-- Add new employee
INSERT INTO profiles (id, email, is_employee, role)
VALUES (
  'USER_UUID_FROM_AUTH',
  'new.employee@adzeta.io',
  true,
  'employee'  -- or 'admin' for other @adzeta.io emails
)
ON CONFLICT (id) DO UPDATE 
SET is_employee = true, role = EXCLUDED.role;
```

Or via `/admin` page once logged in.

---

## Post-Deployment Verification

### Smoke Tests
- [ ] Homepage loads without errors
- [ ] Login with magic link works
- [ ] Dashboard shows for authenticated employee
- [ ] Profile fetch returns is_employee: true
- [ ] Admin page accessible (for @adzeta.io emails)
- [ ] Logout works

### Monitor These Logs
```bash
# Vercel logs
vercel logs adzeta-gtmos --production

# Look for:
# - "[Auth] User signed in:"
# - "[Auth] Profile loaded:"
# - No "Profile fetch error" messages
```

---

## Rollback Plan

If issues occur:
1. Vercel → Deployments → Select previous working deployment
2. Click "Promote to Production"
3. Check Supabase for data issues

---

## Key Fixes Included

1. **RLS Recursion Fixed** - Migration 016
2. **Auth Race Condition Fixed** - Two separate effects
3. **Employee Detection Fixed** - Profile fetch properly triggers
4. **Loading State Fixed** - Profile fetch completes before isLoading=false

---

## Support

If production login fails:
1. Check Vercel function logs for errors
2. Verify Supabase Auth provider settings
3. Check profile exists: `SELECT * FROM profiles WHERE email = '...'`
4. Clear browser localStorage and retry
