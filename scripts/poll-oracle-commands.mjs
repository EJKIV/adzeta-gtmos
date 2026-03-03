#!/usr/bin/env node

/**
 * Standalone polling script for oracle_commands.
 *
 * Watches for status='pending' rows, spawns adzeta-gtm via OpenClaw CLI,
 * and writes the result back to oracle_commands.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   OPENCLAW_GATEWAY_URL=... OPENCLAW_GATEWAY_TOKEN=... \
 *   node scripts/poll-oracle-commands.mjs
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ───────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL;
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '30000', 10);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!OPENCLAW_GATEWAY_URL) {
  console.error('Missing required env var: OPENCLAW_GATEWAY_URL');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Core logic ───────────────────────────────────────────────────────

async function processPendingCommands() {
  // Fetch all pending rows
  const { data: pending, error: fetchErr } = await supabase
    .from('oracle_commands')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (fetchErr) {
    console.error('[poll] Failed to fetch pending commands:', fetchErr.message);
    return;
  }

  if (!pending || pending.length === 0) return;

  console.log(`[poll] Found ${pending.length} pending command(s)`);

  for (const cmd of pending) {
    await processCommand(cmd);
  }
}

async function processCommand(cmd) {
  const { command_id, raw_input } = cmd;
  console.log(`[poll] Processing command ${command_id}: ${raw_input.slice(0, 80)}`);

  // Mark as processing
  const { error: updateErr } = await supabase
    .from('oracle_commands')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('command_id', command_id);

  if (updateErr) {
    console.error(`[poll] Failed to mark ${command_id} as processing:`, updateErr.message);
    return;
  }

  try {
    // Spawn adzeta-gtm via OpenClaw gateway
    const res = await fetch(`${OPENCLAW_GATEWAY_URL}/sessions/spawn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Password': OPENCLAW_GATEWAY_TOKEN,
      },
      body: JSON.stringify({
        agentId: 'adzeta-gtm',
        task: `GTM Command from oracle:\n${raw_input}`,
        thread: true,
        mode: 'session',
        label: `command-${command_id}`,
        timeoutSeconds: 300,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenClaw spawn failed: ${res.status} ${errText}`);
    }

    const result = await res.json();
    console.log(`[poll] Spawned adzeta-gtm for ${command_id}:`, result.sessionKey ?? '(no key)');

    // Mark completed
    const now = new Date().toISOString();
    await supabase
      .from('oracle_commands')
      .update({
        status: 'completed',
        response: JSON.stringify(result),
        updated_at: now,
        completed_at: now,
      })
      .eq('command_id', command_id);

  } catch (err) {
    console.error(`[poll] Command ${command_id} failed:`, err.message ?? err);

    const now = new Date().toISOString();
    await supabase
      .from('oracle_commands')
      .update({
        status: 'failed',
        response: err.message ?? String(err),
        updated_at: now,
        completed_at: now,
      })
      .eq('command_id', command_id);
  }
}

// ── Polling loop with graceful shutdown ──────────────────────────────

let running = true;
let timer;

function shutdown(signal) {
  console.log(`\n[poll] Received ${signal}, shutting down…`);
  running = false;
  if (timer) clearInterval(timer);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log(`[poll] Starting oracle_commands poller (interval: ${POLL_INTERVAL_MS}ms)`);
console.log(`[poll] OpenClaw gateway: ${OPENCLAW_GATEWAY_URL}`);

// Run once immediately, then on interval
await processPendingCommands();

timer = setInterval(async () => {
  if (!running) return;
  try {
    await processPendingCommands();
  } catch (err) {
    console.error('[poll] Unexpected error in poll loop:', err);
  }
}, POLL_INTERVAL_MS);
