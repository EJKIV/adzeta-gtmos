import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/environment';
import { authenticate } from '@/lib/api-auth';

const POLL_MS = 2000;
const TIMEOUT_MS = 300_000; // 5 min
const CHUNK_SIZE = 5; // words per chunk
const CHUNK_DELAY_MS = 30;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Extract blocks from the stored response.
 * The response may be:
 *   1. OpenClaw gateway format: { payloads: [{ text: '{"version":"1.0","blocks":[...]}' }], meta }
 *   2. Direct blocks format:    { version: "1.0", blocks: [...] }
 *   3. Plain text (returns null)
 */
function extractBlocks(response: string): unknown[] | null {
  try {
    const outer = JSON.parse(response);

    // Direct format: { blocks: [...] }
    if (Array.isArray(outer.blocks)) return outer.blocks;

    // OpenClaw gateway format: { payloads: [{ text: "<json>" }] }
    if (Array.isArray(outer.payloads)) {
      for (const payload of outer.payloads) {
        if (typeof payload.text === 'string') {
          try {
            const inner = JSON.parse(payload.text);
            if (Array.isArray(inner.blocks)) return inner.blocks;
          } catch {
            // payload.text wasn't JSON — skip
          }
        }
      }
    }
  } catch {
    // Not JSON at all
  }
  return null;
}

/**
 * Extract readable plain text from the stored response.
 * Handles OpenClaw payloads wrapper or raw strings.
 */
function extractPlainText(response: string): string {
  try {
    const outer = JSON.parse(response);
    // OpenClaw gateway: pull text from first payload
    if (Array.isArray(outer.payloads)) {
      const texts = outer.payloads
        .map((p: { text?: string }) => p.text)
        .filter(Boolean);
      if (texts.length > 0) return texts.join('\n\n');
    }
  } catch {
    // Not JSON — use raw string
  }
  return response;
}

const STATUS_MESSAGES: Record<string, { status: string; message: string }> = {
  pending:    { status: 'pending',   message: 'Your command is queued and waiting for an available agent...' },
  processing: { status: 'executing', message: 'The agent has picked up your request and is working on it...' },
  executing:  { status: 'executing', message: 'Generating a structured response — this may take a moment for complex queries...' },
};

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.ok) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const commandId = url.searchParams.get('commandId');
  const env = (url.searchParams.get('environment') as 'dev' | 'prod') || 'dev';

  if (!commandId) {
    return new Response('Missing commandId', { status: 400 });
  }

  const supabase = getSupabaseClient(env, true);

  // Verify the command exists and belongs to this user
  const { data: cmd } = await supabase
    .from('oracle_commands')
    .select('user_id')
    .eq('command_id', commandId)
    .eq('environment', env)
    .single();

  if (!cmd || (auth.userId && cmd.user_id !== auth.userId)) {
    return new Response('Not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const deadline = Date.now() + TIMEOUT_MS;
      let lastStatus = '';

      // Poll loop
      while (!closed && Date.now() < deadline) {
        try {
          const { data: row } = await supabase
            .from('oracle_commands')
            .select('status, response')
            .eq('command_id', commandId)
            .single();

          if (!row) {
            send({ type: 'error', message: 'Command not found' });
            break;
          }

          // Emit status change
          if (row.status !== lastStatus) {
            lastStatus = row.status;
            const mapped = STATUS_MESSAGES[row.status];
            if (mapped) {
              send({ type: 'status', status: mapped.status, message: mapped.message });
            }
          }

          // Completed — stream response (structured blocks or plain text)
          if (row.status === 'completed' && row.response) {
            // Try to extract structured blocks from response
            const blocks = extractBlocks(row.response);
            if (blocks) {
              for (let i = 0; i < blocks.length && !closed; i++) {
                send({ type: 'block', block: blocks[i], blockIndex: i, totalBlocks: blocks.length });
                await sleep(50);
              }
              send({ type: 'done', response: row.response });
              break;
            }

            // Plain text — extract readable text from payload or use raw
            const plainText = extractPlainText(row.response);
            const words = plainText.split(/(\s+)/);
            for (let i = 0; i < words.length && !closed; i += CHUNK_SIZE) {
              const chunk = words.slice(i, i + CHUNK_SIZE).join('');
              send({ type: 'chunk', text: chunk });
              await sleep(CHUNK_DELAY_MS);
            }
            send({ type: 'done', response: plainText });
            break;
          }

          // Failed
          if (row.status === 'failed') {
            send({ type: 'error', message: row.response || 'Command failed' });
            break;
          }
        } catch {
          // DB hiccup — keep retrying
        }

        await sleep(POLL_MS);
      }

      // Timeout
      if (!closed && Date.now() >= deadline) {
        send({ type: 'error', message: 'Timed out waiting for response' });
      }

      if (!closed) {
        closed = true;
        try { controller.close(); } catch { /* already closed */ }
      }
    },

    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
