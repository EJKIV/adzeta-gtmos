'use client';

import { useState } from 'react';
import { Database, Mail, Search, Calendar } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
}

const INITIAL_INTEGRATIONS: Integration[] = [
  {
    id: 'crm',
    name: 'CRM',
    description: 'Salesforce, HubSpot, or Pipedrive',
    icon: <Database className="w-5 h-5" />,
    connected: false,
  },
  {
    id: 'email',
    name: 'Email',
    description: 'SendGrid, Mailgun, or SES',
    icon: <Mail className="w-5 h-5" />,
    connected: false,
  },
  {
    id: 'enrichment',
    name: 'Enrichment',
    description: 'Apollo.io, Clearbit, or ZoomInfo',
    icon: <Search className="w-5 h-5" />,
    connected: false,
  },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Google Calendar or Outlook',
    icon: <Calendar className="w-5 h-5" />,
    connected: false,
  },
];

export function IntegrationsSettings() {
  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS);
  const [toast, setToast] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, connected: !i.connected } : i))
    );
    setToast('Integration settings will be available soon');
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Integrations
          </h3>
          <span
            className="px-2 py-0.5 text-xs font-medium rounded-full"
            style={{ backgroundColor: 'rgba(143, 118, 245, 0.1)', color: '#8f76f5' }}
          >
            Coming Soon
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          Connect your tools to power the GTM engine
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="rounded-xl border p-4 flex items-start gap-4"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
            >
              {integration.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {integration.name}
                </h4>
                <span
                  className="px-2 py-0.5 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: integration.connected ? 'rgba(22, 163, 74, 0.08)' : 'var(--color-bg-tertiary)',
                    color: integration.connected ? '#16a34a' : 'var(--color-text-muted)',
                  }}
                >
                  {integration.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                {integration.description}
              </p>
              <button
                onClick={() => handleToggle(integration.id)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                style={{
                  backgroundColor: integration.connected ? 'transparent' : 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {integration.connected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div
          className="px-4 py-2.5 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-secondary)',
            borderColor: 'var(--color-border)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
