// Shared formatting utilities — single source of truth for money, dates and
// invoice numbering across the whole app. Do not re-implement these per page.

/**
 * Format a monetary amount the DPEX way: space-grouped thousands, comma
 * decimals, MAD suffix. e.g. 12345.5 -> "12 345,50 MAD".
 */
export function formatMoney(value) {
  const n = Number(value || 0);
  return (
    n
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' MAD'
  );
}

/**
 * Same as formatMoney but without the currency suffix — for use inside a cell
 * that already carries a "MAD" column header or a composite input.
 */
export function formatAmount(value) {
  const n = Number(value || 0);
  return n
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Format a date as "12 mars 2026". Returns "-" for empty/invalid input.
 */
export function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date with time, e.g. "12 mars 2026, 14:30".
 */
export function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Value for a <input type="datetime-local"> defaulted to "now" — built from the
 * browser's local wall-clock fields, not toISOString() (which is UTC and would
 * silently mislabel the field whenever the browser isn't in UTC).
 */
export function toLocalDatetimeInputValue(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Relative time in French, e.g. "il y a 5 min", "il y a 2 h". Falls back to
 * formatDate() beyond 7 days so old entries don't show an absurd "il y a 34 j".
 */
export function formatRelativeTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "à l'instant";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;
  return formatDate(value);
}

/**
 * Human-facing invoice number: prefer the explicit `numero`, else compose from
 * the sequence + year (e.g. "FE 42/2026").
 */
export function getInvoiceNumber(inv) {
  if (!inv) return '';
  return inv.numero || `FE ${inv.numero_n}/${inv.annee}`;
}
