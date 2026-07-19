import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileDown, Receipt, Wallet } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SortHeader from '../../components/ui/SortHeader';
import SearchInput from '../../components/ui/SearchInput';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import { useColumnSort } from '../../hooks/useColumnSort';
import { useUrlPage } from '../../hooks/useUrlPage';
import { formatDate, formatMoney, getInvoiceNumber } from '../../lib/format';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'impayee', label: 'Impayées' },
  { value: 'payee', label: 'Payées' },
];

export default function MyInvoices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const statut = searchParams.get('statut') || '';
  const focusId = searchParams.get('focus');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ lastPage: 1, total: 0, perPage: 25 });
  const { page, setPage, resetPage } = useUrlPage();
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statut, column, direction, page]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/my/invoices', { params: { search: q, statut, page, ...sortParams } });
      setInvoices(data.data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.last_page && page > data.last_page) resetPage();
    } finally {
      setLoading(false);
    }
  };

  // Top-of-page stats (computed on the visible page)
  const unpaidCount = invoices.filter((i) => i.statut === 'impayee').length;
  const totalImpaye = invoices.filter((i) => i.statut === 'impayee').reduce((acc, i) => acc + Number(i.ttc || 0), 0);

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
    next.delete('statut');
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const handleStatusChange = (e) => updateParam('statut', e.target.value);

  return (
    <div>
      <PageHeader
        title="Mes Factures"
        subtitle="Consultez, téléchargez et suivez vos factures."
      />

      {/* Inline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <SummaryStat
          icon={Receipt}
          label="Nombre de factures impayées"
          value={unpaidCount}
          accent="primary"
        />
        <SummaryStat
          icon={Wallet}
          label="Solde impayé"
          value={formatMoney(totalImpaye)}
          accent="danger"
        />
      </div>

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div className="flex flex-col md:flex-row" style={{ gap: 12, alignItems: 'center' }}>
          <SearchInput
            value={q}
            onSearch={handleSearch}
            onClear={handleClearAll}
            loading={loading}
            placeholder="Rechercher par numéro de facture..."
          />
          <select
            value={statut}
            onChange={handleStatusChange}
            className="select"
            style={{ maxWidth: 220 }}
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <Skeleton height={20} width="55%" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Aucune facture trouvée"
            description={
              q || statut
                ? 'Aucun résultat ne correspond à vos filtres.'
                : "Aucune facture n'a été émise à votre encontre pour le moment."
            }
          />
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <SortHeader label="Numéro" col="numero_n" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Date" col="date_facture" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Échéance" col="date_echeance" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="HT" col="taxable" currentCol={column} direction={direction} onClick={toggle} align="right" />
                <SortHeader label="TVA" col="tva" currentCol={column} direction={direction} onClick={toggle} align="right" />
                <SortHeader label="TTC" col="ttc" currentCol={column} direction={direction} onClick={toggle} align="right" />
                <SortHeader label="Statut" col="statut" currentCol={column} direction={direction} onClick={toggle} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const id = inv.id;
                const focused = id.toString() === focusId;
                return (
                  <tr
                    key={id}
                    onClick={() => navigate(`/client/mes-factures/${id}`)}
                    style={{
                      cursor: 'pointer',
                      background: focused ? 'var(--color-primary-wash)' : undefined,
                    }}
                  >
                    <td className="font-mono-data" style={{ color: 'var(--color-primary)' }}>
                      <span>{getInvoiceNumber(inv)}</span>
                    </td>
                    <td>{formatDate(inv.date_facture)}</td>
                    <td>{formatDate(inv.date_echeance)}</td>
                    <td className="text-right">{formatMoney(inv.taxable)}</td>
                    <td className="text-right">{formatMoney(inv.tva)}</td>
                    <td className="text-right" style={{ fontWeight: 700, color: 'var(--color-graphite)' }}>
                      {formatMoney(inv.ttc)}
                    </td>
                    <td>
                      <StatusBadge status={inv.statut} variant="left" />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`/api/my/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        download={`${getInvoiceNumber(inv)}.pdf`}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        title="Télécharger le PDF"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileDown size={16} /> PDF
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {!loading && invoices.length > 0 && (
        <>
          <Pagination page={page} lastPage={meta.lastPage} total={meta.total} perPage={meta.perPage} onChange={setPage} />
          {meta.lastPage <= 1 && (
            <p
              className="mt-3 text-center"
              style={{ fontSize: 12, color: 'var(--color-steel)' }}
            >
              {meta.total} facture{meta.total > 1 ? 's' : ''}
            </p>
          )}
        </>
      )}

      <p
        className="mt-3 text-center"
        style={{ fontSize: 12, color: 'var(--color-steel)' }}
      >
        Pour toute question concernant vos factures, merci de nous contacter.
      </p>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value, accent }) {
  const accents = {
    primary: { bg: 'var(--color-primary-wash)', fg: 'var(--color-primary)' },
    success: { bg: 'var(--color-success-container)', fg: 'var(--color-vivid-green-dark)' },
    danger: { bg: 'var(--color-danger-container)', fg: 'var(--color-danger)' },
  };
  const a = accents[accent] || accents.primary;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 40, height: 40, borderRadius: 9999,
            background: a.bg, color: a.fg,
          }}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-steel)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: 500,
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--color-graphite)',
              marginTop: 2,
            }}
            className="truncate"
          >
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}
