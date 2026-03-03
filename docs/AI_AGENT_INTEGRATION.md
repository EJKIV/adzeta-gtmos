# AI Agent Integration Guide

**Zetty (adzeta-gtm) ↔ GTM-OS Frontend Integration**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Chat Input  │  │  Chat List  │  │  Message History        │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────────┘  │
└─────────┼───────────────────────────────────────────────────────┘
          │ POST /api/agent/command
          │ (SSE stream)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS API ROUTE                              │
│              /app/api/agent/command/route.ts                      │
│                                                                   │
│  1. Match skill locally (if applicable)                           │
│  2. Execute skill → get structured output                         │
│  3. Stream to OpenClaw for AI synthesis                         │
│  4. Store result in chat_messages                                 │
└─────────────────────────────────────────────────────────────────┘
          │
          │ HTTP + SSE
          │ Headers: Authorization: Bearer {token}
          │          x-openclaw-session-key: gtm-os:user:{userId}
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OPENCLAW GATEWAY                              │
│                   http://127.0.0.1:18790                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  SESSION KEY: gtm-os:user:{userId}                         │  │
│  │  (Persistent thread per user)                               │  │
│  └─────────────────────────────────────────────────────────────┘  │
          │
          │ Route to agent
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ZETTY (adzeta-gtm)                         │
│              Workspace: ~/.openclaw/workspace-gtmos/            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  SKILLS AVAILABLE:                                           │  │
│  │  • sessions_spawn (30 subagents)                             │  │
│  │  • web_search, web_fetch                                    │  │
│  │  • read, write, edit (workspace files)                       │  │
│  │  • memory_search, memory_get (long-term memory)              │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### chat_sessions
```sql
Table: chat_sessions
├── id (UUID, PK)
├── user_id (TEXT) - owner
├── title (TEXT) - auto-generated from first message
├── context_type (TEXT) - 'research', 'campaign', 'analytics'
├── is_archived (BOOLEAN)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

### chat_messages
```sql
Table: chat_messages
├── id (UUID, PK)
├── session_id (UUID, FK → chat_sessions)
├── client_id (TEXT) - deduplication
├── type (ENUM: user, assistant, system, tool_result, error)
├── text (TEXT) - message content
├── output (JSONB) - structured skill output
│   └── { skillId, status, blocks, dataFreshness }
├── tokens_used (INTEGER)
├── error_message (TEXT)
├── metadata (JSONB) - { model, duration_ms, source }
└── created_at (TIMESTAMPTZ)
```

### command_history
```sql
Table: command_history
├── id (UUID, PK)
├── user_id (TEXT)
├── raw_command (TEXT) - original user input
├── command_type (ENUM) - classified intent
├── confidence_score (NUMERIC)
├── parsed_entities (JSONB) - extracted params
├── routed_to (TEXT) - service/agent that handled
├── handler_name (TEXT) - specific function
├── status (ENUM) - pending → executing → completed/failed
├── related_resources (JSONB) - created/modified records
├── result_type (TEXT) - success/partial/failure
├── result_message (TEXT)
├── result_data (JSONB)
├── error_code (TEXT)
├── error_details (JSONB)
├── session_id (TEXT)
├── received_at, parsed_at, routed_at, started_at, completed_at
└── duration_ms (INTEGER)
```

---

## Workflow: User Question → Response

### Step 1: User Types Message
```typescript
// Frontend (React)
const sendMessage = async (text: string) => {
  const response = await fetch('/api/agent/command', {
    method: 'POST',
    headers: { 'Accept': 'text/event-stream' },
    body: JSON.stringify({
      text,
      userId: currentUser.id,
      sessionId: currentSession.id
    })
  });

  // Read SSE stream
  const reader = response.body?.getReader();
  // Handle events: status → skill-result → openclaw-delta → done
};
```

### Step 2: API Route Processes
```typescript
// /app/api/agent/command/route.ts
export async function POST(req: NextRequest) {
  // 1. Authenticate
  const auth = await authenticate(req);

  // 2. Match local skill (optional)
  const match = matchFromText(userText);

  // 3. Execute skill (gets structured data)
  const skillOutput = await executeSkill({ skillId, params });

  // 4. Stream to OpenClaw
  for await (const chunk of streamChatCompletion({
    message: buildOpenClawMessages(userText, skillOutput),
    userId: auth.userId,
    signal: AbortSignal.timeout(60_000)
  })) {
    // Yield SSE frames
  }

  // 5. Store in database
  await supabase.from('chat_messages').insert({
    session_id: sessionId,
    type: 'assistant',
    text: fullResponse,
    output: skillOutput,
    metadata: { model, duration_ms }
  });
}
```

### Step 3: OpenClaw Gateway Routes
```
POST /v1/chat/completions
Headers:
  Authorization: Bearer zetty123ffasdlkfjasldkfjfjasdlfalkj
  x-openclaw-session-key: gtm-os:user:user_123

Body:
  {
    "model": "openclaw:adzeta-gtm",
    "messages": [
      { "role": "user", "content": "Find me CMOs at Series B fintechs" }
    ],
    "stream": true
  }
```

### Step 4: Zetty Receives & Responds
```
Session Key: gtm-os:user:user_123
Agent: adzeta-gtm
Workspace: ~/.openclaw/workspace-gtmos/

