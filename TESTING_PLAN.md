# GTM OS — Comprehensive Testing Plan

**Version:** 1.0  
**Date:** 2026-02-26  
**Scope:** Your GTM OS app (`~/projects/gtm-os`) + OpenClaw/Zetty integration

---

## System Architecture (Simplified)

```
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR GTM OS (Port 3001)                      │
│                    ~/projects/gtm-os                            │
│  ┌────────────┐     ┌──────────────┐     ┌──────────────────┐ │
│  │   Chat UI  │────▶│ Local Skills │────▶│ Data (Supabase)  │ │
│  │  (3001)    │     │   (local)    │     │   (your DB)      │ │
│  └────────────┘     └──────────────┘     └──────────────────┘ │
│         │                                                     │
│         │ (when local skills insufficient)                    │
│         ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ POST /api/agent/command                                 │ │
│  │   ├─→ executeSkill() (local, fast)                      │ │
│  │   └─→ streamChatCompletion() → OpenClaw/Zetty (async) │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/SSE
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  OPENCLAW GATEWAY                               │
│                    (to be started)                              │
│              ┌──────────────────────────┐                       │
│              │  Routes message to       │                       │
│              │  agent: adzeta-gtm       │                       │
│              │  (Zetty/GTM Lead)        │                       │
│              └──────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Internal routing
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ZETTY AGENT                                 │
│                    (adzeta-gtm)                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  1. Receives user query                                   │ │
│  │  2. Classifies intent                                     │ │
│  │  3. Spawns specialists (prospect-researcher, etc.)      │ │
│  │  4. Returns results via SSE stream                        │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Layers

| Layer | Component | Status Goal | Priority |
|-------|-----------|-------------|----------|
| **L1** | Your GTM OS (stand-alone) | All local skills work | 🔴 Critical |
| **L2** | OpenClaw Gateway | Gateway accepts connections | 🔴 Critical |
| **L3** | Zetty Agent (adzeta-gtm) | Agent responds to queries | 🔴 Critical |
| **L4** | Integration (Your App → Zetty) | Full chat flow works | 🟡 High |
| **L5** | End-to-End (User → Zetty → Response) | Complete user journey | 🟡 High |

---

## Test Categories

### Category A: Local Skills (No Dependencies)

**Purpose:** Verify your app works without OpenClaw

**Prerequisites:**
- [ ] Your app installed: `cd ~/projects/gtm-os && npm install`
- [ ] Local dev database running (or mock data)

**Tests:**

| ID | Test | Command/Steps | Expected |
|----|------|---------------|----------|
| A1 | Health check | `curl http://localhost:3001/api/agent/command -X POST -d '{"text": "help"}'` | Returns skill list |
| A2 | Local skill works | Send "research prospects" via chat UI | Returns prospect table |
| A3 | Fallback works | Send unknown command | Returns "no matching skill" or help |
| A4 | Error handling | Disconnect network, send command | Graceful error message |

**Pass Criteria:**
- All local skills execute in < 500ms
- Errors caught and displayed
- No crashes on edge cases

---

### Category B: OpenClaw Gateway Connectivity

**Purpose:** Verify Gateway is reachable

**Prerequisites:**
- [ ] OpenClaw Gateway running (check with: `openclaw gateway status`)
- [ ] Gateway URL known (e.g., `http://localhost:PORT` or Tailscale IP)
- [ ] Gateway token configured

**Environment Variables (in your app):**
```bash
OPENCLAW_GATEWAY_URL=http://localhost:PORT  # or http://100.x.x.x:PORT
OPENCLAW_GATEWAY_TOKEN=sk_xxx
OPENCLAW_AGENT_ID=adzeta-gtm
```

**Tests:**

| ID | Test | Command | Expected |
|----|------|---------|----------|
| B1 | Gateway health | `curl $OPENCLAW_GATEWAY_URL/health` | 200 OK |
| B2 | Tool invocation | `curl $OPENCLAW_GATEWAY_URL/v1/tools/invoke` | Auth accepted/rejected |
| B3 | Chat endpoint | `curl $OPENCLAW_GATEWAY_URL/v1/chat/completions` | 200 (with valid token) |
| B4 | From your app | Check `isOpenClawAvailable()` | Returns `true` |

**Pass Criteria:**
- All Gateway endpoints respond
- Auth works with token
- Network errors are properly classified

---

### Category C: Zetty Agent (adzeta-gtm)

**Purpose:** Verify agent spawns and responds

