export default function Breadcrumbs({ items = [] }) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-xs"
      style={{ color: 'var(--color-steel)', marginBottom: 12 }}
    >
      <ol className="flex items-center gap-2 flex-wrap">
        <li>
          <a
            href="/dashboard"
            style={{ color: 'var(--color-steel)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-graphite)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-steel)')}
          >
            Accueil
          </a>
        </li>
        {items.map((item, idx) => {
          const last = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-2">
              <span style={{ color: 'var(--color-ash)' }}>›</span>
              {last || !item.to ? (
                <span className="font-medium" style={{ color: 'var(--color-graphite)' }}>{item.label}</span>
              ) : (
                <a
                  href={item.to}
                  style={{ color: 'var(--color-steel)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-graphite)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-steel)')}
                >
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
