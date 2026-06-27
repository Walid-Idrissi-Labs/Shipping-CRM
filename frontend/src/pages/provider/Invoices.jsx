import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import SortHeader from '../../components/ui/SortHeader';
import SearchInput from '../../components/ui/SearchInput';
import { useColumnSort } from '../../hooks/useColumnSort';
import { useDialog } from '../../contexts/DialogContext';
import { useToast } from '../../contexts/ToastContext';
import TruckLoader from '../../components/ui/TruckLoader';
import { Check, X, FileDown, Trash2, Receipt } from 'lucide-react';

const factureStatusOptions = [
  { value: '', label: 'Tous' },
  { value: 'impayee', label: 'Impayée' },
  { value: 'payee', label: 'Payée' },
];

const destFilters = [
  { value: '', label: 'Tous types' },
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
];

function formatMoney(value, negative = false) {
  const n = Number(value || 0);
  const formatted = n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return negative ? `- ${formatted} MAD` : `${formatted} MAD`;
}

function displayMoney(value, negative) {
  return negative
    ? <span style={{ color: 'var(--color-vivid-green-dark)' }}>- {formatMoney(Math.abs(value))}</span>
    : formatMoney(value);
}

function clientLabel(f) {
  if (f.client) return f.client.full_name;
  if (f.client_divers_nom) return f.client_divers_nom + ' (Divers)';
  return '—';
}

