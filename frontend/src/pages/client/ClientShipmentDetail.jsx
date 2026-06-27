import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Circle,
  CopyPlus,
  Download,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard, DetailRow } from '../../components/ui/DataCard';
import StatusBadge from '../../components/ui/StatusBadge';
import CopyButton from '../../components/ui/CopyButton';
import TruckLoader from '../../components/ui/TruckLoader';
import { useToast } from '../../contexts/ToastContext';

function formatSousStatut(s) {
  return s.replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const TRACKING_STATUSES = [
  { value: 'information_recue', label: 'Information Recue' },
  { value: 'ramasse', label: 'Ramasse' },
  { value: 'en_transit', label: 'En Transit' },
  { value: 'en_cours', label: 'En Cours' },
  { value: 'livre', label: 'Livre' },
];

function HorizontalTimeline({ events }) {
  const eventStatuses = new Set(events.map((e) => e.statut));
  const currentIndex = TRACKING_STATUSES.reduce((highest, status, idx) => {
    if (eventStatuses.has(status.value) && idx > highest) return idx;
    return highest;
  }, -1);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        position: 'relative',
      }}
    >
      {TRACKING_STATUSES.map((status, idx) => {
        const event = [...events]
          .filter((e) => e.statut === status.value)
          .sort((a, b) => new Date(b.date_statut) - new Date(a.date_statut))[0] || null;
        const completed = idx <= currentIndex && currentIndex !== -1;
        const current = idx === currentIndex;
        const isLast = idx === TRACKING_STATUSES.length - 1;
        const dotBg = current
          ? 'var(--color-vivid-green)'
          : completed
            ? 'var(--color-primary)'
            : 'var(--color-bone)';
        const dotBorder = current
          ? 'var(--color-vivid-green)'
          : completed
            ? 'var(--color-primary)'
            : 'var(--color-ash)';
        const lineRightBg = idx < currentIndex ? 'var(--color-primary)' : 'var(--color-ash)';
        const lineLeftBg = completed ? 'var(--color-primary)' : 'var(--color-ash)';
        return (
          <div
            key={status.value}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              minWidth: 0,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {!isLast && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    right: '-50%',
                    top: 23,
                    height: 3,
                    background: lineRightBg,
                    zIndex: 0,
                  }}
                />
              )}
              {!isLast && idx !== 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '-50%',
                    right: '50%',
                    top: 23,
                    height: 3,
                    background: lineLeftBg,
                    zIndex: 0,
                  }}
                />
              )}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: 40,
                  height: 40,
                  borderRadius: 9999,
                  background: dotBg,
                  border: `3px solid ${dotBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-paper-white)',
                  boxShadow: current ? '0 0 0 6px rgba(74,198,76,0.22)' : 'none',
                }}
              >
                {completed ? <Check size={18} strokeWidth={3} /> : <Circle size={8} fill="var(--color-smoke)" />}
              </div>
            </div>
            <div
              style={{
                marginTop: 18,
                textAlign: 'center',
                fontWeight: 600,
                fontSize: 15,
                color: completed ? 'var(--color-graphite)' : 'var(--color-smoke)',
                lineHeight: 1.3,
                wordBreak: 'break-word',
              }}
            >
              {(event && event.sous_statut) ? formatSousStatut(event.sous_statut) : status.label}
            </div>
            {event && (
              <>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--color-steel)',
                    marginTop: 8,
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}
                >
                  {new Date(event.date_statut).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                {event.description && (
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--color-graphite)',
                      marginTop: 6,
                      textAlign: 'center',
                      lineHeight: 1.4,
                      maxWidth: 200,
                      wordBreak: 'break-word',
                    }}
                  >
                    {event.description}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VerticalTimeline({ events }) {
  const eventStatuses = new Set(events.map((e) => e.statut));
  const currentIndex = TRACKING_STATUSES.reduce((highest, status, idx) => {
    if (eventStatuses.has(status.value) && idx > highest) return idx;
    return highest;
  }, -1);

  return (
    <div style={{ position: 'relative' }}>
      {TRACKING_STATUSES.map((status, idx) => {
        const event = [...events]
          .filter((e) => e.statut === status.value)
          .sort((a, b) => new Date(b.date_statut) - new Date(a.date_statut))[0] || null;
        const completed = idx <= currentIndex && currentIndex !== -1;
        const current = idx === currentIndex;
        const isLast = idx === TRACKING_STATUSES.length - 1;
        return (
          <div
            key={status.value}
            style={{ position: 'relative', paddingLeft: 36, paddingBottom: isLast ? 0 : 22 }}
          >
            {!isLast && (
              <div
                style={{
                  position: 'absolute',
                  left: 11,
                  top: 22,
                  bottom: 0,
                  width: 2,
                  background: idx < currentIndex ? 'var(--color-primary)' : 'var(--color-ash)',
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                left: 0,
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
              }}
            >
              {completed ? <Check size={14} strokeWidth={3} /> : <Circle size={7} fill="var(--color-smoke)" />}
            </div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 15,
                color: completed ? 'var(--color-graphite)' : 'var(--color-smoke)',
                lineHeight: 1.3,
              }}
            >
              {(event && event.sous_statut) ? formatSousStatut(event.sous_statut) : status.label}
            </div>
            {event && (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--color-steel)',
                  marginTop: 4,
                  lineHeight: 1.3,
                }}
              >
                {new Date(event.date_statut).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {event.sous_statut && (
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
                    {formatSousStatut(event.sous_statut)}
                  </span>
                )}
                {event.description && (
                  <span style={{ color: 'var(--color-graphite)', display: 'block', marginTop: 2 }}>
                    {event.description}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
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

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTimeFR(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function ClientShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [shipment, setShipment] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [labelHtml, setLabelHtml] = useState(null);
  const [labelLoading, setLabelLoading] = useState(true);
  const [labelMenuOpen, setLabelMenuOpen] = useState(false);
  const [labelUrl, setLabelUrl] = useState(null);
  const labelMenuRef = useRef(null);

  useEffect(() => {
    fetchShipment();
    fetchLabel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const fetchShipment = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/my/expeditions/${id}`);
      setShipment(data.shipment || data);
      const suivi = data.suivi_statuts || data.shipment?.suiviStatuts || [];
      setEvents(suivi);
    } catch {
      toast.push('Expedition introuvable.', 'error');
      navigate('/client/mes-expeditions');
    } finally {
      setLoading(false);
    }
  };

  const fetchLabel = async () => {
    setLabelLoading(true);
    try {
      const res = await api.get(`/my/expeditions/${id}/label-preview`, { responseType: 'text' });
      setLabelHtml(typeof res.data === 'string' ? res.data : '');
      api.get(`/my/expeditions/${id}/label`, { responseType: 'blob' })
        .then((r) => {
          const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
          if (labelUrl) URL.revokeObjectURL(labelUrl);
          setLabelUrl(url);
        })
        .catch(() => {});
    } finally {
      setLabelLoading(false);
    }
  };

  const openLabelPdf = () => {
    if (!shipment) return;
    window.open(`/api/my/expeditions/${id}/label-inline`, '_blank');
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

  if (loading) {
    return (
      <div style={{ maxWidth: 1080, display: 'flex', justifyContent: 'center', padding: 32 }}>
        <TruckLoader />
      </div>
    );
  }

  if (!shipment) return null;

  return (
    <div className="space-y-8">
      <div style={{ marginBottom: 4 }}>
        <button
          type="button"
          onClick={() => navigate('/client/mes-expeditions')}
          className="btn btn-ghost"
        >
          <ArrowLeft size={14} /> Retour aux expeditions
        </button>
      </div>

      <PageHeader
        eyebrow="Expedition"
        title={
          <>
            {shipment.shipping_number} <CopyButton value={shipment.shipping_number} size={16} />
          </>
        }
        breadcrumbs={[
          { label: 'Mes Expeditions', to: '/client/mes-expeditions' },
          { label: shipment.shipping_number },
        ]}
        actions={
          <div className="flex flex-col" style={{ gap: 8, width: '100%' }}>
            <button
              type="button"
              onClick={downloadLabel}
              disabled={!labelUrl || !shipment}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              <Download size={14} /> Telecharger etiquette
            </button>
            <Link
              to={`/client/expeditions/nouveau?copyFrom=${shipment.id}`}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              title="Creer une nouvelle expedition avec les memes informations. Les champs resteront modifiables."
            >
              <CopyPlus size={14} /> Copier Details dans Nouvelle Expedition
            </Link>
          </div>
        }
      />

      <DataCard
        title="Suivi"
        description="Progression actuelle de votre expedition."
        padding={16}
        style={{ marginBottom: 16 }}
      >
        {events.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--color-steel)', padding: 12 }}>
            Aucun evenement de suivi pour le moment.
          </div>
        ) : (
          <div className="hidden lg:block">
            <HorizontalTimeline events={events} />
          </div>
        )}
        {events.length > 0 && (
          <div className="lg:hidden">
            <VerticalTimeline events={events} />
          </div>
        )}
      </DataCard>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" style={{ gap: 16 }}>
        <div className="flex flex-col min-w-0" style={{ gap: 16 }}>
          <DataCard title="Expediteur" description="Vos informations d'envoi." padding={16}>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
              <DetailRow label="Nom" value={shipment.sender_name} />
              <DetailRow label="Entreprise" value={shipment.sender_company || '-'} />
              <DetailRow label="Email" value={shipment.sender_email || '-'} />
              <DetailRow label="Telephone" value={shipment.sender_phone || '-'} />
              <DetailRow label="Adresse" value={shipment.sender_address || '-'} />
              <DetailRow label="Ville" value={shipment.sender_city || '-'} />
              <DetailRow label="Code postal" value={shipment.sender_postal_code || '-'} />
              <DetailRow label="Pays" value={shipment.sender_country || '-'} />
            </div>
          </DataCard>

          <DataCard title="Destinataire" description="Personne qui recevra le colis." padding={16}>
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

        <div className="flex flex-col min-w-0" style={{ gap: 16 }}>
          <DataCard title="Colis & Service" description="Caracteristiques du colis et du service." padding={16}>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
              <DetailRow label="Service" value={(shipment.type_service || '').replace(/_/g, ' ')} />
              <DetailRow label="Statut actuel"><StatusBadge status={shipment.statut_actuel} /></DetailRow>
              <DetailRow label="Type de colis" value={shipment.type_colis || '-'} />
              <DetailRow label="Poids" value={shipment.poids ? `${shipment.poids} kg` : '-'} />
              <DetailRow
                label="Dimensions (cm)"
                value={shipment.longueur && shipment.largeur && shipment.hauteur ? `${shipment.longueur} x ${shipment.largeur} x ${shipment.hauteur}` : '-'}
              />
              <DetailRow label="Pieces" value={shipment.nb_pieces ?? '-'} />
              <DetailRow
                label="Valeur declaree"
                value={shipment.valeur_declaree && Number(shipment.valeur_declaree) > 0 ? `${shipment.valeur_declaree} ${shipment.devise_valeur || 'MAD'}` : '-'}
              />
              <DetailRow label="Description" value={shipment.description_colis || '-'} />
            </div>
          </DataCard>

          <DataCard
            title="Etiquette"
            description="Apercu de l'etiquette de colis."
            actions={
              <div ref={labelMenuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setLabelMenuOpen((v) => !v)}
                  disabled={labelLoading}
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px' }}
                  title="Plus d'options"
                >
                  <ChevronDown size={16} />
                </button>
                {labelMenuOpen && (
                  <div
                    className="animate-fade-in"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      marginTop: 6,
                      minWidth: 200,
                      background: 'var(--color-paper-white)',
                      border: '1px solid var(--color-ash)',
                      borderRadius: 8,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      zIndex: 30,
                      padding: 4,
                    }}
                  >
                    <button
                      type="button"
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
                      type="button"
                      onClick={downloadLabel}
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
                  height: 300,
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
      </div>
    </div>
  );
}
