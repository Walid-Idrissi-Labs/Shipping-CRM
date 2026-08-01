// Single source of truth for status -> {label, variant}. Import STATUS_LABELS /
// statusLabel() anywhere a French status label is needed, and statusVariant()
// for the pill colour. Do not re-declare these maps per page.

// variant is one of: info | success | danger | warning | neutral
const STATUS = {
  // Quotes / demandes
  envoye: { label: 'Envoyé', variant: 'info' },
  accepte: { label: 'Accepté', variant: 'success' },
  refuse: { label: 'Refusé', variant: 'danger' },
  en_attente: { label: 'En attente', variant: 'warning' },
  traitee: { label: 'Traitée', variant: 'success' },
  approuvee: { label: 'Approuvée', variant: 'success' },
  rejetee: { label: 'Rejetée', variant: 'danger' },
  acceptee: { label: 'Acceptée', variant: 'success' },
  refusee: { label: 'Refusée', variant: 'danger' },

  // Shipment lifecycle
  information_recue: { label: 'Information reçue', variant: 'neutral' },
  ramasse: { label: 'Ramassé', variant: 'info' },
  en_transit: { label: 'En transit', variant: 'info' },
  en_cours: { label: 'En cours', variant: 'warning' },
  livre: { label: 'Livré', variant: 'success' },
  en_cours_de_livraison: { label: 'En cours de livraison', variant: 'warning' },
  tentative_de_livraison: { label: 'Tentative de livraison', variant: 'warning' },
  on_hold: { label: 'En attente', variant: 'neutral' },
  retour: { label: 'Retour', variant: 'danger' },

  // Invoices
  impayee: { label: 'Impayée', variant: 'warning' },
  payee: { label: 'Payée', variant: 'success' },
  reglee: { label: 'Réglée', variant: 'success' },

  // Fleet / vehicles
  disponible: { label: 'Disponible', variant: 'success' },
  en_mission: { label: 'En mission', variant: 'warning' },
  en_maintenance: { label: 'En maintenance', variant: 'neutral' },
  hors_service: { label: 'Hors service', variant: 'danger' },

  // Drivers / employees
  actif: { label: 'Actif', variant: 'success' },
  en_conge: { label: 'En congé', variant: 'info' },

  // Missions / assignments
  planifiee: { label: 'Planifiée', variant: 'info' },
  terminee: { label: 'Terminée', variant: 'success' },
  annulee: { label: 'Annulée', variant: 'danger' },
};

/** Human label for a status key, e.g. "en_transit" -> "En transit". */
export function statusLabel(status) {
  if (!status) return '';
  return STATUS[status]?.label || String(status).replace(/_/g, ' ');
}

/** Pill variant for a status key: info | success | danger | warning | neutral. */
export function statusVariant(status) {
  return STATUS[status]?.variant || 'neutral';
}

/** Map of key -> label, for building <select> option lists. */
export const STATUS_LABELS = Object.fromEntries(
  Object.entries(STATUS).map(([k, v]) => [k, v.label]),
);

/** The five main shipment statuses an employé can set. */
export const SHIPMENT_STATUSES = [
  'information_recue',
  'ramasse',
  'en_transit',
  'en_cours',
  'livre',
].map((value) => ({ value, label: STATUS[value].label }));

/** Sub-statuses attached to a delivery attempt. */
export const SHIPMENT_SUB_STATUSES = [
  'en_cours_de_livraison',
  'tentative_de_livraison',
  'on_hold',
  'retour',
].map((value) => ({ value, label: STATUS[value].label }));

export default STATUS;