**Prerequisites:**
- [ ] Gateway running
- [ ] Agent configured: `~/.openclaw/openclaw.json` includes `adzeta-gtm`
- [ ] Agent files present: `~/.openclaw/agents/adzeta-gtm/agent/`

**Tests:**

| ID | Test | Method | Expected |
|----|------|--------|----------|
| C1 | Agent status | Check `openclaw agents list` | Shows `adzeta-gtm` |
| C2 | Direct query | `curl $OPENCLAW_GATEWAY_URL/v1/chat/completions -d '{"model": "openclaw:adzeta-gtm", "messages": [{"role": "user", "content": "Hello"}]}'` | Agent responds |
| C3 | Stream works | Same as C2 with `stream: true` | SSE stream received |
| C4 | Intent classification | Send "Find CMOs at fintechs" | Returns intent: research |

**Pass Criteria:**
- Agent responds to queries
- Intent classification works
- Streaming responses complete

---

### Category D: Integration (Your App → Zetty)

**Purpose:** Verify full flow from your UI through to Zetty

**Prerequisites:**
- [ ] Your app running: `npm run dev` (port 3001)
- [ ] Gateway running
- [ ] Zetty configured

**Tests:**

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| D1 | SSE connects | Open chat UI, send message | Status: "Connecting to AI agent..." |
| D2 | Status messages | Watch status bar | Shows: matching → executing → connecting → streaming |
| D3 | Zetty response | Send: "What specialists are available?" | Zetty returns list of 12 specialists |
| D4 | Stream ends | Complete a conversation | "Done" received, UI shows completion |
| D5 | Thread persists | Refresh page, send follow-up | Zetty remembers context |
| D6 | Error handling | Stop Gateway, send message | UI shows "Zetty unavailable" with hint |

**Pass Criteria:**
- Status messages appear in sequence
- Zetty responses render correctly
- Errors handled gracefully
- Thread continuity maintained

---

### Category E: End-to-End Scenarios

**Purpose:** Real-world user workflows

**Scenario E1: Research → Campaign Creation**

```
1. User: "Find CMOs at Series B fintechs"
   └─→ Local skill executes
   └─→ Returns prospect table

2. User: "Create an email sequence for these prospects"
   └─→ Local skill: "execution" (campaign_create)
   └─→ Or: escalate to Zetty if not confident
   └─→ Campaign created

3. Verify: Campaign appears in your DB, linked to prospects
```

**Scenario E2: Fallback to Zetty**

```
1. User: "What should I prioritize this week?"
   └─→ Local skills: No match
   └─→ Escalate to Zetty
   └─→ Zetty analyzes pipeline, returns recommendations
   
2. Verify: Recommendations surfaced with rationale
```

**Scenario E3: Multi-turn Conversation**

```
1. User: "Research AI companies"
2. Zetty: Returns company list
3. User: "Which ones have recent funding?"
4. Zetty: Filters list
5. Verify: Context maintained across turns
```

---

## Test Execution Plan

### Phase 1: Foundation (Local Only)

**Goal:** Your app works standalone

```bash
# Setup
cd ~/projects/gtm-os
npm install

# Start your app
npm run dev

# Run local tests (no OpenClaw)
# In browser: http://localhost:3001
curl http://localhost:3001/api/agent/command \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"text": "help"}'
```

**Checklist:**
- [ ] A1: Health check passes
- [ ] A2: Local skills work
- [ ] A3: Fallback works
- [ ] A4: Error handling works

**Success Criteria:** App runs without crashes, all local features work

---

### Phase 2: OpenClaw Infrastructure

**Goal:** Gateway and agent are ready

```bash
# Check OpenClaw status
openclaw status
openclaw agents list

# If not running, start Gateway
openclaw gateway run --bind loopback --port PORT --auth password --password xxx

# Verify configuration
echo $OPENCLAW_GATEWAY_URL
echo $OPENCLAW_AGENT_ID  # Should be: adzeta-gtm
```

**Checklist:**
- [ ] B1: Gateway responds to health check
- [ ] B2: Auth works
- [ ] C1: Agent listed
- [ ] C2: Direct query works

**Success Criteria:** Gateway + Zetty operational

---

### Phase 3: Integration Testing

**Goal:** Your app talks to Zetty

```bash
# Ensure env vars are set
cat .env.local | grep OPENCLAW

# Restart your app to pick up env vars
# Test via UI
```

**Checklist:**
- [ ] D1: SSE connects
- [ ] D2: Status messages flow
- [ ] D3: Zetty responds to queries
- [ ] D4: Stream completes
- [ ] D5: Thread persists

