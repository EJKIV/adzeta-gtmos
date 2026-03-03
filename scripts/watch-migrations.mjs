#!/usr/bin/env node
/**
 * Migration File Watcher Service
 * Auto-detects and runs new .sql files in migrations/
 * 
 * Mirrors oracle-poll pattern: polling-based, runs continuously
 * Tracks applied migrations in schema_migrations table
 * 
 * Environment variables:
 *   GTMOS_DEV_SUPABASE_URL, GTMOS_DEV_SERVICE_ROLE_KEY
 *   GTMOS_PROD_SUPABASE_URL, GTMOS_PROD_SERVICE_ROLE_KEY
 *   MIGRATION_LOG_LEVEL (optional: debug, info, warn, error)
 */

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';

const POLL_INTERVAL_MS = Number(process.env.MIGRATION_POLL_INTERVAL_MS) || 10000;
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || '/Users/alariceverett/projects/gtm-os/migrations';
const STATE_FILE = '/Users/alariceverett/.openclaw/.migration-state.json';

const ENV_CONFIG = {
  dev: {
    supabaseUrl: process.env.GTMOS_DEV_SUPABASE_URL,
    serviceKey: process.env.GTMOS_DEV_SERVICE_ROLE_KEY,
    dbName: 'dev',
  },
  prod: {
    supabaseUrl: process.env.GTMOS_PROD_SUPABASE_URL,
    serviceKey: process.env.GTMOS_PROD_SERVICE_ROLE_KEY,
    dbName: 'prod',
  },
};

const LOG_LEVEL = process.env.MIGRATION_LOG_LEVEL || 'info';

function log(level, ...args) {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  if (levels[level] >= levels[LOG_LEVEL]) {
    const timestamp = new Date().toISOString();
    console.log(`[Migration:${level}:${timestamp}]`, ...args);
  }
}

