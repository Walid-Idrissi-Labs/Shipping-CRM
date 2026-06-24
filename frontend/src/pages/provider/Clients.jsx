import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, UserPlus } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SortHeader from '../../components/ui/SortHeader';
import { useColumnSort } from '../../hooks/useColumnSort';

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    const t = setTimeout(() => fetchClients(), 250);
    return () => clearTimeout(t);
  }, [search, column, direction]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/clients', { params: { search, ...sortParams } });
      setClients(data.data || []);
    } finally {
      setLoading(false);
    }
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
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-smoke)' }}
          />
          <input
            type="text"
            placeholder="Rechercher par nom, email, telephone, compte..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: 36 }}
          />
        </div>
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
            description={search ? 'Aucun resultat pour votre recherche.' : 'Commencez par ajouter un nouveau client.'}
            actionLabel={!search ? 'Ajouter un client' : undefined}
            actionTo={!search ? '/dashboard/clients/nouveau' : undefined}
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
