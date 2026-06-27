import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, ArrowLeft, Plus, List, Package, Copy } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard } from '../../components/ui/DataCard';
import { FormField } from '../../components/ui/Form';
import { useToast } from '../../contexts/ToastContext';
import { useSuccess } from '../../contexts/SuccessModalContext';

const initial = {
  client_id: '',
  sender_name: '', sender_company: '', sender_address: '', sender_city: '', sender_postal_code: '', sender_country: 'Maroc', sender_email: '', sender_phone: '',
  recipient_name: '', recipient_company: '', recipient_address: '', recipient_city: '', recipient_postal_code: '', recipient_country: '', recipient_phone: '',
  poids: '', longueur: '', largeur: '', hauteur: '', nb_pieces: 1,
  valeur_declaree: '', devise_valeur: 'MAD', type_colis: 'paquet', description_colis: '', type_service: 'national'
};

export default function ShipmentCreate() {
  const [searchParams] = useSearchParams();
  const devisId = searchParams.get('devisId');
  const copyFrom = searchParams.get('copyFrom');
  const [form, setForm] = useState(initial);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [copySource, setCopySource] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const success = useSuccess();

  useEffect(() => {
    api.get('/clients?limit=1000').then((res) => setClients(res.data.data || []));
  }, []);

  useEffect(() => {
    if (!copyFrom || devisId) return;
    api.get(`/shipments/${copyFrom}`)
      .then((res) => {
        const s = res.data.shipment || res.data || {};
        setCopySource({ id: s.id, shipping_number: s.shipping_number });
        setForm({
          ...form,
          client_id: s.client_id ? String(s.client_id) : '',
          sender_name: s.sender_name || '',
          sender_company: s.sender_company || '',
          sender_address: s.sender_address || '',
          sender_city: s.sender_city || '',
          sender_postal_code: s.sender_postal_code || '',
          sender_country: s.sender_country || 'Maroc',
          sender_email: s.sender_email || '',
          sender_phone: s.sender_phone || '',
          recipient_name: s.recipient_name || '',
          recipient_company: s.recipient_company || '',
          recipient_address: s.recipient_address || '',
          recipient_city: s.recipient_city || '',
          recipient_postal_code: s.recipient_postal_code || '',
          recipient_country: s.recipient_country || '',
          recipient_phone: s.recipient_phone || '',
          poids: s.poids ?? '',
          longueur: s.longueur ?? '',
          largeur: s.largeur ?? '',
          hauteur: s.hauteur ?? '',
          nb_pieces: s.nb_pieces ?? 1,
          valeur_declaree: s.valeur_declaree ?? '',
          devise_valeur: s.devise_valeur || 'MAD',
          type_colis: s.type_colis || 'paquet',
          description_colis: s.description_colis || '',
          type_service: s.type_service || 'national',
        });
      })
      .catch(() => {
        toast.push('Impossible de charger l\'expedition source.', 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyFrom, devisId]);

  useEffect(() => {
    if (!devisId) return;
    api.get(`/quotes/${devisId}`)
      .then((res) => {
        const q = res.data;
        setPrefill(q);
        setForm({
          ...form,
          client_id: q.client_id ? String(q.client_id) : '',
          sender_name: q.client_name || '',
          sender_company: '',
          sender_address: q.client_address || '',
          sender_city: q.client_city || '',
          sender_postal_code: q.client_postal_code || '',
          sender_country: q.client_country || 'Maroc',
          sender_email: q.client_email || '',
          sender_phone: q.client_phone || '',
          recipient_name: q.recipient_name || '',
          recipient_company: q.recipient_company || '',
          recipient_address: q.recipient_address || '',
          recipient_city: q.recipient_city || '',
          recipient_postal_code: q.recipient_postal_code || '',
          recipient_country: q.recipient_country || '',
          recipient_phone: q.recipient_phone || '',
          poids: q.poids ?? '',
          longueur: q.longueur ?? '',
          largeur: q.largeur ?? '',
          hauteur: q.hauteur ?? '',
          nb_pieces: q.nb_pieces ?? 1,
          type_colis: q.type_colis || 'paquet',
          type_service: q.type_service || 'national',
          description_colis: q.description_colis || '',
        });
      })
      .catch(() => {
        toast.push('Impossible de charger le devis source.', 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devisId]);

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
        sender_name: client.full_name,
        sender_company: client.company_name || '',
        sender_address: client.address || '',
        sender_city: client.city || '',
        sender_postal_code: client.postal_code || '',
        sender_country: client.country || 'Maroc',
        sender_email: client.email || '',
        sender_phone: client.phone || '',
      }));
    } else {
      setForm((f) => ({ ...f, client_id: clientId }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]));
      if (devisId) payload.quote_id = parseInt(devisId, 10);
      const { data } = await api.post('/shipments', payload);
      const createdId = data.shipment.id;
      toast.push('Expedition creee', 'success');
      success.show({
        title: 'Expedition creee avec succes',
        message: `L'expedition #${createdId} a ete enregistree. Vous pouvez suivre son traitement.`,
        detail: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-steel)' }}>Numero</span>
              <span className="font-mono-data" style={{ color: 'var(--color-graphite)', fontWeight: 600 }}>{data.shipment.shipping_number || `EXP-${String(createdId).padStart(6, '0')}`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-steel)' }}>Statut</span>
              <span style={{ color: 'var(--color-vivid-green-dark)', fontWeight: 600 }}>Information recue</span>
            </div>
          </div>
        ),
        primaryAction: {
          label: 'Voir l\'expedition',
          icon: Package,
          onClick: () => { success.hide(); navigate(`/dashboard/expeditions/${createdId}`); },
        },
        secondaryActions: [
          { label: 'Creer une autre', icon: Plus, onClick: () => { success.hide(); setForm(initial); } },
          { label: 'Voir la liste', icon: List, onClick: () => { success.hide(); navigate('/dashboard/expeditions'); } },
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
        title={copySource ? `Nouvelle Expedition (depuis copie)` : 'Nouvelle Expedition'}
        subtitle={devisId
          ? 'Expedition creee a partir d\'un devis accepte.'
          : copySource
            ? 'Donnees pre-remplies depuis une expedition existante. Vous pouvez tout modifier.'
            : 'Creer une expedition pour un client (compte ou divers).'}
        breadcrumbs={copySource
          ? [{ label: 'Expeditions', to: '/dashboard/expeditions' }, { label: copySource.shipping_number, to: `/dashboard/expeditions/${copySource.id}` }, { label: 'Copier' }]
          : devisId
            ? [{ label: 'Devis', to: '/dashboard/devis' }, { label: `Devis #${devisId}` }, { label: 'Nouvelle expedition' }]
            : undefined}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {copySource && !prefill && (
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
            <Copy size={16} color="var(--color-primary)" />
            <span>
              Les champs ont ete pre-remplis depuis l'expedition{' '}
              <strong className="font-mono-data">{copySource.shipping_number}</strong>. Un nouveau numero d'expedition et un nouveau statut vous seront attribues. Vous pouvez tout modifier.
            </span>
          </div>
        )}
        {prefill && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-ash)',
              borderLeft: '3px solid var(--color-vivid-green)',
              background: 'var(--color-paper-white)',
              fontSize: 13,
              color: 'var(--color-graphite)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Package size={16} color="var(--color-vivid-green-dark)" />
            <span>
              Formulaire pre-rempli depuis le devis <strong className="font-mono-data">{prefill.quote_number}</strong>. Vous pouvez ajuster les valeurs avant d'enregistrer.
            </span>
          </div>
        )}
        {error && (
          <div style={{ background: 'var(--color-danger-container)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}

        <DataCard title="Client" description="Selectionnez un client pour pre-remplir l'expediteur.">
          <FormField label="Compte client" hint="Laissez vide pour un client divers.">
            <select value={form.client_id} onChange={handleClientChange} className="select" style={{ maxWidth: 480 }}>
              <option value="">Client divers (sans compte)</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.account_number} - {c.full_name}</option>)}
            </select>
          </FormField>
        </DataCard>

        <DataCard title="Expediteur">
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
            <FormField label="Nom" required><input name="sender_name" value={form.sender_name} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Entreprise"><input name="sender_company" value={form.sender_company} onChange={handleChange} className="input" /></FormField>
            <FormField label="Email"><input name="sender_email" value={form.sender_email} onChange={handleChange} type="email" className="input" /></FormField>
            <FormField label="Telephone"><input name="sender_phone" value={form.sender_phone} onChange={handleChange} className="input" /></FormField>
            <FormField label="Adresse"><input name="sender_address" value={form.sender_address} onChange={handleChange} className="input" /></FormField>
            <FormField label="Ville"><input name="sender_city" value={form.sender_city} onChange={handleChange} className="input" /></FormField>
            <FormField label="Code postal"><input name="sender_postal_code" value={form.sender_postal_code} onChange={handleChange} className="input" /></FormField>
            <FormField label="Pays"><input name="sender_country" value={form.sender_country} onChange={handleChange} className="input" /></FormField>
          </div>
        </DataCard>

        <DataCard title="Destinataire">
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
            <FormField label="Nom" required><input name="recipient_name" value={form.recipient_name} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Entreprise"><input name="recipient_company" value={form.recipient_company} onChange={handleChange} className="input" /></FormField>
            <FormField label="Telephone"><input name="recipient_phone" value={form.recipient_phone} onChange={handleChange} className="input" /></FormField>
            <FormField label="Adresse" required><input name="recipient_address" value={form.recipient_address} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Ville" required><input name="recipient_city" value={form.recipient_city} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Code postal" required><input name="recipient_postal_code" value={form.recipient_postal_code} onChange={handleChange} className="input" required /></FormField>
            <FormField label="Pays" required><input name="recipient_country" value={form.recipient_country} onChange={handleChange} className="input" required /></FormField>
          </div>
        </DataCard>

        <DataCard title="Colis" description="Dimensions et caracteristiques.">
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 16 }}>
            <FormField label="Poids (kg)"><input name="poids" value={form.poids} onChange={handleChange} type="number" step="0.001" min="0" className="input" /></FormField>
            <FormField label="Longueur (cm)"><input name="longueur" value={form.longueur} onChange={handleChange} type="number" step="0.01" min="0" className="input" /></FormField>
            <FormField label="Largeur (cm)"><input name="largeur" value={form.largeur} onChange={handleChange} type="number" step="0.01" min="0" className="input" /></FormField>
            <FormField label="Hauteur (cm)"><input name="hauteur" value={form.hauteur} onChange={handleChange} type="number" step="0.01" min="0" className="input" /></FormField>
            <FormField label="Pieces"><input name="nb_pieces" value={form.nb_pieces} onChange={handleChange} type="number" min="1" className="input" /></FormField>
            <FormField label="Valeur Declaree">
              <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--color-ash)', borderRadius: 8, background: 'var(--color-paper-white)', overflow: 'hidden' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input name="valeur_declaree" value={form.valeur_declaree} onChange={handleChange} type="number" step="0.01" min="0" className="input" style={{ borderRadius: 0, borderRight: 'none', border: 'none', boxShadow: 'none' }} />
                </div>
                <div style={{ width: 90, borderLeft: '1px solid var(--color-ash)', background: 'var(--color-fog)' }}>
                  <select name="devise_valeur" value={form.devise_valeur} onChange={handleChange} className="select" style={{ borderRadius: 0, border: 'none', boxShadow: 'none', background: 'transparent' }}>
                    <option value="MAD">MAD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
            </FormField>
            <FormField label="Type de colis">
              <select name="type_colis" value={form.type_colis} onChange={handleChange} className="select">
                <option value="document">Document</option>
                <option value="paquet">Paquet</option>
                <option value="palette">Palette</option>
              </select>
            </FormField>
            <FormField label="Type de service">
              <select name="type_service" value={form.type_service} onChange={handleChange} className="select">
                <option value="national">National</option>
                <option value="international_express_dap">International Express DAP</option>
                <option value="fret_aerien">Fret Aerien</option>
                <option value="routier_groupage">Routier (Groupage)</option>
                <option value="maritime_groupage">Maritime (Groupage)</option>
              </select>
            </FormField>
          </div>
          <FormField label="Description du colis" hint="60 caracteres maximum">
            <input name="description_colis" value={form.description_colis} onChange={handleChange} maxLength={60} className="input" />
          </FormField>
        </DataCard>

        <div className="flex" style={{ gap: 10 }}>
          <button type="submit" disabled={loading} className="btn btn-primary">
            <Send size={14} />
            {loading ? 'Creation...' : "Creer l'Expedition"}
          </button>
          <button type="button" onClick={() => navigate('/dashboard/expeditions')} className="btn btn-ghost">
            <ArrowLeft size={14} />
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
