import { useMinLoading } from '../../hooks';
import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';
import { FormField } from '../../components/ui/Form';
import { useUrlPage } from '../../hooks/useUrlPage';
import { formatRelativeTime, formatDateTime } from '../../lib/format';
import { Activity, LogIn, Package, FileEdit, Receipt, User, SlidersHorizontal } from 'lucide-react';

const typeOptions = [
  { value: '', label: 'Tous' },
  { value: 'login', label: 'Connexions' },
  { value: 'shipment_created', label: 'Expéditions' },
  { value: 'quote_request_created', label: 'Devis' },
  { value: 'invoice_downloaded', label: 'Factures' },
  { value: 'profile_updated', label: 'Profil' },
];

const typeMeta = {
  login: { icon: LogIn, tone: 'primary' },
  shipment_created: { icon: Package, tone: 'primary' },
  quote_request_created: { icon: FileEdit, tone: 'warning' },
  invoice_downloaded: { icon: Receipt, tone: 'success' },
  profile_updated: { icon: User, tone: 'neutral' },
};

function ActivityIcon({ type }) {
  const meta = typeMeta[type] || { icon: Activity, tone: 'neutral' };
  const Icon = meta.icon;
  return (
    <div className={`icon-tile icon-tile-${meta.tone} rounded-full`} style={{ width: 36, height: 36, flexShrink: 0 }}>
      <Icon size={16} />
    </div>
  );
}

function clientLabel(activity) {
  if (!activity.client) return '—';
  return activity.client.company_name || activity.client.full_name;
}

export default function ClientActivity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoader = useMinLoading(loading);
  const [meta, setMeta] = useState({ lastPage: 1, total: 0, perPage: 25 });
  const { page, setPage, resetPage } = useUrlPage();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ type: '', date_from: '', date_to: '' });

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/client-activities', {
        params: { page, ...filters },
      });
      setActivities(data.data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.last_page && page > data.last_page) resetPage();
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleTypeChange = (value) => {
    setFilters((prev) => ({ ...prev, type: value }));
    resetPage();
  };

  const handleDateChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    resetPage();
  };

  const datesActive = Boolean(filters.date_from || filters.date_to);

  return (
    <div>
      <PageHeader
        title="Activité clients"
        subtitle={meta.total > 0 ? `${meta.total} événement${meta.total > 1 ? 's' : ''} (30 derniers jours)` : 'Connexions, expéditions, devis, factures et mises à jour de profil (30 derniers jours)'}
      />

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div className="flex flex-col md:flex-row" style={{ gap: 12, alignItems: 'center' }}>
          <select
            value={filters.type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="select"
            style={{ maxWidth: 220 }}
          >
            {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className="btn btn-secondary"
            aria-expanded={showFilters}
            style={{
              borderColor: datesActive ? 'var(--color-primary)' : undefined,
              color: datesActive ? 'var(--color-primary)' : undefined,
            }}
          >
            <SlidersHorizontal size={16} />
            <span>Dates</span>
          </button>
        </div>

        {showFilters && (
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              marginTop: 12,
              padding: 14,
              border: '1px solid var(--color-ash)',
              borderRadius: 12,
              background: 'var(--color-bone)',
            }}
          >
            <FormField label="Du">
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleDateChange('date_from', e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </FormField>
            <FormField label="Au">
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleDateChange('date_to', e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </FormField>
            {datesActive && (
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, date_from: '', date_to: '' }))}
                className="btn btn-ghost"
                style={{ alignSelf: 'end' }}
              >
                Réinitialiser
              </button>
            )}
          </div>
        )}
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {showLoader ? (
          <PageLoader variant="table" embedded />
        ) : activities.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Aucune activité pour l'instant"
            description="Les connexions, expéditions, devis et mises à jour de vos clients apparaîtront ici."
          />
        ) : (
          <>
            {/* Mobile: one card per activity */}
            <div className="emp-hide-desktop" style={{ padding: '16px 16px 4px' }}>
              {activities.map((a) => (
                <div key={a.id} className="emp-hist-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <ActivityIcon type={a.type} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontWeight: 500, color: 'var(--color-graphite)' }}>{clientLabel(a)}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-steel)', whiteSpace: 'nowrap' }}>
                          {formatRelativeTime(a.created_at)}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-iron)', marginTop: 4 }}>{a.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: the table */}
            <div className="emp-hide-mobile" style={{ overflowX: 'auto' }}>
              <table className="table-clean" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 48 }}></th>
                    <th>Client</th>
                    <th>Activité</th>
                    <th style={{ width: 160 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a) => (
                    <tr key={a.id}>
                      <td><ActivityIcon type={a.type} /></td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--color-graphite)' }}>{clientLabel(a)}</div>
                        {a.client?.account_number && (
                          <div className="font-mono-data" style={{ fontSize: 12, color: 'var(--color-steel)', marginTop: 2 }}>
                            {a.client.account_number}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: 13, color: 'var(--color-iron)' }}>{a.description || '—'}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, color: 'var(--color-graphite)' }} title={formatDateTime(a.created_at)}>
                          {formatRelativeTime(a.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!loading && activities.length > 0 && (
          <Pagination page={page} lastPage={meta.lastPage} total={meta.total} perPage={meta.perPage} onChange={setPage} />
        )}
      </Card>
    </div>
  );
}
