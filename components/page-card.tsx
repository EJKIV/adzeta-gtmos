export function PageCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {children}
      </div>
    </section>
  );
}
