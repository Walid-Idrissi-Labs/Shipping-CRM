import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Truck, User, MapPin, Calendar, ExternalLink, ChevronDown, ArrowRight,
  CircleCheck, Clock, CircleX, PlayCircle, Save,
} from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import TruckLoader from '../../components/ui/TruckLoader';
import { useToast } from '../../contexts/ToastContext';

const STATUSES = [
  { value: 'planifiee', label: 'Planifiee', icon: Clock },
  { value: 'en_cours', label: 'En Cours', icon: PlayCircle },
  { value: 'terminee', label: 'Terminee', icon: CircleCheck },
  { value: 'annulee', label: 'Annulee', icon: CircleX },
];

function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function InfoBlock({ icon: Icon, label, value, mono }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'var(--color-primary-wash)', color: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </div>
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
          style={{ fontSize: 14, color: 'var(--color-graphite)', fontWeight: 500, wordBreak: 'break-word' }}
        >
          {value || '—'}
        </div>
      </div>
    </div>
  );
}

function RouteBlock({ villeDepart, paysDepart, villeArrivee, paysArrivee }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-graphite)' }}>
          {villeDepart || '—'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-steel)' }}>{paysDepart}</div>
      </div>
      <ArrowRight size={18} style={{ color: 'var(--color-smoke)' }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-graphite)' }}>
          {villeArrivee || 'N/A'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-steel)' }}>{paysArrivee || ''}</div>
      </div>
    </div>
  );
}

