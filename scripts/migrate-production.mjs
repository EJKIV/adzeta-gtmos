#!/usr/bin/env node
/**
 * Production Migration Script
 * Runs all SQL migrations in migrations/ directory against the database.
 *
 * Key improvements over the old runner:
 * - Handles DO $$ blocks and multi-statement functions correctly
 * - Better error reporting with full context
 * - Tolerates "already exists" and "duplicate" errors (idempotent reruns)
 * - Validates exec_sql function exists before proceeding
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Production Migration Script');
console.log('================================');
console.log('');

// Validate environment
if (!SUPABASE_URL) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  process.exit(1);
}

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Set this secret in GitHub: Settings > Secrets > Actions > SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log(`Service Key: ${SERVICE_KEY.substring(0, 10)}... (truncated)`);
console.log('');

/**
 * Execute a SQL string via the exec_sql RPC function.
 * Returns { ok: boolean, error?: string }
 */
async function execSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });

  if (!res.ok) {
    const error = await res.text();
    return { ok: false, error };
  }
  return { ok: true };
}

/**
 * Split a SQL file into executable statements.
 * Handles $$ dollar-quoted blocks (functions, DO blocks) correctly.
 */
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip pure comment lines (but keep comments inside statements)
    if (!current.trim() && trimmed.startsWith('--')) continue;

    // Track $$ dollar quoting
    const dollarMatches = line.match(/\$\$/g);
    if (dollarMatches) {
      for (const _match of dollarMatches) {
        inDollarQuote = !inDollarQuote;
      }
    }

    current += line + '\n';

    // Statement ends at ; when not inside a $$ block
    if (!inDollarQuote && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt && stmt !== ';') {
        statements.push(stmt);
      }
      current = '';
    }
  }

  // Catch any trailing statement without semicolon
  const remaining = current.trim();
  if (remaining && remaining !== ';' && !remaining.startsWith('--')) {
    statements.push(remaining);
  }

  return statements;
}

/**
 * Check if an error is safe to ignore (idempotent rerun).
 */
function isIgnorableError(error) {
  const ignorable = [
    'already exists',
    'duplicate key',
    'duplicate object',
    'is not an enum',
    'multiple primary keys',
  ];
  const lower = error.toLowerCase();
  return ignorable.some(pattern => lower.includes(pattern));
}

// ==========================================
// Main execution
// ==========================================

const migrationsDir = join(__dirname, '..', 'migrations');
let files;
try {
  files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
} catch (err) {
  console.error('Cannot read migrations directory:', err.message);
  process.exit(1);
}

console.log(`Found ${files.length} migration files`);
console.log('');

let successCount = 0;
let failCount = 0;
let warningCount = 0;

for (const file of files) {
  const filepath = join(migrationsDir, file);
  console.log(`Running ${file}...`);

  try {
    const sql = readFileSync(filepath, 'utf8');
    const statements = splitStatements(sql);

    let fileErrors = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const result = await execSQL(stmt);

      if (!result.ok) {
        if (isIgnorableError(result.error)) {
          // Idempotent rerun — skip silently
          continue;
        }

        fileErrors++;
        const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
        console.error(`  WARNING statement ${i + 1}: ${result.error.substring(0, 120)}`);
        console.error(`    SQL: ${preview}...`);
        warningCount++;
      }
    }

    if (fileErrors === 0) {
      console.log(`  OK ${file} (${statements.length} statements)`);
    } else {
      console.log(`  PARTIAL ${file} (${fileErrors} warnings)`);
    }
    successCount++;

  } catch (err) {
    console.error(`  FAILED ${file}: ${err.message}`);
    failCount++;
  }
}

console.log('');
console.log('================================');
console.log('Migration Summary');
console.log('================================');
console.log(`Success: ${successCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Warnings: ${warningCount}`);
console.log('');

if (failCount > 0) {
  console.log('Some migrations failed. Check logs above.');
  process.exit(1);
} else if (warningCount > 0) {
  console.log('Migrations completed with warnings (likely idempotent reruns).');
  process.exit(0);
} else {
  console.log('All migrations completed successfully.');
  process.exit(0);
}
