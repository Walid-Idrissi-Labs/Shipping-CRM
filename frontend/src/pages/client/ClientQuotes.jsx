import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, Plus, FileText, Search, Send, Clock, FileCheck2 } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import StatusBadge from '../../components/ui/StatusBadge';
import SearchInput from '../../components/ui/SearchInput';
import { useDialog } from '../../contexts/DialogContext';
import { useToast } from '../../contexts/ToastContext';

const quoteStatusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'envoye', label: 'En attente' },
  { value: 'accepte', label: 'Accepte' },
  { value: 'refuse', label: 'Refuse' },
];

const requestStatusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'traitee', label: 'Traitee' },
];

function formatMoney(v) {
  const n = Number(v || 0);
  return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ClientQuotes() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'demandes' ? 'demandes' : 'devis';
  const q = searchParams.get('q') || '';
  const statut = searchParams.get('statut') || '';

  const [quotes, setQuotes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const dialog = useDialog();
  const toast = useToast();

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const switchTab = (next) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'demandes') nextParams.set('tab', 'demandes');
    else nextParams.delete('tab');
    nextParams.delete('q');
    nextParams.delete('statut');
    setSearchParams(nextParams, { replace: true });
  };

  const handleClearAll = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('statut');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (tab === 'devis') fetchQuotes();
    else fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, statut]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/my/quotes', { params: { search: q, statut } });
      setQuotes(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/my/quote-requests', { params: { search: q, statut } });
      setRequests(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  const updateQuoteStatus = async (id, newStatus) => {
    const labels = { accepte: 'Accepter', refuse: 'Refuser' };
    const descriptions = {
      accepte: 'Vous confirmez ce devis. Votre demande sera prise en compte.',
      refuse: 'Vous refusez ce devis. Action irreversible.',
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
      toast.push(`Devis ${newStatus === 'accepte' ? 'accepte' : 'refuse'}.`, 'success');
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
      <div
        role="tablist"
        className="flex items-center"
        style={{
          gap: 4,
          padding: 4,
          background: 'var(--color-bone)',
          borderRadius: 10,
          border: '1px solid var(--color-ash)',
          width: 'fit-content',
          marginBottom: 20,
        }}
      >
        <button
          role="tab"
          aria-selected={tab === 'devis'}
          type="button"
          onClick={() => switchTab('devis')}
          className="flex items-center"
          style={{
            gap: 8,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            background: tab === 'devis' ? 'var(--color-paper-white)' : 'transparent',
            color: tab === 'devis' ? 'var(--color-graphite)' : 'var(--color-iron)',
            boxShadow: tab === 'devis' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            transition: 'background 150ms ease, color 150ms ease',
          }}
        >
          <FileCheck2 size={14} />
          Devis
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 9999,
              background: tab === 'devis' ? 'var(--color-primary-wash)' : 'var(--color-fog)',
              color: tab === 'devis' ? 'var(--color-primary)' : 'var(--color-steel)',
            }}
          >
            {quotes.length || (loading ? '…' : 0)}
          </span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'demandes'}
          type="button"
          onClick={() => switchTab('demandes')}
          className="flex items-center"
          style={{
            gap: 8,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            background: tab === 'demandes' ? 'var(--color-paper-white)' : 'transparent',
            color: tab === 'demandes' ? 'var(--color-graphite)' : 'var(--color-iron)',
            boxShadow: tab === 'demandes' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            transition: 'background 150ms ease, color 150ms ease',
          }}
        >
          <Send size={14} />
          Demandes de Devis
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 9999,
              background: tab === 'demandes' ? 'var(--color-primary-wash)' : 'var(--color-fog)',
              color: tab === 'demandes' ? 'var(--color-primary)' : 'var(--color-steel)',
            }}
          >
            {requests.length || (loading ? '…' : 0)}
          </span>
        </button>
      </div>

      {/* Filter Bar */}
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div className="flex flex-col md:flex-row" style={{ gap: 12, alignItems: 'center' }}>
          <SearchInput
            value={q}
            onSearch={(v) => updateParam('q', v)}
            onClear={handleClearAll}
            loading={loading}
            placeholder={tab === 'devis' ? 'Rechercher par numero, destinataire...' : 'Rechercher par destinataire, ville...'}
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
                  ? 'Aucun devis ne correspond a vos filtres.'
                  : 'Vous recevrez vos devis ici des qu\'ils seront emis.'
              }
            />
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Numero</th>
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
                      {qt.montant_ttc ? `${formatMoney(qt.montant_ttc)} MAD` : '-'}
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
                  ? 'Aucune demande ne correspond a vos filtres.'
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
                      {r.statut === 'traitee' ? (
                        <span className="pill pill-success">Traitee</span>
                      ) : (
                        <span className="pill pill-warning"><Clock size={11} /> En attente</span>
                      )}
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
        </Card>
      )}
    </div>
  );
}
