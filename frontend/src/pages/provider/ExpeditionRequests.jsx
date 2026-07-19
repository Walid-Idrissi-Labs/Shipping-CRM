import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {Package, Eye} from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SortHeader from '../../components/ui/SortHeader';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import { useColumnSort } from '../../hooks/useColumnSort';
import { useUrlPage } from '../../hooks/useUrlPage';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'acceptee', label: 'Acceptee' },
  { value: 'refusee', label: 'Refusee' },
];


export default function ExpeditionRequests() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const statut = searchParams.get('statut') || '';
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ lastPage: 1, total: 0, perPage: 25 });
  const { page, setPage, resetPage } = useUrlPage();
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statut, column, direction, page]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/expedition-requests', { params: { search: q, statut, page, ...sortParams } });
      setRequests(data.data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.last_page && page > data.last_page) resetPage();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const handleSearch = (value) => updateParam('q', value);

  const handleClearAll = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('statut');
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const getStatusColor = (statut) => {
    switch (statut) {
      case 'acceptee': return 'var(--color-vivid-green-dark)';
      case 'refusee': return 'var(--color-danger)';
      default: return 'var(--color-primary)';
    }
  };

  return (
    <div>
      <PageHeader
        title="Demandes d'Expedition"
        subtitle="Demandes d'expedition envoyees par les clients via lien public"
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Demandes d\'Expedition' }]}
      />

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div className="flex flex-col md:flex-row" style={{ gap: 12, alignItems: 'center' }}>
          <SearchInput value={q} onSearch={handleSearch} onClear={handleClearAll} loading={loading} placeholder="Rechercher par client, destinataire, numero devis..." />
          <select value={statut} onChange={(e) => updateParam('statut', e.target.value)} className="select" style={{ maxWidth: 220 }}>
            {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <Skeleton height={20} width="50%" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Aucune demande d'expedition"
            description="Les demandes apparaissent ici quand un client complete le formulaire via le lien public."
          />
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <SortHeader label="Date" col="created_at" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Devis" col="quote_number" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Expediteur" col="sender_name" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Destinataire" col="recipient_name" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Statut" col="statut" currentCol={column} direction={direction} onClick={toggle} />
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/dashboard/demandes-expedition/${r.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="font-mono-data" style={{ color: 'var(--color-iron)' }}>
                    {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td>
                    {r.quote ? (
                      <span className="font-mono-data" style={{ color: 'var(--color-primary)' }}>{r.quote.quote_number}</span>
                    ) : (
                      <span style={{ color: 'var(--color-steel)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>{r.sender_name}</td>
                  <td>{r.recipient_name}</td>
                  <td>
                    <StatusBadge status={r.statut} color={getStatusColor(r.statut)}>
                      {r.statut === 'en_attente' && 'En attente'}
                      {r.statut === 'acceptee' && 'Acceptee'}
                      {r.statut === 'refusee' && 'Refusee'}
                    </StatusBadge>
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/demandes-expedition/${r.id}`); }}
                      className="btn btn-icon"
                      title="Voir les details"
                    >
                      <Eye size={16} color="var(--color-primary)" />
                    </button>
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
    </div>
  );
}