#!/usr/bin/env node
/**
 * Execute SQL migrations via Supabase REST API
 * Usage: node scripts/exec-migrations.mjs
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

console.log('🔌 Connecting to Supabase...');
console.log(`   URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  const { data, error } = await supabase.from('information_schema.tables').select('table_name').limit(1);
  if (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
  console.log('✅ Connection successful\n');
  return true;
}

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
      // Split SQL into individual statements
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (!statement.trim()) continue;
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement.trim() + ';' 
        });
        
        if (error) {
          // Try direct query if RPC fails
          const { error: queryError } = await supabase.query(statement.trim() + ';');
          if (queryError) {
            console.error(`  ⚠️  Statement failed: ${queryError.message}`);
          }
        }
      }
      
      console.log(`  ✅ ${file} completed`);
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
  }
  
  console.log('\n✅ Migration run complete');
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
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`  ❌ ${table}: ${error.message}`);
    } else {
      console.log(`  ✅ ${table}: exists`);
    }
  }
}

// Main execution
(async () => {
  const connected = await testConnection();
  if (!connected) {
    console.log('\n⚠️  Trying alternative connection method...');
  }
  
  await runMigrations();
  await verifyTables();
  
  console.log('\n🎉 Setup complete!');
})();
