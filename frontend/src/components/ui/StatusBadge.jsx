import { statusLabel, statusVariant } from '../../lib/statuses';

export default function StatusBadge({ status, children, variant = 'centered' }) {
  const suffix = statusVariant(status);
  const label = children ?? statusLabel(status);

  if (variant === 'left') {
    return <span className={`pill-left pill-left-${suffix}`}>{label}</span>;
  }

  return <span className={`pill pill-${suffix}`}>{label}</span>;
}
