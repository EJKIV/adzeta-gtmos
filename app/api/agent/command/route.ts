import { NextRequest, NextResponse } from 'next/server';
import { executeSkill, executeFromText, matchFromText } from '@/lib/skills/executor';
import type { ResultContext, SkillOutput, StatusPhase, StatusEvent } from '@/lib/skills/types';
import {
  isOpenClawChatAvailable,
  streamChatCompletion,
} from '@/src/lib/research/openclaw-client';
import { authenticate } from '@/lib/api-auth';
import { getServerSupabase } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function statusFrame(phase: StatusPhase, message: string, extra?: Partial<StatusEvent>): string {
  return sseFrame('status', { phase, message, ts: Date.now(), ...extra });
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
// Database helpers
// ---------------------------------------------------------------------------

async function storeUserMessage(
  supabase: ReturnType<typeof getServerSupabase>,
  sessionId: string,
  text: string,
  clientId?: string
) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      type: 'user',
      text,
      client_id: clientId,
    })
    .select()
    .single();
    
  if (error) {
    console.warn('[command] Failed to store user message:', error.message);
  }
  return data;
}

async function storeAssistantMessage(
  supabase: ReturnType<typeof getServerSupabase>,
  sessionId: string,
  text: string,
  output: SkillOutput,
  metadata?: Record<string, unknown>
) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      type: 'assistant',
      text,
      output,
      metadata: metadata || {},
    })
    .select()
    .single();
    
  if (error) {
    console.warn('[command] Failed to store assistant message:', error.message);
  }
  return data;
}

async function logCommand(
  supabase: ReturnType<typeof getServerSupabase>,
  params: {
    userId: string;
    rawCommand: string;
    sessionId: string;
    commandType?: string;
    skillId?: string;
    status: string;
    resultType?: string;
    resultMessage?: string;
    relatedResources?: Record<string, unknown>;
    startedAt: string;
    completedAt: string;
    durationMs: number;
  }
) {
  if (!supabase) return null;
  
  const { error } = await supabase
    .from('command_history')
    .insert({
      user_id: params.userId,
      raw_command: params.rawCommand,
      session_id: params.sessionId,
      command_type: params.commandType,
      routed_to: params.skillId,
      handler_name: params.skillId,
      status: params.status,
      result_type: params.resultType,
      result_message: params.resultMessage,
      related_resources: params.relatedResources || {},
      started_at: params.startedAt,
      completed_at: params.completedAt,
      duration_ms: params.durationMs,
    });
    
  if (error) {
    console.warn('[command] Failed to log command:', error.message);
  }
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
  const supabase = getServerSupabase();
  const userId = auth.userId || (body.userId as string) || 'anonymous';
  const sessionId = (body.sessionId as string) || crypto.randomUUID();
  const clientId = body.clientId as string | undefined;

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
  const startedAt = new Date().toISOString();
  
  // Store user message immediately
  await storeUserMessage(supabase, sessionId, userText, clientId);

  const encoder = new TextEncoder();
  let aiResponseBuffer = '';
  let skillOutput: SkillOutput | null = null;
  let executionMs = 0;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const skillContext = { source: 'ui' as const, resultContext, userId };

        // 1. Match skill
        controller.enqueue(encoder.encode(statusFrame('matching', 'Understanding your request...')));
        const match = matchFromText(userText, skillContext);
        console.log(`[command] skill matched: ${match?.skillId ?? 'none'}, starting execution`);
        const skillStart = Date.now();

        // 2. Execute skill
        if (match) {
          controller.enqueue(
            encoder.encode(
              statusFrame('executing', `Running ${match.skillName}...`, {
                skillId: match.skillId,
                skillName: match.skillName,
              })
            )
          );
          skillOutput = await executeSkill({
            skillId: match.skillId,
            params: match.params,
            context: match.context,
          });
        } else {
          controller.enqueue(encoder.encode(statusFrame('executing', 'Processing...')));
          skillOutput = await executeFromText(userText, skillContext);
        }
        executionMs = Date.now() - skillStart;
        console.log(`[command] skill executed in ${executionMs}ms, OpenClaw available: ${isOpenClawChatAvailable()}`);
        controller.enqueue(encoder.encode(sseFrame('skill-result', skillOutput)));

        // 3. Stream OpenClaw chat if available
        if (isOpenClawChatAvailable()) {
          controller.enqueue(encoder.encode(statusFrame('connecting', 'Connecting to AI agent...')));
          try {
            const messages = buildOpenClawMessages(userText, skillOutput);
            const sessionUserId = userId;
            console.log(`[command] starting OpenClaw stream for userId=${sessionUserId}`);
            let firstChunk = true;

            for await (const chunk of streamChatCompletion({
              message: messages[0].content,
              userId: sessionUserId,
              signal: AbortSignal.timeout(60_000),
            })) {
              if (chunk.done) break;
              if (firstChunk) {
                controller.enqueue(encoder.encode(statusFrame('streaming', 'AI agent is analyzing...')));
                firstChunk = false;
              }
              // Collect response for storage
              aiResponseBuffer += chunk.content;
              controller.enqueue(
                encoder.encode(sseFrame('openclaw-delta', { content: chunk.content }))
              );
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Zetty unavailable';
            console.log(`[command] OpenClaw error: ${message}`);
            const hint = (err as Error & { hint?: string })?.hint;
            controller.enqueue(
              encoder.encode(
                sseFrame('openclaw-error', {
                  message,
                  ...(hint ? { hint } : {}),
                })
              )
            );
            aiResponseBuffer += `\n\n[Error: ${message}]`;
          }
        } else {
          // No OpenClaw - just return skill result
          aiResponseBuffer = skillOutput.blocks
            .map(b => b.type === 'text' ? b.content : '')
            .filter(Boolean)
            .join('\n\n');
        }

        // 4. Store assistant message
        await storeAssistantMessage(supabase, sessionId, aiResponseBuffer, skillOutput, {
          model: 'kimi-k2.5:cloud',
          duration_ms: executionMs,
          source: isOpenClawChatAvailable() ? 'openclaw' : 'local',
        });

        // 5. Log command history
        const completedAt = new Date().toISOString();
        await logCommand(supabase, {
          userId,
          rawCommand: userText,
          sessionId,
          commandType: match?.skillId || 'unknown',
          skillId: match?.skillId,
          status: 'completed',
          resultType: skillOutput.status === 'error' ? 'failure' : 'success',
          resultMessage: aiResponseBuffer.slice(0, 500),
          startedAt,
          completedAt,
          durationMs: executionMs,
        });

        // 6. Done
        controller.enqueue(encoder.encode(sseFrame('done', {})));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Execution failed';
        console.error('[command] Error:', errorMessage);
        
        // Store error message
        skillOutput = {
          skillId: 'error',
          status: 'error',
          blocks: [
            {
              type: 'error',
              message: errorMessage,
            },
          ],
          followUps: [],
          executionMs: 0,
          dataFreshness: 'mock',
        };
        
        await storeAssistantMessage(supabase, sessionId, errorMessage, skillOutput, {
          error: true,
        });

        // Log failed command
        await logCommand(supabase, {
          userId,
          rawCommand: userText,
          sessionId,
          status: 'failed',
          resultType: 'failure',
          resultMessage: errorMessage,
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - new Date(startedAt).getTime(),
        });

        controller.enqueue(
          encoder.encode(
            sseFrame('skill-result', skillOutput)
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
