import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Plus, List, FileText, Info } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard } from '../../components/ui/DataCard';
import { FormField } from '../../components/ui/Form';
import { useToast } from '../../contexts/ToastContext';
import { useSuccess } from '../../contexts/SuccessModalContext';

const initial = {
  client_name: '', client_email: '', client_phone: '', client_address: '', client_city: '', client_postal_code: '', client_country: '',
  recipient_name: '', recipient_company: '', recipient_email: '', recipient_address: '', recipient_city: '', recipient_postal_code: '', recipient_country: '', recipient_phone: '',
  poids: '', longueur: '', largeur: '', hauteur: '', nb_pieces: 1,
  type_colis: 'paquet', type_service: 'national', description_colis: '',
};

export default function ClientQuoteRequestCreate() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const success = useSuccess();

  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => {
        const user = data.user || {};
        const c = user.client || {};
        setForm((f) => ({
          ...f,
          client_name: c.full_name || user.name || '',
          client_email: c.email || user.email || '',
          client_phone: c.phone || '',
          client_address: c.address || '',
          client_city: c.city || '',
          client_postal_code: c.postal_code || '',
          client_country: c.country || '',
        }));
      })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]));
      const { data } = await api.post('/my/quote-requests', payload);
      const id = data.quote_request.id;
      toast.push('Demande de devis envoyee', 'success');
      success.show({
        title: 'Demande de devis envoyee',
        message: `Votre demande #${id} a ete envoyee. Vous recevrez une proposition tarifaire dans les meilleurs delais.`,
        detail: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-steel)' }}>Reference</span>
              <span className="font-mono-data" style={{ color: 'var(--color-graphite)', fontWeight: 600 }}>#{id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-steel)' }}>Statut</span>
              <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>En attente</span>
            </div>
          </div>
        ),
        primaryAction: {
          label: 'Voir mes devis',
          icon: FileText,
          onClick: () => { success.hide(); navigate('/client/devis?tab=demandes'); },
        },
        secondaryActions: [
          { label: 'Nouvelle demande', icon: Plus, onClick: () => { success.hide(); navigate('/client/demande-devis/nouveau'); } },
          { label: 'Voir la liste', icon: List, onClick: () => { success.hide(); navigate('/client/devis?tab=demandes'); } },
        ],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la soumission.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 960 }}>
      <PageHeader
        title="Nouvelle Demande de Devis"
        subtitle="Decrivez votre besoin pour recevoir une proposition tarifaire."
        breadcrumbs={[
          { label: 'Devis', to: '/client/devis' },
          { label: 'Demandes', to: '/client/devis?tab=demandes' },
          { label: 'Nouvelle' },
        ]}
        actions={
          <>
            <button type="button" onClick={() => navigate('/client/devis?tab=demandes')} className="btn btn-ghost">
              <ArrowLeft size={14} /> Annuler
            </button>
            <button type="submit" form="quote-req-form" disabled={loading} className="btn btn-primary">
              <Send size={14} /> {loading ? 'Envoi...' : 'Envoyer la Demande'}
            </button>
          </>
        }
      />

      <form id="quote-req-form" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div style={{ background: 'var(--color-danger-container)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid var(--color-ash)',
            borderLeft: '3px solid var(--color-primary)',
            background: 'var(--color-primary-wash)',
            fontSize: 13,
            color: 'var(--color-graphite)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Info size={16} color="var(--color-primary)" />
          Vos informations d'expediteur ci-dessous sont pre-remplies depuis votre fiche client. Vous pouvez les modifier avant l'envoi.
        </div>

        <DataCard title="Vos informations (Expediteur)" description="Ces champs sont pre-remplis depuis votre profil. Vous pouvez les modifier si besoin.">
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
            <FormField label="Nom" required><input name="client_name" value={form.client_name} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Email" required><input name="client_email" value={form.client_email} onChange={handleChange} type="email" className="input" required /></FormField>
            <FormField label="Telephone" required><input name="client_phone" value={form.client_phone} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Adresse" required><input name="client_address" value={form.client_address} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Ville" required><input name="client_city" value={form.client_city} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Code postal" required><input name="client_postal_code" value={form.client_postal_code} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Pays" required><input name="client_country" value={form.client_country} onChange={handleChange} className="input" required /></FormField>
          </div>
        </DataCard>

        <DataCard title="Destinataire" description="Personne physique ou morale qui recevra le colis.">
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
            <FormField label="Nom" required><input name="recipient_name" value={form.recipient_name} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Entreprise"><input name="recipient_company" value={form.recipient_company} onChange={handleChange} className="input" /></FormField>
            <FormField label="Email"><input name="recipient_email" value={form.recipient_email} onChange={handleChange} type="email" className="input" /></FormField>
            <FormField label="Telephone" required><input name="recipient_phone" value={form.recipient_phone} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Adresse" required><input name="recipient_address" value={form.recipient_address} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Ville" required><input name="recipient_city" value={form.recipient_city} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Code postal" required><input name="recipient_postal_code" value={form.recipient_postal_code} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Pays" required><input name="recipient_country" value={form.recipient_country} onChange={handleChange} className="input" required /></FormField>
          </div>
        </DataCard>

        <DataCard title="Colis" description="Dimensions et caracteristiques du colis a expedier.">
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 16 }}>
            <FormField label="Poids (kg)"><input name="poids" value={form.poids} onChange={handleChange} type="number" step="0.001" min="0" className="input" /></FormField>
            <FormField label="Longueur (cm)"><input name="longueur" value={form.longueur} onChange={handleChange} type="number" step="0.01" min="0" className="input" /></FormField>
            <FormField label="Largeur (cm)"><input name="largeur" value={form.largeur} onChange={handleChange} type="number" step="0.01" min="0" className="input" /></FormField>
            <FormField label="Hauteur (cm)"><input name="hauteur" value={form.hauteur} onChange={handleChange} type="number" step="0.01" min="0" className="input" /></FormField>
            <FormField label="Pieces"><input name="nb_pieces" value={form.nb_pieces} onChange={handleChange} type="number" min="1" className="input" /></FormField>
            <FormField label="Type de colis">
              <select name="type_colis" value={form.type_colis} onChange={handleChange} className="select">
                <option value="document">Document</option>
                <option value="paquet">Paquet</option>
                <option value="palette">Palette</option>
              </select>
            </FormField>
            <div className="col-span-2">
              <FormField label="Service" required>
                <select name="type_service" value={form.type_service} onChange={handleChange} className="select">
                  <option value="national">National</option>
                  <option value="international_express_dap">International Express DAP</option>
                  <option value="fret_aerien">Fret Aerien</option>
                  <option value="routier_groupage">Routier (Groupage)</option>
                  <option value="maritime_groupage">Maritime (Groupage)</option>
                </select>
              </FormField>
            </div>
          </div>
          <FormField label="Description du colis" hint="60 caracteres maximum">
            <input name="description_colis" value={form.description_colis} onChange={handleChange} maxLength={60} className="input" />
          </FormField>
        </DataCard>

        <div className="flex" style={{ gap: 10 }}>
          <button type="submit" disabled={loading} className="btn btn-primary">
            <Send size={14} />
            {loading ? 'Envoi...' : 'Envoyer la Demande'}
          </button>
          <button type="button" onClick={() => navigate('/client/devis?tab=demandes')} className="btn btn-ghost">
            <ArrowLeft size={14} />
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
