import BarChart from './BarChart';

const SERVICE_META = {
  national: { label: 'National', color: 'var(--color-primary)' },
  international_express_dap: { label: 'International Express DAP', color: 'var(--color-vivid-green)' },
  fret_aerien: { label: 'Fret Aerien', color: 'var(--color-warning)' },
  routier_groupage: { label: 'Routier Groupage', color: 'var(--color-graphite)' },
  maritime_groupage: { label: 'Maritime Groupage', color: 'var(--color-primary-glow)' },
};

export default function ServiceTypeBarChart({
  data = {},
  shipmentsHref = '/dashboard/expeditions',
}) {
  const rows = Object.entries(SERVICE_META)
    .map(([key, meta]) => ({
      label: meta.label,
      value: data[key] ?? 0,
      color: meta.color,
      href: shipmentsHref,
    }))
    .filter((r) => r.value > 0);

  return <BarChart data={rows} />;
}
