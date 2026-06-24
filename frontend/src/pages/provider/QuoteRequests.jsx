import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileText, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SortHeader from '../../components/ui/SortHeader';
import { useColumnSort } from '../../hooks/useColumnSort';
import { useDialog } from '../../contexts/DialogContext';
import { useToast } from '../../contexts/ToastContext';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'traitee', label: 'Traitee' },
];

export default function QuoteRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const dialog = useDialog();
  const toast = useToast();
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    const t = setTimeout(() => fetchRequests(), 250);
    return () => clearTimeout(t);
  }, [search, status, column, direction]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/quote-requests', { params: { search, statut: status, ...sortParams } });
      setRequests(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await dialog.confirm({
      title: 'Supprimer cette demande de devis ?',
      description: 'La demande sera supprimee definitivement. Vous pourrez toujours en recevoir de nouvelles depuis le formulaire public.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      safetyGate: true,
      requiredInput: 'supprimer',
      inputLabel: 'Tapez supprimer pour confirmer',
    });
    if (!ok) return;
    await api.delete(`/quote-requests/${id}`);
    toast.push('Demande supprimee', 'success');
    fetchRequests();
  };

  return (
    <div>
      <PageHeader
        title="Demandes de Devis"
        subtitle="Demandes de devis envoyees par les clients (compte et divers)"
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
              placeholder="Rechercher par client, email..."
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
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ marginBottom: 12 }}><Skeleton height={20} width="55%" /></div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState icon={FileText} title="Aucune demande" description="Aucun resultat ne correspond." />
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <SortHeader label="Date" col="created_at" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Client" col="client_name" currentCol={column} direction={direction} onClick={toggle} />
                <th>Email</th>
                <th>Destinataire</th>
                <th>Service</th>
                <SortHeader label="Statut" col="statut" currentCol={column} direction={direction} onClick={toggle} />
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--color-steel)', whiteSpace: 'nowrap' }}>
                    {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td>{r.client_name}</td>
                  <td>{r.client_email}</td>
                  <td>{r.recipient_name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{(r.type_service || '').replace(/_/g, ' ')}</td>
                  <td>
                    {r.quote_id ? (
                      <span className="pill pill-success">Devis cree</span>
                    ) : (
                      <StatusBadge status={r.statut} />
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end" style={{ gap: 4 }}>
                      {!r.quote_id && (
                        <Link to={`/dashboard/devis/nouveau?demandeId=${r.id}`} className="btn-icon" title="Creer un Devis">
                          <FileText size={16} />
                        </Link>
                      )}
                      <button onClick={() => handleDelete(r.id)} className="btn-icon" title="Supprimer">
                        <Trash2 size={16} color="var(--color-danger)" />
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