**Success Criteria:** Full chat flow works end-to-end

---

### Phase 4: End-to-End Validation

**Goal:** Real user scenarios work

**Execute Scenarios:**
- [ ] E1: Research → Campaign
- [ ] E2: Fallback to Zetty
- [ ] E3: Multi-turn conversation

**Success Criteria:** All scenarios complete successfully

---

## Automated Test Commands

### Quick Health Check

```bash
#!/bin/bash
# save as: scripts/test-health.sh

echo "=== GTM OS Health Check ==="

# Test local app
echo "Testing local app..."
curl -s http://localhost:3001/api/agent/command \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"text": "ping"}' \
  | jq -e '.skillId' && echo "✓ Local app OK" || echo "✗ Local app FAILED"

# Test Gateway
echo "Testing OpenClaw Gateway..."
curl -s $OPENCLAW_GATEWAY_URL/health \
  | jq -e '.status' && echo "✓ Gateway OK" || echo "✗ Gateway FAILED"

# Test Zetty directly
echo "Testing Zetty agent..."
curl -s $OPENCLAW_GATEWAY_URL/v1/chat/completions \
  -X POST \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "openclaw:adzeta-gtm", "messages": [{"role": "user", "content": "hello"}], "max_tokens": 50}' \
  | grep -q "content" && echo "✓ Zetty OK" || echo "✗ Zetty FAILED"

echo "=== Complete ==="
```

### Load Test (Integration)

```bash
# Send 10 concurrent requests to your app
for i in {1..10}; do
  curl -s http://localhost:3001/api/agent/command \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"test $i\"}" &
done
wait
echo "Load test complete"
```

---

## Debugging Guide

### Common Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Gateway not running** | "Zetty unavailable", network error | `openclaw gateway start` |
| **Wrong agent ID** | "Agent not found" | Verify `OPENCLAW_AGENT_ID=adzeta-gtm` |
| **Auth failure** | 401 errors | Check `OPENCLAW_GATEWAY_TOKEN` |
| **Port conflict** | "Address already in use" | Change port in next.config |
| **CORS** | Request blocked | Add `Access-Control-Allow-Origin` to Gateway |
| **Missing skills** | "No matching skill" | Check `lib/skills/` directory |

### Diagnostic Commands

```bash
# Check what's running
lsof -i :3001  # Your app
lsof -i :PORT  # Gateway (whatever port it's on)

# Check OpenClaw config
cat ~/.openclaw/openclaw.json | jq '.agents'

# Verify agent files
ls -la ~/.openclaw/agents/adzeta-gtm/agent/

# Check Gateway logs
openclaw gateway logs

# Test from your app directory
node -e "console.log(process.env.OPENCLAW_GATEWAY_URL)"
```

---

## Success Criteria Summary

### Phase 1 (Local)
- [ ] App starts without errors
- [ ] Local skills execute
- [ ] Chat UI renders
- [ ] No dependency on OpenClaw

### Phase 2 (Infrastructure)
- [ ] Gateway running and accessible
- [ ] Agent configured and responsive
- [ ] Authentication works
- [ ] Direct queries succeed

### Phase 3 (Integration)
- [ ] Your app connects to Gateway
- [ ] SSE streams work
- [ ] Zetty responses render
- [ ] Thread persistence works
- [ ] Error handling graceful

### Phase 4 (E2E)
- [ ] Real user scenarios complete
- [ ] Multi-turn conversations work
- [ ] Fallback to Zetty works
- [ ] Performance acceptable (< 3s responses)

---

## Appendix

### Files You Need to Modify/Check

| File | Purpose |
|------|---------|
| `~/projects/gtm-os/.env.local` | Environment variables |
| `~/projects/gtm-os/src/lib/research/openclaw-client.ts` | Gateway client |
| `~/projects/gtm-os/app/api/agent/command/route.ts` | Command handler |
| `~/projects/gtm-os/app/hooks/use-chat-engine.ts` | Chat logic |
| `~/.openclaw/openclaw.json` | Agent configuration |
| `~/.openclaw/agents/adzeta-gtm/agent/` | Zetty agent files |

### Ports to Remember

| Service | Port | Command to Check |
|---------|------|------------------|
| Your GTM OS | 3001 | `curl http://localhost:3001` |
| GTM Command Center | 3000 | `curl http://localhost:3000/api/adzeta-gtm` |
| OpenClaw Gateway | ??? | `openclaw gateway status` |

---

*Document: `~/projects/gtm-os/TESTING_PLAN.md`*
