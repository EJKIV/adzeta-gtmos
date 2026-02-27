'use client';

import { useState } from 'react';
import { LoginGate } from '@/app/components/login-gate';
import { useIntelligenceStream } from '@/app/hooks/use-intelligence-bridge';
import {
  useAutonomyMetrics,
  useAutonomousTasks,
  useSelfHealingEvents,
  formatDuration,
} from '@/app/hooks/use-autonomy';
import { RecommendationCard } from '@/app/components/ops/recommendation-card';
import { ActionItemCard } from '@/app/components/ops/action-item-card';
import { AutonomyTaskCard } from '@/app/components/ops/autonomy-task-card';
import { HealingEventCard } from '@/app/components/ops/healing-event-card';
import { OverrideRateIndicator } from '@/app/components/ops/override-rate';
import { ConfidenceDistributionBar } from '@/app/components/ops/confidence-distribution';


function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function OpsContent() {
  const [activeTab, setActiveTab] = useState<'review' | 'performance'>('review');

  const {
    recommendations,
    reviewQueue,
    autoExecuted,
    isProcessing,
    lastUpdated,
    error,
    stats,
    approveRecommendation,
    rejectRecommendation,
    dismissRecommendation,
    refresh,
  } = useIntelligenceStream('demo-user-123', 80);

  const {
    data: autonomyMetrics,
    isLoading: autonomyLoading,
  } = useAutonomyMetrics(30000);

  const {
    tasks: autonomousTasks,
    pendingTasks,
    createdToday: tasksCreatedToday,
  } = useAutonomousTasks(30000);

  const {
    events: healingEvents,
    todayCount: healingToday,
    weekCount: healingWeek,
    successRate: healingSuccessRate,
    avgTimeToHealMs,
    escalationRate,
  } = useSelfHealingEvents(30000);

  const escalatedEvents = healingEvents.filter(e => e.status === 'escalated');
  const pendingCount = reviewQueue.length + escalatedEvents.length;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* Header */}
      <header
        className="flex-shrink-0 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Operations
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {lastUpdated
                  ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}`
                  : 'Initializing...'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isProcessing && (
                <span className="text-sm flex items-center gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  Processing...
                </span>
              )}
              <button
                onClick={refresh}
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200">
              <p className="text-sm text-rose-700">{error.message}</p>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('review')}
              className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
              style={{
                borderColor: activeTab === 'review' ? '#de347f' : 'transparent',
                color: activeTab === 'review' ? '#de347f' : 'var(--color-text-secondary)',
              }}
            >
              Pending Review
              {pendingCount > 0 && (
                <span
                  className="px-2 py-0.5 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: activeTab === 'review' ? 'rgba(222, 52, 127, 0.1)' : 'var(--color-bg-tertiary)',
                    color: activeTab === 'review' ? '#de347f' : 'var(--color-text-tertiary)',
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: activeTab === 'performance' ? '#de347f' : 'transparent',
                color: activeTab === 'performance' ? '#de347f' : 'var(--color-text-secondary)',
              }}
            >
              Activity &amp; Performance
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {activeTab === 'review' && (
            <>
              {/* Approval Queue */}
              {reviewQueue.length > 0 && (
                <section>
                  <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                    Approval Queue
                  </h2>
                  <div className="space-y-3">
                    {reviewQueue.map((rec) => (
                      <RecommendationCard
                        key={rec.id}
                        recommendation={rec}
                        onApprove={approveRecommendation}
                        onReject={rejectRecommendation}
                        onDismiss={dismissRecommendation}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Escalations */}
              {escalatedEvents.length > 0 && (
                <section>
                  <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                    Escalations
                  </h2>
                  <div className="space-y-2">
                    {escalatedEvents.map((event) => (
                      <HealingEventCard key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {pendingCount === 0 && (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">&#10003;</div>
                  <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    All clear
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    No items need your attention right now
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'performance' && (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Recommendations">
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {stats.total}
                  </div>
                </StatCard>
                <StatCard label="Auto-Executed">
                  <div className="text-2xl font-bold text-emerald-600">{stats.autoExecutable}</div>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    {stats.total > 0 ? Math.round((stats.autoExecutable / stats.total) * 100) : 0}% of total
                  </p>
                </StatCard>
                <StatCard label="Avg Confidence">
                  <div className="text-2xl font-bold text-blue-600">{stats.avgConfidence}%</div>
                </StatCard>
                <StatCard label="Override Rate">
                  {autonomyLoading ? (
                    <div className="h-8 rounded animate-pulse" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
                  ) : autonomyMetrics ? (
                    <OverrideRateIndicator rate={autonomyMetrics.decisions.overrideRate} />
                  ) : (
                    <div style={{ color: 'var(--color-text-muted)' }}>--</div>
                  )}
                </StatCard>
              </div>

              {/* Confidence Distribution */}
              <section
                className="rounded-xl border p-4"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  borderColor: 'var(--color-border)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  Confidence Distribution
                </h2>
                <ConfidenceDistributionBar
                  high={stats.highConfidence}
                  medium={stats.mediumConfidence}
                  low={stats.lowConfidence}
                />
              </section>

              {/* Auto-Executed Actions */}
              {autoExecuted.length > 0 && (
                <section>
                  <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                    Auto-Executed Actions
                  </h2>
                  <div className="space-y-2">
                    {autoExecuted.map((action) => (
                      <ActionItemCard key={action.id} action={action} />
                    ))}
                  </div>
                </section>
              )}

              {/* Self-Healing Statistics */}
              {autonomyMetrics && (
                <section
                  className="rounded-xl border p-4"
                  style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    borderColor: 'var(--color-border)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                    Self-Healing Statistics
                  </h2>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Success Rate</p>
                      <p className="text-xl font-semibold text-emerald-600">{healingSuccessRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Avg Time to Heal</p>
                      <p className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {formatDuration(avgTimeToHealMs)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Escalation Rate</p>
                      <p className={`text-xl font-semibold ${escalationRate < 5 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {escalationRate}%
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Two column: Tasks + Healing Events */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Autonomous Tasks
                    </h2>
                    <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                      {pendingTasks.length} pending
                    </span>
                  </div>
                  {autonomousTasks.length === 0 ? (
                    <div
                      className="text-center py-8 border rounded-lg"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
                    >
                      <p>No autonomous tasks created yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {autonomousTasks.slice(0, 6).map((task) => (
                        <AutonomyTaskCard key={task.id} task={task} />
                      ))}
                      {autonomousTasks.length > 6 && (
                        <p className="text-center text-sm py-2" style={{ color: 'var(--color-text-tertiary)' }}>
                          +{autonomousTasks.length - 6} more tasks
                        </p>
                      )}
                    </div>
                  )}
                </section>

                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Self-Healing Events
                    </h2>
                    <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                      {healingWeek} this week
                    </span>
                  </div>
                  {healingEvents.length === 0 ? (
                    <div
                      className="text-center py-8 border rounded-lg"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
                    >
                      <p>No healing events recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {healingEvents.slice(0, 6).map((event) => (
                        <HealingEventCard key={event.id} event={event} />
                      ))}
                      {healingEvents.length > 6 && (
                        <p className="text-center text-sm py-2" style={{ color: 'var(--color-text-tertiary)' }}>
                          +{healingEvents.length - 6} more events
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function OpsPage() {
  return (
    <LoginGate>
      <OpsContent />
    </LoginGate>
  );
}