export default function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dialog = useDialog();
  const toast = useToast();
  const [factures, setFactures] = useState([]);
  const [avoirs, setAvoirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const tab = searchParams.get('tab') === 'avoirs' ? 'avoirs' : 'factures';
  const q = tab === 'factures' ? (searchParams.get('q') || '') : '';
  const statut = tab === 'factures' ? (searchParams.get('statut') || '') : '';
  const typeDest = searchParams.get('type_dest') || '';

  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const switchTab = (next) => {
    // Reset all filters when switching tabs, keep only the tab
    const nextParams = new URLSearchParams();
    if (next === 'avoirs') nextParams.set('tab', 'avoirs');
    navigate(`/dashboard/factures${nextParams.toString() ? `?${nextParams.toString()}` : ''}`, { replace: true });
  };

  const handleSearch = (value) => updateParam('q', value);

  const handleClearAll = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('statut');
    next.delete('type_dest');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (tab === 'factures') fetchFactures();
    else fetchAvoirs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, statut, typeDest, column, direction]);

  const fetchFactures = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/invoices', {
        params: { search: q, statut, type_destination: typeDest, page: 1, ...sortParams },
      });
      setFactures(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [q, statut, typeDest, sortParams]);

  const fetchAvoirs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/credit-notes', { params: { page: 1, ...sortParams } });
      setAvoirs(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [sortParams]);

  const markAsPaid = async (id) => {
    const ok = await dialog.confirm({
      title: 'Marquer comme payee ?',
      description: 'Cette action met a jour le statut de paiement. La facture sera marquee comme reglee.',
      confirmText: 'Marquer comme payee',
      cancelText: 'Annuler',
      variant: 'success',
    });
    if (!ok) return;
    try {
      await api.patch(`/invoices/${id}/status`, { statut: 'payee' });
      toast.push('Facture marquee comme payee', 'success');
      fetchFactures();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors du changement de statut.', 'error');
    }
  };

  const markAsUnpaid = async (id) => {
    try {
      await api.patch(`/invoices/${id}/status`, { statut: 'impayee' });
      toast.push('Facture marquee comme impayee', 'success');
      fetchFactures();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors du changement de statut.', 'error');
    }
  };

  const toggleStatus = (id, current) => {
    if (current === 'payee') {
      markAsUnpaid(id);
    } else {
      markAsPaid(id);
    }
  };

  const deleteFacture = async (id) => {
    const ok = await dialog.confirm({
      title: 'Supprimer cette facture ?',
      description: 'La facture et toutes les lignes associees seront definitivement retirees.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      safetyGate: true,
      requiredInput: 'supprimer',
      inputLabel: 'Tapez supprimer pour confirmer',
    });
    if (!ok) return;
    try {
      await api.delete(`/invoices/${id}`);
      toast.push('Facture supprimee', 'success');
      fetchFactures();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors de la suppression.', 'error');
    }
  };

  const downloadPdf = async (id) => {
    const facture = factures.find((f) => f.id === id);
    const { data } = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${facture?.numero || `FA ${id}`}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAvoirPdf = async (id) => {
    const avoir = avoirs.find((x) => x.id === id);
    const { data } = await api.get(`/credit-notes/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${avoir?.numero || `AV ${id}`}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAvoir = async (id) => {
    const ok = await dialog.confirm({
      title: 'Supprimer cet avoir ?',
      description: "L'avoir sera definitivement retire.",
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      safetyGate: true,
      requiredInput: 'supprimer',
      inputLabel: 'Tapez supprimer pour confirmer',
    });
    if (!ok) return;
    try {
      await api.delete(`/credit-notes/${id}`);
      toast.push('Avoir supprime', 'success');
      fetchAvoirs();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors de la suppression.', 'error');
    }
  };

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(''), 3000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  return (
    <div>
      <PageHeader
        title="Factures & Avoirs"
        subtitle="Gerer les factures et les avoirs"
        actionLabel={tab === 'factures' ? 'Creer une Facture' : 'Creer un Avoir'}
        actionTo={tab === 'factures' ? '/dashboard/factures/nouveau' : '/dashboard/avoirs/nouveau'}
        actionIcon={Receipt}
      />

      {feedback && (
        <div className="pill-success mb-4" style={{ padding: '10px 14px', display: 'block' }}>
          {feedback}
        </div>
      )}

      <div className="mb-4 flex gap-2" style={{ borderBottom: '2px solid var(--color-ash)' }}>
        <button
          onClick={() => switchTab('factures')}
          style={{
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: tab === 'factures' ? '600' : '400',
            color: tab === 'factures' ? 'var(--color-primary)' : 'var(--color-steel)',
            borderBottom: tab === 'factures' ? '2px solid var(--color-primary)' : '2px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            border: 'none',
            outline: 'none'
          }}
        >
          Factures
        </button>
        <button
          onClick={() => switchTab('avoirs')}
          style={{
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: tab === 'avoirs' ? '600' : '400',
            color: tab === 'avoirs' ? 'var(--color-primary)' : 'var(--color-steel)',
            borderBottom: tab === 'avoirs' ? '2px solid var(--color-primary)' : '2px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            border: 'none',
            outline: 'none'
          }}
        >
          Avoirs
        </button>
      </div>

      {feedback && tab === 'factures' && (
        <div className="pill-success mb-4" style={{ padding: '10px 14px', display: 'block' }}>
          {feedback}
        </div>
      )}

      {tab === 'factures' ? (
        <>
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <div className="flex flex-col md:flex-row" style={{ gap: 12, alignItems: 'center' }}>
              <SearchInput value={q} onSearch={handleSearch} onClear={handleClearAll} loading={loading} placeholder="Rechercher par client..." />
              <select value={statut} onChange={(e) => updateParam('statut', e.target.value)} className="select" style={{ maxWidth: 220 }}>
                {factureStatusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select value={typeDest} onChange={(e) => updateParam('type_dest', e.target.value)} className="select" style={{ maxWidth: 220 }}>
                {destFilters.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </Card>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><TruckLoader /></div>
            ) : factures.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-steel)' }}>Aucune facture</div>
            ) : (
              <table className="table-clean">
                <thead>
                  <tr>
                    <SortHeader label="Numero" col="numero_n" currentCol={column} direction={direction} onClick={toggle} />
                    <SortHeader label="Date" col="created_at" currentCol={column} direction={direction} onClick={toggle} />
                    <SortHeader label="Client" col="full_name" currentCol={column} direction={direction} onClick={toggle} />
                    <SortHeader label="Type" col="type_destination" currentCol={column} direction={direction} onClick={toggle} />
                    <SortHeader label="HT" col="taxable" currentCol={column} direction={direction} onClick={toggle} align="right" />
                    <SortHeader label="TTC" col="ttc" currentCol={column} direction={direction} onClick={toggle} align="right" />
                    <SortHeader label="Echeance" col="date_echeance" currentCol={column} direction={direction} onClick={toggle} />
                    <SortHeader label="Statut" col="statut" currentCol={column} direction={direction} onClick={toggle} />
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {factures.map((f) => (
                    <tr
                      key={f.id}
                      onClick={() => navigate(`/dashboard/factures/${f.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="font-mono-data" style={{ color: f.avoir ? 'var(--color-danger)' : 'var(--color-primary)' }}>{f.numero}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(f.created_at).toLocaleDateString('fr-FR')}</td>
                      <td>{clientLabel(f)}</td>
                      <td style={{ textTransform: 'capitalize' }}>{f.type_destination === 'national' ? 'National' : 'International'}</td>
                      <td className="font-mono-data" style={{ textAlign: 'right' }}>{formatMoney(f.taxable || 0)}</td>
                      <td className="font-mono-data" style={{ textAlign: 'right', fontWeight: 500 }}>{formatMoney(f.ttc || 0)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(f.date_echeance).toLocaleDateString('fr-FR')}</td>
                      <td><StatusBadge status={f.statut} /></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end" style={{ gap: 4 }}>
                          <button onClick={() => downloadPdf(f.id)} className="btn-icon" title="Telecharger PDF">
                            <FileDown size={20} />
                          </button>
                          <button
                            onClick={() => toggleStatus(f.id, f.statut)}
                            className="btn-icon"
                            title={f.statut === 'payee' ? 'Marquer impayee' : 'Marquer payee'}
                          >
                            {f.statut === 'payee' ? <X size={16} color="var(--color-warning)" /> : <Check size={16} color="var(--color-vivid-green-dark)" />}
                          </button>
                          <button onClick={() => deleteFacture(f.id)} className="btn-icon" title="Supprimer">
                            <Trash2 size={16} color="var(--color-danger)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><TruckLoader /></div>
          ) : avoirs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-steel)' }}>Aucun avoir</div>
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <SortHeader label="Numero" col="numero_n" currentCol={column} direction={direction} onClick={toggle} />
                  <SortHeader label="Facture" col="facture_numero" currentCol={column} direction={direction} onClick={toggle} />
                  <SortHeader label="Client" col="full_name" currentCol={column} direction={direction} onClick={toggle} />
                  <SortHeader label="HT" col="taxable" currentCol={column} direction={direction} onClick={toggle} align="right" />
                  <SortHeader label="TVA" col="tva" currentCol={column} direction={direction} onClick={toggle} align="right" />
                  <SortHeader label="TTC" col="ttc" currentCol={column} direction={direction} onClick={toggle} align="right" />
                  <SortHeader label="Date" col="created_at" currentCol={column} direction={direction} onClick={toggle} />
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {avoirs.map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono-data" style={{ color: 'var(--color-danger)' }}>{a.numero}</td>
                    <td className="font-mono-data">{a.facture?.numero}</td>
                    <td>{a.client?.full_name || a.facture?.client_divers_nom || '—'}</td>
                    <td className="font-mono-data" style={{ textAlign: 'right', color: 'var(--color-danger)' }}>- {formatMoney(Math.abs(a.taxable || 0))}</td>
                    <td className="font-mono-data" style={{ textAlign: 'right', color: 'var(--color-danger)' }}>- {formatMoney(Math.abs(a.tva || 0))}</td>
                    <td className="font-mono-data" style={{ textAlign: 'right', fontWeight: 500, color: 'var(--color-danger)' }}>- {formatMoney(Math.abs(a.ttc || 0))}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleDateString('fr-FR')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end" style={{ gap: 4 }}>
                        <button onClick={() => downloadAvoirPdf(a.id)} className="btn-icon" title="Telecharger PDF">
                          <FileDown size={20} color="var(--color-danger)" />
                        </button>
                        <button onClick={() => deleteAvoir(a.id)} className="btn-icon" title="Supprimer">
                          <Trash2 size={16} color="var(--color-danger)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
