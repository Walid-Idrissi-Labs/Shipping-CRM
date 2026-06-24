import DonutChart from './DonutChart';

const STATUS_META = {
  envoye: { label: 'Envoye', color: 'var(--color-primary)' },
  information_recue: { label: 'Information recue', color: 'var(--color-warning)' },
  ramasse: { label: 'Ramasse', color: 'var(--color-primary-glow)' },
  en_cours: { label: 'En cours', color: 'var(--color-primary)' },
  livre: { label: 'Livre', color: 'var(--color-vivid-green)' },
  retour: { label: 'Retour', color: 'var(--color-danger)' },
  en_transit: { label: 'En transit', color: 'var(--color-primary)' },
  en_cours_de_livraison: { label: 'En cours de livraison', color: 'var(--color-warning)' },
  tentative_de_livraison: { label: 'Tentative de livraison', color: 'var(--color-warning)' },
  on_hold: { label: 'En attente', color: 'var(--color-steel)' },
};

export default function ShipmentStatusDonut({ data = {}, shipmentsHref = '/dashboard/expeditions' }) {
  const segments = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      label: STATUS_META[key]?.label ?? key,
      value,
      color: STATUS_META[key]?.color ?? 'var(--color-slate)',
      href: shipmentsHref,
    }));

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div>
      <DonutChart
        data={segments}
        centerValue={total}
        centerLabel="Expeditions"
      />
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((s) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: 'var(--color-graphite)',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1 }}>{s.label}</span>
            <span
              style={{
                color: 'var(--color-steel)',
                fontFamily: 'monospace',
              }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
