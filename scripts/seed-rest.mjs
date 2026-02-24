#!/usr/bin/env node
/**
 * Seed database via direct REST API
 * Bypasses schema cache issues
 * Usage: node scripts/seed-rest.mjs
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

async function supabaseRequest(table, method = 'GET', data = null) {
  const url = `${supabaseUrl}/rest/v1/${table}`;
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };
  
  if (method === 'POST') {
    headers['Prefer'] = 'return=representation';
  }
  
  const options = {
    method,
    headers
  };
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    return { error: { message: error }, data: null };
  }
  
  const responseData = await response.json().catch(() => null);
  return { data: responseData, error: null };
}

async function seed() {
  console.log('🌱 Seeding database via REST API...\n');
  
  // Seed qualified accounts
  console.log('📊 Adding qualified accounts...');
  const { data: accounts, error: accountsError } = await supabaseRequest('qualified_accounts', 'POST', [
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
  ]);
  
  if (accountsError) {
    console.log(`  ⚠️  ${accountsError.message.substring(0, 100)}`);
  } else {
    console.log(`  ✅ Accounts added`);
  }
  
  // Seed preference models
  console.log('🎯 Adding preference models...');
  const { data: prefs, error: prefsError } = await supabaseRequest('preference_models', 'POST', {
    user_id: 'system',
    card_order: ['intelligence', 'kpi', 'objectives', 'alerts'],
    card_scores: { kpi: 1.5, intelligence: 2.0, objectives: 0.8, alerts: 0.3 },
    communication_style: 'concise',
    autonomy_level: 'high'
  });
  
  if (prefsError) {
    console.log(`  ⚠️  ${prefsError.message.substring(0, 100)}`);
  } else {
    console.log(`  ✅ Preference model added`);
  }
  
  // Seed autonomous tasks
  console.log('🤖 Adding autonomous tasks...');
  const { data: tasks, error: tasksError } = await supabaseRequest('autonomous_tasks', 'POST', [
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
    }
  ]);
  
  if (tasksError) {
    console.log(`  ⚠️  ${tasksError.message.substring(0, 100)}`);
  } else {
    console.log(`  ✅ Tasks added`);
  }
  
  // Seed feedback signals
  console.log('💬 Adding feedback signals...');
  const { data: feedback, error: feedbackError } = await supabaseRequest('feedback_signals', 'POST', [
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
    }
  ]);
  
  if (feedbackError) {
    console.log(`  ⚠️  ${feedbackError.message.substring(0, 100)}`);
  } else {
    console.log(`  ✅ Feedback signals added`);
  }
  
  console.log('\n✅ Seed attempt complete!');
  console.log('\n⚠️  Note: Schema cache may cause API errors.');
  console.log('    Tables exist but client may need time to refresh cache.');
  console.log('    Try running script again in 1-2 minutes if errors occurred.');
}

seed().catch(console.error);
