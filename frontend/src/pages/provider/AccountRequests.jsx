import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {Eye, UserCheck, UserX, Trash2, AlertTriangle} from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import SortHeader from '../../components/ui/SortHeader';
import Pagination from '../../components/ui/Pagination';
import { useColumnSort } from '../../hooks/useColumnSort';
import { useUrlPage } from '../../hooks/useUrlPage';
import { useDialog } from '../../contexts/DialogContext';
import { useToast } from '../../contexts/ToastContext';
import { usePendingCounts } from '../../contexts/PendingCountsContext';

export default function AccountRequests() {
  const navigate = useNavigate();
  const dialog = useDialog();
  const toast = useToast();
  const { refresh: refreshPendingCounts } = usePendingCounts();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [meta, setMeta] = useState({ lastPage: 1, total: 0, perPage: 25 });
  const { page, setPage, resetPage } = useUrlPage();
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [column, direction, page]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(''), 3500);
    return () => clearTimeout(t);
  }, [feedback]);

  const fetchRequests = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get('/account-requests', { params: { page, ...sortParams } });
      setRequests(data.data || data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.last_page && page > data.last_page) resetPage();
    } catch {
      // Previously there was no catch at all: a failed request left the list
      // at [] and rendered the "aucune demande" empty state, which is
      // indistinguishable from genuinely having no requests.
      setRequests([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const accept = (r) => navigate(`/dashboard/clients/nouveau?demandeId=${r.id}`);

  const reject = async (id) => {
    const ok = await dialog.confirm({
      title: 'Rejeter cette demande de compte ?',
      description: 'La demande sera definitivement supprimee. Vous pouvez ensuite accepter d\'autres demandes.',
      confirmText: 'Rejeter',
      cancelText: 'Annuler',
      variant: 'danger',
      safetyGate: true,
      requiredInput: 'supprimer',
      inputLabel: 'Tapez supprimer pour confirmer',
    });
    if (!ok) return;
    try {
      await api.delete(`/account-requests/${id}`);
      toast.push('Demande rejetee', 'success');
      fetchRequests();
      refreshPendingCounts();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur', 'error');
    }
  };

  const remove = async (id) => {
    const ok = await dialog.confirm({
      title: 'Supprimer definitivement cette demande ?',
      description: 'La demande rejetee sera supprimee de la liste de maniere definitive.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      safetyGate: true,
      requiredInput: 'supprimer',
      inputLabel: 'Tapez supprimer pour confirmer',
    });
    if (!ok) return;
    try {
      await api.delete(`/account-requests/${id}/force`);
      toast.push('Demande supprimee', 'success');
      fetchRequests();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur', 'error');
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <div>
      <PageHeader
        title="Demandes de Compte"
        subtitle="Demandes de creation de compte clients en cours de traitement"
      />

      {feedback && (
        <div
          className="mb-4 text-sm font-medium animate-fade-in"
          style={{
            background: 'var(--color-success-container)',
            color: 'var(--color-vivid-green-dark)',
            padding: '10px 14px',
            borderRadius: 8,
          }}
        >
          {feedback}
        </div>
      )}

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
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
            description="Les demandes de compte n'ont pas pu etre recuperees. Verifiez votre connexion puis reessayez."
            actionLabel="Reessayer"
            onAction={fetchRequests}
          />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="Aucune demande"
            description="Aucune demande de compte en attente pour le moment."
          />
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <SortHeader label="Nom" col="full_name" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Email" col="email" currentCol={column} direction={direction} onClick={toggle} />
                <th>Telephone</th>
                <th>Ville</th>
                <SortHeader label="Statut" col="statut" currentCol={column} direction={direction} onClick={toggle} />
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
             <tbody>
               {requests.map((r) => (
                <>
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500, color: 'var(--color-graphite)' }}>{r.full_name}</td>
                    <td>{r.email || '—'}</td>
                    <td>{r.phone || '—'}</td>
                    <td>{r.city || '—'}</td>
                    <td><StatusBadge status={r.statut} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end" style={{ gap: 4 }}>
                        <button onClick={() => toggleExpand(r.id)} className="btn-icon" title="Voir details">
                          <Eye size={16} />
                        </button>
                        {r.statut === 'en_attente' && (
                          <>
                            <button onClick={() => accept(r)} className="btn-icon" title="Creer le compte">
                              <UserCheck size={16} color="var(--color-vivid-green-dark)" />
                            </button>
                            <button onClick={() => reject(r.id)} className="btn-icon" title="Rejeter">
                              <UserX size={16} color="var(--color-danger)" />
                            </button>
                          </>
                        )}
                        {r.statut === 'rejetee' && (
                          <button onClick={() => remove(r.id)} className="btn-icon" title="Supprimer definitivement">
                            <Trash2 size={16} color="var(--color-danger)" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr key={`${r.id}-exp`} style={{ background: 'var(--color-bone)' }}>
                      <td colSpan={6} style={{ padding: 20 }}>
                        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '12px 24px', fontSize: 13 }}>
                          <Field label="Nom complet" value={r.full_name} />
                          <Field label="Email" value={r.email} />
                          <Field label="Telephone" value={r.phone} />
                          <Field label="ICE" value={r.ice} />
                          <Field label="Adresse" value={r.address} />
                          <Field label="Ville" value={r.city} />
                          <Field label="Code postal" value={r.postal_code} />
                          <Field label="Pays" value={r.country} />
                          <Field label="Soumis le" value={r.created_at ? new Date(r.created_at).toLocaleString('fr-FR') : null} />
                          <div className="md:col-span-2" style={{ marginTop: 8 }}>
                            <Label>Notes supplementaires</Label>
                            <div
                              className="whitespace-pre-wrap"
                              style={{
                                background: 'var(--color-paper-white)',
                                border: '1px solid var(--color-ash)',
                                borderRadius: 6,
                                padding: 12,
                                color: 'var(--color-graphite)',
                              }}
                            >
                              {r.notes || '—'}
                            </div>
                          </div>
                          {r.statut === 'approuvee' && r.client_id && (
                            <div className="md:col-span-2" style={{ marginTop: 8, fontSize: 13, color: 'var(--color-vivid-green-dark)' }}>
                              Compte cree :{' '}
                              <Link to={`/dashboard/clients/${r.client_id}`} style={{ textDecoration: 'underline', color: 'inherit' }}>
                                Voir la fiche client
                              </Link>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
        {!loading && requests.length > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <Pagination page={page} lastPage={meta.lastPage} total={meta.total} perPage={meta.perPage} onChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}

function Label({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--color-steel)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <Label>{label}</Label>
      <div style={{ color: 'var(--color-graphite)' }}>{value || '—'}</div>
    </div>
  );
}
