import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { executeSkill, executeFromText } from '@/lib/skills/executor';
import type { ResultContext, SkillOutput } from '@/lib/skills/types';
import {
  isOpenClawChatAvailable,
  streamChatCompletion,
} from '@/src/lib/research/openclaw-client';

/**
 * Authenticate the request via:
 * 1. Bearer token (for OpenClaw / API callers)
 * 2. Supabase session cookie (for browser requests)
 * 3. Development bypass
 */
async function authenticate(req: NextRequest): Promise<{ ok: boolean; userId?: string }> {
  // 1. Bearer token (machine-to-machine)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const apiKey = process.env.OPENCLAW_API_KEY;
    if (apiKey && token === apiKey) return { ok: true };
  }

  // 2. Supabase session cookie (browser)
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return { ok: true, userId: user.id };
    }
  } catch {
    // Cookie parsing failed — fall through
  }

  // 3. Development bypass
  if (process.env.NODE_ENV === 'development') return { ok: true };

  return { ok: false };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Build the user message that OpenClaw sees.
 * Includes the raw user text plus a compact serialisation of the local
 * skill output so the LLM can summarise / critique it.
 */
function buildOpenClawMessages(
  userText: string,
  skillOutput: SkillOutput
): Array<{ role: 'user'; content: string }> {
  // Truncate large tables to keep context size reasonable
  const compactBlocks = skillOutput.blocks.map((b) => {
    if (b.type === 'table' && b.rows.length > 10) {
      return { ...b, rows: b.rows.slice(0, 10), _truncated: true };
    }
    return b;
  });

  const context = JSON.stringify({
    skillId: skillOutput.skillId,
    status: skillOutput.status,
    blocks: compactBlocks,
    dataFreshness: skillOutput.dataFreshness,
  });

  return [
    {
      role: 'user' as const,
      content: `User query: ${userText}\n\nLocal skill output:\n${context}`,
    },
  ];
}

// ---------------------------------------------------------------------------
// POST handler — dual mode (SSE streaming or JSON)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const wantsSSE = req.headers.get('accept') === 'text/event-stream';

  // ── JSON path (backward-compatible) ────────────────────────────────────
  if (!wantsSSE) {
    try {
      const resultContext = body.resultContext as ResultContext | undefined;

      if (typeof body.skillId === 'string') {
        const output = await executeSkill({
          skillId: body.skillId,
          params: (body.params as Record<string, unknown>) ?? {},
          context: { source: 'api', resultContext },
        });
        return NextResponse.json(output);
      }

      if (typeof body.text === 'string') {
        const output = await executeFromText(body.text, { source: 'api', resultContext });
        return NextResponse.json(output);
      }

      return NextResponse.json(
        { error: 'Request must include "text" (string) or "skillId" (string)' },
        { status: 400 }
      );
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Execution failed' },
        { status: 500 }
      );
    }
  }

  // ── SSE path ───────────────────────────────────────────────────────────
  if (typeof body.text !== 'string') {
    return NextResponse.json(
      { error: 'SSE mode requires "text" (string)' },
      { status: 400 }
    );
  }

  const userText = body.text as string;
  const resultContext = body.resultContext as ResultContext | undefined;
  // Prefer server-verified session userId over client-provided one
  const userId = auth.userId || (body.userId as string) || undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Execute local skill
        const skillOutput = await executeFromText(userText, {
          source: 'ui',
          resultContext,
          userId,
        });
        controller.enqueue(encoder.encode(sseFrame('skill-result', skillOutput)));

        // 2. Stream OpenClaw chat if available
        if (isOpenClawChatAvailable()) {
          try {
            const messages = buildOpenClawMessages(userText, skillOutput);
            const sessionUserId = userId || 'anonymous';

            for await (const chunk of streamChatCompletion({
              message: messages[0].content,
              userId: sessionUserId,
              signal: AbortSignal.timeout(60_000),
            })) {
              if (chunk.done) break;
              controller.enqueue(
                encoder.encode(sseFrame('openclaw-delta', { content: chunk.content }))
              );
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'OpenClaw unavailable';
            const hint = (err as Error & { hint?: string })?.hint;
            controller.enqueue(
              encoder.encode(
                sseFrame('openclaw-error', {
                  message,
                  ...(hint ? { hint } : {}),
                })
              )
            );
          }
        }

        // 3. Done
        controller.enqueue(encoder.encode(sseFrame('done', {})));
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            sseFrame('skill-result', {
              skillId: 'error',
              status: 'error',
              blocks: [
                {
                  type: 'error',
                  message: err instanceof Error ? err.message : 'Execution failed',
                },
              ],
              followUps: [],
              executionMs: 0,
              dataFreshness: 'mock',
            })
          )
        );
        controller.enqueue(encoder.encode(sseFrame('done', {})));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
