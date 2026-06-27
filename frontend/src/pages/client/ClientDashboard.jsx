import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, Receipt, Wallet,
  ArrowUpRight, CircleCheck, Clock,
  ChevronRight, FileText, FileCheck2, Truck, Plus, UserRoundCog, Box,
} from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatCurrency(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num) + ' DH';
}

export default function ClientDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/client')
      .then(({ data }) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const ongoingShipments = stats?.ongoing_shipments || [];
  const unpaidInvoices = stats?.unpaid_invoices || [];
  const lastShipmentDate = ongoingShipments[0]?.created_at;
  const clientName = stats?.full_name || '';

  const greeting = hourGreeting();
  const greetingTitle = clientName ? `${greeting} ${clientName}` : greeting;

  return (
    <div>
      <PageHeader
        eyebrow="Espace Client"
        title={greetingTitle}
        style={{ paddingBottom: 44 , marginBottom : 24 }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          loading={loading}
          icon={Package}
          label="Expeditions en Cours"
          value={loading ? null : (stats?.total_shipments ?? 0)}
          accentColor="primary"
          href="/client/mes-expeditions"
        />
        <StatCard
          loading={loading}
          icon={Receipt}
          label="Factures en attente"
          value={loading ? null : (stats?.total_invoices ?? 0)}
          accentColor="iron"
          href="/client/mes-factures?statut=impayee"
        />
        <StatCard
          loading={loading}
          icon={Wallet}
          label="Solde Impaye"
          value={loading ? null : formatCurrency(stats?.unpaid_total ?? 0)}
          accentColor="danger"
          href="/client/mes-factures?statut=impayee"
          isCurrency
        />
        <StatCard
          loading={loading}
          icon={Clock}
          label="Derniere Activite"
          value={loading ? null : formatDate(lastShipmentDate)}
          accentColor="success"
          isDate
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Ongoing Shipments */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div
            className="flex items-center justify-between p-5"
            style={{ borderBottom: '1px solid var(--color-ash)' }}
          >
            <div>
              <h3 className="section-heading flex items-center gap-2">
                <Truck size={18} style={{ color: 'var(--color-primary)' }} />
                Expeditions en Cours
              </h3>
              <p style={{ fontSize: 12, color: 'var(--color-steel)', marginTop: 4 }}>
                Les expeditions actuellement en cours.
              </p>
            </div>
            <Link
              to="/client/mes-expeditions"
              style={{ fontSize: 13, fontWeight: 500 }}
              className="flex items-center gap-1 hover:gap-2 transition-all"
            >
              Voir tout <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: 24 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <Skeleton height={16} width="65%" />
                </div>
              ))}
            </div>
          ) : ongoingShipments.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Aucune expedition en cours"
              description="Vous pouvez creer une nouvelle expedition ou suivre l'etat de vos colis depuis ce tableau de bord."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>Numero</th>
                    <th>Destinataire</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ongoingShipments.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/client/mes-expeditions/${s.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="font-mono-data">
                        <Link
                          to={`/client/mes-expeditions/${s.id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: 'var(--color-primary)', fontWeight: 500 }}
                        >
                          {s.shipping_number}
                        </Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{s.recipient_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-steel)' }}>
                          {s.recipient_city}, {s.recipient_country}
                        </div>
                      </td>
                      <td><StatusBadge status={s.statut_actuel} /></td>
                      <td>{formatDate(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <div className="flex flex-col gap-3">
          <h3 className="section-heading">Acces rapide</h3>
          <QuickActionCard
            to="/client/mes-expeditions"
            icon={Box}
            title="Toutes mes expeditions"
            description="Liste complete avec filtres et recherche."
            accent="primary"
          />
          <QuickActionCard
            to="/client/expeditions/nouveau"
            icon={Plus}
            title="Nouvelle expedition"
            description="Creer un nouvel envoi."
            accent="primary"
          />
          <QuickActionCard
            to="/client/devis"
            icon={FileCheck2}
            title="Mes devis"
            description="Consulter vos devis et demandes."
            accent="info"
          />
          <QuickActionCard
            to="/client/mes-factures"
            icon={FileText}
            title="Mes factures"
            description="Telechargez vos factures PDF."
            accent="info"
          />
          <QuickActionCard
            to="/client/mon-compte"
            icon={UserRoundCog}
            title="Mon compte"
            description="Modifier mes informations."
            accent="neutral"
          />
          {/* <QuickActionCard
            to="/suivi"
            icon={Plus}
            title="Suivi public"
            description="Suivre un colis sans se connecter."
            accent="neutral"
          /> */}
        </div>
      </div>

      {/* Unpaid Invoices */}
      <Card className="overflow-hidden">
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid var(--color-ash)' }}
        >
          <div>
            <h3 className="section-heading flex items-center gap-2">
              <Receipt size={18} style={{ color: 'var(--color-primary)' }} />
              Factures en Attente
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-steel)', marginTop: 4 }}>
              Les factures en attente de reglement.
            </p>
          </div>
          <Link
            to="/client/mes-factures?statut=impayee"
            style={{ fontSize: 13, fontWeight: 500 }}
            className="flex items-center gap-1 hover:gap-2 transition-all"
          >
            Voir tout <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <Skeleton height={16} width="55%" />
              </div>
            ))}
          </div>
        ) : unpaidInvoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Aucune facture en attente"
            description="Aucune facture n'est en attente de reglement pour le moment."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Date</th>
                  <th>Montant TTC</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
                <tbody>
                  {unpaidInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/client/mes-factures/${inv.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="font-mono-data">
                      <Link
                        to={`/client/mes-factures/${inv.id}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: 'var(--color-primary)', fontWeight: 500 }}
                      >
                        {inv.numero || `FA ${inv.numero_n}/${inv.annee}`}
                      </Link>
                    </td>
                    <td>{formatDate(inv.date_facture)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(inv.ttc)}</td>
                    <td>
                      <InvoiceStatusPill status={inv.statut} />
                    </td>
                    <td>
                      <a
                        href={`/api/my/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="btn btn-ghost"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accentColor, href, loading, isCurrency, isDate }) {
  const colorMap = {
    primary: { bg: 'var(--color-primary-wash)', fg: 'var(--color-primary)' },
    success: { bg: '#dcfce7', fg: '#15803d' },
    danger: { bg: 'var(--color-danger-container)', fg: 'var(--color-danger)' },
    iron: { bg: 'var(--color-bone)', fg: 'var(--color-graphite)' },
  };
  const colors = colorMap[accentColor] || colorMap.primary;

  return (
    <Card className="p-5 transition-all" style={{ height: '100%' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
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
          {loading ? (
            <div style={{ marginTop: 8 }}>
              <Skeleton height={isCurrency ? 22 : 24} width={isCurrency ? 110 : 80} />
            </div>
          ) : (
            <p
              style={{
                fontSize: isDate ? 18 : 28,
                fontWeight: 600,
                color: 'var(--color-graphite)',
                marginTop: 6,
                lineHeight: 1.1,
              }}
              className="truncate"
            >
              {value}
            </p>
          )}
        </div>
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 40, height: 40, borderRadius: 9999,
            background: colors.bg, color: colors.fg,
          }}
        >
          <Icon size={20} />
        </div>
      </div>
      {href && !loading && (
        <Link
          to={href}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: 'var(--color-primary)', marginTop: 12,
            fontWeight: 500,
          }}
        >
          Voir <ArrowUpRight size={12} />
        </Link>
      )}
    </Card>
  );
}

function QuickActionCard({ to, icon: Icon, title, description, accent }) {
  const accents = {
    primary: { bg: 'var(--color-primary-wash)', fg: 'var(--color-primary)' },
    info: { bg: '#e0f2fe', fg: '#0369a1' },
    neutral: { bg: 'var(--color-bone)', fg: 'var(--color-graphite)' },
  };
  const a = accents[accent] || accents.primary;
  return (
    <Link to={to} className="block" style={{ textDecoration: 'none' }}>
      <Card className="p-4 transition-all hover:shadow-md hover:scale-[1.02]" style={{ cursor: 'pointer' }}>
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: a.bg, color: a.fg,
            }}
          >
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p style={{ fontWeight: 500, color: 'var(--color-graphite)', fontSize: 14 }}>{title}</p>
            <p style={{ fontSize: 12, color: 'var(--color-steel)', marginTop: 2 }}>{description}</p>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--color-smoke)' }} className="shrink-0" />
        </div>
      </Card>
    </Link>
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

function hourGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon apres-midi';
  return 'Bonsoir';
}
