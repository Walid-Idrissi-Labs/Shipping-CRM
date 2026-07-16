import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import StatusBadge from '../../components/ui/StatusBadge';
import { FormField } from '../../components/ui/Form';
import { ChevronLeft, ChevronRight, ArrowRight, SlidersHorizontal, Search, X } from 'lucide-react';

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

/** old → new status, with the sub-status shown underneath when it changed. */
function StatusFlow({ item }) {
  return (
    <div className="emp-hist-flow">
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

export default function MonHistorique() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 25, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    date_from: '',
    date_to: '',
  });

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current_page,
        limit: pagination.per_page,
      });
      if (filters.search) params.append('search', filters.search);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const { data } = await api.get(`/employe/history?${params.toString()}`);
      setHistory(data.data || []);
      setPagination((prev) => ({
        ...prev,
        current_page: data.current_page,
        last_page: data.last_page,
        per_page: data.per_page,
        total: data.total,
      }));
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.current_page, pagination.per_page, filters]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.last_page) {
      setPagination((prev) => ({ ...prev, current_page: page }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const datesActive = Boolean(filters.date_from || filters.date_to);

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: 'var(--color-graphite)', letterSpacing: '-0.01em' }}>
          Mon historique
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-steel)', marginTop: 4 }}>
          {pagination.total > 0
            ? `${pagination.total} modification${pagination.total > 1 ? 's' : ''} de statut`
            : 'Vos changements de statut'}
        </p>
      </div>

      {/* Search is always reachable; date filters fold away */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-smoke)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            inputMode="numeric"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="N° d'expédition"
            className="input"
            style={{ width: '100%', fontSize: 16, minHeight: 44, paddingLeft: 36 }}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => handleFilterChange('search', '')}
              aria-label="Effacer la recherche"
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'none',
                color: 'var(--color-smoke)',
                cursor: 'pointer',
                display: 'flex',
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className="btn btn-secondary"
          aria-expanded={showFilters}
          style={{
            minHeight: 44,
            paddingLeft: 14,
            paddingRight: 14,
            borderColor: datesActive ? 'var(--color-primary)' : undefined,
            color: datesActive ? 'var(--color-primary)' : undefined,
          }}
        >
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Dates</span>
        </button>
      </div>

      {showFilters && (
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            padding: 14,
            marginBottom: 12,
            border: '1px solid var(--color-ash)',
            borderRadius: 12,
            background: 'var(--color-bone)',
          }}
        >
          <FormField label="Du">
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="input"
              style={{ width: '100%', fontSize: 16, minHeight: 44 }}
            />
          </FormField>
          <FormField label="Au">
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="input"
              style={{ width: '100%', fontSize: 16, minHeight: 44 }}
            />
          </FormField>
          {datesActive && (
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, date_from: '', date_to: '' }))}
              className="btn btn-ghost"
              style={{ alignSelf: 'end', marginBottom: 16, minHeight: 44 }}
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {loading && history.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-steel)' }}>
          <div className="truck-loader" style={{ margin: '0 auto 16px' }} />
          <p>Chargement de l'historique...</p>
        </div>
      ) : history.length === 0 ? (
        <div style={{ padding: '48px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 16, color: 'var(--color-graphite)', marginBottom: 6 }}>
            Aucune modification trouvée
          </p>
          <p style={{ fontSize: 14, color: 'var(--color-steel)' }}>
            Vos changements de statut apparaîtront ici.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: one card per change */}
          <div className="emp-hide-desktop">
            {history.map((item) => (
              <div key={item.id} className="emp-hist-card">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span
                    className="font-mono-data"
                    style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}
                  >
                    {item.shipment?.shipping_number}
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
                <StatusFlow item={item} />
                {item.description && (
                  <div style={{ fontSize: 13, color: 'var(--color-iron)', marginTop: 8, lineHeight: 1.45 }}>
                    {item.description}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: the table */}
          <div
            className="emp-hide-mobile"
            style={{ border: '1px solid var(--color-ash)', borderRadius: 12, overflow: 'hidden' }}
          >
            <table className="table-clean" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 180 }}>Date</th>
                  <th>Expédition</th>
                  <th>Changement de statut</th>
                  <th style={{ width: 200 }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-mono-data" style={{ fontSize: 13, color: 'var(--color-graphite)' }}>
                        {formatDate(item.changed_at)}
                      </div>
                    </td>
                    <td>
                      <div
                        className="font-mono-data"
                        style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}
                      >
                        {item.shipment?.shipping_number}
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
                padding: '20px 0 8px',
              }}
            >
              <button
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
                className="btn btn-secondary"
                aria-label="Page précédente"
                style={{ minHeight: 44, paddingLeft: 16, paddingRight: 16 }}
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
                style={{ minHeight: 44, paddingLeft: 16, paddingRight: 16 }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
