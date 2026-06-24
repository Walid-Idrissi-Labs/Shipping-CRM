import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Users, FileText, Receipt, ArrowUpRight,
  Truck, AlertTriangle, FileWarning, TrendingUp, Wallet,
  Route, PlusCircle, ScrollText, UserPlus,
} from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ShipmentStatusDonut from '../../components/charts/ShipmentStatusDonut';
import ServiceTypeBarChart from '../../components/charts/ServiceTypeBarChart';

const fmtMAD = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' MAD';
};

const monthDelta = (current, previous) => {
  if (!previous || previous === 0) return null;
  const delta = ((current - previous) / previous) * 100;
  return Math.round(delta);
};

function MetricCard({ label, value, icon: Icon, accent, href, trend }) {
  const body = (
    <Card style={{ padding: 20, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'var(--color-bone)',
            color: accent,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} />
        </span>
        <ArrowUpRight
          size={14}
          color="var(--color-smoke)"
          style={{ opacity: href ? 1 : 0 }}
        />
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          color: 'var(--color-graphite)',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--color-steel)',
          marginTop: 4,
        }}
      >
        {label}
      </div>
      {trend && (
        <div
          style={{
            fontSize: 11,
            color: trend.positive ? 'var(--color-vivid-green)' : 'var(--color-danger)',
            marginTop: 6,
            fontWeight: 500,
          }}
        >
          {trend.positive ? '+' : ''}{trend.percent}% vs mois precedent
        </div>
      )}
    </Card>
  );
  if (!href) return body;
  return (
    <Link to={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      {body}
    </Link>
  );
}

function Section({ title, href, hrefLabel, children, action }) {
  return (
    <Card style={{ padding: 0, height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid var(--color-ash)',
        }}
      >
        <h2 className="section-heading">{title}</h2>
        {action ?? (href && (
          <Link
            to={href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-primary)',
              textDecoration: 'none',
            }}
          >
            {hrefLabel || 'Voir tout'} <ArrowUpRight size={14} />
          </Link>
        ))}
      </div>
      <div style={{ padding: '20px 22px' }}>{children}</div>
    </Card>
  );
}

const ALERT_SEVERITY_COLOR = {
  danger: 'var(--color-danger)',
  warning: 'var(--color-warning)',
};

