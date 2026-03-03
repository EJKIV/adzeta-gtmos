'use client';

import Link from 'next/link';
import { LoginGate } from '@/app/components/login-gate';
import { WorkQueuePanel } from '@/app/components/adzeta/work-queue-panel';
import { AutonomyGateProgress } from '@/app/components/adzeta/autonomy-gate-progress';
import { ProactiveSuggestionsPanel } from '@/app/components/adzeta/proactive-suggestions-panel';
import { AutonomyMetricsDashboard } from '@/app/components/adzeta/autonomy-metrics-dashboard';

export default function AutonomyPage() {
  return (
    <LoginGate>
      <AutonomyDashboard />
    </LoginGate>
  );
}

function AutonomyDashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Agent Autonomy</h1>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to Chat
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top: Autonomy Gates — full width */}
        <AutonomyGateProgress />

        {/* Middle: 2-col on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WorkQueuePanel />
          </div>
          <div className="lg:col-span-1">
            <ProactiveSuggestionsPanel />
          </div>
        </div>

        {/* Bottom: Metrics dashboard — full width */}
        <AutonomyMetricsDashboard />
      </main>
    </div>
  );
}
