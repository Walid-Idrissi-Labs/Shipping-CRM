import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileDown, CircleCheck, Clock, Receipt, Wallet } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SortHeader from '../../components/ui/SortHeader';
import SearchInput from '../../components/ui/SearchInput';
import { useColumnSort } from '../../hooks/useColumnSort';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'impayee', label: 'Impayees' },
  { value: 'payee', label: 'Payees' },
];

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formatCurrency(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num) + ' DH';
}

function getInvoiceNumber(inv) {
  return inv.numero || `FA ${inv.numero_n}/${inv.annee}`;
}

export default function MyInvoices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const statut = searchParams.get('statut') || '';
  const focusId = searchParams.get('focus');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statut, column, direction]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/my/invoices', { params: { search: q, statut, ...sortParams } });
      setInvoices(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  // Top-of-page stats
  const unpaidCount = invoices.filter((i) => i.statut === 'impayee').length;
  const totalImpaye = invoices.filter((i) => i.statut === 'impayee').reduce((acc, i) => acc + Number(i.ttc || 0), 0);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const handleSearch = (value) => updateParam('q', value);

  const handleClearAll = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('statut');
    setSearchParams(next, { replace: true });
  };

  const handleStatusChange = (e) => updateParam('statut', e.target.value);

  return (
    <div>
      <PageHeader
        title="Mes Factures"
        subtitle="Consultez, telechargez et suivez vos factures."
      />

      {/* Inline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <SummaryStat
          icon={Receipt}
          label="Nombre de factures impayees"
          value={unpaidCount}
          accent="primary"
        />
        <SummaryStat
          icon={Wallet}
          label="Solde impaye"
          value={formatCurrency(totalImpaye)}
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
            placeholder="Rechercher par numero de facture..."
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
            title="Aucune facture trouvee"
            description={
              q || statut
                ? 'Aucun resultat ne correspond a vos filtres.'
                : "Aucune facture n'a ete emise a votre encontre pour le moment."
            }
          />
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <SortHeader label="Numero" col="numero_n" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Date" col="date_facture" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Echeance" col="date_echeance" currentCol={column} direction={direction} onClick={toggle} />
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
                    <td className="text-right">{formatCurrency(inv.taxable)}</td>
                    <td className="text-right">{formatCurrency(inv.tva)}</td>
                    <td className="text-right" style={{ fontWeight: 700, color: 'var(--color-graphite)' }}>
                      {formatCurrency(inv.ttc)}
                    </td>
                    <td>
                      <InvoiceStatusPill status={inv.statut} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`/api/my/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        download={`${inv.numero || `FA ${inv.numero_n}/${inv.annee}`}.pdf`}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        title="Telecharger le PDF"
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
        <p
          className="mt-3 text-center"
          style={{ fontSize: 12, color: 'var(--color-steel)' }}
        >
          {invoices.length} facture{invoices.length > 1 ? 's' : ''}
        </p>
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

function InvoiceStatusPill({ status }) {
  if (status === 'payee') {
    return (
      <span className="pill pill-success">
        <CircleCheck size={11} /> Payee
      </span>
    );
  }
  if (status === 'impayee') {
    return (
      <span className="pill pill-warning">
        <Clock size={11} /> Impayee
      </span>
    );
  }
  return <span className="pill pill-neutral">{status || '-'}</span>;
}

function SummaryStat({ icon: Icon, label, value, accent }) {
  const accents = {
    primary: { bg: 'var(--color-primary-wash)', fg: 'var(--color-primary)' },
    success: { bg: '#dcfce7', fg: '#15803d' },
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
