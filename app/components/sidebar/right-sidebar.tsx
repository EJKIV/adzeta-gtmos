'use client';

import { SidebarKpis } from './sidebar-kpis';
import { ActivityFeed } from '../activity-feed';
import { ProactiveSuggestionsPanel } from '@/app/components/adzeta/proactive-suggestions-panel';

interface RightSidebarProps {
  onAction: (command: string) => void;
}

export function RightSidebar({ onAction }: RightSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* KPIs section */}
      <SidebarKpis />

      {/* Divider */}
      <div
        className="mx-4 border-t"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      />

      {/* Proactive Suggestions */}
      <div className="px-4 py-2">
        <ProactiveSuggestionsPanel />
      </div>

      {/* Divider */}
      <div
        className="mx-4 border-t"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      />

      {/* Activity Feed section */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <ActivityFeed onAction={onAction} compact />
      </div>
    </div>
  );
}
