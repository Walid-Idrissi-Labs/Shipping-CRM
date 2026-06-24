export default function StatusBadge({ status, children, variant = 'centered' }) {
  const map = {
    envoye: 'info',
    accepte: 'success',
    refuse: 'danger',
    en_attente: 'warning',
    traitee: 'success',
    approuvee: 'success',
    rejetee: 'danger',
    information_recue: 'neutral',
    ramasse: 'info',
    en_transit: 'success',
    en_cours: 'warning',
    livre: 'success',
    impayee: 'warning',
    payee: 'success',
    en_cours_de_livraison: 'warning',
    tentative_de_livraison: 'warning',
    on_hold: 'neutral',
    retour: 'danger',
    disponible: 'success',
    en_mission: 'warning',
    en_maintenance: 'neutral',
    hors_service: 'danger',
    actif: 'success',
    en_conge: 'info',
    planifiee: 'info',
    terminee: 'success',
    annulee: 'danger',
  };

  const suffix = map[status] || 'neutral';
  const label = children ?? status;

  if (variant === 'left') {
    return <span className={`pill-left pill-left-${suffix}`}>{label}</span>;
  }

  return <span className={`pill pill-${suffix}`}>{label}</span>;
}
