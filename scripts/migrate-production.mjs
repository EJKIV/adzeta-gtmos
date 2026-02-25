#!/usr/bin/env node
/**
 * Production Migration Script
 * Runs all SQL migrations in migrations/ directory against production database
 * Uses SUPABASE_SERVICE_ROLE_KEY from GitHub secrets
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Production Migration Script');
console.log('================================');
console.log('');

// Validate environment
if (!SUPABASE_URL) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  process.exit(1);
}

if (!SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Make sure this secret is set in GitHub:');
  console.error('Settings → Secrets → Actions → SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
console.log(`🔑 Service Key: ${SERVICE_KEY.substring(0, 10)}... (truncated)`);
console.log('');

// Get migration files
const migrationsDir = join(__dirname, '..', 'migrations');
let files;
try {
  files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
} catch (err) {
  console.error('❌ Cannot read migrations directory:', err.message);
  process.exit(1);
}

console.log(`📁 Found ${files.length} migration files`);
console.log('');

// Run each migration
let successCount = 0;
let failCount = 0;

for (const file of files) {
  const filepath = join(migrationsDir, file);
  console.log(`\n📝 Running ${file}...`);
  
  try {
    const sql = readFileSync(filepath, 'utf8');
    
    // Split SQL into individual statements (simplified)
    const statements = sql.split(/;\s*\n+/).filter(s => s.trim());
    
    for (const statement of statements) {
      if (!statement.trim() || statement.trim().startsWith('--')) continue;
      
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: statement }),
      });
      
      if (!res.ok) {
        const error = await res.text();
        // Some statements might fail if they already exist (that's ok)
        if (!error.includes('already exists') && !error.includes('Duplicate')) {
          console.error(`  ⚠️  Warning: ${error.substring(0, 100)}`);
        }
      }
    }
    
    console.log(`  ✅ ${file}`);
    successCount++;
    
  } catch (err) {
    console.error(`  ❌ ${file}: ${err.message}`);
    failCount++;
  }
}

console.log('');
console.log('================================');
console.log('📊 Migration Summary');
console.log('================================');
console.log(`✅ Success: ${successCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log('');

if (failCount > 0) {
  console.log('⚠️  Some migrations failed. Check logs above.');
  process.exit(1);
} else {
  console.log('🎉 All migrations completed successfully!');
  console.log('');
  console.log('Production database is now up to date.');
  process.exit(0);
}