Zetty can:
1. Query Supabase directly (if configured)
2. Use web_search/web_fetch for research
3. Spawn subagents for delegation
4. Access workspace files for context
5. Use memory_search for historical knowledge
```

### Step 5: Response Flows Back
```
SSE Events (chronological):
1. status: "matching" - Understanding request
2. status: "executing" - Running {skillName}
3. skill-result - { skillId, status, blocks, ... }
4. status: "connecting" - Connecting to AI
5. status: "streaming" - AI analyzing
6. openclaw-delta - "Here are 15 CMOs..."
7. openclaw-delta - "Based on your criteria..."
8. done - Stream complete
```

---

## Response Structure Types

### Type 1: Text Response
```json
{
  "type": "assistant",
  "text": "I found 23 CMOs at Series B fintechs...",
  "metadata": {
    "model": "kimi-k2.5:cloud",
    "duration_ms": 4200,
    "source": "openclaw"
  }
}
```

### Type 2: Structured Data + Synthesis
```json
{
  "type": "assistant",
  "text": "Here are the top prospects matching your ICP...",
  "output": {
    "skillId": "research_prospects",
    "status": "success",
    "blocks": [
      {
        "type": "table",
        "title": "Prospects",
        "headers": ["Name", "Company", "Title", "LinkedIn"],
        "rows": [...]
      }
    ],
    "dataFreshness": "live"
  },
  "metadata": {
    "skillExecutionMs": 1200,
    "openclawMs": 3000
  }
}
```

### Type 3: Tool Result (Error)
```json
{
  "type": "error",
  "text": "Unable to complete research",
  "error_message": "Rate limit exceeded for Apollo API",
  "metadata": {
    "retryable": true,
    "suggested_action": "Wait 60 seconds and retry"
  }
}
```

---

## Storage Patterns

### Pattern 1: Store Raw User Input
```sql
-- Always log to command_history
INSERT INTO command_history (
  user_id, raw_command, command_type, status, session_id
) VALUES (
  'user_123', 'Find CMOs at fintechs', 'research_prospects', 'pending', 'session_xyz'
);
```

### Pattern 2: Store Conversation Thread
```sql
-- User message
INSERT INTO chat_messages (session_id, type, text)
VALUES ('session_xyz', 'user', 'Find CMOs at fintechs');

-- Assistant response
INSERT INTO chat_messages (session_id, type, text, output)
VALUES ('session_xyz', 'assistant', 'Found 23 CMOs...', '{"skillId": "research", ...}');
```

### Pattern 3: Link Resources
```sql
-- Update command with created resources
UPDATE command_history
SET
  related_resources = '{"campaign_id": "uuid", "prospect_ids": ["uuid1", "uuid2"]}',
  status = 'completed',
  completed_at = NOW()
WHERE id = 'command_uuid';
```

---

## Permissions (RLS)

```sql
-- Users can only see THEIR sessions
SELECT * FROM chat_sessions WHERE user_id = auth.uid()::text;

-- Users can only see messages from THEIR sessions
SELECT cm.* FROM chat_messages cm
JOIN chat_sessions cs ON cm.session_id = cs.id
WHERE cs.user_id = auth.uid()::text;

-- Same for command_history
SELECT * FROM command_history WHERE user_id = auth.uid()::text;
```

---

## Error Handling

### OpenClaw Unavailable
```json
{
  "event": "openclaw-error",
  "data": {
    "message": "Cannot reach OpenClaw gateway",
    "hint": "Check that Tailscale is connected"
  }
}
```

### Invalid Command
```json
{
  "event": "skill-result",
  "data": {
    "status": "error",
    "blocks": [{
      "type": "error",
      "message": "I don't understand 'do the thing'. Try: 'research prospects' or 'create campaign'"
    }]
  }
}
```

### Timeout
```json
{
  "event": "skill-result",
  "data": {
    "status": "error",
    "blocks": [{
      "type": "error",
      "message": "Request timed out after 60s. Try a more specific query."
    }]
  }
}
```

---

## Configuration

### Environment Variables (already set in .env.local)
```bash
# OpenClaw Gateway
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18790
OPENCLAW_GATEWAY_TOKEN=zetty123ffasdlkfjasldkfjfjasdlfalkj
OPENCLAW_AGENT_ID=adzeta-gtm

# Supabase (for chat storage)
SUPABASE_URL=https://hqhliqjpovtncrwbhlpx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Gateway Health Check
```bash
curl http://127.0.0.1:18790/v1/health \
  -H "Authorization: Bearer zetty123ffasdlkfjasldkfjfjasdlfalkj"
```

---

## Migration Required

Apply migration to create chat tables:
```bash
psql $SUPABASE_URL -f migrations/027_create_chat_tables.sql
```

Or via Supabase dashboard → SQL Editor

---

## Summary

| Component | Purpose |
|-----------|---------|
| `chat_sessions` | Group messages into conversations |
| `chat_messages` | Store every message (user + AI) |
| `command_history` | Audit trail of all commands executed |
| `streamChatCompletion()` | Connects to Zetty via SSE |
| `x-openclaw-session-key` | Per-user persistent thread |

**Result**: Users ask questions in portal → Zetty answers → All stored in Supabase → Full context for follow-ups