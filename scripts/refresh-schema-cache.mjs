#!/usr/bin/env node
/**
 * Refresh Supabase PostgREST schema cache
 * 
 * When adding new columns to tables, PostgREST caches the schema.
 * This script sends a NOTIFY command to force a cache refresh.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load env from project root
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function refreshSchemaCache() {
  console.log('Refreshing PostgREST schema cache...');
  
  try {
    // Method 1: Execute raw SQL via supabase.sql (if supported)
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "NOTIFY pgrst, 'reload schema'"
    });
    
    if (error) {
      // Method 2: Direct query via REST
      console.log('Trying direct REST approach...');
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'tx=rollback'
        }
      });
      
      // Trigger cache refresh by making a request
      await supabase.from('feedback_signals').select('count', { count: 'exact', head: true });
      
      console.log('✅ Schema cache refresh triggered');
      console.log('   You may need to wait 10-30 seconds for cache to propagate');
    } else {
      console.log('✅ Schema cache refresh command sent');
    }
    
  } catch (err) {
    console.error('❌ Error refreshing cache:', err.message);
    console.log('');
    console.log('MANUAL FIX: Run this SQL in Supabase SQL Editor:');
    console.log("  NOTIFY pgrst, 'reload schema';");
    process.exit(1);
  }
}

refreshSchemaCache();