export default function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [affectation, setAffectation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [id]);

  const fetchAssignment = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/assignments/${id}`);
      setAffectation(data.affectation || data);
    } catch (err) {
      toast.error('Impossible de charger la mission.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClick = () => setStatusOpen(false);
    if (statusOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [statusOpen]);

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    setStatusOpen(false);
    try {
      await api.patch(`/assignments/${id}/status`, { statut: newStatus });
      toast.success(`Statut mis a jour: ${STATUSES.find((s) => s.value === newStatus)?.label}`);
      fetchAssignment();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise a jour.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Mission" subtitle="Chargement..." />
        <Card style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
          <TruckLoader />
        </Card>
      </div>
    );
  }

  if (!affectation) {
    return (
      <div>
        <PageHeader title="Mission introuvable" subtitle="" />
        <Card style={{ padding: 24, textAlign: 'center', color: 'var(--color-danger)' }}>
          Cette mission n'existe pas ou vous n'y avez pas acces.
        </Card>
      </div>
    );
  }

  const currentStatus = STATUSES.find((s) => s.value === affectation.statut);
  const expeditions = affectation.expeditions || [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`Mission #${affectation.id}`}
        title={`${affectation.ville_depart || ''} ${affectation.ville_arrivee ? '-> ' + affectation.ville_arrivee : ''}`}
        subtitle={`Depart: ${formatDateTime(affectation.date_heure_depart)}`}
        breadcrumbs={[
          { label: 'Flotte', to: '/dashboard/flotte' },
          { label: 'Affectations', to: '/dashboard/flotte/affectations' },
          { label: `#${affectation.id}` },
        ]}
        actionLabel="Retour a la liste"
        onAction={() => navigate('/dashboard/flotte/affectations')}
      />

      {/* Status card */}
      <Card style={{ padding: 20 }}>
        <div
          style={{
            display: 'flex', alignItems: 'center',
            gap: 14, flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              fontSize: 11, fontWeight: 500, color: 'var(--color-steel)',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}
          >
            Statut
          </div>
          <StatusBadge status={affectation.statut} />
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStatusOpen((v) => !v);
              }}
              disabled={updatingStatus}
              className="btn btn-secondary"
              style={{ padding: '8px 14px' }}
            >
              Changer statut <ChevronDown size={13} />
            </button>
            {statusOpen && (
              <div
                className="animate-fade-in"
                style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 6,
                  minWidth: 200, background: 'var(--color-paper-white)',
                  border: '1px solid var(--color-ash)', borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 30, padding: 4,
                }}
              >
                {STATUSES.map((s) => {
                  const Icon = s.icon;
                  const current = s.value === affectation.statut;
                  return (
                    <button
                      key={s.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!current) handleStatusChange(s.value);
                      }}
                      disabled={current}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '10px 12px',
                        background: current ? 'var(--color-bone)' : 'transparent',
                        border: 'none', borderRadius: 6,
                        textAlign: 'left', cursor: current ? 'default' : 'pointer',
                        fontSize: 13,
                        color: current ? 'var(--color-steel)' : 'var(--color-graphite)',
                        fontWeight: current ? 600 : 500,
                      }}
                    >
                      <Icon size={14} />
                      {s.label}
                      {current && <span style={{ marginLeft: 'auto', fontSize: 11 }}>actuel</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {currentStatus?.value === 'terminee' || currentStatus?.value === 'annulee' ? (
          <div
            style={{
              marginTop: 14, padding: 12, background: 'var(--color-primary-wash)',
              borderRadius: 8, fontSize: 12, color: 'var(--color-iron)',
            }}
          >
            <strong style={{ fontWeight: 600 }}>Note :</strong> Le passage au statut Terminee ou Annulee retablit automatiquement le vehicule a Disponible et le chauffeur a Actif.
          </div>
        ) : null}
      </Card>

      {/* Resources cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card style={{ padding: 20 }}>
          <h3 className="section-heading mb-4 flex items-center gap-2">
            <User size={16} style={{ color: 'var(--color-primary)' }} /> Chauffeur
          </h3>
          {affectation.chauffeur ? (
            <InfoBlock
              icon={User}
              label="Nom Complet"
              value={affectation.chauffeur.nom_complet}
            />
          ) : (
            <p style={{ color: 'var(--color-steel)', fontSize: 13 }}>Aucun chauffeur assigne.</p>
          )}
        </Card>

        <Card style={{ padding: 20 }}>
          <h3 className="section-heading mb-4 flex items-center gap-2">
            <Truck size={16} style={{ color: 'var(--color-primary)' }} /> Vehicule
          </h3>
          {affectation.vehicule ? (
            <InfoBlock
              icon={Truck}
              label="Immatriculation"
              value={affectation.vehicule.immatriculation}
              mono
            />
          ) : (
            <p style={{ color: 'var(--color-steel)', fontSize: 13 }}>Aucun vehicule assigne.</p>
          )}
        </Card>
      </div>

      {/* Route card */}
      <Card style={{ padding: 20 }}>
        <h3 className="section-heading mb-4 flex items-center gap-2">
          <MapPin size={16} style={{ color: 'var(--color-primary)' }} /> Itineraire
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <RouteBlock
              villeDepart={affectation.ville_depart}
              paysDepart={affectation.pays_depart}
              villeArrivee={affectation.ville_arrivee}
              paysArrivee={affectation.pays_arrivee}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoBlock
              icon={Calendar}
              label="Depart"
              value={formatDateTime(affectation.date_heure_depart)}
            />
            <InfoBlock
              icon={Calendar}
              label="Arrivee"
              value={affectation.date_heure_arrivee ? formatDateTime(affectation.date_heure_arrivee) : 'Non definie'}
            />
          </div>
        </div>
      </Card>

      {/* Expeditions list */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-ash)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <h3 className="section-heading flex items-center gap-2">
            <Truck size={16} style={{ color: 'var(--color-primary)' }} />
            Expeditions ({expeditions.length})
          </h3>
        </div>

        {expeditions.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Aucune expedition"
            description="Cette mission ne couvre actuellement aucune expedition."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Client</th>
                  <th>Destinataire</th>
                  <th>Service</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
            <tbody>
              {expeditions.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/dashboard/expeditions/${s.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="font-mono-data" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                      {s.shipping_number}
                    </td>
                    <td>{s.client?.full_name || s.client_divers_nom || '-'}</td>
                    <td>{s.recipient_name}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {(s.type_service || '').replace(/_/g, ' ')}
                    </td>
                    <td><StatusBadge status={s.statut_actuel} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <ExternalLink size={14} style={{ color: 'var(--color-smoke)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
