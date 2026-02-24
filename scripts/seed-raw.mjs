#!/usr/bin/env node
/**
 * Seed database with sample data via raw SQL
 * Usage: node scripts/seed-raw.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedRaw() {
  console.log('🌱 Seeding database via raw SQL...\n');
  
  const seedSQL = `
-- Seed qualified accounts
INSERT INTO qualified_accounts (
    user_id, company_name, website, employee_count, 
    estimated_spend, spend_tier, funding_stage, recent_signal,
    pain_point_indicators, head_of_revops_name, vp_sales_name, cmo_name, score, status
) VALUES 
('system', 'Qualified.io', 'https://qualified.io', 150, '$500K-$1M', 'tier_2', 'Series B', 'Feb 2024 $17M funding', ARRAY['multiple tools', 'scaling GTM'], 'Sarah Chen', 'Mike Johnson', 'Lisa Park', 5, 'new'),
('system', 'Chili Piper', 'https://chillipiper.com', 200, '$1M-$2M', 'tier_1', 'Series B', 'Global expansion', ARRAY['scheduling chaos', 'revenue ops'], 'David Park', 'Emily Roberts', 'Alex Thompson', 5, 'new'),
('system', 'Walnut', 'https://walnut.io', 180, '$500K-$1M', 'tier_2', 'Series B', '3x growth in 2024', ARRAY['demo platform', 'buyer experience'], 'Rachel Kim', 'James Wilson', NULL, 5, 'new')
ON CONFLICT ON CONSTRAINT qualified_accounts_user_id_company_name_key DO UPDATE SET
    updated_at = NOW();

-- Seed preference models
INSERT INTO preference_models (
    user_id, card_order, card_scores, communication_style, autonomy_level
) VALUES
('system', '["intelligence", "kpi", "objectives", "alerts"]', '{"kpi": 1.5, "intelligence": 2.0, "objectives": 0.8, "alerts": 0.3}', 'concise', 'high')
ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW();

-- Seed autonomous tasks
INSERT INTO autonomous_tasks (
    user_id, task_type, title, description, status, priority, confidence_score, estimated_duration_minutes
) VALUES
('system', 'kpi_investigation', 'Investigate MQL decline', 'MQL volume dropped 15% vs last week. Root cause analysis needed.', 'pending', 'high', 85, 60),
('system', 'blocker_mitigation', 'Assign owner to large deal', 'Opportunity >$100K has no assigned owner. Risk of stall.', 'pending', 'critical', 92, 15),
('system', 'strategic_gap', 'Review Q1 pipeline coverage', 'Pipeline coverage ratio below 3x. Forecast at risk.', 'pending', 'high', 78, 30)
ON CONFLICT DO NOTHING;

-- Seed feedback signals
INSERT INTO feedback_signals (
    user_id, signal_type, card_type, section, duration_ms
) VALUES
('system', 'dwell', 'kpi', 'hero', 15000),
('system', 'explicit_positive', 'intelligence', 'recommendations', 5000),
('system', 'dwell', 'objectives', 'list', 8000)
ON CONFLICT DO NOTHING;
`;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: seedSQL });
    
    if (error) {
      console.error('❌ Seed failed:', error.message);
      console.log('\n⚠️  Trying individual inserts...');
      
      // Try individual inserts
      const results = await Promise.allSettled([
        supabase.from('qualified_accounts').insert({
          user_id: 'system', company_name: 'Test Account', website: 'https://example.com',
          employee_count: 100, score: 3, status: 'new'
        }),
        supabase.from('preference_models').insert({
          user_id: 'system', card_order: ['kpi', 'intelligence']
        }),
        supabase.from('autonomous_tasks').insert({
          user_id: 'system', task_type: 'kpi_investigation', 
          title: 'Test Task', description: 'Test description',
          status: 'pending', priority: 'medium'
        })
      ]);
      
      results.forEach((result, i) => {
        const tables = ['qualified_accounts', 'preference_models', 'autonomous_tasks'];
        if (result.status === 'fulfilled' && !result.value.error) {
          console.log(`  ✅ ${tables[i]}: seeded`);
        } else {
          console.log(`  ⚠️  ${tables[i]}: ${result.value?.error?.message || 'unknown error'}`);
        }
      });
    } else {
      console.log('✅ Seed data inserted successfully via SQL');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  // Verify data
  console.log('\n🔍 Verifying seed data...');
  const tables = ['qualified_accounts', 'preference_models', 'autonomous_tasks', 'feedback_signals'];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact' });
    
    if (error) {
      console.log(`  ❌ ${table}: error`);
    } else {
      console.log(`  ✅ ${table}: ${count || 0} rows`);
    }
  }
  
  console.log('\n✅ Seed complete!');
}

seedRaw().catch(console.error);
