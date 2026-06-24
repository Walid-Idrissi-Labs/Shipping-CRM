export function FormField({ label, required, children, hint, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label className="field-label">
          {label}
          {required && <span style={{ color: 'var(--color-primary)', marginLeft: 4 }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <div style={{ fontSize: 11, color: 'var(--color-smoke)', marginTop: 4 }}>{hint}</div>
      )}
      {error && (
        <div style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
}

export function Section({ title, description, children, actions }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="section-heading">{title}</h2>
          {description && (
            <p style={{ fontSize: 13, color: 'var(--color-steel)', marginTop: 4 }}>{description}</p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function Stack({ gap = 24, children, className = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }} className={className}>
      {children}
    </div>
  );
}

export function Row({ gap = 16, children, className = '', align = 'center', wrap = false }) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'row', gap, alignItems: align, flexWrap: wrap ? 'wrap' : 'nowrap' }}
      className={className}
    >
      {children}
    </div>
  );
}

export function Column({ gap = 16, children, className = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }} className={className}>
      {children}
    </div>
  );
}

export function FieldGroup({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {children}
    </div>
  );
}