function FleetPill({ label, value, color }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '12px 14px',
        borderRadius: 8,
        background: 'var(--color-bone)',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-steel)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function ProviderDashboard() {
  const [stats, setStats] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/provider').catch(() => ({ data: {} })),
      api.get('/shipments?limit=10').catch(() => ({ data: { data: [] } })),
    ]).then(([s, sh]) => {
      setStats(s.data);
      setShipments(sh.data.data || []);
      setLoading(false);
    });
  }, []);

  const fleet = stats?.fleet_summary || {};
  const revenue = Number(stats?.revenue_this_month || 0);
  const prevRevenue = Number(stats?.revenue_last_month || 0);

  const rDelta = monthDelta(revenue, prevRevenue);

  const revenueTrend = rDelta != null
    ? { percent: Math.abs(rDelta), positive: rDelta >= 0 }
    : null;

  // -- Metric cards row (4)
  const metrics = [
    {
      label: 'Total Expeditions',
      value: stats?.total_shipments ?? '—',
      icon: Package,
      accent: 'var(--color-primary)',
      href: '/dashboard/expeditions',
    },
    {
      label: 'Total Clients',
      value: stats?.total_clients ?? '—',
      icon: Users,
      accent: 'var(--color-vivid-green)',
      href: '/dashboard/clients',
    },
    {
      label: 'Devis en Attente',
      value: stats?.pending_quotes ?? '—',
      icon: FileText,
      accent: 'var(--color-warning)',
      href: '/dashboard/demandes-devis',
    },
    {
      label: 'Factures Impayees',
      value: stats?.unpaid_invoices ?? '—',
      icon: Receipt,
      accent: 'var(--color-danger)',
      href: '/dashboard/factures',
    },
  ];

  const quickActions = [
    { to: '/dashboard/expeditions/nouveau', label: 'Creer une Expedition', icon: PlusCircle },
    { to: '/dashboard/factures/nouveau', label: 'Creer une Facture', icon: ScrollText },
    { to: '/dashboard/clients/nouveau', label: 'Ajouter Client', icon: UserPlus },
    { to: '/dashboard/devis/nouveau', label: 'Nouveau Devis', icon: FileText },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        eyebrow="Tableau de bord"
        title="Vue d'ensemble"
        subtitle="Activite recente et point d'entree rapide vers les actions courantes."
      />

      {/* Row 1: 4 metric cards */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        style={{ gap: 16 }}
      >
        {metrics.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            icon={m.icon}
            accent={m.accent}
            href={m.href}
          />
        ))}
      </div>

      {/* Row 2: Operations grid (alerts + fleet + ship/donut + service/bar) */}
      <div
        className="grid grid-cols-1 lg:grid-cols-3"
        style={{ gap: 16 }}
      >
        {/* Document Alerts */}
        <Card style={{ padding: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 22px',
              borderBottom: '1px solid var(--color-ash)',
            }}
          >
            <h2 className="section-heading">Documents a renouveler</h2>
            <Link
              to="/dashboard/flotte/vehicules"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-primary)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Voir flotte <ArrowUpRight size={14} />
            </Link>
          </div>
          <div style={{ padding: '12px 22px 22px' }}>
            {loading ? (
              <Skeleton height={40} />
            ) : !stats?.document_alerts?.length ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '14px 12px',
                  borderRadius: 8,
                  background: 'var(--color-success-container)',
                  color: 'var(--color-vivid-green-dark)',
                  fontSize: 13,
                }}
              >
                <FileWarning size={16} /> Tous les documents sont en regle.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.document_alerts.map((a, idx) => {
                  const color = ALERT_SEVERITY_COLOR[a.severity] || 'var(--color-warning)';
                  return (
                    <Link
                      key={idx}
                      to={`/dashboard/flotte/vehicules/${a.vehicule.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'var(--color-bone)',
                        textDecoration: 'none',
                        color: 'var(--color-graphite)',
                        borderLeft: `3px solid ${color}`,
                        transition: 'background 150ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-fog)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bone)')}
                    >
                      <AlertTriangle size={16} color={color} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {a.label} - {a.vehicule.immatriculation}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-steel)' }}>
                          {a.status === 'expired'
                            ? `Expire depuis ${Math.abs(a.days)} jours`
                            : `Expire dans ${a.days} jours`}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Shipments by status donut */}
        <Section title="Expeditions par statut" href="/dashboard/expeditions">
          {loading ? (
            <Skeleton height={180} />
          ) : (
            <ShipmentStatusDonut data={stats?.shipments_by_status || {}} />
          )}
        </Section>

        {/* Service type bar */}
        <Section title="Repartition par type de service" href="/dashboard/expeditions">
          {loading ? (
            <Skeleton height={140} />
          ) : (
            <ServiceTypeBarChart data={stats?.shipments_by_service || {}} />
          )}
        </Section>
      </div>

      {/* Row 3: Fleet at a glance + Quick actions + Revenue */}
      <div
        className="grid grid-cols-1 lg:grid-cols-3"
        style={{ gap: 16 }}
      >
        {/* Fleet at a glance */}
        <Card style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 className="section-heading">Flotte en un coup d'oeil</h2>
            <Link
              to="/dashboard/flotte"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-primary)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Truck size={14} /> Gerer
            </Link>
          </div>

          <div style={{ fontSize: 12, color: 'var(--color-steel)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
            Vehicules
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <FleetPill label="Disponibles" value={fleet.available_vehicles ?? 0} color="var(--color-vivid-green)" />
            <FleetPill label="En mission" value={fleet.mission_vehicles ?? 0} color="var(--color-warning)" />
            <FleetPill label="Maintenance" value={fleet.maintenance_vehicles ?? 0} color="var(--color-olive-gray)" />
          </div>

          <div style={{ fontSize: 12, color: 'var(--color-steel)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
            Chauffeurs
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <FleetPill label="Actifs" value={fleet.available_drivers ?? 0} color="var(--color-vivid-green)" />
            <FleetPill label="En mission" value={fleet.mission_drivers ?? 0} color="var(--color-warning)" />
            <FleetPill label="En conge" value={fleet.leave_drivers ?? 0} color="var(--color-primary)" />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Link
              to="/dashboard/flotte/affectations"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--color-primary-wash)',
                textDecoration: 'none',
                color: 'var(--color-graphite)',
                border: '1px solid var(--color-primary-glow)',
              }}
            >
              <Route size={16} color="var(--color-primary)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--color-steel)' }}>Missions du jour</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{stats?.missions_today ?? 0}</div>
              </div>
            </Link>
            <Link
              to="/dashboard/expeditions"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--color-bone)',
                textDecoration: 'none',
                color: 'var(--color-graphite)',
              }}
            >
              <Package size={16} color="var(--color-olive-gray)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--color-steel)' }}>Non affectees</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{stats?.unassigned_count ?? 0}</div>
              </div>
            </Link>
          </div>
        </Card>

        {/* Quick actions */}
        <Card style={{ padding: 22 }}>
          <h2 className="section-heading" style={{ marginBottom: 16 }}>Actions rapides</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quickActions.map((ac) => {
              const Icon = ac.icon;
              return (
                <Link
                  key={ac.to}
                  to={ac.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: 'var(--color-bone)',
                    textDecoration: 'none',
                    color: 'var(--color-graphite)',
                    fontSize: 14,
                    fontWeight: 500,
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-fog)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bone)')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <Icon size={16} color="var(--color-olive-gray)" />
                    {ac.label}
                  </span>
                  <ArrowUpRight size={14} color="var(--color-steel)" />
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Revenue card */}
        <Card style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Wallet size={16} color="var(--color-olive-gray)" />
            <h2 className="section-heading">Performance financiere</h2>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--color-steel)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Chiffre d'affaires ce mois
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: 'var(--color-graphite)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                marginTop: 6,
              }}
            >
              {stats ? fmtMAD(revenue) : <Skeleton height={32} width={160} />}
            </div>
            {revenueTrend && (
              <div
                style={{
                  fontSize: 12,
                  color: revenueTrend.positive ? 'var(--color-vivid-green)' : 'var(--color-danger)',
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                {revenueTrend.positive ? '+' : '-'}{revenueTrend.percent}% vs mois precedent
              </div>
            )}
          </div>

          <div
            style={{
              paddingTop: 14,
              borderTop: '1px solid var(--color-ash)',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-steel)' }}>Mois precedent</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-graphite)' }}>
                {stats ? fmtMAD(prevRevenue) : <Skeleton height={20} width={120} />}
              </div>
            </div>
            <TrendingUp
              size={20}
              color={revenue > prevRevenue ? 'var(--color-vivid-green)' : 'var(--color-olive-gray)'}
            />
          </div>

          <Link
            to="/dashboard/factures"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 8,
              background: 'var(--color-danger-container)',
              textDecoration: 'none',
              color: 'var(--color-danger)',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Receipt size={16} /> Impaye a recouvrer
            </span>
            <span style={{ fontFamily: 'monospace' }}>
              {stats ? fmtMAD(stats.unpaid_invoices_total) : <Skeleton height={16} width={80} />}
            </span>
          </Link>
        </Card>
      </div>

      {/* Row 4: Recent shipments */}
      <Card style={{ padding: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-ash)',
          }}
        >
          <h2 className="section-heading">Expeditions recentes</h2>
          <Link
            to="/dashboard/expeditions"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-primary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Voir tout <ArrowUpRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <Skeleton height={16} width="60%" />
              </div>
            ))}
          </div>
        ) : shipments.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Aucune expedition pour l'instant"
            description="Commencez par creer votre premiere expedition pour la voir apparaitre ici."
            actionLabel="Creer une Expedition"
            actionTo="/dashboard/expeditions/nouveau"
          />
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <th>Numero</th>
                <th>Date</th>
                <th>Client</th>
                <th>Destinataire</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link
                      to={`/dashboard/expeditions/${s.id}`}
                      className="font-mono-data"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {s.shipping_number}
                    </Link>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                  <td style={{ color: 'var(--color-graphite)' }}>{s.client?.full_name || 'Client Divers'}</td>
                  <td>{s.recipient_name}</td>
                  <td><StatusBadge status={s.statut_actuel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
