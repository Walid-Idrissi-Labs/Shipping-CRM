/**
 * Shared segmented tab control.
 *
 * <Tabs
 *   value={tab}
 *   onChange={setTab}
 *   tabs={[{ value: 'factures', label: 'Factures', count: 12 }, ...]}
 * />
 */
export default function Tabs({ value, onChange, tabs, className = '' }) {
  return (
    <div className={`tabs ${className}`} role="tablist">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`tab ${active ? 'is-active' : ''}`}
            onClick={() => onChange(t.value)}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.count != null && <span className="tab-count">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
