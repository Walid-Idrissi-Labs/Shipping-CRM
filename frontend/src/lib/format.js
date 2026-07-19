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
 * Human-facing invoice number: prefer the explicit `numero`, else compose from
 * the sequence + year (e.g. "FA 42/2026").
 */
export function getInvoiceNumber(inv) {
  if (!inv) return '';
  return inv.numero || `FA ${inv.numero_n}/${inv.annee}`;
}
