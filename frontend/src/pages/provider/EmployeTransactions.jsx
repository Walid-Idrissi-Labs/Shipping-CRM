import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard } from '../../components/ui/DataCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { FormField } from '../../components/ui/Form';
import { ChevronLeft, ChevronRight, ArrowRight, RotateCcw, Users } from 'lucide-react';

const STATUS_LABELS = {
  information_recue: 'Information Reçue',
  ramasse: 'Ramassé',
  en_transit: 'En Transit',
  en_cours: 'En Cours',
  livre: 'Livré',
  en_cours_de_livraison: 'En cours de livraison',
  tentative_de_livraison: 'Tentative de livraison',
  on_hold: 'On Hold',
  retour: 'Retour',
};

const SORT_OPTIONS = [
  { value: 'time', label: 'Par date (plus récent)' },
  { value: 'shipment_number', label: "Par N° d'expédition" },
  { value: 'employe_name', label: "Par nom d'employé" },
];

const EMPTY_FILTERS = {
  employe_id: '',
  shipping_number: '',
  date_from: '',
  date_to: '',
  sort_by: 'time',
};

function labelFor(status) {
  if (!status) return null;
  return STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusFlow({ item }) {
  return (
    <div className="emp-hist-flow" style={{ marginTop: 0 }}>
      {item.old_status ? (
        <StatusBadge status={item.old_status}>{labelFor(item.old_status)}</StatusBadge>
      ) : (
        <span style={{ fontSize: 13, color: 'var(--color-smoke)' }}>—</span>
      )}
      <ArrowRight size={14} className="emp-hist-arrow" />
      <StatusBadge status={item.new_status}>{labelFor(item.new_status)}</StatusBadge>
      {(item.old_sub_status || item.new_sub_status) && (
        <span style={{ fontSize: 12, color: 'var(--color-steel)' }}>
          ({labelFor(item.old_sub_status) || '—'} → {labelFor(item.new_sub_status) || '—'})
        </span>
      )}
    </div>
  );
}

export default function EmployeTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 25, total: 0 });
  const [employes, setEmployes] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current_page,
        limit: pagination.per_page,
      });
      if (filters.employe_id) params.append('employe_id', filters.employe_id);
      if (filters.shipping_number) params.append('shipping_number', filters.shipping_number);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);

      const { data } = await api.get(`/admin/employes/transactions?${params.toString()}`);
      setTransactions(data.data || []);
      setError('');
      setPagination((prev) => ({
        ...prev,
        current_page: data.current_page,
        last_page: data.last_page,
        per_page: data.per_page,
        total: data.total,
      }));
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setTransactions([]);
      setError("L'historique n'a pas pu être chargé. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  }, [pagination.current_page, pagination.per_page, filters]);

  const fetchEmployes = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/employes?limit=100');
      setEmployes(data.data || []);
    } catch (err) {
      console.error('Failed to fetch employés:', err);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchEmployes();
  }, [fetchEmployes]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.last_page) {
      setPagination((prev) => ({ ...prev, current_page: page }));
    }
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const filtersActive = Object.keys(EMPTY_FILTERS).some((k) => filters[k] !== EMPTY_FILTERS[k]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Employés"
        title="Historique des Transactions"
        subtitle="Toutes les modifications de statut effectuées par les employés, filtrables et triables."
      />

      <DataCard title="Filtres" description="Filtrer l'historique global des modifications." padding={16}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4">
          <FormField label="Employé">
            <select
              value={filters.employe_id}
              onChange={(e) => handleFilterChange('employe_id', e.target.value)}
              className="select"
              style={{ width: '100%' }}
            >
              <option value="">Tous les employés</option>
              {employes.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="N° d'expédition">
            <input
              type="text"
              inputMode="numeric"
              value={filters.shipping_number}
              onChange={(e) => handleFilterChange('shipping_number', e.target.value)}
              placeholder="Numéro d'expédition..."
              className="input"
              style={{ width: '100%' }}
            />
          </FormField>
          <FormField label="Trier par">
            <select
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
              className="select"
              style={{ width: '100%' }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Date de début">
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </FormField>
          <FormField label="Date de fin">
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </FormField>
          <div className="flex items-start sm:items-end" style={{ marginBottom: 16 }}>
            <button
              onClick={handleResetFilters}
              className="btn btn-ghost"
              disabled={!filtersActive}
              style={{ width: '100%' }}
            >
              <RotateCcw size={14} /> Réinitialiser
            </button>
          </div>
        </div>
      </DataCard>

      <DataCard
        title={`Transactions (${pagination.total})`}
        description="Modifications de statut par les employés."
        padding={0}
      >
        {loading && transactions.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-steel)' }}>
            <div className="truck-loader" style={{ margin: '0 auto 16px' }} />
            <p>Chargement des transactions...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: 'var(--color-graphite)', marginBottom: 12 }}>{error}</p>
            <button onClick={fetchTransactions} className="btn btn-secondary">
              <RotateCcw size={14} /> Réessayer
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-steel)' }}>
            <Users size={40} style={{ margin: '0 auto 16px', color: 'var(--color-smoke)' }} />
            <p style={{ fontSize: 16, color: 'var(--color-graphite)', marginBottom: 6 }}>Aucune transaction</p>
            <p style={{ fontSize: 14 }}>
              {filtersActive
                ? 'Aucune modification ne correspond aux filtres actuels.'
                : "Les modifications de statut de vos employés apparaîtront ici."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: one card per transaction */}
            <div className="emp-hide-desktop" style={{ padding: '0 16px 4px' }}>
              {transactions.map((item) => (
                <div key={item.id} className="emp-hist-card">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span
                      className="font-mono-data"
                      style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}
                    >
                      {item.shipment?.shipping_number || '—'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-steel)', marginLeft: 'auto' }}>
                      {formatDate(item.changed_at)}
                    </span>
                  </div>
                  {item.shipment?.client && (
                    <div style={{ fontSize: 12, color: 'var(--color-steel)', marginTop: 2 }}>
                      {item.shipment.client.full_name}
                    </div>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <StatusFlow item={item} />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: '1px solid var(--color-ash)',
                      fontSize: 12,
                      color: 'var(--color-steel)',
                    }}
                  >
                    <Users size={13} />
                    {item.employee?.name || 'Employé supprimé'}
                  </div>
                  {item.description && (
                    <div style={{ fontSize: 13, color: 'var(--color-iron)', marginTop: 8, lineHeight: 1.45 }}>
                      {item.description}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: the table */}
            <div className="emp-hide-mobile" style={{ overflowX: 'auto' }}>
              <table className="table-clean" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 170 }}>Date</th>
                    <th style={{ width: 180 }}>Employé</th>
                    <th style={{ width: 180 }}>Expédition</th>
                    <th>Changement de statut</th>
                    <th style={{ width: 200 }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-mono-data" style={{ fontSize: 13, color: 'var(--color-graphite)' }}>
                          {formatDate(item.changed_at)}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--color-graphite)' }}>
                          {item.employee?.name || 'Employé supprimé'}
                        </div>
                        {item.employee?.email && (
                          <div style={{ fontSize: 12, color: 'var(--color-steel)', marginTop: 2 }}>
                            {item.employee.email}
                          </div>
                        )}
                      </td>
                      <td>
                        <div
                          className="font-mono-data"
                          style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}
                        >
                          {item.shipment?.shipping_number || '—'}
                        </div>
                        {item.shipment?.client && (
                          <div style={{ fontSize: 12, color: 'var(--color-steel)', marginTop: 2 }}>
                            {item.shipment.client.full_name}
                          </div>
                        )}
                      </td>
                      <td>
                        <StatusFlow item={item} />
                      </td>
                      <td>
                        <div style={{ fontSize: 13, color: 'var(--color-iron)' }}>{item.description || '—'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.last_page > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: 16,
                  borderTop: '1px solid var(--color-ash)',
                }}
              >
                <button
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className="btn btn-secondary"
                  aria-label="Page précédente"
                  style={{ padding: '8px 14px' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: 14, color: 'var(--color-iron)', minWidth: 90, textAlign: 'center' }}>
                  Page {pagination.current_page} / {pagination.last_page}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.last_page}
                  className="btn btn-secondary"
                  aria-label="Page suivante"
                  style={{ padding: '8px 14px' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </DataCard>
    </div>
  );
}