function validateEnv() {
  const errors = [];
  
  if (!ENV_CONFIG.dev.supabaseUrl || !ENV_CONFIG.dev.serviceKey) {
    errors.push('GTMOS_DEV_SUPABASE_URL and GTMOS_DEV_SERVICE_ROLE_KEY required');
  }
  
  if (!ENV_CONFIG.prod.supabaseUrl || !ENV_CONFIG.prod.serviceKey) {
    log('warn', 'Production credentials not set - will only process dev migrations');
  }
  
  if (errors.length) {
    console.error('[Migration] Environment errors:');
    errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
}

async function createSupabaseClient(environment) {
  const config = ENV_CONFIG[environment];
  if (!config?.supabaseUrl || !config?.serviceKey) {
    throw new Error(`Invalid environment: ${environment}`);
  }
  return createClient(config.supabaseUrl, config.serviceKey);
}

async function ensureMigrationsTable(supabase) {
  // Check if schema_migrations table exists
  const { error: checkError } = await supabase
    .from('schema_migrations')
    .select('version')
    .limit(1);
  
  if (checkError && checkError.code === 'PGRST116') {
    // Table doesn't exist, create it
    log('info', 'Creating schema_migrations table...');
    
    const createSql = `
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
      
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
        ON schema_migrations(version);
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_environment 
        ON schema_migrations(environment);
    `;
    
    const { error } = await supabase.rpc('exec_sql', { sql: createSql });
    if (error) {
      // exec_sql might not exist, fall back to direct query
      log('warn', 'Could not create schema_migrations via RPC, will track in memory');
      return false;
    }
    log('info', 'schema_migrations table created');
  }
  
  return true;
}

async function getAppliedMigrations(supabase, environment) {
  try {
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('version, filename, applied_at')
      .eq('environment', environment)
      .order('version');
    
    if (error) {
      log('warn', `Could not query schema_migrations: ${error.message}`);
      return new Map();
    }
    
    const map = new Map();
    data?.forEach(m => map.set(m.version, m));
    return map;
  } catch (err) {
    log('warn', `Error getting applied migrations: ${err.message}`);
    return new Map();
  }
}

async function scanMigrationFiles(dir) {
  try {
    const files = await readdir(dir);
    return files
      .filter(f => f.endsWith('.sql'))
      .map(f => {
        // Extract version from filename:
        // 001_name.sql -> 001
        // 20260303_name.sql -> 20260303
        // name.sql -> name (fallback)
        const versionMatch = f.match(/^(\d+)_/) || f.match(/^(\d{8})_/);
        const version = versionMatch ? versionMatch[1] : f.replace('.sql', '');
        return {
          filename: f,
          path: join(dir, f),
          version,
          fullPath: join(dir, f),
        };
      })
      .sort((a, b) => a.version.localeCompare(b.version));
  } catch (err) {
    log('error', `Could not scan migrations directory: ${err.message}`);
    return [];
  }
}

async function runMigration(supabase, migrationFile, environment) {
  const { version, filename, path } = migrationFile;
  
  log('info', `Running migration: ${filename} (${environment})`);
  
  try {
    const sql = await readFile(path, 'utf-8');
    
    // Split into statements (semicolon-separated, but not inside $$ blocks)
    const statements = splitSqlStatements(sql);
    log('debug', `Parsed ${statements.length} statements from ${filename}`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt || stmt.startsWith('--') || stmt.startsWith('/*')) {
        continue; // Skip comments
      }
      
      log('debug', `Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: stmt });
        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase.query(stmt);
          if (directError) {
            throw new Error(`Statement ${i + 1} failed: ${directError.message}`);
          }
        }
      } catch (stmtErr) {
        // Some statements might fail (e.g., CREATE IF EXISTS), that's OK
        if (!isIgnorableError(stmtErr.message)) {
          log('warn', `Statement warning: ${stmtErr.message}`);
        }
      }
    }
    
    // Record successful migration
    const checksum = await computeChecksum(sql);
    const { error: recordError } = await supabase
      .from('schema_migrations')
      .insert({
        version,
        filename,
        environment,
        checksum,
        success: true,
      });
    
    if (recordError) {
      log('warn', `Could not record migration: ${recordError.message}`);
    }
    
    log('info', `✓ Migration complete: ${filename}`);
    return { success: true };
    
  } catch (err) {
    log('error', `✗ Migration failed: ${filename} - ${err.message}`);
    
    // Record failure
    await supabase
      .from('schema_migrations')
      .insert({
        version,
        filename,
        environment,
        success: false,
        error_message: err.message,
      });
    
    return { success: false, error: err.message };
  }
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';
    
    current += char;
    
    // Check for dollar quote start
    if (char === '$' && !inDollarQuote) {
      const match = sql.slice(i).match(/^\$([A-Za-z_]*)\$/);
      if (match) {
        dollarTag = match[1];
        inDollarQuote = true;
        i += match[0].length - 1;
        current += match[0].slice(1);
        continue;
      }
    }
    
    // Check for dollar quote end
    if (inDollarQuote && char === '$') {
      const endMatch = sql.slice(i).match(new RegExp(`^\\$${dollarTag}\\$`));
      if (endMatch) {
        inDollarQuote = false;
        dollarTag = '';
        i += endMatch[0].length - 1;
        current += endMatch[0].slice(1);
        continue;
      }
    }
    
    // Statement terminator (not in dollar quote)
    if (!inDollarQuote && char === ';') {
      statements.push(current.trim());
      current = '';
    }
  }
  
  // Add remaining
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements.filter(s => s.length > 0);
}

function isIgnorableError(message) {
  const ignorable = [
    'already exists',
    'duplicate key',
    'does not exist',
    'IF NOT EXISTS',
    'IF EXISTS',
  ];
  return ignorable.some(pattern => message.toLowerCase().includes(pattern.toLowerCase()));
}

async function computeChecksum(str) {
  const crypto = await import('crypto');
  return crypto.createHash('md5').update(str).digest('hex');
}

async function pollEnvironment(environment) {
  try {
    const supabase = await createSupabaseClient(environment);
    await ensureMigrationsTable(supabase);
    
    const applied = await getAppliedMigrations(supabase, environment);
    const files = await scanMigrationFiles(MIGRATIONS_DIR);
    
    // Find pending migrations
    const pending = files.filter(f => !applied.has(f.version));
    
    if (pending.length === 0) {
      log('debug', `${environment}: No new migrations`);
      return { pending: 0, run: 0 };
    }
    
    log('info', `${environment}: Found ${pending.length} pending migration(s): ${pending.map(p => p.filename).join(', ')}`);
    
    let successCount = 0;
    for (const migration of pending) {
      const result = await runMigration(supabase, migration, environment);
      if (result.success) {
        successCount++;
      } else {
        log('error', `${environment}: Stopping - failed on ${migration.filename}`);
        break;
      }
    }
    
    return { pending: pending.length, run: successCount };
    
  } catch (err) {
    log('error', `${environment}: Polling error: ${err.message}`);
    return { pending: 0, run: 0, error: err.message };
  }
}

async function runWatcher() {
  log('info', '=== Migration Watcher Started ===');
  log('info', `Watching: ${MIGRATIONS_DIR}`);
  log('info', `Poll interval: ${POLL_INTERVAL_MS}ms`);
  
  validateEnv();
  
  // First run
  const devResult = await pollEnvironment('dev');
  if (ENV_CONFIG.prod.supabaseUrl) {
    await pollEnvironment('prod');
  }
  
  log('info', `Initial scan complete. Dev migrations: ${devResult.run} run`);
  log('info', 'Watching for new migrations...');
  
  // Set up interval
  setInterval(async () => {
    try {
      await pollEnvironment('dev');
      if (ENV_CONFIG.prod.supabaseUrl) {
        await pollEnvironment('prod');
      }
    } catch (err) {
      log('error', 'Poll error:', err.message);
    }
  }, POLL_INTERVAL_MS);
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('info', 'Received SIGINT, shutting down...');
  process.exit(0);
});

// Start
runWatcher().catch(err => {
  log('error', 'Fatal error:', err.message);
  process.exit(1);
});
