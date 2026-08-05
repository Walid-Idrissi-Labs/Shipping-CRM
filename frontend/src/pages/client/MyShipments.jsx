import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, PackagePlus, CircleArrowOutUpRight, CircleArrowOutDownLeft, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SortHeader from '../../components/ui/SortHeader';
import CopyButton from '../../components/ui/CopyButton';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import { useColumnSort } from '../../hooks/useColumnSort';
import { useUrlPage } from '../../hooks/useUrlPage';
import { formatDate } from '../../lib/format';
import { SHIPMENT_STATUSES } from '../../lib/statuses';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  ...SHIPMENT_STATUSES,
];

export default function MyShipments() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const statut = searchParams.get('statut') || '';
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [meta, setMeta] = useState({ lastPage: 1, total: 0, perPage: 25 });
  const { page, setPage, resetPage } = useUrlPage();
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    fetchShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statut, column, direction, page]);

  const fetchShipments = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get('/my/shipments', { params: { search: q, statut, page, ...sortParams } });
      setShipments(data.data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.last_page && page > data.last_page) resetPage();
    } catch {
      // Without this, a failed request left shipments at [] and rendered the
      // "aucune expedition" empty state, indistinguishable from a customer
      // genuinely having no shipments.
      setShipments([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const total = meta.total;

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

  const handleStatusChange = (e) => updateParam('statut', e.target.value);

  return (
    <div>
      <PageHeader
        title="Mes Expéditions"
        subtitle="Suivi détaillé de tous vos envois."
        actionLabel="Nouvelle Expédition"
        actionTo="/client/expeditions/nouveau"
        actionIcon={PackagePlus}
      />

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div className="flex flex-col md:flex-row" style={{ gap: 12, alignItems: 'center' }}>
          <SearchInput
            value={q}
            onSearch={handleSearch}
            onClear={handleClearAll}
            loading={loading}
            placeholder="Rechercher par numéro, destinataire..."
          />
          <select
            value={statut}
            onChange={handleStatusChange}
            className="select"
            style={{ maxWidth: 220 }}
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <Skeleton height={20} width="55%" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <EmptyState
            icon={AlertTriangle}
            tone="danger"
            title="Chargement impossible"
            description="Vos expeditions n'ont pas pu etre recuperees. Verifiez votre connexion puis reessayez."
            actionLabel="Reessayer"
            onAction={fetchShipments}
          />
        ) : shipments.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Aucune expédition"
            description={
              q || statut
                ? 'Aucun résultat ne correspond à vos filtres.'
                : "Vous n'avez pas encore d'expédition dans votre espace."
            }
            actionLabel={!q && !statut ? 'Nouvelle Expédition' : undefined}
            actionTo={!q && !statut ? '/client/expeditions/nouveau' : undefined}
          />
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <SortHeader label="Numéro" col="shipping_number" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Destinataire" col="recipient_name" currentCol={column} direction={direction} onClick={toggle} />
                <th style={{ width: 60, textAlign: 'center' }}>Direction</th>
                <SortHeader label="Service" col="type_service" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Statut" col="statut_actuel" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Date" col="created_at" currentCol={column} direction={direction} onClick={toggle} />
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => {
                const clientName = s.client?.full_name || '';
                const isExport = s.sender_name?.toLowerCase().includes(clientName.toLowerCase());
                const isImport = s.recipient_name?.toLowerCase().includes(clientName.toLowerCase());
                return (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/client/mes-expeditions/${s.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="font-mono-data" style={{ color: 'var(--color-primary)' }}>
                      <span>{s.shipping_number}</span>
                      <CopyButton value={s.shipping_number} size={14} />
                    </td>
                    <td>{s.recipient_name}</td>
                    <td style={{ textAlign: 'center' }}>
                      {isExport ? (
                        <CircleArrowOutUpRight size={16} style={{ color: 'var(--color-vivid-green-dark)' }} title="Export" />
                      ) : isImport ? (
                        <CircleArrowOutDownLeft size={16} style={{ color: 'var(--color-primary)' }} title="Import" />
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--color-steel)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{(s.type_service || '').replace(/_/g, ' ')}</td>
                    <td><StatusBadge status={s.statut_actuel} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(s.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {!loading && shipments.length > 0 && (
        <>
          <Pagination page={page} lastPage={meta.lastPage} total={meta.total} perPage={meta.perPage} onChange={setPage} />
          {meta.lastPage <= 1 && (
            <p
              className="mt-3 text-center"
              style={{ fontSize: 12, color: 'var(--color-steel)' }}
            >
              {total} expédition{total > 1 ? 's' : ''}
            </p>
          )}
        </>
      )}
    </div>
  );
}
