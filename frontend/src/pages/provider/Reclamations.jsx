/* eslint-disable react-hooks/set-state-in-effect -- house data-fetch pattern: the effect calls fetchThreads(), which flips `loading` synchronously, same as every list page in this repo */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Inbox, AlertTriangle, MessageSquareText } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import StatusBadge from '../../components/ui/StatusBadge';
import SearchInput from '../../components/ui/SearchInput';
import Tabs from '../../components/ui/Tabs';
import Pagination from '../../components/ui/Pagination';
import { useUrlPage } from '../../hooks/useUrlPage';
import { formatRelativeTime } from '../../lib/format';

// Tabs rather than a <select> for the status split: the inbox lives in three
// workflow states and triage means jumping between them constantly — a
// dropdown hides the split behind a click, tabs keep it visible.
const statusTabs = [
  { value: 'all', label: 'Toutes' },
  { value: 'ouverte', label: 'Ouvertes' },
  { value: 'en_traitement', label: 'En traitement' },
  { value: 'resolue', label: 'Résolues' },
];

const typeOptions = [
  { value: '', label: 'Tous les types' },
  { value: 'remarque', label: 'Remarque' },
  { value: 'reclamation', label: 'Réclamation' },
];

const TYPE_LABELS = { remarque: 'Remarque', reclamation: 'Réclamation' };

function TypeTag({ type }) {
  const isReclamation = type === 'reclamation';
  const Icon = isReclamation ? AlertTriangle : MessageSquareText;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: 'var(--color-iron)', whiteSpace: 'nowrap' }}>
      <Icon size={13} strokeWidth={2} color={isReclamation ? 'var(--color-warning)' : 'var(--color-smoke)'} aria-hidden="true" />
      {TYPE_LABELS[type] || type}
    </span>
  );
}

function UnreadDot() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: 'var(--color-primary)',
        boxShadow: '0 0 0 3px var(--color-primary-wash)',
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}

function UnreadPill({ count }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--color-primary)',
        color: 'var(--color-paper-white)',
        borderRadius: 9999,
        padding: '2px 9px',
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {count === 1 ? '1 nouveau message' : `${count} nouveaux messages`}
    </span>
  );
}

export default function Reclamations() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const statut = searchParams.get('statut') || '';
  const type = searchParams.get('type') || '';
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [meta, setMeta] = useState({ lastPage: 1, total: 0, perPage: 25 });
  const { page, setPage, resetPage } = useUrlPage();

  const fetchThreads = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get('/reclamations', { params: { search: q, statut, type, page } });
      setThreads(data.data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.last_page && page > data.last_page) resetPage();
    } catch {
      // Without this, a failed request left the list at [] and rendered the
      // empty state, indistinguishable from genuinely having no réclamations.
      setThreads([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statut, type, page]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const handleClearAll = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('statut');
    next.delete('type');
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  // Unread-first within the page: the API sorts by last activity, but a thread
  // waiting on a reply always matters more than a recently self-answered one.
  // Array.prototype.sort is stable, so server order is kept within each group.
  const sorted = [...threads].sort(
    (a, b) => (b.unread_count > 0 ? 1 : 0) - (a.unread_count > 0 ? 1 : 0),
  );

  return (
    <div>
      <PageHeader
        title="Remarques & Réclamations"
        subtitle="Conversations ouvertes par vos clients — répondez et suivez leur traitement."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Remarques & Réclamations' }]}
      />

      <div style={{ marginBottom: 20, overflowX: 'auto' }}>
        <Tabs
          value={statut || 'all'}
          onChange={(v) => updateParam('statut', v === 'all' ? '' : v)}
          tabs={statusTabs}
        />
      </div>

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div className="flex flex-col md:flex-row" style={{ gap: 12, alignItems: 'center' }}>
          <SearchInput
            value={q}
            onSearch={(v) => updateParam('q', v)}
            onClear={handleClearAll}
            loading={loading}
            placeholder="Rechercher par référence, client, sujet..."
          />
          <select
            value={type}
            onChange={(e) => updateParam('type', e.target.value)}
            className="select"
            style={{ maxWidth: 180 }}
            aria-label="Filtrer par type"
          >
            {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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
            description="Les réclamations n'ont pas pu être récupérées. Vérifiez votre connexion puis réessayez."
            actionLabel="Réessayer"
            onAction={fetchThreads}
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Aucune conversation"
            description={
              q || statut || type
                ? 'Aucune conversation ne correspond à vos filtres.'
                : 'Les remarques et réclamations ouvertes par vos clients apparaîtront ici.'
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="list-table-wrap">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Client</th>
                    <th>Sujet</th>
                    <th>Type</th>
                    <th>Statut</th>
                    <th>Dernière activité</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => {
                    const unread = r.unread_count > 0;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => navigate(`/dashboard/reclamations/${r.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            {unread && <UnreadDot />}
                            <span className="font-mono-data" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                              {r.reference}
                            </span>
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: unread ? 600 : 500, color: 'var(--color-graphite)' }}>
                            {r.client?.full_name || '—'}
                          </div>
                          {r.client?.company_name && (
                            <div style={{ fontSize: 12, color: 'var(--color-steel)' }}>{r.client.company_name}</div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: unread ? 600 : 500, color: 'var(--color-graphite)' }}>{r.sujet}</div>
                          {r.last_message_excerpt && (
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--color-steel)',
                                marginTop: 2,
                                maxWidth: 320,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {r.last_message_author_role === 'client' ? 'Client' : 'Vous'} — {r.last_message_excerpt}
                            </div>
                          )}
                        </td>
                        <td><TypeTag type={r.type} /></td>
                        <td><StatusBadge status={r.statut} /></td>
                        <td>
                          <div style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{formatRelativeTime(r.last_message_at)}</div>
                          {unread && (
                            <div style={{ marginTop: 4 }}>
                              <UnreadPill count={r.unread_count} />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="list-card-stack">
              {sorted.map((r) => {
                const unread = r.unread_count > 0;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => navigate(`/dashboard/reclamations/${r.id}`)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      background: 'var(--color-paper-white)',
                      border: '1px solid var(--color-ash)',
                      borderLeft: `3px solid ${unread ? 'var(--color-primary)' : 'var(--color-ash)'}`,
                      borderRadius: 10,
                      padding: '12px 14px',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div className="flex items-center justify-between" style={{ gap: 8 }}>
                      <span className="font-mono-data" style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 12.5 }}>
                        {r.reference}
                      </span>
                      <StatusBadge status={r.statut} variant="left" />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-graphite)', marginTop: 6 }}>
                      {r.client?.full_name || '—'}
                      {r.client?.company_name && (
                        <span style={{ fontWeight: 400, color: 'var(--color-steel)' }}> · {r.client.company_name}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: unread ? 600 : 400, color: 'var(--color-graphite)', marginTop: 3 }}>
                      {r.sujet}
                    </div>
                    <div className="flex items-center justify-between" style={{ gap: 8, marginTop: 8 }}>
                      <TypeTag type={r.type} />
                      {unread ? (
                        <UnreadPill count={r.unread_count} />
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--color-steel)' }}>{formatRelativeTime(r.last_message_at)}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {!loading && sorted.length > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <Pagination page={page} lastPage={meta.lastPage} total={meta.total} perPage={meta.perPage} onChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
