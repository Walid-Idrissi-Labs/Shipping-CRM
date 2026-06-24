import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Package, ExternalLink } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SortHeader from '../../components/ui/SortHeader';
import { useColumnSort } from '../../hooks/useColumnSort';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'information_recue', label: 'Information Recue' },
  { value: 'ramasse', label: 'Ramasse' },
  { value: 'en_transit', label: 'En Transit' },
  { value: 'en_cours', label: 'En Cours' },
  { value: 'livre', label: 'Livre' },
  { value: 'retour', label: 'Retour' },
];

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function MyShipments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('statut') || '';
  const initialQ = searchParams.get('q') || '';

  const [shipments, setShipments] = useState([]);
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState(initialQ);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    const params = { ...sortParams };
    if (status) params.statut = status;
    if (search) params.search = search;

    setSearchParams({ statut: status, q: search, ...(sortParams.sort_by ? { sort_by: sortParams.sort_by, sort_dir: sortParams.sort_dir } : {}) }, { replace: true });

    setLoading(true);
    const t = setTimeout(() => {
      api.get('/my/shipments', { params })
        .then(({ data }) => {
          setShipments(data.data || []);
          setTotal(data.total ?? (data.data?.length ?? 0));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 250);

    return () => clearTimeout(t);
  }, [status, search, column, direction]);

  const handleClearFilters = () => {
    setStatus('');
    setSearch('');
  };

  return (
    <div>
      <PageHeader
        eyebrow="Espace Client"
        title="Mes Expeditions"
        subtitle="Suivi detaille de tous vos envois."
      />

      {/* Filter Bar */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: 12, color: 'var(--color-smoke)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par numero, destinataire, ville..."
              className="input"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="select"
            style={{ maxWidth: 240, minWidth: 180 }}
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {(search || status) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn-ghost"
              style={{ padding: '8px 14px' }}
            >
              Reinitialiser
            </button>
          )}
        </div>

        <div
          className="flex items-center gap-2 mt-3"
          style={{ fontSize: 12, color: 'var(--color-steel)' }}
        >
          <Package size={13} />
          <span>
            {loading ? 'Chargement...' : `${total} expedition${total > 1 ? 's' : ''}`}
          </span>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <Skeleton height={18} width="70%" />
              </div>
            ))}
          </div>
        ) : shipments.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Aucune expedition trouvee"
            description={
              search || status
                ? "Aucun resultat ne correspond a vos filtres. Essayez d'elargir votre recherche."
                : "Vous n'avez pas encore d'expedition dans votre espace."
            }
            actionLabel={search || status ? undefined : "Faire un suivi public"}
            actionTo={search || status ? undefined : "/suivi"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-clean">
              <thead>
                <tr>
                  <SortHeader label="Numero" col="shipping_number" currentCol={column} direction={direction} onClick={toggle} />
                  <SortHeader label="Destinataire" col="recipient_name" currentCol={column} direction={direction} onClick={toggle} />
                  <SortHeader label="Service" col="type_service" currentCol={column} direction={direction} onClick={toggle} />
                  <SortHeader label="Statut" col="statut_actuel" currentCol={column} direction={direction} onClick={toggle} />
                  <SortHeader label="Date" col="created_at" currentCol={column} direction={direction} onClick={toggle} />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono-data">
                      <Link
                        to={`/suivi?n=${encodeURIComponent(s.shipping_number)}`}
                        style={{ color: 'var(--color-primary)', fontWeight: 600 }}
                      >
                        {s.shipping_number}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.recipient_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-steel)' }}>
                        {s.recipient_city}, {s.recipient_country}
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {(s.type_service || '').replace(/_/g, ' ')}
                    </td>
                    <td><StatusBadge status={s.statut_actuel} /></td>
                    <td>{formatDate(s.created_at)}</td>
                    <td>
                      <Link
                        to={`/suivi?n=${encodeURIComponent(s.shipping_number)}`}
                        className="btn btn-ghost"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                      >
                        <ExternalLink size={12} /> Suivre
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
