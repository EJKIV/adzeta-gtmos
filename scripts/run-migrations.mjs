#!/usr/bin/env node
/**
 * Run Supabase migrations
 * Usage: node scripts/run-migrations.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Get credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  const migrationsDir = join(__dirname, '..', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📦 Found ${files.length} migration files\n`);

  for (const file of files) {
    const filepath = join(migrationsDir, file);
    const sql = readFileSync(filepath, 'utf8');
    
    console.log(`🔄 Running ${file}...`);
    
    try {
      // Execute SQL via Supabase
      const { error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        console.error(`  ❌ Failed: ${error.message}`);
      } else {
        console.log(`  ✅ Success`);
      }
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
  }
  
  console.log('\n✅ Migration run complete');
  
  // Refresh PostgREST schema cache
  console.log('\n🔄 Refreshing PostgREST schema cache...');
  try {
    await supabase.rpc('exec_sql', { 
      sql: "NOTIFY pgrst, 'reload schema'" 
    });
    console.log('  ✅ Schema cache refresh triggered');
    console.log('     (Wait 10-30 seconds for changes to propagate)');
  } catch (err) {
    console.log('  ⚠️  Could not auto-refresh cache');
    console.log('     Run manually: NOTIFY pgrst, \'reload schema\';');
  }
}

runMigrations().catch(console.error);
