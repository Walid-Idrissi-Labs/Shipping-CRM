import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard } from '../../components/ui/DataCard';
import { FormField } from '../../components/ui/Form';
import { FileText, Eye, Download, Plus, List } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useSuccess } from '../../contexts/SuccessModalContext';
import TruckLoader from '../../components/ui/TruckLoader';

const today = () => new Date().toISOString().split('T')[0];
const inThirtyDays = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};

function formatMoney(value) {
  const n = Number(value || 0);
  return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const toast = useToast();
  const success = useSuccess();

  const [clients, setClients] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [selectedShipments, setSelectedShipments] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [clientMode, setClientMode] = useState('divers');
  const [clientId, setClientId] = useState('');
  const [clientDivers, setClientDivers] = useState({ nom: '', adresse: '', tel: '', email: '' });

  const [numeroYear, setNumeroYear] = useState(new Date().getFullYear());
  const [numeroSequence, setNumeroSequence] = useState(1);
  const [numeroN, setNumeroN] = useState('1');
  const [numeroLoading, setNumeroLoading] = useState(true);

  const [typeDestination, setTypeDestination] = useState('national');
  const [dateFacture, setDateFacture] = useState(today());
  const [dateEcheance, setDateEcheance] = useState(inThirtyDays());
  const [taxable, setTaxable] = useState('');
  const [nonTaxable, setNonTaxable] = useState('');

  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    setNumeroLoading(true);
    api.get('/invoices/next-number')
      .then((res) => {
        const sequence = Number(res.data.sequence || 1);
        setNumeroSequence(sequence);
        setNumeroN(String(sequence));
        setNumeroYear(Number(res.data.year || new Date().getFullYear()));
      })
      .catch(() => {
        const fallbackYear = new Date().getFullYear();
        setNumeroSequence(1);
        setNumeroN('1');
        setNumeroYear(fallbackYear);
      })
      .finally(() => setNumeroLoading(false));
  }, []);

  useEffect(() => {
    setLoadingClients(true);
    api.get('/clients?limit=1000')
      .then((res) => setClients(res.data.data || []))
      .finally(() => setLoadingClients(false));
  }, []);

  useEffect(() => {
    setSelectedShipments([]);
    setLoadingShipments(true);
    const params = { client_id: clientMode === 'compte' && clientId ? clientId : '' };
    api.get('/invoices/unbilled-shipments', { params })
      .then((res) => setShipments(res.data.data || []))
      .finally(() => setLoadingShipments(false));
  }, [clientMode, clientId]);

  useEffect(() => {
    if (typeDestination === 'national') {
      setNonTaxable('');
    }
  }, [typeDestination]);

  const numericTaxable = parseFloat(taxable || 0);
  const numericNonTaxable = typeDestination === 'national' ? 0 : parseFloat(nonTaxable || 0);
  const taux = typeDestination === 'national' ? 0.10 : 0.20;
  const computedTva = +(numericTaxable * taux).toFixed(2);
  const computedTtc = typeDestination === 'national'
    ? +(numericTaxable + computedTva).toFixed(2)
    : +(numericNonTaxable + numericTaxable + computedTva).toFixed(2);
  const numeroLabel = `FA ${numeroN || numeroSequence}/${numeroYear}`;

  const toggleShipment = (id) => {
    if (clientMode === 'divers') {
      setSelectedShipments([id]);
    } else {
      setSelectedShipments((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    }
  };

  const buildPayload = () => ({
    type_destination: typeDestination,
    date_facture: dateFacture,
    date_echeance: dateEcheance,
    numero_n: Number.parseInt(numeroN || numeroSequence, 10),
    taxable: numericTaxable,
    non_taxable: typeDestination === 'national' ? 0 : numericNonTaxable,
    expedition_ids: selectedShipments,
    ...(clientMode === 'compte'
      ? { client_id: parseInt(clientId, 10) }
      : {
        client_divers_nom: clientDivers.nom,
        client_divers_adresse: clientDivers.adresse,
        client_divers_tel: clientDivers.tel,
        client_divers_email: clientDivers.email,
      }),
  });

  const canPreview = selectedShipments.length > 0 && numericTaxable >= 0;

  const handlePreview = async () => {
    setPreviewError('');
    setPreviewing(true);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    try {
      const payload = buildPayload();
      payload.taxable = payload.taxable || 0;
      const res = await api.post('/invoices/preview', payload, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      setPreviewUrl(url);
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la previsualisation.';
      if (!(err.response?.data instanceof Blob)) setPreviewError(msg);
      else setPreviewError('La previsualisation a echoue.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/invoices', buildPayload());
      const createdId = data.facture.id;
      toast.push('Facture creee', 'success');
      success.show({
        title: 'Facture creee avec succes',
        message: `La facture ${numeroLabel} a ete generee.`,
        detail: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-steel)' }}>Numero</span>
              <span className="font-mono-data" style={{ color: 'var(--color-graphite)', fontWeight: 600 }}>{numeroLabel}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-steel)' }}>Statut</span>
              <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Impayee</span>
            </div>
          </div>
        ),
        primaryAction: {
          label: 'Voir la facture',
          icon: FileText,
          onClick: () => { success.hide(); navigate(`/dashboard/factures/${createdId}`); },
        },
        secondaryActions: [
          { label: 'Creer une autre', icon: Plus, onClick: () => { success.hide(); window.location.reload(); } },
          { label: 'Voir la liste', icon: List, onClick: () => { success.hide(); navigate('/dashboard/factures'); } },
        ],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la creation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={numeroLoading ? 'Nouvelle Facture' : `Nouvelle Facture — ${numeroLabel}`}
        subtitle="Numero auto-genere (FA n/year)"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT COLUMN - FORM */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
          {error && (
            <div
              className="text-sm font-medium"
              style={{
                background: 'var(--color-danger-container)',
                color: 'var(--color-danger)',
                padding: '10px 14px',
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}

          <DataCard title="Client">
            <div className="flex" style={{ gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => { setClientMode('compte'); setClientId(''); }}
                className={clientMode === 'compte' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ padding: '8px 14px' }}
              >
                Client en Compte
              </button>
              <button
                type="button"
                onClick={() => setClientMode('divers')}
                className={clientMode === 'divers' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ padding: '8px 14px' }}
              >
                Client Divers
              </button>
            </div>

            {clientMode === 'compte' ? (
              <FormField label="Client">
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  className="select"
                >
                  <option value="">— Choisir un client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.account_number} - {c.full_name}</option>
                  ))}
                </select>
              </FormField>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
                <FormField label="Nom / Entreprise" required>
                  <input value={clientDivers.nom} onChange={(e) => setClientDivers((s) => ({ ...s, nom: e.target.value }))} className="input" required />
                </FormField>
                <FormField label="Email">
                  <input value={clientDivers.email} onChange={(e) => setClientDivers((s) => ({ ...s, email: e.target.value }))} type="email" className="input" />
                </FormField>
                <FormField label="Telephone">
                  <input value={clientDivers.tel} onChange={(e) => setClientDivers((s) => ({ ...s, tel: e.target.value }))} className="input" />
                </FormField>
                <FormField label="Adresse">
                  <input value={clientDivers.adresse} onChange={(e) => setClientDivers((s) => ({ ...s, adresse: e.target.value }))} className="input" />
                </FormField>
              </div>
            )}
          </DataCard>

          <DataCard
            title={`Expeditions a facturer ${clientMode === 'divers' ? '(1 max)' : ''}`}
            description="Selectionnez les expeditions a inclure dans cette facture."
          >
            {loadingShipments ? (
              <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}><TruckLoader /></div>
            ) : shipments.length === 0 ? (
              <div style={{ fontSize: 14, color: 'var(--color-steel)', padding: 12 }}>Aucune expedition non facturee pour ce client.</div>
            ) : (
              <table className="table-clean">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Choisir</th>
                    <th>N° d'envoi</th>
                    <th>Destinataire</th>
                    <th>Service</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s.id}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type={clientMode === 'divers' ? 'radio' : 'checkbox'}
                          checked={selectedShipments.includes(s.id)}
                          onChange={() => toggleShipment(s.id)}
                        />
                      </td>
                      <td className="font-mono-data">{s.shipping_number}</td>
                      <td>{s.recipient_name}</td>
                      <td style={{ textTransform: 'capitalize' }}>{(s.type_service || '').replace(/_/g, ' ')}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DataCard>

          <DataCard title="Informations facture" description="Numero, dates et type.">
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
              <FormField label="Numero de facture" required>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <span
                    className="input font-mono-data"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      borderRight: 'none',
                      paddingInline: 12,
                      background: 'var(--color-bone)',
                      color: 'var(--color-graphite)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    FA
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={numeroN}
                    onChange={(e) => setNumeroN(e.target.value)}
                    required
                    className="input font-mono-data"
                    style={{
                      borderRadius: 0,
                      borderLeft: 'none',
                      borderRight: 'none',
                      textAlign: 'center',
                      width: 120,
                    }}
                  />
                  <span
                    className="input font-mono-data"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      paddingInline: 12,
                      background: 'var(--color-bone)',
                      color: 'var(--color-graphite)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    /{numeroYear}
                  </span>
                </div>
              </FormField>
              <FormField label="Date de facture" required>
                <input
                  type="date"
                  value={dateFacture}
                  onChange={(e) => setDateFacture(e.target.value)}
                  required
                  className="input"
                />
              </FormField>
              <FormField label="Date d'echeance" required>
                <input
                  type="date"
                  value={dateEcheance}
                  onChange={(e) => setDateEcheance(e.target.value)}
                  min={today()}
                  required
                  className="input"
                />
              </FormField>
              <FormField label="Type">
                <select value={typeDestination} onChange={(e) => setTypeDestination(e.target.value)} className="select">
                  <option value="national">National (TVA 10%)</option>
                  <option value="international">International (TVA 20%)</option>
                </select>
              </FormField>
            </div>
          </DataCard>

          <DataCard title="Calcul fiscal" description="TVA et TTC calcules automatiquement.">
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
              {typeDestination === 'national' ? (
                <FormField label="Non Taxable (MAD)" hint="Verrouille en national">
                  <div style={{
                    padding: '8px 12px',
                    border: '1px solid var(--color-ash)',
                    borderRadius: 4,
                    background: 'var(--color-bone)',
                    color: 'var(--color-smoke)',
                    fontSize: 14,
                    fontStyle: 'italic',
                  }}>
                    —
                  </div>
                </FormField>
              ) : (
                <FormField label="Non Taxable (MAD)">
                  <input
                    type="number"
                    step="0.01"
                    value={nonTaxable}
                    onChange={(e) => setNonTaxable(e.target.value)}
                    placeholder="0.00"
                    className="input"
                  />
                </FormField>
              )}
              <FormField label="Taxable (MAD)" required>
                <input
                  type="number"
                  step="0.01"
                  value={taxable}
                  onChange={(e) => setTaxable(e.target.value)}
                  required
                  placeholder="0.00"
                  className="input"
                />
              </FormField>
              <FormField label="Taux TVA">
                <input type="text" value={`${(taux * 100).toFixed(2)} %`} disabled className="input" style={{ color: 'var(--color-graphite)' }} />
              </FormField>
              <FormField label="TVA (calcule)">
                <input
                  type="text"
                  value={`${formatMoney(computedTva)} MAD`}
                  disabled
                  className="input font-mono-data"
                  style={{ color: 'var(--color-graphite)' }}
                />
              </FormField>
            </div>
          </DataCard>

          <div className="flex flex-col sm:flex-row flex-wrap" style={{ gap: 10 }}>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!canPreview || previewing}
              className="btn btn-secondary"
            >
              <Eye size={16} />
              {previewing ? 'Generation...' : 'Previsualiser le PDF'}
            </button>
            <button
              type="submit"
              disabled={submitting || selectedShipments.length === 0}
              className="btn btn-primary"
            >
              {submitting ? 'Creation...' : 'Creer la Facture'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/factures')}
              className="btn btn-ghost"
            >
              Annuler
            </button>
          </div>
        </form>

        {/* RIGHT COLUMN - SUMMARY + PREVIEW */}
        <aside className="lg:col-span-2 space-y-6 lg:sticky lg:top-6 lg:self-start">
          <div
            style={{
              background: 'var(--color-paper-white)',
              border: '1px solid var(--color-ash)',
              borderRadius: 12,
              padding: 24,
              backgroundImage: 'radial-gradient(at 100% 0%, rgba(224,201,255,0.18) 0%, transparent 55%)',
            }}
          >
            <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
              <div>
                <div
                  style={{
                    fontSize: 11, fontWeight: 500, color: 'var(--color-steel)',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}
                >
                  Apercu Facture
                </div>
                <div className="font-mono-data" style={{ fontSize: 24, color: 'var(--color-graphite)', fontWeight: 500, marginTop: 4, letterSpacing: '-0.01em' }}>
                  {numeroLoading ? '—' : numeroLabel}
                </div>
              </div>
              <FileText color="var(--color-primary)" size={28} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--color-ash)', paddingTop: 16 }}>
              <SummaryRow label="Non Taxable" value={typeDestination === 'national' ? '—' : `${formatMoney(numericNonTaxable)} MAD`} />
              <SummaryRow label="Taxable" value={`${formatMoney(numericTaxable)} MAD`} />
              <SummaryRow label={`TVA (${(taux * 100).toFixed(0)}%)`} value={`${formatMoney(computedTva)} MAD`} />
              <div
                className="flex items-baseline justify-between"
                style={{ paddingTop: 14, marginTop: 6, borderTop: '1px solid var(--color-ash)' }}
              >
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-graphite)' }}>Total TTC</span>
                <span className="font-mono-data" style={{ fontSize: 26, fontWeight: 600, color: 'var(--color-primary)', letterSpacing: '-0.01em' }}>
                  {formatMoney(computedTtc)} <span style={{ fontSize: 14, fontWeight: 500 }}>MAD</span>
                </span>
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-ash)', fontSize: 12, color: 'var(--color-steel)' }}>
              <div className="flex justify-between">
                <span>Type</span>
                <span style={{ fontWeight: 500 }}>{typeDestination === 'national' ? 'National (10%)' : 'International (20%)'}</span>
              </div>
              <div className="flex justify-between" style={{ marginTop: 4 }}>
                <span>Expeditions</span>
                <span style={{ fontWeight: 500 }}>{selectedShipments.length}</span>
              </div>
            </div>
          </div>

          <DataCard
            title="Apercu PDF"
            actions={
              previewUrl ? (
                <a
                  href={previewUrl}
                  download={`${numeroLabel.replace(/\//g, '-')}.pdf`}
                  className="btn-icon"
                  title="Telecharger"
                  style={{ display: 'inline-flex' }}
                >
                  <Download size={16} />
                </a>
              ) : null
            }
          >
            {previewError && (
              <div
                style={{
                  background: 'var(--color-danger-container)',
                  color: 'var(--color-danger)',
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                {previewError}
              </div>
            )}
            {previewUrl ? (
              <iframe
                src={previewUrl}
                title="Apercu du PDF"
                style={{ width: '100%', height: 480, border: '1px solid var(--color-ash)', borderRadius: 8 }}
              />
            ) : (
              <div
                className="flex flex-col items-center justify-center"
                style={{
                  width: '100%',
                  height: 480,
                  border: '2px dashed var(--color-ash)',
                  borderRadius: 8,
                  color: 'var(--color-steel)',
                  fontSize: 14,
                  background: 'var(--color-bone)',
                  gap: 12,
                }}
              >
                <FileText size={40} color="var(--color-smoke)" />
                <div style={{ fontWeight: 500 }}>Aucun apercu</div>
                <div style={{ fontSize: 12, maxWidth: 200, textAlign: 'center' }}>
                  Cliquez sur "Previsualiser le PDF" pour generer un apercu.
                </div>
              </div>
            )}
          </DataCard>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between" style={{ fontSize: 14 }}>
      <span style={{ color: 'var(--color-iron)' }}>{label}</span>
      <span className="font-mono-data" style={{ color: 'var(--color-graphite)' }}>{value}</span>
    </div>
  );
}
