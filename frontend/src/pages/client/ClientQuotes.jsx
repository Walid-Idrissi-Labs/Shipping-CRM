import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, Plus, FileText, Send, FileCheck2 } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import StatusBadge from '../../components/ui/StatusBadge';
import SearchInput from '../../components/ui/SearchInput';
import Tabs from '../../components/ui/Tabs';
import Pagination from '../../components/ui/Pagination';
import { useUrlPage } from '../../hooks/useUrlPage';
import { useDialog } from '../../contexts/DialogContext';
import { useToast } from '../../contexts/ToastContext';
import { formatMoney, formatDate } from '../../lib/format';

const quoteStatusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'envoye', label: 'En attente' },
  { value: 'accepte', label: 'Accepté' },
  { value: 'refuse', label: 'Refusé' },
];

const requestStatusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'traitee', label: 'Traitée' },
];

export default function ClientQuotes() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'demandes' ? 'demandes' : 'devis';
  const q = searchParams.get('q') || '';
  const statut = searchParams.get('statut') || '';

  const [quotes, setQuotes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ lastPage: 1, total: 0, perPage: 25 });
  const { page, setPage, resetPage } = useUrlPage();
  const dialog = useDialog();
  const toast = useToast();

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const switchTab = (next) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'demandes') nextParams.set('tab', 'demandes');
    else nextParams.delete('tab');
    nextParams.delete('q');
    nextParams.delete('statut');
    nextParams.delete('page');
    setSearchParams(nextParams, { replace: true });
  };

  const handleClearAll = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('statut');
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (tab === 'devis') fetchQuotes();
    else fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, statut, page]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/my/quotes', { params: { search: q, statut, page } });
      setQuotes(data.data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.last_page && page > data.last_page) resetPage();
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/my/quote-requests', { params: { search: q, statut, page } });
      setRequests(data.data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.last_page && page > data.last_page) resetPage();
    } finally {
      setLoading(false);
    }
  };

  const updateQuoteStatus = async (id, newStatus) => {
    const labels = { accepte: 'Accepter', refuse: 'Refuser' };
    const descriptions = {
      accepte: 'Vous confirmez ce devis. Votre demande sera prise en compte.',
      refuse: 'Vous refusez ce devis. Action irréversible.',
    };
    const ok = await dialog.confirm({
      title: `${labels[newStatus]} ce devis ?`,
      description: descriptions[newStatus],
      confirmText: labels[newStatus],
      cancelText: 'Annuler',
      variant: newStatus === 'accepte' ? 'success' : 'danger',
    });
    if (!ok) return;
    try {
      await api.patch(`/my/quotes/${id}/status`, { statut: newStatus });
      toast.push(`Devis ${newStatus === 'accepte' ? 'accepté' : 'refusé'}.`, 'success');
      fetchQuotes();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors du changement de statut.', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Espace Client"
        title="Devis"
        subtitle="Consultez vos devis et demandes de devis."
        actions={
          tab === 'demandes' ? (
            <button
              type="button"
              onClick={() => navigate('/client/demande-devis/nouveau')}
              className="btn btn-primary"
            >
              <Plus size={14} /> Nouvelle Demande
            </button>
          ) : null
        }
      />

      {/* Tabs */}
      <div style={{ marginBottom: 20 }}>
        <Tabs
          value={tab}
          onChange={switchTab}
          tabs={[
            { value: 'devis', label: 'Devis', icon: <FileCheck2 size={14} />, count: loading ? '…' : quotes.length },
            { value: 'demandes', label: 'Demandes de devis', icon: <Send size={14} />, count: loading ? '…' : requests.length },
          ]}
        />
      </div>

      {/* Filter Bar */}
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div className="flex flex-col md:flex-row" style={{ gap: 12, alignItems: 'center' }}>
          <SearchInput
            value={q}
            onSearch={(v) => updateParam('q', v)}
            onClear={handleClearAll}
            loading={loading}
            placeholder={tab === 'devis' ? 'Rechercher par numéro, destinataire...' : 'Rechercher par destinataire, ville...'}
          />
          <select
            value={statut}
            onChange={(e) => updateParam('statut', e.target.value)}
            className="select"
            style={{ maxWidth: 220 }}
          >
            {(tab === 'devis' ? quoteStatusOptions : requestStatusOptions).map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Devis Tab */}
      {tab === 'devis' && (
        <Card style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <Skeleton height={20} width="55%" />
                </div>
              ))}
            </div>
          ) : quotes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucun devis"
              description={
                q || statut
                  ? 'Aucun devis ne correspond à vos filtres.'
                  : 'Vous recevrez vos devis ici dès qu\'ils seront émis.'
              }
            />
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Destinataire</th>
                  <th>Service</th>
                  <th style={{ textAlign: 'right' }}>Montant TTC</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((qt) => (
                  <tr
                    key={qt.id}
                    onClick={() => navigate(`/client/devis/${qt.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="font-mono-data" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                      {qt.quote_number}
                    </td>
                    <td>{qt.recipient_name || '-'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{(qt.type_service || '').replace(/_/g, ' ')}</td>
                    <td className="font-mono-data" style={{ textAlign: 'right', fontWeight: 600 }}>
                      {qt.montant_ttc ? formatMoney(qt.montant_ttc) : "-"}
                    </td>
                    <td><StatusBadge status={qt.statut} /></td>
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                      {qt.statut === 'envoye' && (
                        <div className="flex items-center justify-end" style={{ gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => updateQuoteStatus(qt.id, 'accepte')}
                            className="btn-icon"
                            title="Accepter"
                          >
                            <Check size={16} color="var(--color-vivid-green-dark)" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateQuoteStatus(qt.id, 'refuse')}
                            className="btn-icon"
                            title="Refuser"
                          >
                            <X size={16} color="var(--color-danger)" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && quotes.length > 0 && (
            <div style={{ padding: '0 16px 12px' }}>
              <Pagination page={page} lastPage={meta.lastPage} total={meta.total} perPage={meta.perPage} onChange={setPage} />
            </div>
          )}
        </Card>
      )}

      {/* Demandes Tab */}
      {tab === 'demandes' && (
        <Card style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <Skeleton height={20} width="50%" />
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={Send}
              title="Aucune demande"
              description={
                q || statut
                  ? 'Aucune demande ne correspond à vos filtres.'
                  : 'Vous pouvez creer une demande de devis pour recevoir une proposition tarifaire.'
              }
              actionLabel={!q && !statut ? 'Nouvelle Demande' : undefined}
              actionTo={!q && !statut ? '/client/demande-devis/nouveau' : undefined}
              actionIcon={Plus}
            />
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Destinataire</th>
                  <th>Destination</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Devis</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono-data" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                      #{r.id}
                    </td>
                    <td>{r.recipient_name || '-'}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.recipient_city || '-'}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-steel)' }}>{r.recipient_country}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{(r.type_service || '').replace(/_/g, ' ')}</td>
                    <td>{formatDate(r.created_at)}</td>
                    <td>
                      <StatusBadge status={r.statut} variant="left" />
                    </td>
                    <td>
                      {r.quote_id ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/client/devis/${r.quote_id}`)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                          <FileText size={12} /> Voir le devis
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--color-smoke)' }}>En attente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && requests.length > 0 && (
            <div style={{ padding: '0 16px 12px' }}>
              <Pagination page={page} lastPage={meta.lastPage} total={meta.total} perPage={meta.perPage} onChange={setPage} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
