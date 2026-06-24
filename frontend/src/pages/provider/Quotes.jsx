import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Check, X, FilePenLine } from 'lucide-react';
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
  { value: 'envoye', label: 'Envoye' },
  { value: 'accepte', label: 'Accepte' },
  { value: 'refuse', label: 'Refuse' },
];

function formatMoney(v) {
  const n = Number(v || 0);
  return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function Quotes() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    const t = setTimeout(() => fetchQuotes(), 250);
    return () => clearTimeout(t);
  }, [search, status, column, direction]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/quotes', { params: { search, statut: status, ...sortParams } });
      setQuotes(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, statut) => {
    try {
      await api.patch(`/quotes/${id}/status`, { statut });
      fetchQuotes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <PageHeader
        title="Devis"
        subtitle="Propositions commerciales envoyees aux clients"
        actionLabel="Nouveau Devis"
        actionTo="/dashboard/devis/nouveau"
        actionIcon={FilePenLine}
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
              placeholder="Rechercher par numero, client..."
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
        ) : quotes.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Aucun devis"
            description="Commencez par creer votre premiere proposition commerciale."
            actionLabel="Nouveau Devis"
            actionTo="/dashboard/devis/nouveau"
          />
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <SortHeader label="Numero" col="quote_number" currentCol={column} direction={direction} onClick={toggle} />
                <th>Origine</th>
                <SortHeader label="Client" col="client_name" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Service" col="type_service" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="TTC" col="montant_ttc" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Statut" col="statut" currentCol={column} direction={direction} onClick={toggle} />
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => navigate(`/dashboard/devis/${q.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="font-mono-data" style={{ color: 'var(--color-primary)' }}>{q.quote_number}</td>
                  <td>
                    {q.request ? (
                      <span className="pill pill-info">Demande #{q.request.id}</span>
                    ) : (
                      <span style={{ color: 'var(--color-steel)', fontSize: 12 }}>Manuel</span>
                    )}
                  </td>
                  <td>{q.client?.full_name || q.client_name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{q.type_service.replace(/_/g, ' ')}</td>
                  <td className="font-mono-data">
                    {q.montant_ttc ? `${formatMoney(q.montant_ttc)} MAD` : '—'}
                  </td>
                  <td><StatusBadge status={q.statut} /></td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end" style={{ gap: 4 }}>
                      {q.statut === 'envoye' && (
                        <>
                          <button onClick={() => updateStatus(q.id, 'accepte')} className="btn-icon" title="Accepter">
                            <Check size={16} color="var(--color-vivid-green-dark)" />
                          </button>
                          <button onClick={() => updateStatus(q.id, 'refuse')} className="btn-icon" title="Refuser">
                            <X size={16} color="var(--color-danger)" />
                          </button>
                        </>
                      )}
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
