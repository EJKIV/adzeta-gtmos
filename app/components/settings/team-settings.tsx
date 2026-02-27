'use client';

const MOCK_TEAM = [
  { name: 'You', email: 'you@company.com', role: 'Owner' },
  { name: 'Alex Rivera', email: 'alex@company.com', role: 'Admin' },
  { name: 'Jordan Kim', email: 'jordan@company.com', role: 'Viewer' },
];

export function TeamSettings() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Team
          </h3>
          <span
            className="px-2 py-0.5 text-xs font-medium rounded-full"
            style={{ backgroundColor: 'rgba(143, 118, 245, 0.1)', color: '#8f76f5' }}
          >
            Coming Soon
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          Manage who has access to your GTM OS
        </p>
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
              <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
                Name
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
                Email
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
                Role
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_TEAM.map((member) => (
              <tr key={member.email} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {member.name}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                  {member.email}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: member.role === 'Owner' ? 'rgba(222, 52, 127, 0.08)' : 'var(--color-bg-tertiary)',
                      color: member.role === 'Owner' ? '#de347f' : 'var(--color-text-tertiary)',
                    }}
                  >
                    {member.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        disabled
        className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors opacity-50 cursor-not-allowed"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-tertiary)',
        }}
        title="Coming soon"
      >
        Invite Team Member
      </button>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Team invitations coming soon
      </p>
    </div>
  );
}
