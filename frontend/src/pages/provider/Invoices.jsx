import { useMinLoading, useFileDownload } from '../../hooks';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import SortHeader from '../../components/ui/SortHeader';
import SearchInput from '../../components/ui/SearchInput';
import Tabs from '../../components/ui/Tabs';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { useColumnSort } from '../../hooks/useColumnSort';
import { useUrlPage } from '../../hooks/useUrlPage';
import { formatMoney } from '../../lib/format';
import { useDialog } from '../../contexts/DialogContext';
import { useToast } from '../../contexts/ToastContext';
import PageLoader from '../../components/ui/PageLoader';
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
  const downloadFile = useFileDownload();
  const [factures, setFactures] = useState([]);
  const [avoirs, setAvoirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoader = useMinLoading(loading);
  const [meta, setMeta] = useState({ lastPage: 1, total: 0, perPage: 25 });
  const { page, setPage, resetPage } = useUrlPage();

  const tab = searchParams.get('tab') === 'avoirs' ? 'avoirs' : 'factures';
  const q = tab === 'factures' ? (searchParams.get('q') || '') : '';
  const statut = tab === 'factures' ? (searchParams.get('statut') || '') : '';
  const typeDest = searchParams.get('type_dest') || '';

  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
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
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (tab === 'factures') fetchFactures();
    else fetchAvoirs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, statut, typeDest, column, direction, page]);

  const fetchFactures = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/invoices', {
        params: { search: q, statut, type_destination: typeDest, page, ...sortParams },
      });
      setFactures(data.data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.last_page && page > data.last_page) resetPage();
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statut, typeDest, page, sortParams]);

  const fetchAvoirs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/credit-notes', { params: { page, ...sortParams } });
      setAvoirs(data.data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.last_page && page > data.last_page) resetPage();
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortParams]);

  const markAsPaid = async (id) => {
    const ok = await dialog.confirm({
      title: 'Marquer comme payée ?',
      description: 'Cette action met à jour le statut de paiement. La facture sera marquée comme réglée.',
      confirmText: 'Marquer comme payée',
      cancelText: 'Annuler',
      variant: 'success',
    });
    if (!ok) return;
    try {
      await api.patch(`/invoices/${id}/status`, { statut: 'payee' });
      toast.push('Facture marquée comme payée', 'success');
      fetchFactures();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors du changement de statut.', 'error');
    }
  };

  const markAsUnpaid = async (id) => {
    const ok = await dialog.confirm({
      title: 'Marquer comme impayée ?',
      description: 'La facture repassera au statut impayée et sera de nouveau en attente de règlement.',
      confirmText: 'Marquer comme impayée',
      cancelText: 'Annuler',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await api.patch(`/invoices/${id}/status`, { statut: 'impayee' });
      toast.push('Facture marquée comme impayée', 'success');
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
      description: 'La facture et toutes les lignes associées seront définitivement retirées.',
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
    try {
      await downloadFile(async () => {
        const { data } = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
        const url = URL.createObjectURL(new Blob([data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${facture?.numero || `FE ${id}`}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'Génération de la facture...');
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors du téléchargement.', 'error');
    }
  };

  const downloadAvoirPdf = async (id) => {
    const avoir = avoirs.find((x) => x.id === id);
    try {
      await downloadFile(async () => {
        const { data } = await api.get(`/credit-notes/${id}/pdf`, { responseType: 'blob' });
        const url = URL.createObjectURL(new Blob([data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${avoir?.numero || `AV ${id}`}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }, "Génération de l'avoir...");
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors du téléchargement.', 'error');
    }
  };

  const deleteAvoir = async (id) => {
    const ok = await dialog.confirm({
      title: 'Supprimer cet avoir ?',
      description: "L'avoir sera définitivement retiré.",
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

  return (
    <div>
      <PageHeader
        title="Factures & Avoirs"
        subtitle="Gérer les factures et les avoirs"
        actionLabel={tab === 'factures' ? 'Créer une facture' : 'Créer un avoir'}
        actionTo={tab === 'factures' ? '/dashboard/factures/nouveau' : '/dashboard/avoirs/nouveau'}
        actionIcon={Receipt}
      />

      <div style={{ marginBottom: 20 }}>
        <Tabs
          value={tab}
          onChange={switchTab}
          tabs={[
            { value: 'factures', label: 'Factures' },
            { value: 'avoirs', label: 'Avoirs' },
          ]}
        />
      </div>

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
            {showLoader ? (
              <PageLoader variant="table" embedded />
            ) : factures.length === 0 ? (
              <EmptyState icon={Receipt} title="Aucune facture" description="Aucune facture ne correspond à votre recherche." />
            ) : (
              <table className="table-clean">
                <thead>
                  <tr>
                    <SortHeader label="Numéro" col="numero_n" currentCol={column} direction={direction} onClick={toggle} />
                    <SortHeader label="Date" col="created_at" currentCol={column} direction={direction} onClick={toggle} />
                    <SortHeader label="Client" col="full_name" currentCol={column} direction={direction} onClick={toggle} />
                    <SortHeader label="Type" col="type_destination" currentCol={column} direction={direction} onClick={toggle} />
                    <SortHeader label="HT" col="taxable" currentCol={column} direction={direction} onClick={toggle} align="right" />
                    <SortHeader label="TTC" col="ttc" currentCol={column} direction={direction} onClick={toggle} align="right" />
                    <SortHeader label="Échéance" col="date_echeance" currentCol={column} direction={direction} onClick={toggle} />
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
                          <button onClick={() => downloadPdf(f.id)} className="btn-icon" title="Télécharger PDF">
                            <FileDown size={20} />
                          </button>
                          <button
                            onClick={() => toggleStatus(f.id, f.statut)}
                            className="btn-icon"
                            title={f.statut === 'payee' ? 'Marquer impayée' : 'Marquer payée'}
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
            {!loading && factures.length > 0 && (
              <Pagination page={page} lastPage={meta.lastPage} total={meta.total} perPage={meta.perPage} onChange={setPage} />
            )}
          </Card>
        </>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {showLoader ? (
            <PageLoader variant="table" embedded />
          ) : avoirs.length === 0 ? (
            <EmptyState icon={Receipt} title="Aucun avoir" description="Aucun avoir n'a encore été émis." />
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <SortHeader label="Numéro" col="numero_n" currentCol={column} direction={direction} onClick={toggle} />
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
                        <button onClick={() => downloadAvoirPdf(a.id)} className="btn-icon" title="Télécharger PDF">
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
          {!loading && avoirs.length > 0 && (
            <Pagination page={page} lastPage={meta.lastPage} total={meta.total} perPage={meta.perPage} onChange={setPage} />
          )}
        </Card>
      )}
    </div>
  );
}
