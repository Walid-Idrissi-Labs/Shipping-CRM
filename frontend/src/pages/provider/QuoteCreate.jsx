import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save, ArrowLeft, FileText, Plus, List, ExternalLink, X } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard, DetailRow } from '../../components/ui/DataCard';
import { FormField } from '../../components/ui/Form';
import { useToast } from '../../contexts/ToastContext';
import { useSuccess } from '../../contexts/SuccessModalContext';
import { MultiColisForm } from '../../components/MultiColisForm';

const initial = {
  client_id: '', client_name: '', client_address: '', client_city: '', client_postal_code: '', client_country: 'Maroc', client_email: '', client_phone: '',
  recipient_name: '', recipient_company: '', recipient_address: '', recipient_city: '', recipient_postal_code: '', recipient_country: '', recipient_phone: '',
  // Colis fields - now handled by MultiColisForm
  colis: [],
  type_service: 'national', 
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
  const [taxRate, setTaxRate] = useState(20);
  const [colis, setColis] = useState([{
    nb_pieces: 1,
    poids: '',
    longueur: '',
    largeur: '',
    hauteur: '',
    type_colis: 'paquet',
    description_colis: ''
  }]);

  useEffect(() => {
    api.get('/clients?limit=1000').then((res) => setClients(res.data.data || []));
  }, []);

  useEffect(() => {
    if (!demandeId) return;
    api.get(`/quote-requests/${demandeId}`).then((res) => {
      const r = res.data;
      setPrefill(r);
      // Handle colis from quote request
      const prefillColis = r.colis && r.colis.length > 0
        ? r.colis.map((c, i) => ({
            position: c.position ?? i,
            nb_pieces: c.nb_pieces ?? 1,
            poids: c.poids ?? '',
            longueur: c.longueur ?? '',
            largeur: c.largeur ?? '',
            hauteur: c.hauteur ?? '',
            type_colis: c.type_colis || 'paquet',
            description_colis: c.description_colis || ''
          }))
        : [{
            nb_pieces: r.nb_pieces ?? 1,
            poids: r.poids ?? '',
            longueur: r.longueur ?? '',
            largeur: r.largeur ?? '',
            hauteur: r.hauteur ?? '',
            type_colis: r.type_colis || 'paquet',
            description_colis: r.description_colis || ''
          }];
      
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
        colis: prefillColis,
        type_service: r.type_service || 'national',
        description_colis: r.description_colis || '',
      });
      setColis(prefillColis);
    }).catch(() => {});
  }, [demandeId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleTaxRateChange = (rate) => {
    setTaxRate(rate);
    const ht = parseFloat(form.montant_ht) || 0;
    if (ht > 0) {
      setForm((f) => ({ ...f, montant_ttc: (ht * (1 + rate / 100)).toFixed(2) }));
    }
  };

  const handleHtChange = (e) => {
    const value = e.target.value;
    const ht = parseFloat(value) || 0;
    setForm((f) => ({
      ...f,
      montant_ht: value,
      montant_ttc: ht > 0 ? (ht * (1 + taxRate / 100)).toFixed(2) : f.montant_ttc,
    }));
  };

  const handleTtcChange = (e) => {
    const value = e.target.value;
    const ttc = parseFloat(value) || 0;
    setForm((f) => ({
      ...f,
      montant_ttc: value,
      montant_ht: ttc > 0 ? (ttc / (1 + taxRate / 100)).toFixed(2) : f.montant_ht,
    }));
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
    if (demandeId) {
      const ht = parseFloat(form.montant_ht);
      if (isNaN(ht) || ht <= 0) {
        setError('Le montant HT est obligatoire et doit etre superieur a 0.');
        return;
      }
      const ttc = parseFloat(form.montant_ttc) || ht * (1 + taxRate / 100);
    }
    // Validate at least one colis has poids and type_colis
    const hasValidColis = colis.some(c => c.poids && c.type_colis);
    if (!hasValidColis) {
      setError('Veuillez renseigner au moins un colis avec un poids et un type.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let createdId;
      if (demandeId) {
        const { data } = await api.post(`/quote-requests/${demandeId}/create-quote`, {
          montant_ht: parseFloat(form.montant_ht),
          montant_ttc: parseFloat(form.montant_ttc) || parseFloat(form.montant_ht) * (1 + taxRate / 100),
        });
        createdId = data.quote.id;
      } else {
        const payload = {
          ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])),
          colis: colis.map(c => ({
            nb_pieces: c.nb_pieces,
            poids: c.poids ? Number(c.poids) : 0,
            longueur: c.longueur ? Number(c.longueur) : null,
            largeur: c.largeur ? Number(c.largeur) : null,
            hauteur: c.hauteur ? Number(c.hauteur) : null,
            type_colis: c.type_colis,
            description_colis: c.description_colis || null
          }))
        };
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
              <span style={{ color: 'var(--color-steel)' }}>Reference</span>
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

  const buildAddress = (r) => {
    const parts = [
      r.recipient_address,
      [r.recipient_postal_code, r.recipient_city].filter(Boolean).join(' '),
      r.recipient_country,
    ].filter(Boolean);
    return parts.join(', ') || '-';
  };

  const buildDimensions = (r) => {
    if (!r) return '-';
    const dims = [r.longueur, r.largeur, r.hauteur].filter((v) => v != null && v !== '');
    return dims.length ? dims.map((d) => `${d} cm`).join(' x ') : '-';
  };

  const isDemande = !!demandeId;

  return (
    <div style={{ maxWidth: isDemande ? 1000 : 960 }}>
      <PageHeader
        eyebrow={isDemande ? 'Depuis demande de devis' : undefined}
        title={isDemande ? 'Nouveau Devis (demande)' : 'Nouveau Devis'}
        subtitle={isDemande ? 'Completez la tarification et creez le devis.' : 'Creer une proposition commerciale.'}
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

        {isDemande ? (
          <>
            {/* Read-only summary cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16, marginBottom: 16 }}>
              {/* Destination */}
              <DataCard title="Destination" description="Informations provenant de la demande.">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {prefill?.recipient_address && (
                    <DetailRow label="Adresse" value={prefill.recipient_address} />
                  )}
                  {(prefill?.recipient_city || prefill?.recipient_postal_code) && (
                    <DetailRow label="Ville / CP" value={[prefill.recipient_postal_code, prefill.recipient_city].filter(Boolean).join(' ')} />
                  )}
                  {prefill?.recipient_country && (
                    <DetailRow label="Pays" value={prefill.recipient_country} />
                  )}
                </div>
              </DataCard>

              {/* Colis */}
              <DataCard title="Colis" description="Caracteristiques provenant de la demande.">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8  , border : '1px solid var(--color-border)' , color: 'var(--color-graphite)'}}>
                  {prefill?.type_service && (
                    <DetailRow label="Service" value={prefill.type_service.replace(/_/g, ' ')} />
                  )}
                  {prefill?.colis && prefill.colis.length > 0 ? (
                    prefill.colis.map((c, idx) => (
                      <div key={idx} style={{ padding: '8px', background: 'var(--color-bg)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Colis {idx + 1}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
                          {c.type_colis && <span><strong>Type:</strong> {c.type_colis}</span>}
                          {c.nb_pieces && <span><strong>Pièces:</strong> {c.nb_pieces}</span>}
                          {c.poids != null && <span><strong>Poids/pièce:</strong> {c.poids} kg</span>}
                          {c.poids != null && c.nb_pieces && <span><strong>Poids total:</strong> {(c.nb_pieces * c.poids).toFixed(3)} kg</span>}
                          {c.longueur && c.largeur && c.hauteur && (
                            <span><strong>Dimensions:</strong> {c.longueur} x {c.largeur} x {c.hauteur} cm</span>
                          )}
                          {c.longueur && c.largeur && c.hauteur && c.nb_pieces && (
                            <span><strong>Volume total:</strong> {(c.nb_pieces * (c.longueur/100) * (c.largeur/100) * (c.hauteur/100)).toFixed(4)} m³</span>
                          )}
                          {c.description_colis && <span><strong>Description:</strong> {c.description_colis}</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {prefill?.type_colis && (
                        <DetailRow label="Type de colis" value={prefill.type_colis} />
                      )}
                      {prefill?.poids != null && (
                        <DetailRow label="Poids" value={`${prefill.poids} kg`} />
                      )}
                      {buildDimensions(prefill) !== '-' && (
                        <DetailRow label="Dimensions (L x l x H)" value={buildDimensions(prefill)} />
                      )}
                      {prefill?.nb_pieces && (
                        <DetailRow label="Nombre de pieces" value={prefill.nb_pieces} />
                      )}
                      {prefill?.description_colis && (
                        <DetailRow label="Description" value={prefill.description_colis} />
                      )}
                    </>
                  )}
                </div>
              </DataCard>
            </div>

            {/* Pricing section - interactive */}
            <DataCard title="Tarification" description="Saisissez le montant HT. Le TTC se calcule automatiquement selon le taux de TVA.">
              <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16 }}>
                <FormField label="Taux de TVA">
                  <div style={{ display: 'flex', gap: 8 , }}>
                    <button
                      type="button"
                      onClick={() => handleTaxRateChange(10)}
                      className={`btn ${taxRate === 10 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1 }}
                    >
                      10%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTaxRateChange(20)}
                      className={`btn ${taxRate === 20 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1 }}
                    >
                      20%
                    </button>
                  </div>
                </FormField>

                <FormField label="Montant HT (MAD)" required hint="Obligatoire, superieur a 0">
                  <input
                    name="montant_ht"
                    value={form.montant_ht}
                    onChange={handleHtChange}
                    type="number"
                    step="0.01"
                    min="0.00"
                    className="input"
                    required
                  />
                </FormField>

                <FormField label="Montant TTC (MAD)" hint="Calcule automatiquement, editable">
                  <input
                    name="montant_ttc"
                    value={form.montant_ttc}
                    onChange={handleTtcChange}
                    type="number"
                    step="0.01"
                    min="0.00"
                    className="input"
                  />
                </FormField>
              </div>
            </DataCard>
          </>
        ) : (
          <>
            <DataCard title="Client" description="Selectionnez un client ou laissez vide pour un client divers.">
              <FormField label="Compte client" hint="Laissez vide pour un client divers.">
                <select value={form.client_id} onChange={handleClientChange} className="select">
                  <option value="">Client divers (sans compte)</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.account_number} - {c.full_name}</option>)}
                </select>
              </FormField>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16, marginTop: 12 }}>
                <FormField label="Nom" required><input name="client_name" value={form.client_name} onChange={handleChange} className="input" required /></FormField>
                <FormField label="Email" required><input name="client_email" value={form.client_email} onChange={handleChange} type="email" className="input" required /></FormField>
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
                  <FormField label="Nom" required><input name="recipient_name" value={form.recipient_name} onChange={handleChange} className="input" required /></FormField>
                  <FormField label="Entreprise"><input name="recipient_company" value={form.recipient_company} onChange={handleChange} className="input" /></FormField>
                  <FormField label="Telephone"><input name="recipient_phone" value={form.recipient_phone} onChange={handleChange} className="input" /></FormField>
                  <FormField label="Adresse" required><input name="recipient_address" value={form.recipient_address} onChange={handleChange} className="input" required /></FormField>
                  <FormField label="Ville" required><input name="recipient_city" value={form.recipient_city} onChange={handleChange} className="input" required /></FormField>
                  <FormField label="Code postal" required><input name="recipient_postal_code" value={form.recipient_postal_code} onChange={handleChange} className="input" required /></FormField>
                  <FormField label="Pays" required><input name="recipient_country" value={form.recipient_country} onChange={handleChange} className="input" required /></FormField>
                </div>
              </DataCard>
            </div>

            <div style={{ marginTop: 16 }}>
              <DataCard title="Colis & Tarification" description="Ajoutez un ou plusieurs colis. Chaque colis peut contenir plusieurs pieces identiques.">
                <MultiColisForm
                  colis={colis}
                  onChange={setColis}
                  showTotals={true}
                />
                <FormField label="Montant HT (MAD)" required>
                  <input name="montant_ht" value={form.montant_ht} onChange={handleChange} type="number" step="0.01" min="0" required className="input" />
                </FormField>
                <FormField label="Montant TTC (MAD)" required>
                  <input name="montant_ttc" value={form.montant_ttc} onChange={handleChange} type="number" step="0.01" min="0" required className="input" />
                </FormField>
              </DataCard>
            </div>
          </>
        )}

        {/* <div className="flex" style={{ gap: 10, marginTop: 16 }}>
          <button type="submit" disabled={loading} className="btn btn-primary">
            <Save size={14} />
            {loading ? 'Creation...' : 'Creer le Devis'}
          </button>
          <button type="button" onClick={() => navigate('/dashboard/devis')} className="btn btn-ghost">
            <ArrowLeft size={14} />
            Annuler
          </button>
        </div> */}
      </form>
    </div>
  );
}