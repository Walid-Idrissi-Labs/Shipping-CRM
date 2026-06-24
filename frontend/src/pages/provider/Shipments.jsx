import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileMinus, PackagePlus } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SortHeader from '../../components/ui/SortHeader';
import CopyButton from '../../components/ui/CopyButton';
import { useColumnSort } from '../../hooks/useColumnSort';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'information_recue', label: 'Information Recue' },
  { value: 'ramasse', label: 'Ramasse' },
  { value: 'en_transit', label: 'En Transit' },
  { value: 'en_cours', label: 'En Cours' },
  { value: 'livre', label: 'Livre' },
];

export default function Shipments() {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    const t = setTimeout(() => fetchShipments(), 250);
    return () => clearTimeout(t);
  }, [search, status, column, direction]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/shipments', { params: { search, statut: status, ...sortParams } });
      setShipments(data.data || []);
    } finally {
      setLoading(false);
    }
  };

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
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-smoke)' }}
            />
            <input
              type="text"
              placeholder="Rechercher par numero, expediteur, destinataire..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="select" style={{ maxWidth: 220 }}>
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
        ) : shipments.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Aucune expedition"
            description={search || status ? 'Aucun resultat ne correspond a vos filtres.' : 'Commencez par creer une premiere expedition.'}
            actionLabel={!search && !status ? 'Nouvelle Expedition' : undefined}
            actionTo={!search && !status ? '/dashboard/expeditions/nouveau' : undefined}
          />
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <SortHeader label="Numero" col="shipping_number" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Client" col="sender_name" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Destinataire" col="recipient_name" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Service" col="type_service" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Date" col="created_at" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Statut" col="statut_actuel" currentCol={column} direction={direction} onClick={toggle} />
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/dashboard/expeditions/${s.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="font-mono-data" style={{ color: 'var(--color-primary)' }}>
                    <span>{s.shipping_number}</span>
                    <CopyButton value={s.shipping_number} size={14} />
                  </td>
                  <td>{s.client?.full_name || 'Client Divers'}</td>
                  <td>{s.recipient_name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{s.type_service.replace(/_/g, ' ')}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
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
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
