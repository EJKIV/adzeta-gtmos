'use client';

import { useState, useCallback, useRef } from 'react';
import { LoginGate } from '@/app/components/login-gate';
import { useAuth } from '@/app/components/auth-provider';
import { KpiStrip } from '@/app/components/kpi-strip';
import { DashboardCommand } from '@/app/components/dashboard-command';
import { ResponseThread, type ThreadEntry } from '@/app/components/response-thread';
import { ActivityFeed } from '@/app/components/activity-feed';
import { QuickActionsBar } from '@/app/components/quick-actions';
import { parseSSEBuffer } from '@/lib/sse/parse-sse';
import type { SkillOutput, ResultContext } from '@/lib/skills/types';

export default function Home() {
  return (
    <LoginGate>
      <DashboardContent />
    </LoginGate>
  );
}

function extractResultContext(output: SkillOutput): ResultContext | undefined {
  for (const block of output.blocks) {
    if (block.type === 'table' && block.rows.length > 0) {
      const ids = block.rows.map((r) => r.id as string).filter(Boolean);
      if (ids.length) {
        return { prospectIds: ids, sourceSkillId: output.skillId, resultCount: ids.length };
      }
    }
  }
  return undefined;
}

function DashboardContent() {
  const { user } = useAuth();
  const [thread, setThread] = useState<ThreadEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResultContext, setLastResultContext] = useState<ResultContext | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  const handleCommand = useCallback(async (text: string) => {
    // Abort any in-flight stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const commandId = `cmd-${Date.now()}`;
    const responseId = `res-${Date.now()}`;

    // Add command to thread
    setThread((prev) => [
      ...prev,
      { id: commandId, type: 'command', text, timestamp: new Date() },
    ]);

    setIsProcessing(true);

    try {
      const res = await fetch('/api/agent/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          text,
          resultContext: lastResultContext,
          userId: user?.id,
        }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let openclawText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSEBuffer(buffer);
        buffer = remaining;

        for (const evt of events) {
          switch (evt.event) {
            case 'skill-result': {
              const output: SkillOutput = JSON.parse(evt.data);
              const ctx = extractResultContext(output);
              if (ctx) setLastResultContext(ctx);

              setThread((prev) => [
                ...prev,
                { id: responseId, type: 'response', output, timestamp: new Date() },
              ]);
              break;
            }

            case 'openclaw-delta': {
              const { content } = JSON.parse(evt.data) as { content: string };
              openclawText += content;

              setThread((prev) =>
                prev.map((entry) => {
                  if (entry.id !== responseId || !entry.output) return entry;
                  // Find existing text block or prepare to append one
                  const hasTextBlock = entry.output.blocks.some((b) => b.type === 'text');
                  const updatedBlocks = hasTextBlock
                    ? entry.output.blocks.map((b) =>
                        b.type === 'text'
                          ? { ...b, content: openclawText, isStreaming: true }
                          : b
                      )
                    : [
                        ...entry.output.blocks,
                        { type: 'text' as const, content: openclawText, source: 'openclaw', isStreaming: true },
                      ];
                  return { ...entry, output: { ...entry.output, blocks: updatedBlocks } };
                })
              );
              break;
            }

            case 'openclaw-error':
              // Silently degrade — user still has local skill blocks
              break;

            case 'done': {
              // Mark text block streaming as complete
              setThread((prev) =>
                prev.map((entry) => {
                  if (entry.id !== responseId || !entry.output) return entry;
                  return {
                    ...entry,
                    output: {
                      ...entry.output,
                      blocks: entry.output.blocks.map((b) =>
                        b.type === 'text' ? { ...b, isStreaming: false } : b
                      ),
                    },
                  };
                })
              );
              break;
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setThread((prev) => [
        ...prev,
        {
          id: responseId,
          type: 'response',
          output: {
            skillId: 'error',
            status: 'error',
            blocks: [{ type: 'error', message: 'Something went wrong. Please try again.' }],
            followUps: [{ label: 'Show help', command: 'help' }],
            executionMs: 0,
            dataFreshness: 'mock',
          },
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }, [lastResultContext, user?.id]);

  return (
    <div
      className="light-content min-h-screen transition-colors duration-300"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Dashboard
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              Agent-first command center
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: 'rgba(22, 163, 74, 0.08)' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16a34a]" />
              </span>
              <span className="text-xs font-semibold text-[#16a34a]">
                Live
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content — single column, centered */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <KpiStrip />
        <DashboardCommand onCommand={handleCommand} isProcessing={isProcessing} />
        <QuickActionsBar onAction={handleCommand} />
        <ResponseThread entries={thread} onFollowUp={handleCommand} />
        <ActivityFeed onAction={handleCommand} />
      </main>
    </div>
  );
}
