import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, FileMinus, FileText, Plus, List } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard } from '../../components/ui/DataCard';
import { FormField } from '../../components/ui/Form';
import { useToast } from '../../contexts/ToastContext';
import { useSuccess } from '../../contexts/SuccessModalContext';

function formatMoney(value, negative = true) {
  const n = Math.abs(Number(value || 0));
  const formatted = n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return negative ? `- ${formatted}` : formatted;
}

export default function AvoirCreate() {
  const [searchParams] = useSearchParams();
  const initialFactureId = searchParams.get('facture_id') || '';
  const navigate = useNavigate();
  const toast = useToast();
  const success = useSuccess();

  const [factures, setFactures] = useState([]);
  const [selectedId, setSelectedId] = useState(initialFactureId);
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [taxable, setTaxable] = useState('');
  const [nonTaxable, setNonTaxable] = useState('0');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/invoices').then((res) => setFactures(res.data.data || []));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedFacture(null);
      return;
    }
    api.get(`/invoices/${selectedId}`).then((res) => {
      setSelectedFacture(res.data);
      setTaxable(res.data.taxable);
      setNonTaxable(res.data.non_taxable);
    }).catch(() => setSelectedFacture(null));
  }, [selectedId]);

  const numericTaxable = parseFloat(taxable || 0);
  const numericNonTaxable = parseFloat(nonTaxable || 0);
  const isInternational = selectedFacture?.type_destination === 'international';
  const taux = isInternational ? 0.20 : 0.10;
  const computedTva = +(numericTaxable * taux).toFixed(2);
  const computedTtc = isInternational
    ? +(numericNonTaxable + numericTaxable + computedTva).toFixed(2)
    : +(numericTaxable + computedTva).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        facture_id: parseInt(selectedId, 10),
        type_destination: selectedFacture?.type_destination,
        taxable: numericTaxable,
        non_taxable: isInternational ? numericNonTaxable : 0,
      };
      const { data } = await api.post('/credit-notes', payload);
      const createdId = data.avoir?.id || data.credit_note?.id || data.id;
      const numero = data.avoir?.numero || data.credit_note?.numero;
      toast.push('Avoir cree', 'success');
      success.show({
        title: 'Avoir cree avec succes',
        message: `L'avoir a ete cree et lie a la facture d'origine.`,
        detail: numero && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-steel)' }}>Numero</span>
              <span className="font-mono-data" style={{ color: 'var(--color-graphite)', fontWeight: 600 }}>{numero}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-steel)' }}>Facture</span>
              <span className="font-mono-data" style={{ color: 'var(--color-graphite)' }}>{selectedFacture?.numero || '-'}</span>
            </div>
          </div>
        ),
        primaryAction: {
          label: 'Creer un autre',
          icon: Plus,
          onClick: () => { success.hide(); navigate('/dashboard/avoirs/nouveau'); },
        },
        secondaryActions: createdId && createdId !== selectedId ? [
          { label: 'Voir la facture', icon: FileText, onClick: () => { success.hide(); navigate(`/dashboard/factures/${selectedId}`); } },
          { label: 'Voir la liste', icon: List, onClick: () => { success.hide(); navigate('/dashboard/factures?tab=avoirs'); } },
        ] : [
          { label: 'Voir la liste', icon: List, onClick: () => { success.hide(); navigate('/dashboard/factures?tab=avoirs'); } },
        ],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la creation.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFactures = factures.filter(
    (f) => !f.avoir && (!search || f.numero?.toLowerCase().includes(search.toLowerCase()) ||
    f.client?.full_name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: 880 }}>
      <PageHeader
        eyebrow="Note de credit"
        title="Nouvel Avoir"
        subtitle="Lie a une facture existante. Toutes les valeurs seront stockees comme negatives."
        breadcrumbs={[{ label: 'Factures & Avoirs', to: '/dashboard/factures' }, { label: 'Nouvel Avoir' }]}
        actions={
          <>
            <button type="button" onClick={() => navigate('/dashboard/factures')} className="btn btn-ghost">
              <ArrowLeft size={14} /> Annuler
            </button>
            <button type="submit" form="avoir-form" disabled={!selectedFacture || submitting} className="btn btn-primary">
              <Save size={14} /> {submitting ? 'Creation...' : "Creer l'Avoir"}
            </button>
          </>
        }
      />

      <form id="avoir-form" onSubmit={handleSubmit}>
        {error && (
          <div style={{ background: 'var(--color-danger-container)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <DataCard title="Facture liee" description="Selectionnez la facture a laquelle appliquer cet avoir.">
          <FormField label="Rechercher" hint="Filtre par numero ou nom de client.">
            <input
              type="text"
              placeholder="ex: FA 5/2025 ou Atlas Logistics"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
          </FormField>
          <FormField label="Facture" required>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              required
              className="select"
            >
              <option value="">— Choisir une facture —</option>
              {filteredFactures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.numero} — {f.client?.full_name || f.client_divers_nom || ''}
                </option>
              ))}
            </select>
          </FormField>

          {selectedFacture && (
            <div
              style={{
                marginTop: 12,
                padding: 14,
                borderRadius: 8,
                background: 'var(--color-bone)',
                fontSize: 13,
                color: 'var(--color-graphite)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 8,
              }}
            >
              <div>
                <div className="field-label">Type</div>
                <div>{isInternational ? 'International (20%)' : 'National (10%)'}</div>
              </div>
              <div>
                <div className="field-label">Date</div>
                <div>{new Date(selectedFacture.date_facture).toLocaleDateString('fr-FR')}</div>
              </div>
              <div>
                <div className="field-label">TTC facture</div>
                <div className="font-mono-data">{formatMoney(selectedFacture.ttc, false)} MAD</div>
              </div>
            </div>
          )}
        </DataCard>

        {selectedFacture && (
          <div style={{ marginTop: 16 }}>
            <DataCard
              title="Montants de l'avoir"
              description="Saisissez les valeurs positives — elles sont stockees comme negatives."
            >
              <div style={{
                marginBottom: 16,
                padding: '10px 14px',
                background: 'var(--color-warning-container)',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--color-graphite)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <FileMinus size={16} color="var(--color-warning)" />
                <div>
                  <strong>Note:</strong> les valeurs seront enregistrees comme negatives (ex: 100,00 MAD → -100,00 MAD).
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                {isInternational && (
                  <FormField label="Non Taxable (MAD)">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={nonTaxable}
                      onChange={(e) => setNonTaxable(e.target.value)}
                      className="input"
                    />
                  </FormField>
                )}
                {!isInternational && (
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
                )}
                <FormField label="Taxable (MAD)" required>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxable}
                    onChange={(e) => setTaxable(e.target.value)}
                    required
                    className="input"
                  />
                </FormField>
                <FormField label="Taux TVA">
                  <input
                    type="text"
                    value={`${(taux * 100).toFixed(2)} %`}
                    disabled
                    className="input"
                    style={{ color: 'var(--color-graphite)' }}
                  />
                </FormField>
                <FormField label="TVA (stockee negative)">
                  <input
                    type="text"
                    value={`${formatMoney(computedTva)} MAD`}
                    disabled
                    className="input font-mono-data"
                    style={{ color: 'var(--color-vivid-green-dark)' }}
                  />
                </FormField>
                <FormField label="TTC avoir (stocke negatif)">
                  <input
                    type="text"
                    value={`${formatMoney(computedTtc)} MAD`}
                    disabled
                    className="input font-mono-data"
                    style={{ color: 'var(--color-vivid-green-dark)', fontWeight: 600 }}
                  />
                </FormField>
              </div>
            </DataCard>
          </div>
        )}
      </form>
    </div>
  );
}
