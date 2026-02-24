#!/usr/bin/env node
/**
 * Production Deployment Verification Script
 * Tests critical endpoints and reports PASS/FAIL
 * Usage: PRODUCTION_URL=https://your-app.vercel.app node scripts/verify-production.mjs
 */

const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://adzeta-gtmos.vercel.app';

const tests = [
  {
    name: 'Homepage loads',
    method: 'GET',
    path: '/',
    expectStatus: 200,
    expectContent: 'GTM Command Center'
  },
  {
    name: 'KPI API',
    method: 'GET',
    path: '/api/command-center/kpis',
    expectStatus: 200,
    validate: (data) => data && (Array.isArray(data.kpis) || typeof data.kpis === 'object')
  },
  {
    name: 'Predictions API (anomalies)',
    method: 'GET',
    path: '/api/predictions/anomalies',
    expectStatus: 200,
    validate: (data) => Array.isArray(data.anomalies) || Array.isArray(data)
  },
  {
    name: 'Predictions API (risks)',
    method: 'GET',
    path: '/api/predictions/risks',
    expectStatus: 200,
    validate: (data) => Array.isArray(data.risks) || Array.isArray(data)
  },
  {
    name: 'Intelligence API',
    method: 'GET',
    path: '/api/intelligence',
    expectStatus: 200
  },
  {
    name: 'Operator Status API',
    method: 'GET',
    path: '/api/operator-status',
    expectStatus: 200
  },
  {
    name: 'Feedback POST (CORS preflight)',
    method: 'OPTIONS',
    path: '/api/feedback',
    expectStatus: 204
  }
];

async function runTest(test) {
  const url = `${PRODUCTION_URL}${test.path}`;
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: test.method,
      headers: test.method === 'POST' 
        ? { 'Content-Type': 'application/json' }
        : {},
      ...(test.body ? { body: JSON.stringify(test.body) } : {})
    });
    
    const duration = Date.now() - startTime;
    const passed = response.status === test.expectStatus;
    
    let data = null;
    let validationPassed = true;
    let validationError = null;
    
    if (passed && test.validate) {
      try {
        data = await response.json();
        validationPassed = test.validate(data);
        if (!validationPassed) {
          validationError = 'Validation failed';
        }
      } catch (err) {
        validationPassed = false;
        validationError = err.message;
      }
    }
    
    return {
      name: test.name,
      passed: passed && validationPassed,
      status: response.status,
      expected: test.expectStatus,
      duration,
      error: passed ? validationError : `Expected ${test.expectStatus}, got ${response.status}`,
      data: validationPassed ? null : data
    };
    
  } catch (err) {
    return {
      name: test.name,
      passed: false,
      status: 'ERROR',
      expected: test.expectStatus,
      duration: Date.now() - startTime,
      error: err.message,
      data: null
    };
  }
}

async function verifyProduction() {
  console.log(`🔍 Verifying Production Deployment\n`);
  console.log(`URL: ${PRODUCTION_URL}\n`);
  console.log('─'.repeat(60));
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
    
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASS' : 'FAIL';
    
    console.log(`${icon} ${result.name}`);
    console.log(`   Status: ${result.status} (${result.duration}ms)`);
    
    if (!result.passed) {
      console.log(`   Error: ${result.error}`);
      if (result.data) {
        console.log(`   Response: ${JSON.stringify(result.data).substring(0, 200)}`);
      }
      failed++;
    } else {
      passed++;
    }
    console.log('');
  }
  
  console.log('─'.repeat(60));
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('\n✅ PRODUCTION VERIFIED');
    process.exit(0);
  } else {
    console.log('\n❌ PRODUCTION VERIFICATION FAILED');
    console.log('\nRun locally to fix:');
    console.log('  cd ~/projects/gtm-os');
    console.log('  npm run dev');
    process.exit(1);
  }
}

verifyProduction().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
