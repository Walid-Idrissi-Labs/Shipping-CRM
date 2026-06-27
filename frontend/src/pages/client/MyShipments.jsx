import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, PackagePlus } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SortHeader from '../../components/ui/SortHeader';
import CopyButton from '../../components/ui/CopyButton';
import SearchInput from '../../components/ui/SearchInput';
import { useColumnSort } from '../../hooks/useColumnSort';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'information_recue', label: 'Information Recue' },
  { value: 'ramasse', label: 'Ramasse' },
  { value: 'en_transit', label: 'En Transit' },
  { value: 'en_cours', label: 'En Cours' },
  { value: 'livre', label: 'Livre' },
];

export default function MyShipments() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const statut = searchParams.get('statut') || '';
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    fetchShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statut, column, direction]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/my/shipments', { params: { search: q, statut, ...sortParams } });
      setShipments(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  const total = shipments.length;

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const handleSearch = (value) => updateParam('q', value);

  const handleClearAll = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('statut');
    setSearchParams(next, { replace: true });
  };

  const handleStatusChange = (e) => updateParam('statut', e.target.value);

  return (
    <div>
      <PageHeader
        title="Mes Expeditions"
        subtitle="Suivi detaille de tous vos envois."
        actionLabel="Nouvelle Expedition"
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
            placeholder="Rechercher par numero, destinataire..."
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
        ) : shipments.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Aucune expedition"
            description={
              q || statut
                ? 'Aucun resultat ne correspond a vos filtres.'
                : "Vous n'avez pas encore d'expedition dans votre espace."
            }
            actionLabel={!q && !statut ? 'Nouvelle Expedition' : undefined}
            actionTo={!q && !statut ? '/client/expeditions/nouveau' : undefined}
          />
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <SortHeader label="Numero" col="shipping_number" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Destinataire" col="recipient_name" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Service" col="type_service" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Statut" col="statut_actuel" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Date" col="created_at" currentCol={column} direction={direction} onClick={toggle} />
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
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
                  <td style={{ textTransform: 'capitalize' }}>{(s.type_service || '').replace(/_/g, ' ')}</td>
                  <td><StatusBadge status={s.statut_actuel} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {!loading && shipments.length > 0 && (
        <p
          className="mt-3 text-center"
          style={{ fontSize: 12, color: 'var(--color-steel)' }}
        >
          {total} expedition{total > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
