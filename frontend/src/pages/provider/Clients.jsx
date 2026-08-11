import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, UserPlus, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SortHeader from '../../components/ui/SortHeader';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import { useColumnSort } from '../../hooks/useColumnSort';
import { useUrlPage } from '../../hooks/useUrlPage';
import { formatMoney } from '../../lib/format';

const DEFAULT_UNPAID_THRESHOLD = 5000;

/**
 * Feu tricolore du solde impaye : vert a zero, rouge au-dela du seuil
 * parametre, ambre entre les deux.
 */
function balanceColor(amount, threshold) {
  if (amount <= 0) return 'var(--color-vivid-green-dark)';
  if (amount > threshold) return 'var(--color-danger)';
  return 'var(--color-warning)';
}

export default function Clients() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [meta, setMeta] = useState({ lastPage: 1, total: 0, perPage: 25 });
  const [threshold, setThreshold] = useState(DEFAULT_UNPAID_THRESHOLD);
  const { page, setPage, resetPage } = useUrlPage();
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, column, direction, page]);

  const fetchClients = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get('/clients', { params: { search: q, page, ...sortParams } });
      setClients(data.data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.unpaid_alert_threshold != null) setThreshold(Number(data.unpaid_alert_threshold));
      if (data.last_page && page > data.last_page) resetPage();
    } catch {
      // Previously there was no catch at all: a failed request left the list
      // at [] and rendered the "aucun client" empty state, which is
      // indistinguishable from genuinely having no clients.
      setClients([]);
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
    next.delete('page');
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
        ) : loadError ? (
          <EmptyState
            icon={AlertTriangle}
            tone="danger"
            title="Chargement impossible"
            description="Les clients n'ont pas pu etre recuperes. Verifiez votre connexion puis reessayez."
            actionLabel="Reessayer"
            onAction={fetchClients}
          />
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
                <SortHeader label="Solde impayé" col="impayee_ttc" currentCol={column} direction={direction} onClick={toggle} align="right" />
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
                  <td
                    className="font-mono-data"
                    style={{ textAlign: 'right', fontWeight: 600, color: balanceColor(Number(c.impayee_ttc || 0), threshold) }}
                  >
                    {formatMoney(c.impayee_ttc || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && clients.length > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <Pagination page={page} lastPage={meta.lastPage} total={meta.total} perPage={meta.perPage} onChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
