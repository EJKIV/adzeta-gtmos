#!/usr/bin/env node
/**
 * Create exec_sql function in Supabase
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const sql = `
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$\nBEGIN\n    EXECUTE sql;\nEND;\n$$;

GRANT EXECUTE ON FUNCTION exec_sql(text) TO postgres;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
SELECT 'exec_sql created' as status;
`;

async function createFunction() {
  console.log('Creating exec_sql function...\n');
  
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql })
  });
  
  const text = await response.text();
  console.log(`Status: ${response.status}`);
  console.log(`Response: ${text}\n`);
  
  if (response.ok) {
    console.log('✅ exec_sql function ready');
    return true;
  } else if (text.includes('does not exist')) {
    console.log('⚠️  Function does not exist yet, trying alternative method...\n');
    return false;
  }
  return false;
}

createFunction().then(ok => {
  if (!ok) {
    console.log('Run this SQL manually in Supabase Dashboard:');
    console.log(sql);
  }
}).catch(console.error);
