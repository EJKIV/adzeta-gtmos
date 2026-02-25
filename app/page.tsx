'use client';

import { useState, useCallback } from 'react';
import { LoginGate } from '@/app/components/login-gate';
import { KpiStrip } from '@/app/components/kpi-strip';
import { DashboardCommand } from '@/app/components/dashboard-command';
import { ResponseThread, type ThreadEntry } from '@/app/components/response-thread';
import { ActivityFeed } from '@/app/components/activity-feed';
import { QuickActionsBar } from '@/app/components/quick-actions';
import { executeFromText } from '@/lib/skills/executor';

export default function Home() {
  return (
    <LoginGate>
      <DashboardContent />
    </LoginGate>
  );
}

function DashboardContent() {
  const [thread, setThread] = useState<ThreadEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCommand = useCallback(async (text: string) => {
    const commandId = `cmd-${Date.now()}`;

    // Add command to thread
    setThread((prev) => [
      ...prev,
      { id: commandId, type: 'command', text, timestamp: new Date() },
    ]);

    setIsProcessing(true);

    try {
      const output = await executeFromText(text, { source: 'ui' });
      setThread((prev) => [
        ...prev,
        { id: `res-${Date.now()}`, type: 'response', output, timestamp: new Date() },
      ]);
    } catch {
      setThread((prev) => [
        ...prev,
        {
          id: `res-${Date.now()}`,
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
  }, []);

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
