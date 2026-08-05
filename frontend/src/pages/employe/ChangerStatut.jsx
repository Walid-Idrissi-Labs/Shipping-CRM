import { useState, useCallback, useRef } from 'react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { useDialog } from '../../contexts/DialogContext';
import { DetailRow } from '../../components/ui/DataCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { FormField } from '../../components/ui/Form';
import QrScannerModal from '../../components/employe/QrScannerModal';
import { statusLabel, SHIPMENT_STATUSES, SHIPMENT_SUB_STATUSES } from '../../lib/statuses';
import { toLocalDatetimeInputValue } from '../../lib/format';
import {
  ChevronDown,
  Check,
  QrCode,
  Trash2,
  X,
  Search,
  Package,
  User,
  MapPin,
  Clock,
} from 'lucide-react';

const statuses = SHIPMENT_STATUSES;
const subStatuses = SHIPMENT_SUB_STATUSES;

const REPEATABLE = ['en_cours', 'en_transit'];

const emptyEvent = () => ({
  statut: '',
  sous_statut: '',
  date_statut: toLocalDatetimeInputValue(),
  description: '',
  addSousEtape: false,
  sousEtapeDescription: '',
});

function labelFor(value) {
  return value ? statusLabel(value) : '';
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Disclosure({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`emp-disclose${open ? ' is-open' : ''}`}>
      <button type="button" className="emp-disclose-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {Icon && <Icon size={16} strokeWidth={1.8} style={{ color: 'var(--color-steel)' }} />}
        {title}
        <ChevronDown size={16} className="emp-disclose-chevron" />
      </button>
      {open && <div className="emp-disclose-body">{children}</div>}
    </div>
  );
}

