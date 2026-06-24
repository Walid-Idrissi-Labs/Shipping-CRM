export function DetailRow({ label, value, monospace = false }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--color-steel)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        className={monospace ? 'font-mono-data' : ''}
        style={{ color: 'var(--color-graphite)', fontSize: 14 }}
      >
        {value || '—'}
      </div>
    </div>
  );
}

export function DataCard({ title, description, children, actions, padding = 24, style }) {
  return (
    <section
      style={{
        background: 'var(--color-paper-white)',
        border: '1px solid var(--color-ash)',
        borderRadius: 12,
        padding,
        position: 'relative',
        ...style,
      }}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4" style={{ marginBottom: 20 }}>
          <div className="min-w-0">
            {title && <h2 className="section-heading">{title}</h2>}
            {description && (
              <p style={{ fontSize: 13, color: 'var(--color-steel)', marginTop: 4 }}>{description}</p>
            )}
          </div>
          {actions && <div className="flex" style={{ gap: 8 }}>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
