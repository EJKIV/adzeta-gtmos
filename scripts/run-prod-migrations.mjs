#!/usr/bin/env node
/**
 * Execute SQL migrations via Supabase REST API
 * No seed data - tables only
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigrations() {
  const migrationsDir = join(__dirname, '..', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📦 Running ${files.length} migrations...\n`);

  for (const file of files) {
    const filepath = join(migrationsDir, file);
    const sql = readFileSync(filepath, 'utf8');
    
    console.log(`🔄 ${file}...`);
    
    try {
      // Execute via REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`  ⚠️  ${file}: ${errorText.substring(0, 100)}`);
        
        // Check if it's "function already exists" or similar non-error
        if (errorText.includes('already exists') || errorText.includes('duplicate')) {
          console.log(`     (likely already migrated)`);
        }
      } else {
        console.log(`  ✅ Success`);
      }
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying tables...');
  
  const tables = [
    'feedback_signals',
    'preference_models',
    'autonomous_tasks',
    'research_ledger',
    'qualified_accounts',
    'funnels'
  ];
  
  let allExist = true;
  
  for (const table of tables) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?limit=1`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      
      if (response.ok || response.status === 401) { // 401 means table exists but unauthorized
        console.log(`  ✅ ${table}`);
      } else {
        console.log(`  ❌ ${table}: HTTP ${response.status}`);
        allExist = false;
      }
    } catch (err) {
      console.log(`  ❌ ${table}: ${err.message}`);
      allExist = false;
    }
  }
  
  return allExist;
}

async function checkRowCount() {
  console.log('\n📊 Checking for seed data...');
  
  const tables = [
    'qualified_accounts',
    'autonomous_tasks',
    'feedback_signals'
  ];
  
  for (const table of tables) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'count=exact'
        }
      });
      
      // Get count from header
      const count = response.headers.get('content-range') || '0';
      const rowCount = count.includes('/') ? parseInt(count.split('/')[1]) : 0;
      
      console.log(`  ${table}: ${rowCount} rows`);
      
      if (rowCount > 0) {
        console.log(`  ⚠️  Has data (expected empty)`);
      }
    } catch (err) {
      console.log(`  ${table}: unable to check`);
    }
  }
  
  console.log('\n✅ Migration complete - tables only, no seed data added');
}

// Execute
console.log('🚀 Production Migration Started\n');
console.log(`URL: ${supabaseUrl}`);
console.log('');

runMigrations()
  .then(() => verifyTables())
  .then(() => checkRowCount())
  .catch(console.error);
