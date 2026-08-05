import { useMinLoading } from '../../hooks';
import { useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard, DetailRow } from '../../components/ui/DataCard';
import StatusBadge from '../../components/ui/StatusBadge';
import ClientLinkButton from '../../components/ui/ClientLinkButton';
import CopyButton from '../../components/ui/CopyButton';
import PageLoader from '../../components/ui/PageLoader';
import { FormField } from '../../components/ui/Form';
import { toLocalDatetimeInputValue } from '../../lib/format';
import { useDialog } from '../../contexts/DialogContext';
import { useToast } from '../../contexts/ToastContext';
import EmptyState from '../../components/ui/EmptyState';
import {
  Download, Trash2, Check, Circle, ExternalLink, ChevronDown,
  Truck, User, MapPin, Calendar, ArrowRight, ChevronRight, CopyPlus, AlertTriangle,
} from 'lucide-react';
import Tooltip from '../../components/ui/Tooltip';

function formatSousStatut(s) {
  return s.replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function mergeHistory(events = [], sousEtapes = {}) {
  const eventItems = (events || []).map((e) => ({
    ...e,
    _type: 'event',
    _date: e.date_statut,
    _statut: e.statut,
    _id: e.id,
  }));

  const sousEtapeItems = Object.values(sousEtapes).flatMap((arr) =>
    (arr || []).map((se) => ({
      ...se,
      _type: 'sous-etape',
      _date: se.created_at,
      _statut: se.statut,
      _id: se.id,
    }))
  );

  return [...eventItems, ...sousEtapeItems]
    .sort((a, b) => new Date(b._date) - new Date(a._date));
}

const statuses = [
  { value: 'information_recue', label: 'Information Recue' },
  { value: 'ramasse', label: 'Ramasse' },
  { value: 'en_transit', label: 'En Transit' },
  { value: 'en_cours', label: 'En Cours' },
  { value: 'livre', label: 'Livre' },
];

const subStatuses = [
  { value: '', label: '— Aucun —' },
  { value: 'en_cours_de_livraison', label: 'En cours de livraison' },
  { value: 'tentative_de_livraison', label: 'Tentative de livraison' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'retour', label: 'Retour' },
];

function TrackingTimeline({ events, sousEtapes = {} }) {
  const eventStatuses = new Set(events.map((e) => e.statut));
  const currentIndex = statuses.reduce((highest, status, idx) => {
    if (eventStatuses.has(status.value) && idx > highest) return idx;
    return highest;
  }, -1);

  const sousEtapesByStatut = sousEtapes || {};

  return (
    <div style={{ position: 'relative' }}>
      {statuses.map((status, idx) => {
        const completed = idx <= currentIndex && currentIndex !== -1;
        const current = idx === currentIndex;
        const isLast = idx === statuses.length - 1;
        const matchingEvent = [...events]
          .filter((e) => e.statut === status.value)
          .sort((a, b) => new Date(b.date_statut) - new Date(a.date_statut))[0] || null;

        // Provider view: oldest first (latest at bottom)
        const sousEtapesForStatus = [...(sousEtapesByStatut[status.value] || [])].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );
        const sousEtapeCount = sousEtapesForStatus.length;

        return (
          <div
            key={status.value}
            style={{ position: 'relative', paddingLeft: 36 }}
          >
            {/* Main vertical line - centered on status dots (left: 12 = center of 24px dot) */}
            {!isLast && (
              <div
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: completed ? 'var(--color-primary)' : 'var(--color-ash)',
                  zIndex: 1,
                }}
              />
            )}

            {/* Status node row */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              {/* Status dot - centered on vertical line at left: 12 */}
              <div
                style={{
                  position: 'absolute',
                  left: -36,
                  top: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 9999,
                  background: current
                    ? 'var(--color-vivid-green)'
                    : completed
                    ? 'var(--color-primary)'
                    : 'var(--color-bone)',
                  border: `2px solid ${
                    current
                      ? 'var(--color-vivid-green)'
                      : completed
                      ? 'var(--color-primary)'
                      : 'var(--color-ash)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-paper-white)',
                  boxShadow: current ? '0 0 0 4px rgba(74,198,76,0.22)' : 'none',
                  // boxShadow: current ? '0 0 0 4px rgba(242, 140, 40,0.82)' : 'none',
                }}
              >
                {current || completed ? <Check size={12} strokeWidth={3} /> : <Circle size={6} fill="var(--color-smoke)" />}
              </div>

              <div style={{ flex: 1, minWidth: 0, marginLeft: 36 }}>
                <div
                  style={{
                    fontWeight: 500,
                    fontSize: 15,
                    color: current || completed ? 'var(--color-graphite)' : 'var(--color-smoke)',
                  }}
                >
                  {status.label}
                </div>
                {matchingEvent && (
                  <div style={{ fontSize: 13, color: 'var(--color-steel)', marginTop: 4 }}>
                    {new Date(matchingEvent.date_statut).toLocaleString('fr-FR')}
                    {matchingEvent.sous_statut && (
                      <span
                        style={{
                          color: 'var(--color-steel)',
                          display: 'block',
                          marginTop: 4,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {formatSousStatut(matchingEvent.sous_statut)}
                      </span>
                    )}
                    {matchingEvent.description && ` — ${matchingEvent.description}`}
                  </div>
                )}
              </div>
            </div>

            {/* Sous-etapes: horizontal branches from vertical line, stacked vertically, oldest first (latest at bottom) */}
            {sousEtapeCount > 0 && (
              <div style={{ marginTop: 8 }}>
                {sousEtapesForStatus.map((se, si) => (
                  <div
                    key={se.id}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: si === sousEtapeCount - 1 ? 8 : 12,
                    }}
                  >
                    {/* Horizontal branch from main vertical line (centered at left: 12) to card */}
                    <div
                      style={{
                        position: 'absolute',
                        left: -24,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 14,
                        height: 2,
                        background: completed ? 'var(--color-primary)' : 'var(--color-ash)',
                        borderRadius: 1,
                        zIndex: 1,
                      }}
                    />
                    {/* Dot at junction on the vertical line (centered at left: 12) */}
                    <div
                      style={{
                        position: 'absolute',
                        left: -11,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 12,
                        height: 12,
                        borderRadius: 9999,
                        background: 'var(--color-primary)',
                        border: '2px solid var(--color-paper-white)',
                        boxShadow: '0 0 0 1px var(--color-ash)',
                        zIndex: 2,
                      }}
                    />
                    {/* Sous-etape card - shifted right to make room for branch */}
                      <div
                        style={{
                          flex: 1,
                          marginLeft: 5,
                          background: 'var(--color-bone)',
                          border: '2px solid var(--color-ash)',
                          borderRadius: 6,
                          padding: '8px 10px',
                          fontSize: 13,
                          color: 'var(--color-graphite)',
                          minWidth: 200,
                          maxWidth: '100%',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <span>{se.description}</span>

                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--color-steel)',
                            marginLeft: 'auto',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {new Date(se.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                  </div>
                ))}
              </div>
            )}

            {/* Gap after status + sous-etapes before next status */}
            {!isLast && <div style={{ height: 20 }} />}
          </div>
        );
      })}
    </div>
  );
}

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState(null);
  const [isBilled, setIsBilled] = useState(false);
  const [events, setEvents] = useState([]);
  const [sousEtapes, setSousEtapes] = useState({});
  const [affectations, setAffectations] = useState([]);
const [newEvent, setNewEvent] = useState({
     statut: '',
     sous_statut: '',
     date_statut: toLocalDatetimeInputValue(),
     description: '',
     addSousEtape: false,
     sousEtapeDescription: '',
   });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const showLoader = useMinLoading(loading);
  const [labelHtml, setLabelHtml] = useState(null);
  const [labelLoading, setLabelLoading] = useState(true);
  const [labelMenuOpen, setLabelMenuOpen] = useState(false);
  const [labelUrl, setLabelUrl] = useState(null);
  const labelMenuRef = useRef(null);
  const dialog = useDialog();
  const toast = useToast();

  useEffect(() => {
    fetchShipment();
    fetchLabel();
  }, [id]);

  useEffect(() => {
    const handleClick = (e) => {
      if (labelMenuRef.current && !labelMenuRef.current.contains(e.target)) {
        setLabelMenuOpen(false);
      }
    };
    if (labelMenuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [labelMenuOpen]);

  const usedStatuses = useMemo(() => {
    const set = new Set(events.map((e) => e.statut));
    return set;
  }, [events]);

  const availableStatuses = useMemo(() => {
    const repeatable = ['en_cours', 'en_transit'];
    return statuses.filter((s) => {
      if (repeatable.includes(s.value)) return true;
      if (s.value === shipment?.statut_actuel) return true;
      return !usedStatuses.has(s.value);
    });
  }, [usedStatuses, shipment]);

  const fetchShipment = async () => {
    setLoading(true);
    setLoadError(false);
    // This had no try/catch at all: a failed load threw before
    // setLoading(false) was ever reached, leaving the page on its skeleton
    // forever. A 404 still falls through to the "Expedition introuvable"
    // branch below; anything transient gets a retry instead.
    try {
      const { data } = await api.get(`/shipments/${id}`);
      const s = data.shipment || data;
      setShipment(s);
      setIsBilled(Boolean(data.is_billed));
      setEvents(s.suivi_statuts || data.suivi_statuts || []);
      // Load sous_etapes from the API response
      if (data.sous_etapes) {
        setSousEtapes(data.sous_etapes);
      }
      setAffectations(data.affectations || []);
      setNewEvent((prev) => ({
        ...prev,
        statut: s.statut_actuel || '',
        sous_statut: s.sous_statut_actuel || '',
        addSousEtape: false,
        sousEtapeDescription: '',
      }));
    } catch (err) {
      if (err.response?.status !== 404) setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchLabel = async () => {
    setLabelLoading(true);
    try {
      const res = await api.get(`/shipments/${id}/label-preview`, { responseType: 'text' });
      setLabelHtml(typeof res.data === 'string' ? res.data : '');
      api.get(`/shipments/${id}/label`, { responseType: 'blob' })
        .then((r) => {
          const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
          if (labelUrl) URL.revokeObjectURL(labelUrl);
          setLabelUrl(url);
        })
        .catch(() => {
          // fetchLabel re-runs after every tracking mutation, so a toast here
          // would fire repeatedly and become noise unrelated to what the user
          // just did. labelUrl simply stays null/stale; the "Telecharger" menu
          // item below is disabled whenever that's the case, so the failure is
          // visible without an intrusive notification.
        });
    } catch {
      // Reset instead of leaving a stale preview from a previous successful
      // fetch (this re-runs after every tracking update): the card below
      // already renders "Impossible de charger l'etiquette." when labelHtml
      // is falsy, so that's the only signal needed here.
      setLabelHtml(null);
    } finally {
      setLabelLoading(false);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();

    const isNewStatus = !usedStatuses.has(newEvent.statut) && newEvent.statut !== shipment?.statut_actuel;
    const isRepeatable = ['en_cours', 'en_transit'].includes(newEvent.statut);
    const shouldCreateStatusEvent = isNewStatus || isRepeatable;

    try {
      // 1. Create the status event if needed
      if (shouldCreateStatusEvent) {
        await api.post(`/shipments/${id}/tracking`, {
          statut: newEvent.statut,
          sous_statut: newEvent.sous_statut,
          date_statut: newEvent.date_statut,
          description: newEvent.description,
        });
        // The response includes the created event
      }

      // 2. Create sous-etape if requested
      if (newEvent.addSousEtape && newEvent.sousEtapeDescription.trim()) {
        await api.post(`/shipments/${id}/sous-etapes`, {
          statut: newEvent.statut,
          description: newEvent.sousEtapeDescription.trim(),
        });
      }

      // Reset form only once both writes have landed, so a failure leaves
      // the operator's input intact to retry.
      setNewEvent({
        statut: '',
        sous_statut: '',
        date_statut: toLocalDatetimeInputValue(),
        description: '',
        addSousEtape: false,
        sousEtapeDescription: '',
      });
    } catch (err) {
      toast.push(err.response?.data?.message || "Erreur lors de l'ajout du statut.", 'error');
    }

    // Refetch either way: step 1 can succeed while step 2 fails, so the UI
    // has to resync with whatever actually landed.
    fetchShipment();
    fetchLabel();
  };

  const handleDeleteShipment = async () => {
    const ok = await dialog.confirm({
      title: 'Supprimer cette expedition ?',
      description: 'Cette expedition sera definitivement supprimee. Cette action est irreversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/shipments/${id}`);
      toast.push('Expedition supprimee', 'success');
      navigate('/dashboard/expeditions');
    } catch (err) {
      const message = err?.response?.data?.message || 'Suppression impossible.';
      toast.push(message, 'error');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const ok = await dialog.confirm({
      title: 'Supprimer cet evenement ?',
      description: 'Cet evenement de suivi sera definitivement retire du dossier.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/tracking-events/${eventId}`);
    } catch (err) {
      // Without this the delete just silently did nothing: the row stayed
      // put and the operator got no clue why.
      toast.push(err.response?.data?.message || 'Erreur lors de la suppression.', 'error');
      return;
    }
    toast.push('Evenement supprime', 'success');
    setEvents((prev) => {
      const filtered = prev.filter((e) => e.id !== eventId);
      const latest = [...filtered].sort((a, b) => new Date(b.date_statut) - new Date(a.date_statut))[0];
      if (latest) {
        setShipment((s) => s ? { ...s, statut_actuel: latest.statut, sous_statut_actuel: latest.sous_statut } : null);
      } else {
        setShipment((s) => s ? { ...s, statut_actuel: 'information_recue', sous_statut_actuel: null } : null);
      }
      return filtered;
    });
  };

  const handleDeleteSousEtape = async (sousEtapeId) => {
    const ok = await dialog.confirm({
      title: 'Supprimer cette sous-etape ?',
      description: 'Cette note sera definitivement retiree du dossier.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/sous-etapes/${sousEtapeId}`);
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors de la suppression.', 'error');
      return;
    }
    toast.push('Sous-etape supprimee', 'success');
    fetchShipment();
  };

  const openLabelPdf = () => {
    if (!shipment) return;
    window.open(`/api/shipments/${id}/label-inline`, '_blank');
    setLabelMenuOpen(false);
  };

  const downloadLabel = () => {
    if (!labelUrl || !shipment) return;
    const a = document.createElement('a');
    a.href = labelUrl;
    a.download = `etiquette-${shipment.shipping_number}.pdf`;
    a.click();
    setLabelMenuOpen(false);
  };

  if (showLoader) return <PageLoader variant="detail" />;
  if (loadError) return (
    <EmptyState
      icon={AlertTriangle}
      tone="danger"
      title="Chargement impossible"
      description="L'expedition n'a pas pu etre recuperee. Verifiez votre connexion puis reessayez."
      actionLabel="Reessayer"
      onAction={fetchShipment}
    />
  );
  if (!shipment) return <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-danger)' }}>Expedition introuvable</div>;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Expedition"
        title={<>{shipment.shipping_number} <CopyButton value={shipment.shipping_number} size={16} /></>}
        subtitle={`${shipment.sender_name} -> ${shipment.recipient_name}`}
        breadcrumbs={[{ label: 'Expeditions', to: '/dashboard/expeditions' }, { label: shipment.shipping_number }]}
        actions={
          <>
            <Link
              to={`/dashboard/expeditions/nouveau?copyFrom=${shipment.id}`}
              className="btn btn-secondary"
              title="Creer une nouvelle expedition avec les memes informations. Les champs resteront modifiables."
            >
              <CopyPlus size={14} /> Copier Details dans Nouvelle Expedition
            </Link>
            <button
              type="button"
              onClick={handleDeleteShipment}
              className="btn btn-danger"
              disabled={isBilled}
              title={isBilled ? 'Impossible de supprimer une expedition deja facturee.' : undefined}
            >
              <Trash2 size={14} /> Supprimer
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%]" style={{ gap: 16, marginBottom: 24 }}>
        <div className="flex flex-col" style={{ gap: 16, minWidth: 0 }}>
          <DataCard title="Expediteur" description="Informations de l'expediteur." padding={16}>
            {shipment.client?.id && (
              <ClientLinkButton
                clientId={shipment.client.id}
                style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
              <DetailRow label="Nom" value={shipment.sender_name} />
              <DetailRow label="Entreprise" value={shipment.sender_company || '-'} />
              <DetailRow label="Email" value={shipment.sender_email || '-'} />
              <DetailRow label="Telephone" value={shipment.sender_phone || '-'} />
              <DetailRow label="Adresse" value={shipment.sender_address || '-'} />
              <DetailRow label="Ville" value={shipment.sender_city || '-'} />
              <DetailRow label="Code postal" value={shipment.sender_postal_code || '-'} />
              <DetailRow label="Pays" value={shipment.sender_country || '-'} />
              <DetailRow label="Compte client" value={shipment.client?.account_number || '-'} />
              <DetailRow label="Raison sociale client" value={shipment.client?.company_name || '-'} />
            </div>
          </DataCard>

          <DataCard title="Destinataire" description="Informations du destinataire." padding={16}>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
              <DetailRow label="Nom" value={shipment.recipient_name || '-'} />
              <DetailRow label="Entreprise" value={shipment.recipient_company || '-'} />
              <DetailRow label="Telephone" value={shipment.recipient_phone || '-'} />
              <DetailRow label="Adresse" value={shipment.recipient_address || '-'} />
              <DetailRow label="Ville" value={shipment.recipient_city || '-'} />
              <DetailRow label="Code postal" value={shipment.recipient_postal_code || '-'} />
              <DetailRow label="Pays" value={shipment.recipient_country || '-'} />
            </div>
          </DataCard>
        </div>

        <div style={{ minWidth: 0 }}>
          <DataCard title="Colis & Service" description="Caractéristiques du colis et du service." padding={16}>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
              <DetailRow label="Service" value={(shipment.type_service || '').replace(/_/g, ' ')} />
              <DetailRow label="Statut actuel"><StatusBadge status={shipment.statut_actuel} /></DetailRow>
              <DetailRow label="Valeur déclarée" value={shipment.valeur_declaree && Number(shipment.valeur_declaree) > 0 ? `${shipment.valeur_declaree} ${shipment.devise_valeur || 'MAD'}` : '-'} />
            </div>

            {Array.isArray(shipment.colis) && shipment.colis.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-steel)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                  Colis ({shipment.colis.length})
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table-clean table-compact">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Pièces</th>
                        <th>Poids</th>
                        <th>Dimensions (cm)</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipment.colis.map((c, i) => (
                        <tr key={c.id ?? i}>
                          <td style={{ textTransform: 'capitalize' }}>{(c.type_colis || '-').replace(/_/g, ' ')}</td>
                          <td>{c.nb_pieces ?? '-'}</td>
                          <td>{c.poids ? `${c.poids} kg` : '-'}</td>
                          <td>{c.longueur && c.largeur && c.hauteur ? `${c.longueur} x ${c.largeur} x ${c.hauteur}` : '-'}</td>
                          <td>{c.description_colis || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16, marginTop: 16 }}>
                <DetailRow label="Type de colis" value={shipment.type_colis || '-'} />
                <DetailRow label="Poids" value={shipment.poids ? `${shipment.poids} kg` : '-'} />
                <DetailRow label="Dimensions (cm)" value={shipment.longueur && shipment.largeur && shipment.hauteur ? `${shipment.longueur} x ${shipment.largeur} x ${shipment.hauteur}` : '-'} />
                <DetailRow label="Pièces" value={shipment.nb_pieces ?? '-'} />
                <DetailRow label="Description" value={shipment.description_colis || '-'} />
              </div>
            )}
          </DataCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16, marginBottom: 24 }}>
        <DataCard
          title="Ajouter un Statut"
          description="Suivi manuel de la livraison."
          actions={
            shipment.has_employee_changes && (
              <Tooltip placement="top" content={`Modifié par ${shipment.employee_name} le ${new Date(shipment.employee_changed_at).toLocaleString('fr-FR')}`}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: 'var(--color-primary-wash)', color: 'var(--color-primary)' }}>
                  <User size={14} />
                </span>
              </Tooltip>
            )
          }
        >
          <form onSubmit={handleAddEvent}>
            <FormField label="Statut" required>
              <select
                value={newEvent.statut}
                onChange={(e) => setNewEvent({ ...newEvent, statut: e.target.value, sous_statut: e.target.value === 'en_cours' ? newEvent.sous_statut : '' })}
                className="select"
                required
              >
                {availableStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </FormField>
            {newEvent.statut === 'en_cours' && (
              <FormField label="Sous-statut">
                <select
                  value={newEvent.sous_statut}
                  onChange={(e) => setNewEvent({ ...newEvent, sous_statut: e.target.value })}
                  className="select"
                >
                  {subStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </FormField>
            )}
            <FormField label="Date et heure" required>
              <input
                type="datetime-local"
                value={newEvent.date_statut}
                onChange={(e) => setNewEvent({ ...newEvent, date_statut: e.target.value })}
                className="input"
                required
              />
            </FormField>
            <FormField label="Description (60 caracteres max)" hint={`${newEvent.description.length}/60`}>
              <input
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                maxLength={60}
                className="input"
              />
            </FormField>

            <FormField label="Ajouter une Sous-Etape" hint="Note supplementaire pour ce statut (max 60 caracteres)">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newEvent.addSousEtape}
                  onChange={(e) => setNewEvent({ ...newEvent, addSousEtape: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
                />
                <span style={{ fontSize: 14, color: 'var(--color-graphite)' }}>Activer pour ajouter une note sous ce statut</span>
              </label>
            </FormField>

            {newEvent.addSousEtape && (
              <FormField label="Sous-Etape (max 60 caracteres)" hint={`${newEvent.sousEtapeDescription.length}/60`}>
                <input
                  value={newEvent.sousEtapeDescription}
                  onChange={(e) => setNewEvent({ ...newEvent, sousEtapeDescription: e.target.value })}
                  maxLength={60}
                  className="input"
                  placeholder="..."
                />
              </FormField>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Ajouter l'evenement
            </button>
          </form>
        </DataCard>

        <DataCard title="Suivi" description="Progression actuelle de l'expedition.">
          {events.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--color-steel)', padding: 12 }}>
              Aucun evenement enregistre pour le moment.
            </div>
          ) : (
            <TrackingTimeline events={events} sousEtapes={sousEtapes} />
          )}
        </DataCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16, alignItems: 'start' }}>
        <DataCard title="Historique" description="Liste complete des evenements de suivi.">
          {events.length === 0 && Object.keys(sousEtapes).length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--color-steel)', padding: 12 }}>
              Aucun evenement pour l'instant.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mergeHistory(events, sousEtapes).map((item) => {
                const isEvent = item._type === 'event';
                const date = isEvent ? item.date_statut : item.created_at;
                const statut = item._statut;
                const description = isEvent ? item.description : item.description;
                const sousStatut = isEvent ? item.sous_statut : null;
                const onDelete = isEvent ? () => handleDeleteEvent(item.id) : () => handleDeleteSousEtape(item.id);

                return (
                  <div
                    key={item._id}
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      background: isEvent ? 'var(--color-bone)' : 'var(--color-marble)',
                      borderLeft: isEvent ? 'none' : '3px solid var(--color-primary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'nowrap',
                      }}
                    >
                      <StatusBadge status={statut} />
                      {sousStatut && <StatusBadge status={sousStatut} />}
                      {!isEvent && (
                        <span style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Sous-etape
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--color-steel)', marginLeft: 'auto' }}>
                        {new Date(date).toLocaleString('fr-FR')}
                      </span>
                      <button
                        onClick={onDelete}
                        className="btn btn-danger"
                        style={{ padding: '4px 10px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {description && (
                      <div style={{ fontSize: 13, color: 'var(--color-graphite)', lineHeight: 1.45 }}>
                        {description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DataCard>

        <DataCard
          title="Etiquette"
          description="Apercu de l'etiquette de colis."
          actions={
            <div ref={labelMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setLabelMenuOpen((v) => !v)}
                disabled={labelLoading || !labelHtml}
                className="btn btn-secondary"
                style={{ padding: '6px 12px' }}
              >
                <Download size={13} /> Etiquette <ChevronDown size={13} />
              </button>
              {labelMenuOpen && (
                <div
                  className="animate-fade-in"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: 6,
                    minWidth: 220,
                    background: 'var(--color-paper-white)',
                    border: '1px solid var(--color-ash)',
                    borderRadius: 8,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    zIndex: 30,
                    padding: 4,
                  }}
                >
                  <button
                    onClick={openLabelPdf}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'var(--color-graphite)',
                    }}
                  >
                    <ExternalLink size={14} /> Ouvrir en PDF
                  </button>
                  <button
                    onClick={downloadLabel}
                    disabled={!labelUrl}
                    title={labelUrl ? undefined : "Telechargement indisponible pour le moment"}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      textAlign: 'left',
                      cursor: labelUrl ? 'pointer' : 'not-allowed',
                      fontSize: 13,
                      color: labelUrl ? 'var(--color-graphite)' : 'var(--color-steel)',
                    }}
                  >
                    <Download size={14} /> Telecharger
                  </button>
                </div>
              )}
            </div>
          }
        >
          {labelLoading ? (
            <div
              style={{
                height: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-steel)',
                fontSize: 14,
              }}
            >
              Generation de l'etiquette...
            </div>
          ) : labelHtml ? (
            <LabelPreview html={labelHtml} />
          ) : (
            <div style={{ fontSize: 14, color: 'var(--color-danger)', padding: 12 }}>
              Impossible de charger l'etiquette.
            </div>
          )}
        </DataCard>
      </div>

      <MissionSection affectations={affectations} />
    </div>
  );
}

