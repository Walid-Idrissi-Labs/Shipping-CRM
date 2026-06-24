import { Link } from 'react-router-dom';

export default function BarChart({ data = [], maxValue: externalMax, emptyLabel = 'Aucune donnee' }) {
  if (!data.length || data.every((d) => !d.value)) {
    return (
      <div
        style={{
          padding: '24px 16px',
          color: 'var(--color-steel)',
          fontSize: 13,
          textAlign: 'center',
        }}
      >
        {emptyLabel}
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  const max = externalMax ?? Math.max(...data.map((d) => d.value));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {data.map((row, idx) => {
        const pct = max > 0 ? (row.value / max) * 100 : 0;
        const sharePct = total > 0 ? Math.round((row.value / total) * 100) : 0;
        const bar = (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr auto',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 6,
              background: 'transparent',
              cursor: row.href ? 'pointer' : 'default',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (row.href) e.currentTarget.style.background = 'var(--color-bone)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: 'var(--color-graphite)',
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: row.color,
                  flexShrink: 0,
                }}
              />
              {row.label}
            </div>
            <div
              style={{
                height: 10,
                borderRadius: 9999,
                background: 'var(--color-fog)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: row.color,
                  borderRadius: 9999,
                  transition: 'width 200ms ease',
                }}
              />
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono-data, monospace)',
                fontSize: 13,
                color: 'var(--color-graphite)',
                fontWeight: 500,
                minWidth: 70,
                textAlign: 'right',
              }}
            >
              {row.value}
              {sharePct > 0 && (
                <span style={{ marginLeft: 6, color: 'var(--color-steel)', fontWeight: 400 }}>
                  {sharePct}%
                </span>
              )}
            </div>
          </div>
        );
        return row.href ? (
          <Link
            key={`bar-${row.label}-${idx}`}
            to={row.href}
            aria-label={`Voir ${row.label}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            {bar}
          </Link>
        ) : (
          <div key={`bar-${row.label}-${idx}`}>{bar}</div>
        );
      })}
    </div>
  );
}
