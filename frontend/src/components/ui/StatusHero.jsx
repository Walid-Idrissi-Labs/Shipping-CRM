import StatusBadge from './StatusBadge';
import { statusVariant } from '../../lib/statuses';

/**
 * A status banner card: a tinted radial-gradient surface carrying a StatusBadge,
 * a short message, and optional action buttons. Replaces the bespoke
 * `payment-status-*` / inline rgba-gradient cards that were duplicated across
 * quote, invoice and expedition detail pages.
 */
export default function StatusHero({ status, message, children, style }) {
  const variant = statusVariant(status);
  return (
    <div className={`status-hero status-hero-${variant}`} style={style}>
      <StatusBadge status={status} variant="left" />
      {message && <div className="status-hero-message">{message}</div>}
      {children && <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>{children}</div>}
    </div>
  );
}