function formatDateTimeFR(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function MissionSection({ affectations }) {
  if (!affectations || affectations.length === 0) {
    return null;
  }

  return (
    <DataCard
      title="Missions associees"
      description={`Cette expedition est assignee a ${affectations.length} mission${affectations.length > 1 ? 's' : ''}.`}
    >
      <div className="space-y-3">
        {affectations.map((m) => (
          <Link
            key={m.id}
            to={`/dashboard/flotte/affectations/${m.id}`}
            style={{
              display: 'block',
              padding: 16,
              border: '1px solid var(--color-ash)',
              borderRadius: 10,
              background: 'var(--color-paper-white)',
              transition: 'all 150ms ease',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.background = 'var(--color-primary-wash)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-ash)';
              e.currentTarget.style.background = 'var(--color-paper-white)';
            }}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap" style={{ marginBottom: 12 }}>
              <div className="flex items-center gap-2">
                <span className="font-mono-data" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  Mission #{m.id}
                </span>
                <StatusBadge status={m.statut} />
              </div>
              <ChevronRight size={14} style={{ color: 'var(--color-smoke)' }} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 12 }}>
              <ResourceItem
                icon={User}
                label="Chauffeur"
                value={m.chauffeur ? m.chauffeur.nom_complet : 'Non assigne'}
              />
              <ResourceItem
                icon={Truck}
                label="Vehicule"
                value={m.vehicule ? m.vehicule.immatriculation : 'Non assigne'}
                mono
              />
              <ResourceItem
                icon={Calendar}
                label="Depart"
                value={formatDateTimeFR(m.date_heure_depart)}
              />
            </div>

            {(m.ville_depart || m.ville_arrivee) && (
              <div
                className="flex items-center gap-2 mt-3 pt-3"
                style={{
                  borderTop: '1px solid var(--color-ash)',
                  fontSize: 13,
                  color: 'var(--color-iron)',
                }}
              >
                <MapPin size={14} style={{ color: 'var(--color-smoke)' }} />
                <span style={{ fontWeight: 500 }}>{m.ville_depart || '—'}</span>
                <ArrowRight size={12} style={{ color: 'var(--color-smoke)' }} />
                <span style={{ fontWeight: 500 }}>{m.ville_arrivee || '—'}</span>
                {m.pays_depart && (
                  <span style={{ fontSize: 11, color: 'var(--color-steel)', marginLeft: 8 }}>
                    ({m.pays_depart}{m.pays_arrivee ? ` -> ${m.pays_arrivee}` : ''})
                  </span>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>
    </DataCard>
  );
}

function ResourceItem({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} style={{ color: 'var(--color-smoke)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-steel)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          className={mono ? 'font-mono-data' : ''}
          style={{ fontSize: 13, color: 'var(--color-graphite)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {value || '—'}
        </div>
      </div>
    </div>
  );
}

function LabelPreview({ html }) {
  const containerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const measure = () => {
      if (!innerRef.current) return;
      const naturalW = innerRef.current.scrollWidth || innerRef.current.offsetWidth;
      if (naturalW <= 0) return;
      const containerW = containerRef.current?.clientWidth || 1;
      setScale(containerW / naturalW);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (innerRef.current) ro.observe(innerRef.current);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [html]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div
        style={{
          width: '100%',
          height: (innerRef.current?.scrollHeight || 0) * scale,
        }}
      >
        <div
          ref={innerRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: 'fit-content',
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
