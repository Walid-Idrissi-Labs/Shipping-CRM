import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Copy, Eye, EyeOff, ShieldAlert, Trash2, MapPin, Truck, User, ChevronRight } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard, DetailRow } from '../../components/ui/DataCard';
import { FormField } from '../../components/ui/Form';
import SaveStatusButton from '../../components/ui/SaveStatusButton';
import CopyButton from '../../components/ui/CopyButton';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import TruckLoader from '../../components/ui/TruckLoader';
import { useDirtyForm } from '../../hooks/useDirtyForm';
import { useDialog } from '../../contexts/DialogContext';
import { useToast } from '../../contexts/ToastContext';

const emptyClient = {
  full_name: '',
  email: '',
  phone: '',
  ice: '',
  address: '',
  postal_code: '',
  city: '',
  country: 'Maroc',
};

function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dialog = useDialog();
  const toast = useToast();
  const [meta, setMeta] = useState({ origin_password: null, account_created_at: null });
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [missions, setMissions] = useState([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const clientForm = useDirtyForm(emptyClient);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api.get(`/clients/${id}`).then((res) => {
      const c = res.data.client || {};
      clientForm.reset({ ...emptyClient, ...c });
      setMeta({
        origin_password: res.data.origin_password || null,
        account_created_at: res.data.account_created_at || null,
      });
      setLoading(false);
    }).catch((err) => {
      if (err.response?.status === 404) setNotFound(true);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    setMissionsLoading(true);
    api.get(`/clients/${id}/missions`)
      .then((res) => setMissions(res.data.data || []))
      .catch(() => setMissions([]))
      .finally(() => setMissionsLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    clientForm.update({ [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (clientForm.status === 'saving') return;
    clientForm.beginSave();
    try {
      await api.patch(`/clients/${id}`, clientForm.data);
      clientForm.succeedSave();
      toast.push('Client mis a jour', 'success');
    } catch (err) {
      clientForm.failSave();
      toast.push(err.response?.data?.message || 'Erreur lors de la sauvegarde.', 'error');
    }
  };

  const handleDelete = async () => {
    const ok = await dialog.confirm({
      title: 'Supprimer ce client ?',
      description: 'Le compte client, son utilisateur associe, ses expeditions et factures seront definitivement retires.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      safetyGate: true,
      requiredInput: 'supprimer',
      inputLabel: 'Tapez supprimer pour confirmer',
    });
    if (!ok) return;
    await api.delete(`/clients/${id}`);
    toast.push('Client supprime', 'success');
    navigate('/dashboard/clients');
  };

  const handleCopyPassword = async () => {
    if (!meta.origin_password) return;
    await navigator.clipboard.writeText(meta.origin_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><TruckLoader /></div>;
  if (notFound) return <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-danger)' }}>Client introuvable</div>;

  const client = clientForm.data;
  const createdAt = meta.account_created_at || client.created_at;

  return (
    <div className="space-y-6" style={{ maxWidth: 960 }}>
        <PageHeader
          eyebrow="Compte Client"
          title={
            <div className="flex items-baseline gap-4 flex-wrap justify-between w-full">
              <span>{client.full_name || 'Client'}</span>
              <span
                style={{ fontFamily: 'var(--font-sans)', fontSize: 32, fontWeight: 300, color: 'var(--color-primary)', letterSpacing: '0.02em', position: 'relative', top: 3 }}
              >
                {client.account_number || '-'}
                <CopyButton value={client.account_number} size={20} />
              </span>
            </div>
          }
          subtitle="Modifier les informations du client et consulter les identifiants."
          breadcrumbs={[{ label: 'Clients', to: '/dashboard/clients' }, { label: client.account_number || '-' }]}
        />

      <form onSubmit={handleSubmit} className="space-y-6">
        <DataCard
          title="Informations du Compte"
          description="Coordonnees, adresse et identifiants lies a ce client."
          actions={
            <>
              <SaveStatusButton state={clientForm.status} />
              <button type="button" onClick={handleDelete} className="btn btn-danger">
                <Trash2 size={14} />
                Supprimer
              </button>
            </>
          }
        >
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left: Form Fields */}
            <div className="w-full md:w-2/3">
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                <FormField label="Nom / Entreprise"><input name="full_name" value={client.full_name || ''} onChange={handleChange} className="input" /></FormField>
                <FormField label="Email"><input name="email" type="email" value={client.email || ''} onChange={handleChange} className="input" /></FormField>
                <FormField label="Telephone"><input name="phone" value={client.phone || ''} onChange={handleChange} className="input" /></FormField>
                <FormField label="ICE"><input name="ice" value={client.ice || ''} onChange={handleChange} className="input" /></FormField>
                <div className="md:col-span-2">
                  <FormField label="Adresse"><input name="address" value={client.address || ''} onChange={handleChange} className="input" /></FormField>
                </div>
                <FormField label="Ville"><input name="city" value={client.city || ''} onChange={handleChange} className="input" /></FormField>
                <FormField label="Code Postal"><input name="postal_code" value={client.postal_code || ''} onChange={handleChange} className="input" /></FormField>
                <FormField label="Pays"><input name="country" value={client.country || ''} onChange={handleChange} className="input" /></FormField>
              </div>
            </div>

            {/* Right: Account Creation Info */}
            <div className="w-full md:w-1/3">
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-graphite)', margin: 0 }}>
                  Informations de Creation du Compte
                </h3>
                <p style={{ fontSize: 12, color: 'var(--color-steel)', margin: '4px 0 0' }}>
                  Visible uniquement par le prestataire.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <DetailRow
                  label="Date de creation du compte"
                  value={createdAt ? new Date(createdAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : null}
                />
                <div>
                  <DetailsLabel>Mot de passe original</DetailsLabel>
                  <div className="flex" style={{ gap: 6 }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      readOnly
                      value={meta.origin_password || '—'}
                      className="input font-mono-data"
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="btn btn-secondary" style={{ padding: '8px 12px' }} title={showPassword ? 'Masquer' : 'Afficher'}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button type="button" onClick={handleCopyPassword} className="btn btn-secondary" style={{ padding: '8px 12px' }} title="Copier">
                      <Copy size={15} />
                    </button>
                  </div>
                  {copied && <div style={{ fontSize: 12, color: 'var(--color-vivid-green-dark)', marginTop: 6 }}>Copie dans le presse-papier.</div>}
                </div>
              </div>

              <div
                className="flex items-start"
                style={
                  {
                    marginTop: 24,
                    gap: 10,
                    background: 'var(--color-warning-container)',
                    color: 'var(--color-graphite)',
                    padding: '12px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                  }
                }
              >
                <ShieldAlert size={18} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ fontWeight: 600 }}>Confidentiel.</strong> Ne partagez ce mot de passe qu'avec le client concerne. Sa consultation est enregistree dans le journal d'audit.
                </div>
              </div>
            </div>
          </div>
        </DataCard>
      </form>

      <MissionsSection missions={missions} loading={missionsLoading} navigate={navigate} />
    </div>
  );
}

function MissionsSection({ missions, loading, navigate }) {
  return (
    <DataCard
      title="Missions liees a ce client"
      description="Missions qui concernent les expeditions de ce client."
      actions={
        <Link
          to="/dashboard/flotte/affectations"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 13, fontWeight: 500, color: 'var(--color-primary)',
          }}
        >
          Voir toutes les missions <ChevronRight size={13} />
        </Link>
      }
    >
      {loading ? (
        <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}><TruckLoader /></div>
      ) : missions.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Aucune mission"
          description="Aucune mission n'a ete creee pour les expeditions de ce client pour le moment."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr>
                <th>Mission</th>
                <th>Chauffeur</th>
                <th>Vehicule</th>
                <th>Trajet</th>
                <th>Depart</th>
                <th>Expeditions</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {missions.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => navigate(`/dashboard/flotte/affectations/${m.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="font-mono-data" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                    #{m.id}
                  </td>
                  <td>
                    {m.chauffeur ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <User size={12} style={{ color: 'var(--color-smoke)' }} />
                        {m.chauffeur.nom_complet}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    {m.vehicule ? (
                      <span className="font-mono-data" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Truck size={12} style={{ color: 'var(--color-smoke)' }} />
                        {m.vehicule.immatriculation}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <span style={{ fontSize: 13 }}>
                      {m.ville_depart} {'->'} {m.ville_arrivee || '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--color-steel)' }}>
                    {formatDateTime(m.date_heure_depart)}
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 500,
                      background: 'var(--color-primary-wash)', color: 'var(--color-primary)',
                    }}>
                      {(m.expeditions || []).length}
                    </span>
                  </td>
                  <td><StatusBadge status={m.statut} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <ChevronRight size={14} style={{ color: 'var(--color-smoke)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DataCard>
  );
}

function DetailsLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--color-steel)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}
