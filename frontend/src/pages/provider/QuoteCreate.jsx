import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save, ArrowLeft, FileText, Plus, List } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard } from '../../components/ui/DataCard';
import { FormField } from '../../components/ui/Form';
import { useToast } from '../../contexts/ToastContext';
import { useSuccess } from '../../contexts/SuccessModalContext';

const initial = {
  client_id: '', client_name: '', client_address: '', client_city: '', client_postal_code: '', client_country: 'Maroc', client_email: '', client_phone: '',
  recipient_name: '', recipient_company: '', recipient_address: '', recipient_city: '', recipient_postal_code: '', recipient_country: '', recipient_phone: '',
  poids: '', longueur: '', largeur: '', hauteur: '', nb_pieces: 1,
  type_colis: 'paquet', type_service: 'national', description_colis: '',
  montant_ht: '', montant_ttc: '',
};

export default function QuoteCreate() {
  const [form, setForm] = useState(initial);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const demandeId = searchParams.get('demandeId');
  const toast = useToast();
  const success = useSuccess();

  useEffect(() => {
    api.get('/clients?limit=1000').then((res) => setClients(res.data.data || []));
  }, []);

  useEffect(() => {
    if (!demandeId) return;
    api.get(`/quote-requests/${demandeId}`).then((res) => {
      const r = res.data;
      setPrefill(r);
      setForm({
        ...initial,
        client_id: r.client_id ? String(r.client_id) : '',
        client_name: r.client_name || '',
        client_address: r.client_address || '',
        client_city: r.client_city || '',
        client_postal_code: r.client_postal_code || '',
        client_country: r.client_country || 'Maroc',
        client_email: r.client_email || '',
        client_phone: r.client_phone || '',
        recipient_name: r.recipient_name || '',
        recipient_company: r.recipient_company || '',
        recipient_address: r.recipient_address || '',
        recipient_city: r.recipient_city || '',
        recipient_postal_code: r.recipient_postal_code || '',
        recipient_country: r.recipient_country || '',
        recipient_phone: r.recipient_phone || '',
        poids: r.poids ?? '',
        longueur: r.longueur ?? '',
        largeur: r.largeur ?? '',
        hauteur: r.hauteur ?? '',
        nb_pieces: r.nb_pieces ?? 1,
        type_colis: r.type_colis || 'paquet',
        type_service: r.type_service || 'national',
        description_colis: r.description_colis || '',
      });
    }).catch(() => {});
  }, [demandeId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    const client = clients.find((c) => c.id.toString() === clientId);
    if (client) {
      setForm((f) => ({
        ...f,
        client_id: clientId,
        client_name: client.full_name,
        client_address: client.address || '',
        client_city: client.city || '',
        client_postal_code: client.postal_code || '',
        client_country: client.country || 'Maroc',
        client_email: client.email || '',
        client_phone: client.phone || '',
      }));
    } else {
      setForm((f) => ({
        ...f,
        client_id: '',
        client_name: '',
        client_address: '',
        client_city: '',
        client_postal_code: '',
        client_country: 'Maroc',
        client_email: '',
        client_phone: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let createdId;
      if (demandeId) {
        const { data } = await api.post(`/quote-requests/${demandeId}/create-quote`, {
          montant_ht: form.montant_ht,
          montant_ttc: form.montant_ttc,
        });
        createdId = data.quote.id;
      } else {
        const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]));
        const { data } = await api.post('/quotes', payload);
        createdId = data.quote.id;
      }
      toast.push('Devis cree', 'success');
      success.show({
        title: 'Devis cree avec succes',
        message: `Le devis #${createdId} est pret. Vous pouvez maintenant le consulter ou creer un autre devis.`,
        detail: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-steel)' }}>Numero</span>
              <span className="font-mono-data" style={{ color: 'var(--color-graphite)', fontWeight: 600 }}>DV-{String(createdId).padStart(6, '0')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-steel)' }}>Statut</span>
              <span style={{ color: 'var(--color-vivid-green-dark)', fontWeight: 600 }}>En attente</span>
            </div>
          </div>
        ),
        primaryAction: {
          label: 'Voir le devis',
          icon: FileText,
          onClick: () => { success.hide(); navigate(`/dashboard/devis/${createdId}`); },
        },
        secondaryActions: [
          { label: 'Creer un autre', icon: Plus, onClick: () => { success.hide(); navigate('/dashboard/devis/nouveau'); } },
          { label: 'Voir la liste', icon: List, onClick: () => { success.hide(); navigate('/dashboard/devis'); } },
        ],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la creation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 960 }}>
      <PageHeader
        eyebrow={demandeId ? 'Depuis demande de devis' : undefined}
        title={demandeId ? 'Nouveau Devis (demande)' : 'Nouveau Devis'}
        subtitle={demandeId ? 'Completez la tarification et creez le devis.' : 'Creer une proposition commerciale.'}
        breadcrumbs={[{ label: 'Devis', to: '/dashboard/devis' }, { label: 'Nouveau' }]}
        actions={
          <>
            <button type="button" onClick={() => navigate('/dashboard/devis')} className="btn btn-ghost">
              <ArrowLeft size={14} /> Annuler
            </button>
            <button type="submit" form="quote-form" disabled={loading} className="btn btn-primary">
              <Save size={14} /> {loading ? 'Creation...' : 'Creer le Devis'}
            </button>
          </>
        }
      />

      <form id="quote-form" onSubmit={handleSubmit}>
        {prefill && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-ash)',
              borderLeft: '3px solid var(--color-primary)',
              background: 'var(--color-paper-white)',
              marginBottom: 16,
              fontSize: 13,
              color: 'var(--color-graphite)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <FileText size={16} color="var(--color-primary)" />
            Formulaire pre-rempli depuis la demande de devis #{prefill.id}.
          </div>
        )}
        {error && (
          <div style={{ background: 'var(--color-danger-container)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <DataCard title="Client" description="Selectionnez un client ou laissez vide pour un client divers.">
          <FormField label="Compte client" hint="Laissez vide pour un client divers.">
            <select value={form.client_id} onChange={handleClientChange} className="select">
              <option value="">Client divers (sans compte)</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.account_number} - {c.full_name}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16, marginTop: 12 }}>
            <FormField label="Nom" required><input name="client_name" value={form.client_name} onChange={handleChange} required className="input" /></FormField>
            <FormField label="Email" required><input name="client_email" value={form.client_email} onChange={handleChange} type="email" required className="input" /></FormField>
            <FormField label="Telephone" required><input name="client_phone" value={form.client_phone} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Adresse"><input name="client_address" value={form.client_address} onChange={handleChange} className="input" /></FormField>
            <FormField label="Ville"><input name="client_city" value={form.client_city} onChange={handleChange} className="input" /></FormField>
            <FormField label="Code postal"><input name="client_postal_code" value={form.client_postal_code} onChange={handleChange} className="input" /></FormField>
            <FormField label="Pays"><input name="client_country" value={form.client_country} onChange={handleChange} className="input" /></FormField>
          </div>
        </DataCard>

        <div style={{ marginTop: 16 }}>
          <DataCard title="Destinataire">
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
              <FormField label="Nom" required><input name="recipient_name" value={form.recipient_name} onChange={handleChange} required className="input" /></FormField>
              <FormField label="Entreprise"><input name="recipient_company" value={form.recipient_company} onChange={handleChange} className="input" /></FormField>
              <FormField label="Telephone"><input name="recipient_phone" value={form.recipient_phone} onChange={handleChange} className="input" /></FormField>
              <FormField label="Adresse" required><input name="recipient_address" value={form.recipient_address} onChange={handleChange} required className="input" /></FormField>
              <FormField label="Ville" required><input name="recipient_city" value={form.recipient_city} onChange={handleChange} required className="input" /></FormField>
              <FormField label="Code postal" required><input name="recipient_postal_code" value={form.recipient_postal_code} onChange={handleChange} required className="input" /></FormField>
              <FormField label="Pays" required><input name="recipient_country" value={form.recipient_country} onChange={handleChange} required className="input" /></FormField>
            </div>
          </DataCard>
        </div>

        <div style={{ marginTop: 16 }}>
          <DataCard title="Colis & Tarification" description="Caracteristiques du colis et montants HT/TTC.">
            <div className="grid grid-cols-1 md:grid-cols-4" style={{ gap: 16 }}>
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
              <FormField label="Service">
                <select name="type_service" value={form.type_service} onChange={handleChange} className="select">
                  <option value="national">National</option>
                  <option value="international_express_dap">International Express DAP</option>
                  <option value="fret_aerien">Fret Aerien</option>
                  <option value="routier_groupage">Routier (Groupage)</option>
                  <option value="maritime_groupage">Maritime (Groupage)</option>
                </select>
              </FormField>
              <FormField label="Description" hint="60 caracteres max">
                <input name="description_colis" value={form.description_colis} onChange={handleChange} maxLength={60} className="input" />
              </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16, marginTop: 12 }}>
              <FormField label="Montant HT (MAD)" required>
                <input name="montant_ht" value={form.montant_ht} onChange={handleChange} type="number" step="0.01" min="0" required className="input" />
              </FormField>
              <FormField label="Montant TTC (MAD)" required>
                <input name="montant_ttc" value={form.montant_ttc} onChange={handleChange} type="number" step="0.01" min="0" required className="input" />
              </FormField>
            </div>
          </DataCard>
        </div>
      </form>
    </div>
  );
}
