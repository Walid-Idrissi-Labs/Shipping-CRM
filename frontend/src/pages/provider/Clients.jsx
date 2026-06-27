import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, UserPlus } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SortHeader from '../../components/ui/SortHeader';
import SearchInput from '../../components/ui/SearchInput';
import { useColumnSort } from '../../hooks/useColumnSort';

export default function Clients() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, column, direction]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/clients', { params: { search: q, ...sortParams } });
      setClients(data.data || []);
    } finally {
      setLoading(false);
    }
  };

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
    setSearchParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Gestion des comptes clients et de leurs informations"
        actionLabel="Nouveau Client"
        actionTo="/dashboard/clients/nouveau"
        actionIcon={UserPlus}
      />

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <SearchInput value={q} onSearch={handleSearch} onClear={handleClearAll} loading={loading} placeholder="Rechercher par nom, email, telephone, compte..." />
      </Card>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <Skeleton height={20} width="40%" />
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Aucun client"
            description={q ? 'Aucun resultat pour votre recherche.' : 'Commencez par ajouter un nouveau client.'}
            actionLabel={!q ? 'Ajouter un client' : undefined}
            actionTo={!q ? '/dashboard/clients/nouveau' : undefined}
          />
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <SortHeader label="Compte" col="account_number" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Nom" col="full_name" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Entreprise" col="company_name" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Email" col="email" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Telephone" col="phone" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Ville" col="city" currentCol={column} direction={direction} onClick={toggle} />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/dashboard/clients/${c.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="font-mono-data" style={{ color: 'var(--color-primary)' }}>{c.account_number}</td>
                  <td style={{ fontWeight: 500, color: 'var(--color-graphite)' }}>{c.full_name}</td>
                  <td>{c.company_name || '-'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.city || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
