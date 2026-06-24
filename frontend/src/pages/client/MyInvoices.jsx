import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, FileDown, CircleCheck, Clock, Receipt, Wallet } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SortHeader from '../../components/ui/SortHeader';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('statut') || '';
  const initialQ = searchParams.get('q') || '';
  const focusId = searchParams.get('focus');

  const [invoices, setInvoices] = useState([]);
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState(initialQ);
  const [loading, setLoading] = useState(true);
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    const params = { ...sortParams };
    if (status) params.statut = status;
    if (search) params.search = search;

    const sp = { statut: status, q: search };
    if (sortParams.sort_by) sp.sort_by = sortParams.sort_by;
    if (sortParams.sort_dir) sp.sort_dir = sortParams.sort_dir;
    setSearchParams(sp, { replace: true });

    setLoading(true);
    const t = setTimeout(() => {
      api.get('/my/invoices', { params })
        .then(({ data }) => {
          setInvoices(data.data || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 250);

    return () => clearTimeout(t);
  }, [status, search, column, direction]);

  // Top-of-page stats
  const totalTtc = invoices.reduce((acc, i) => acc + Number(i.ttc || 0), 0);
  const totalPaye = invoices.filter((i) => i.statut === 'payee').reduce((acc, i) => acc + Number(i.ttc || 0), 0);
  const totalImpaye = invoices.filter((i) => i.statut === 'impayee').reduce((acc, i) => acc + Number(i.ttc || 0), 0);

  const handleClearFilters = () => {
    setStatus('');
    setSearch('');
  };

  return (
    <div>
      <PageHeader
        eyebrow="Espace Client"
        title="Mes Factures"
        subtitle="Consultez, telechargez et suivez vos factures."
      />

      {/* Inline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <SummaryStat
          icon={Receipt}
          label="Total facture"
          value={formatCurrency(totalTtc)}
          accent="primary"
        />
        <SummaryStat
          icon={CircleCheck}
          label="Total paye"
          value={formatCurrency(totalPaye)}
          accent="success"
        />
        <SummaryStat
          icon={Wallet}
          label="Solde impaye"
          value={formatCurrency(totalImpaye)}
          accent="danger"
        />
      </div>

      {/* Filter Bar */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: 12, color: 'var(--color-smoke)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par numero de facture..."
              className="input"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="select"
            style={{ maxWidth: 220, minWidth: 160 }}
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {(search || status) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn-ghost"
              style={{ padding: '8px 14px' }}
            >
              Reinitialiser
            </button>
          )}
        </div>

        <div
          className="flex items-center gap-2 mt-3"
          style={{ fontSize: 12, color: 'var(--color-steel)' }}
        >
          <Receipt size={13} />
          <span>
            {loading ? 'Chargement...' : `${invoices.length} facture${invoices.length > 1 ? 's' : ''}`}
          </span>
        </div>
      </Card>

      {/* Invoices Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <Skeleton height={18} width="75%" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Aucune facture trouvee"
            description={
              search || status
                ? "Aucun resultat ne correspond a vos filtres."
                : "Aucune facture n'a ete emise a votre encontre pour le moment."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-clean">
              <thead>
                <tr>
                  <SortHeader label="Numero" col="numero_n" currentCol={column} direction={direction} onClick={toggle} />
                  <SortHeader label="Date" col="created_at" currentCol={column} direction={direction} onClick={toggle} />
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
                      style={
                        focused
                          ? { background: 'var(--color-primary-wash)' }
                          : undefined
                      }
                    >
                      <td className="font-mono-data">
                        <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                          {getInvoiceNumber(inv)}
                        </span>
                      </td>
                      <td>{formatDate(inv.date_facture)}</td>
                      <td>{formatDate(inv.date_echeance)}</td>
                      <td className="text-right">{formatCurrency(inv.ht)}</td>
                      <td className="text-right">{formatCurrency(inv.tva)}</td>
                      <td className="text-right" style={{ fontWeight: 700, color: 'var(--color-graphite)' }}>
                        {formatCurrency(inv.ttc)}
                      </td>
                      <td>
                        <InvoiceStatusPill status={inv.statut} />
                      </td>
                      <td>
                        <a
                          href={`/api/my/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          download={`${inv.numero || `FA ${inv.numero_n}/${inv.annee}`}.pdf`}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          title="Telecharger le PDF"
                        >
                          <FileDown size={16} /> PDF
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p
        className="mt-6 text-center"
        style={{ fontSize: 12, color: 'var(--color-steel)' }}
      >
        Pour toute question concernant vos factures, merci de contacter votre prestataire.
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
