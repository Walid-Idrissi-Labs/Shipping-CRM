export function DetailRow({ label, value, monospace = false, children }) {
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
        {children || value || '—'}
      </div>
    </div>
  );
}

export function DataCard({ title, description, children, actions, padding = 24, style }) {
  // Cards holding a full-bleed table pass padding={0}. The header still needs its own
  // inset, otherwise the title and description sit flush against the card border.
  const headerStyle =
    padding === 0
      ? { padding: '16px 16px 0', marginBottom: 16 }
      : { marginBottom: 20 };

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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3" style={headerStyle}>
          <div className="min-w-0">
            {title && <h2 className="section-heading">{title}</h2>}
            {description && (
              <p style={{ fontSize: 13, color: 'var(--color-steel)', marginTop: 4 }}>{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0" style={{ gap: 8 }}>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
