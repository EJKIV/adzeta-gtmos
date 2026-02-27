'use client';

import { useState } from 'react';
import { Bot, Plug, Target, Users } from 'lucide-react';
import { LoginGate } from '@/app/components/login-gate';
import { useSettings } from '@/app/hooks/use-settings';
import { useAuth } from '@/app/components/auth-provider';
import { AutonomySettings } from '@/app/components/settings/autonomy-settings';
import { IntegrationsSettings } from '@/app/components/settings/integrations-settings';
import { IcpSettings } from '@/app/components/settings/icp-settings';
import { TeamSettings } from '@/app/components/settings/team-settings';

const SECTIONS = [
  { id: 'autonomy', label: 'Agent Autonomy', icon: Bot, comingSoon: false },
  { id: 'integrations', label: 'Integrations', icon: Plug, comingSoon: true },
  { id: 'icp', label: 'ICP & Targeting', icon: Target, comingSoon: false },
  { id: 'team', label: 'Team', icon: Users, comingSoon: true },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function SettingsContent() {
  const [activeSection, setActiveSection] = useState<SectionId>('autonomy');
  const { user } = useAuth();
  const { settings, isLoading, isSaving, saveStatus, save } = useSettings(user?.id ?? null);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="space-y-3 w-64">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* Header */}
      <header className="flex-shrink-0 border-b px-6 py-5" style={{ borderColor: 'var(--color-border)' }}>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Settings
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
          Configure your GTM OS
        </p>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop section nav */}
        <nav
          className="hidden md:block w-60 flex-shrink-0 border-r overflow-y-auto py-4 px-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="space-y-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? 'rgba(222, 52, 127, 0.06)' : 'transparent',
                    color: isActive ? '#de347f' : 'var(--color-text-secondary)',
                    border: isActive ? '1px solid rgba(222, 52, 127, 0.15)' : '1px solid transparent',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{section.label}</span>
                  {section.comingSoon && (
                    <span
                      className="px-1.5 py-0.5 text-[10px] font-medium rounded-full"
                      style={{ backgroundColor: 'rgba(143, 118, 245, 0.1)', color: '#8f76f5' }}
                    >
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Mobile section pills */}
        <div
          className="md:hidden flex-shrink-0 border-b overflow-x-auto px-4 py-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex gap-2">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                  style={{
                    backgroundColor: isActive ? 'rgba(222, 52, 127, 0.08)' : 'var(--color-bg-elevated)',
                    color: isActive ? '#de347f' : 'var(--color-text-secondary)',
                    border: `1px solid ${isActive ? 'rgba(222, 52, 127, 0.2)' : 'var(--color-border)'}`,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">
            {activeSection === 'autonomy' && (
              <AutonomySettings settings={settings} onSave={save} isSaving={isSaving} saveStatus={saveStatus} />
            )}
            {activeSection === 'integrations' && <IntegrationsSettings />}
            {activeSection === 'icp' && (
              <IcpSettings settings={settings} onSave={save} isSaving={isSaving} saveStatus={saveStatus} />
            )}
            {activeSection === 'team' && <TeamSettings />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <LoginGate>
      <SettingsContent />
    </LoginGate>
  );
}
