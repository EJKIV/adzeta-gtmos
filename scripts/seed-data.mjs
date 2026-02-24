#!/usr/bin/env node
/**
 * Seed database with sample data
 * Usage: node scripts/seed-data.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
  console.log('🌱 Seeding database...\n');
  
  // Seed qualified accounts
  console.log('📊 Adding qualified accounts...');
  const { data: accounts, error: accountsError } = await supabase
    .from('qualified_accounts')
    .upsert([
      {
        user_id: 'system',
        company_name: 'Qualified.io',
        website: 'https://qualified.io',
        employee_count: 150,
        estimated_spend: '$500K-$1M',
        spend_tier: 'tier_2',
        funding_stage: 'Series B',
        recent_signal: 'Feb 2024 $17M funding',
        pain_point_indicators: ['multiple tools', 'scaling GTM'],
        head_of_revops_name: 'Sarah Chen',
        vp_sales_name: 'Mike Johnson',
        cmo_name: 'Lisa Park',
        score: 5,
        status: 'new'
      },
      {
        user_id: 'system',
        company_name: 'Chili Piper',
        website: 'https://chillipiper.com',
        employee_count: 200,
        estimated_spend: '$1M-$2M',
        spend_tier: 'tier_1',
        funding_stage: 'Series B',
        recent_signal: 'Global expansion',
        pain_point_indicators: ['scheduling chaos', 'revenue ops'],
        head_of_revops_name: 'David Park',
        vp_sales_name: 'Emily Roberts',
        cmo_name: 'Alex Thompson',
        score: 5,
        status: 'new'
      },
      {
        user_id: 'system',
        company_name: 'Walnut',
        website: 'https://walnut.io',
        employee_count: 180,
        estimated_spend: '$500K-$1M',
        spend_tier: 'tier_2',
        funding_stage: 'Series B',
        recent_signal: '3x growth in 2024',
        pain_point_indicators: ['demo platform', 'buyer experience'],
        head_of_revops_name: 'Rachel Kim',
        vp_sales_name: 'James Wilson',
        score: 5,
        status: 'new'
      }
    ], { onConflict: 'user_id,company_name' })
    .select();
  
  if (accountsError) {
    console.error('❌ Accounts:', accountsError.message);
  } else {
    console.log(`  ✅ ${accounts.length} accounts added`);
  }
  
  // Seed preference models
  console.log('🎯 Adding preference models...');
  const { data: prefs, error: prefsError } = await supabase
    .from('preference_models')
    .upsert([
      {
        user_id: 'system',
        card_order: ['intelligence', 'kpi', 'objectives', 'alerts'],
        card_scores: { kpi: 1.5, intelligence: 2.0, objectives: 0.8, alerts: 0.3 },
        communication_style: 'concise',
        autonomy_level: 'high'
      }
    ], { onConflict: 'user_id' })
    .select();
  
  if (prefsError) {
    console.error('❌ Preferences:', prefsError.message);
  } else {
    console.log(`  ✅ ${prefs.length} preference model added`);
  }
  
  // Seed autonomous tasks
  console.log('🤖 Adding autonomous tasks...');
  const { data: tasks, error: tasksError } = await supabase
    .from('autonomous_tasks')
    .upsert([
      {
        user_id: 'system',
        task_type: 'kpi_investigation',
        title: 'Investigate MQL decline',
        description: 'MQL volume dropped 15% vs last week. Root cause analysis needed.',
        status: 'pending',
        priority: 'high',
        confidence_score: 85,
        estimated_duration_minutes: 60
      },
      {
        user_id: 'system',
        task_type: 'blocker_mitigation',
        title: 'Assign owner to large deal',
        description: 'Opportunity >$100K has no assigned owner. Risk of stall.',
        status: 'pending',
        priority: 'critical',
        confidence_score: 92,
        estimated_duration_minutes: 15
      },
      {
        user_id: 'system',
        task_type: 'strategic_gap',
        title: 'Review Q1 pipeline coverage',
        description: 'Pipeline coverage ratio below 3x. Forecast at risk.',
        status: 'pending',
        priority: 'high',
        confidence_score: 78,
        estimated_duration_minutes: 30
      }
    ])
    .select();
  
  if (tasksError) {
    console.error('❌ Tasks:', tasksError.message);
  } else {
    console.log(`  ✅ ${tasks.length} tasks added`);
  }
  
  // Seed feedback signals
  console.log('💬 Adding feedback signals...');
  const { data: feedback, error: feedbackError } = await supabase
    .from('feedback_signals')
    .insert([
      {
        user_id: 'system',
        signal_type: 'dwell',
        card_type: 'kpi',
        section: 'hero',
        duration_ms: 15000
      },
      {
        user_id: 'system',
        signal_type: 'explicit_positive',
        card_type: 'intelligence',
        section: 'recommendations',
        duration_ms: 5000
      },
      {
        user_id: 'system',
        signal_type: 'dwell',
        card_type: 'objectives',
        section: 'list',
        duration_ms: 8000
      }
    ])
    .select();
  
  if (feedbackError) {
    console.error('❌ Feedback:', feedbackError.message);
  } else {
    console.log(`  ✅ ${feedback.length} feedback signals added`);
  }
  
  console.log('\n✅ Seed complete!');
}

seedData().catch(console.error);
