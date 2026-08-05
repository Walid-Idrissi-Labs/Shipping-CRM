import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, FileMinus, PackagePlus, CircleArrowOutUpRight, CircleArrowOutDownLeft, ChevronRight, AlertTriangle } from 'lucide-react';
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

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'information_recue', label: 'Information Recue' },
  { value: 'ramasse', label: 'Ramasse' },
  { value: 'en_transit', label: 'En Transit' },
  { value: 'en_cours', label: 'En Cours' },
  { value: 'livre', label: 'Livre' },
];

const sourceOptions = [
  { value: '', label: 'Toutes les sources' },
  { value: 'client', label: 'Creee par le client' },
  { value: 'prestataire', label: 'Creee par nous' },
];

export default function Shipments() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const statut = searchParams.get('statut') || '';
  const source = searchParams.get('source') || '';
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [meta, setMeta] = useState({ lastPage: 1, total: 0, perPage: 25 });
  const { page, setPage, resetPage } = useUrlPage();
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    fetchShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statut, source, column, direction, page]);

  const fetchShipments = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get('/shipments', {
        params: { search: q, statut, created_by_role: source, page, ...sortParams },
      });
      setShipments(data.data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.last_page && page > data.last_page) resetPage();
    } catch {
      // Previously there was no catch at all: a failed request left the list
      // at [] and rendered the "aucune expedition" empty state, which is
      // indistinguishable from genuinely having no shipments.
      setShipments([]);
      setLoadError(true);
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
    next.delete('source');
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const handleStatusChange = (e) => updateParam('statut', e.target.value);
  const handleSourceChange = (e) => updateParam('source', e.target.value);

  return (
    <div>
      <PageHeader
        title="Expeditions"
        subtitle="Suivi et gestion des expeditions en cours"
        actionLabel="Nouvelle Expedition"
        actionTo="/dashboard/expeditions/nouveau"
        actionIcon={PackagePlus}
      />

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div className="flex flex-col md:flex-row" style={{ gap: 12, alignItems: 'center' }}>
          <SearchInput value={q} onSearch={handleSearch} onClear={handleClearAll} loading={loading} placeholder="Rechercher par numero, expediteur, destinataire..." />
          <select value={statut} onChange={handleStatusChange} className="select" style={{ maxWidth: 220 }}>
            {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={source} onChange={handleSourceChange} className="select" style={{ maxWidth: 240 }}>
            {sourceOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
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
        ) : loadError ? (
          <EmptyState
            icon={AlertTriangle}
            tone="danger"
            title="Chargement impossible"
            description="Les expeditions n'ont pas pu etre recuperees. Verifiez votre connexion puis reessayez."
            actionLabel="Reessayer"
            onAction={fetchShipments}
          />
        ) : shipments.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Aucune expedition"
            description={q || statut || source ? 'Aucun resultat ne correspond a vos filtres.' : 'Commencez par creer une premiere expedition.'}
            actionLabel={!q && !statut && !source ? 'Nouvelle Expedition' : undefined}
            actionTo={!q && !statut && !source ? '/dashboard/expeditions/nouveau' : undefined}
          />
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <SortHeader label="Numero" col="shipping_number" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Date" col="created_at" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Client" col="client.full_name" currentCol={column} direction={direction} onClick={toggle} />
                <th style={{ width: 60, textAlign: 'center' }}>Direction</th>
                <SortHeader label="Service" col="type_service" currentCol={column} direction={direction} onClick={toggle} />
                <th>De / A</th>
                <SortHeader label="Statut" col="statut_actuel" currentCol={column} direction={direction} onClick={toggle} />
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => {
                const clientName = s.client?.full_name || 'Client Divers';
                const isExport = s.sender_name?.toLowerCase().includes(clientName.toLowerCase());
                const isImport = s.recipient_name?.toLowerCase().includes(clientName.toLowerCase());
                return (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/dashboard/expeditions/${s.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="font-mono-data" style={{ color: 'var(--color-primary)' }}>
                      <span>{s.shipping_number}</span>
                      <CopyButton value={s.shipping_number} size={14} />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(s.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td>
                      {s.client?.full_name ? (
                        s.client.full_name
                      ) : (
                        <em style={{ color: 'var(--color-steel)' }}>divers</em>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isExport ? (
                        <CircleArrowOutUpRight size={16} style={{ color: 'var(--color-vivid-green-dark)' }} title="Export" />
                      ) : isImport ? (
                        <CircleArrowOutDownLeft size={16} style={{ color: 'var(--color-primary)' }} title="Import" />
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--color-steel)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{s.type_service.replace(/_/g, ' ')}</td>
                    <td style={{ fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div>{s.sender_city || '—'}</div>
                          {s.sender_country && <div style={{ color: 'var(--color-steel)' }}>({s.sender_country})</div>}
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--color-smoke)', flexShrink: 0 }} />
                        <div>
                          <div>{s.recipient_city || '—'}</div>
                          {s.recipient_country && <div style={{ color: 'var(--color-steel)' }}>({s.recipient_country})</div>}
                        </div>
                      </div>
                    </td>
                    <td><StatusBadge status={s.statut_actuel} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end" style={{ gap: 6 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/api/shipments/${s.id}/label-inline`, '_blank');
                          }}
                          className="btn-icon"
                          title="Etiquette"
                        >
                          <FileMinus size={22} strokeWidth={1.6} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && shipments.length > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <Pagination page={page} lastPage={meta.lastPage} total={meta.total} perPage={meta.perPage} onChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