export default function ChangerStatut() {
  const { push: toast } = useToast();
  const dialog = useDialog();
  const [searchInput, setSearchInput] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [shipment, setShipment] = useState(null);
  const [events, setEvents] = useState([]);
  const [sousEtapes, setSousEtapes] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [newEvent, setNewEvent] = useState(emptyEvent);
  const [editDate, setEditDate] = useState(false);
  const [usedStatuses, setUsedStatuses] = useState(new Set());
  const searchInputRef = useRef(null);

  const resetForm = useCallback(() => {
    setNewEvent(emptyEvent());
    setEditDate(false);
    setShipment(null);
    setEvents([]);
    setSousEtapes({});
    setUsedStatuses(new Set());
  }, []);

  const handleSearch = async (shippingNumber) => {
    if (!shippingNumber.trim()) return;

    setSearchLoading(true);
    try {
      const { data } = await api.post('/employe/shipments/by-number', {
        shipping_number: shippingNumber.trim(),
      });

      setShipment(data.shipment);
      setEvents(data.suivi_statuts || []);
      setSousEtapes(data.sous_etapes || {});
      setUsedStatuses(new Set((data.suivi_statuts || []).map((e) => e.statut)));
      setNewEvent(emptyEvent());
      setEditDate(false);
      toast('Expédition trouvée', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Expédition introuvable';
      toast(msg, 'error');
      resetForm();
    } finally {
      setSearchLoading(false);
    }
  };

  const handleScan = (result) => {
    setScannerOpen(false);
    handleSearch(result);
  };

  const handleScannerClose = (focusInput) => {
    setScannerOpen(false);
    if (focusInput && searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 100);
    }
  };

  const startOver = () => {
    resetForm();
    setSearchInput('');
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const availableStatuses = statuses.filter((s) => {
    if (REPEATABLE.includes(s.value)) return true;
    if (s.value === shipment?.statut_actuel) return true;
    return !usedStatuses.has(s.value);
  });

  const selectStatus = (value) => {
    setNewEvent((prev) => ({
      ...prev,
      statut: value,
      sous_statut: value === 'en_cours' ? prev.sous_statut : '',
    }));
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!shipment || !newEvent.statut) return;

    const isNewStatus = !usedStatuses.has(newEvent.statut) && newEvent.statut !== shipment?.statut_actuel;
    const shouldCreateStatusEvent = isNewStatus || REPEATABLE.includes(newEvent.statut);

    if (shouldCreateStatusEvent) {
      try {
        setLoading(true);
        const { data } = await api.post(`/employe/shipments/${shipment.id}/tracking`, {
          statut: newEvent.statut,
          sous_statut: newEvent.sous_statut,
          date_statut: newEvent.date_statut,
          description: newEvent.description,
        });

        setEvents((prev) =>
          [...prev, data.event].sort((a, b) => new Date(b.date_statut) - new Date(a.date_statut))
        );
        setUsedStatuses((prev) => new Set([...prev, newEvent.statut]));
        setShipment((s) =>
          s ? { ...s, statut_actuel: newEvent.statut, sous_statut_actuel: newEvent.sous_statut } : null
        );
      } catch (err) {
        const msg = err.response?.data?.message || "Erreur lors de l'ajout du statut";
        toast(msg, 'error');
        return;
      } finally {
        setLoading(false);
      }
    }

    if (newEvent.addSousEtape && newEvent.sousEtapeDescription.trim()) {
      try {
        await api.post(`/shipments/${shipment.id}/sous-etapes`, {
          statut: newEvent.statut,
          description: newEvent.sousEtapeDescription.trim(),
        });
        const { data } = await api.get(`/employe/shipments/${shipment.id}`);
        setSousEtapes(data.sous_etapes || {});
      } catch {
        toast("Erreur lors de l'ajout de la sous-étape", 'error');
      }
    }

    const confirmed = await dialog.confirm({
      title: 'Terminer ?',
      description: 'Le statut a été mis à jour. Voulez-vous saisir une nouvelle expédition ?',
      confirmText: 'Terminé',
      cancelText: 'Continuer',
      variant: 'success',
    });

    if (confirmed) {
      startOver();
    } else {
      setNewEvent(emptyEvent());
      setEditDate(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const ok = await dialog.confirm({
      title: 'Supprimer cet événement ?',
      description: 'Cet événement de suivi sera définitivement retiré du dossier.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;
    // Success is reported only once the refresh has also landed: if either
    // step fails the view is stale, so a single error is more honest than a
    // "supprimé" toast next to a row that is still on screen.
    try {
      await api.delete(`/tracking-events/${eventId}`);
      const { data } = await api.get(`/employe/shipments/${shipment.id}`);
      setShipment(data.shipment);
      setEvents(data.suivi_statuts || []);
      setSousEtapes(data.sous_etapes || {});
      setUsedStatuses(new Set((data.suivi_statuts || []).map((e) => e.statut)));
      toast('Événement supprimé', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la suppression.', 'error');
    }
  };

  const handleDeleteSousEtape = async (sousEtapeId) => {
    const ok = await dialog.confirm({
      title: 'Supprimer cette sous-étape ?',
      description: 'Cette note sera définitivement retirée du dossier.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/sous-etapes/${sousEtapeId}`);
      const { data } = await api.get(`/employe/shipments/${shipment.id}`);
      setSousEtapes(data.sous_etapes || {});
      toast('Sous-étape supprimée', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la suppression.', 'error');
    }
  };

  const mergeHistory = (evts = [], sousEtps = {}) => {
    const eventItems = (evts || []).map((e) => ({
      ...e,
      _type: 'event',
      _date: e.date_statut,
      _statut: e.statut,
      _id: `e-${e.id}`,
    }));

    const sousEtapeItems = Object.values(sousEtps).flatMap((arr) =>
      (arr || []).map((se) => ({
        ...se,
        _type: 'sous-etape',
        _date: se.created_at,
        _statut: se.statut,
        _id: `s-${se.id}`,
      }))
    );

    return [...eventItems, ...sousEtapeItems].sort((a, b) => new Date(b._date) - new Date(a._date));
  };

  /* ---------- Scan / search screen ---------- */
  if (!shipment) {
    return (
      <>
        <div className="emp-scan">
          <div className="emp-scan-target" aria-hidden="true">
            <div className="emp-scan-target-inner" />
            <div className="emp-scan-sweep" />
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 500, color: 'var(--color-graphite)', letterSpacing: '-0.01em' }}>
            Scanner un colis
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-steel)', margin: '6px 0 24px', maxWidth: 360 }}>
            Visez le QR code de l'étiquette pour ouvrir le dossier et enregistrer un statut.
          </p>

          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            disabled={searchLoading}
            className="btn btn-primary emp-scan-btn"
          >
            <QrCode size={20} />
            Ouvrir le scanner
          </button>

          <div className="emp-scan-divider">ou</div>

          <form
            className="emp-scan-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(searchInput);
            }}
          >
            <input
              ref={searchInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="N° d'expédition"
              className="input emp-scan-input"
            />
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={searchLoading || !searchInput.trim()}
              aria-label="Rechercher"
              style={{ minHeight: 48, paddingLeft: 18, paddingRight: 18 }}
            >
              <Search size={18} />
            </button>
          </form>
        </div>

        <QrScannerModal open={scannerOpen} onClose={handleScannerClose} onScan={handleScan} />
      </>
    );
  }

  /* ---------- Shipment screen ---------- */
  const history = mergeHistory(events, sousEtapes);
  const destination = [shipment.recipient_city, shipment.recipient_country].filter(Boolean).join(', ');

  return (
    <div className="emp-has-submitbar">
      <div className="emp-ident">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="emp-ident-num">{shipment.shipping_number}</div>
          <div className="emp-ident-sub">
            {shipment.recipient_name || '—'}
            {destination && ` · ${destination}`}
          </div>
        </div>
        <StatusBadge status={shipment.statut_actuel} />
        <button
          type="button"
          onClick={startOver}
          aria-label="Fermer et scanner un autre colis"
          className="flex items-center justify-center shrink-0"
          style={{
            width: 34,
            height: 34,
            border: '1px solid var(--color-ash)',
            background: 'none',
            borderRadius: 9999,
            color: 'var(--color-steel)',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>
      </div>

      <Disclosure title="Destinataire" icon={MapPin}>
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
          <DetailRow label="Nom" value={shipment.recipient_name} />
          <DetailRow label="Entreprise" value={shipment.recipient_company} />
          <DetailRow label="Téléphone" value={shipment.recipient_phone} />
          <DetailRow label="Adresse" value={shipment.recipient_address} />
          <DetailRow label="Ville" value={shipment.recipient_city} />
          <DetailRow label="Code postal" value={shipment.recipient_postal_code} />
          <DetailRow label="Pays" value={shipment.recipient_country} />
        </div>
      </Disclosure>

      <Disclosure title="Expéditeur" icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
          <DetailRow label="Nom" value={shipment.sender_name} />
          <DetailRow label="Entreprise" value={shipment.sender_company} />
          <DetailRow label="Email" value={shipment.sender_email} />
          <DetailRow label="Téléphone" value={shipment.sender_phone} />
          <DetailRow label="Adresse" value={shipment.sender_address} />
          <DetailRow label="Ville" value={shipment.sender_city} />
          <DetailRow label="Code postal" value={shipment.sender_postal_code} />
          <DetailRow label="Pays" value={shipment.sender_country} />
        </div>
      </Disclosure>

      <Disclosure title="Colis & Service" icon={Package}>
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
          <DetailRow label="Service" value={(shipment.type_service || '').replace(/_/g, ' ')} />
          <DetailRow label="Type de colis" value={shipment.type_colis} />
          <DetailRow label="Poids" value={shipment.poids ? `${shipment.poids} kg` : '—'} />
          <DetailRow
            label="Dimensions (cm)"
            value={
              shipment.longueur && shipment.largeur && shipment.hauteur
                ? `${shipment.longueur} x ${shipment.largeur} x ${shipment.hauteur}`
                : '—'
            }
          />
          <DetailRow label="Pièces" value={shipment.nb_pieces ?? '—'} />
          <DetailRow
            label="Valeur déclarée"
            value={
              shipment.valeur_declaree && Number(shipment.valeur_declaree) > 0
                ? `${shipment.valeur_declaree} ${shipment.devise_valeur || 'MAD'}`
                : '—'
            }
          />
          <DetailRow label="Description" value={shipment.description_colis} />
        </div>
      </Disclosure>

      <form onSubmit={handleAddEvent}>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--color-graphite)',
            margin: '24px 0 12px',
          }}
        >
          Nouveau statut
        </h2>

        <div className="emp-choices">
          {availableStatuses.map((s) => {
            const selected = newEvent.statut === s.value;
            const already = usedStatuses.has(s.value);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => selectStatus(s.value)}
                className={`emp-choice${selected ? ' is-selected' : ''}`}
                aria-pressed={selected}
              >
                <span className="emp-choice-dot">{selected && <Check size={12} strokeWidth={3} />}</span>
                {s.label}
                {already && !selected && <span className="emp-choice-done">déjà enregistré</span>}
              </button>
            );
          })}
        </div>

        {newEvent.statut === 'en_cours' && (
          <div style={{ marginTop: 16 }}>
            <label className="field-label">Sous-statut</label>
            <div className="emp-chips">
              {subStatuses.map((s) => {
                const selected = newEvent.sous_statut === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() =>
                      setNewEvent((prev) => ({ ...prev, sous_statut: selected ? '' : s.value }))
                    }
                    className={`emp-chip${selected ? ' is-selected' : ''}`}
                    aria-pressed={selected}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          {editDate ? (
            <FormField label="Date et heure" required>
              <input
                type="datetime-local"
                value={newEvent.date_statut}
                onChange={(e) => setNewEvent({ ...newEvent, date_statut: e.target.value })}
                className="input"
                style={{ fontSize: 16, minHeight: 48 }}
                required
              />
            </FormField>
          ) : (
            <button type="button" className="emp-link-btn" onClick={() => setEditDate(true)}>
              <Clock size={14} />
              {formatDateTime(newEvent.date_statut)} — modifier l'heure
            </button>
          )}
        </div>

        <div style={{ marginTop: 8 }}>
          <FormField label="Description" hint={`${newEvent.description.length}/60`}>
            <input
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              maxLength={60}
              className="input"
              style={{ fontSize: 16, minHeight: 48 }}
              placeholder="Optionnel"
            />
          </FormField>
        </div>

        {newEvent.addSousEtape ? (
          <FormField label="Sous-étape" hint={`${newEvent.sousEtapeDescription.length}/60`}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newEvent.sousEtapeDescription}
                onChange={(e) => setNewEvent({ ...newEvent, sousEtapeDescription: e.target.value })}
                maxLength={60}
                className="input"
                style={{ fontSize: 16, minHeight: 48, flex: 1 }}
                placeholder="Note ajoutée sous ce statut"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setNewEvent({ ...newEvent, addSousEtape: false, sousEtapeDescription: '' })}
                className="btn btn-secondary"
                aria-label="Retirer la sous-étape"
                style={{ minHeight: 48, paddingLeft: 14, paddingRight: 14 }}
              >
                <X size={16} />
              </button>
            </div>
          </FormField>
        ) : (
          <button
            type="button"
            className="emp-link-btn"
            onClick={() => setNewEvent({ ...newEvent, addSousEtape: true })}
          >
            + Ajouter une sous-étape
          </button>
        )}

        <div className="emp-submitbar" style={{ marginTop: 24 }}>
          <button type="submit" className="btn btn-primary" disabled={loading || !newEvent.statut}>
            {loading
              ? 'Enregistrement...'
              : newEvent.statut
                ? `Enregistrer « ${labelFor(newEvent.statut)} »`
                : 'Choisissez un statut'}
          </button>
        </div>
      </form>

      <h2
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: 'var(--color-graphite)',
          margin: '32px 0 14px',
        }}
      >
        Historique
      </h2>

      {history.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--color-steel)' }}>Aucun événement pour l'instant.</p>
      ) : (
        <div className="emp-timeline">
          {history.map((item) => {
            const isEvent = item._type === 'event';
            return (
              <div key={item._id} className={`emp-tl-item${isEvent ? '' : ' is-sub'}`}>
                <div className="emp-tl-rail">
                  <span className="emp-tl-node" />
                </div>
                <div className="emp-tl-body">
                  <div className="emp-tl-head">
                    {isEvent ? (
                      <>
                        <StatusBadge status={item._statut}>{labelFor(item._statut)}</StatusBadge>
                        {item.sous_statut && (
                          <StatusBadge status={item.sous_statut}>{labelFor(item.sous_statut)}</StatusBadge>
                        )}
                      </>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: 'var(--color-steel)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Sous-étape
                      </span>
                    )}
                    <span className="emp-tl-date">{formatDateTime(item._date)}</span>
                    <button
                      type="button"
                      className="emp-tl-del"
                      aria-label="Supprimer"
                      onClick={() => (isEvent ? handleDeleteEvent(item.id) : handleDeleteSousEtape(item.id))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {item.description && <div className="emp-tl-desc">{item.description}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <QrScannerModal open={scannerOpen} onClose={handleScannerClose} onScan={handleScan} />
    </div>
  );
}
