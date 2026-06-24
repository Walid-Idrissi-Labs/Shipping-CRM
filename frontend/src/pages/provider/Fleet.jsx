import { useEffect, useState } from 'react';
import { useApiFetch } from '../../hooks/useApiFetch';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import { Truck, User, AlertTriangle, Calendar, ArrowUpRight } from 'lucide-react';
import Skeleton from '../../components/ui/Skeleton';
import TruckLoader from '../../components/ui/TruckLoader';
import StatusBadge from '../../components/ui/StatusBadge';
import { VehicleKanban, DriverKanban } from '../../components/FleetKanban';
import { useToast } from '../../contexts/ToastContext';

const VEHICLE_LABELS = {
  disponible: 'Disponible',
  en_mission: 'En mission',
  en_maintenance: 'En maintenance',
  hors_service: 'Hors service',
};
const DRIVER_LABELS = {
  actif: 'Actif', en_mission: 'En mission', en_conge: 'En conge',
};

const fetchFleet = () => api.get('/dashboard/fleet').then((r) => r.data);

export default function FleetDashboard() {
  const { data, loading, error } = useApiFetch(fetchFleet, []);
  const toast = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    if (data) {
      const sortBy = (key) => (a, b) => (a[key] || '').localeCompare(b[key] || '');
      const setV = [...(data.vehicles || [])].sort(sortBy('immatriculation'));
      const setD = [...(data.drivers || [])].sort(sortBy('nom_complet'));
      setVehicles(setV);
      setDrivers(setD);
    }
  }, [data]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Flotte" subtitle="Tableau de bord de la flotte" />
        <Card style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
          <TruckLoader />
        </Card>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div>
        <PageHeader title="Flotte" subtitle="Tableau de bord de la flotte" />
        <Card style={{ padding: 32, textAlign: 'center', color: 'var(--color-danger)' }}>
          Erreur de chargement.
        </Card>
      </div>
    );
  }

  const handleStatusChange = async (type, id, newStatus) => {
    const setter = type === 'vehicle' ? setVehicles : setDrivers;
    const sortKey = type === 'vehicle' ? 'immatriculation' : 'nom_complet';
    const endpoint = type === 'vehicle'
      ? `/vehicles/${id}`
      : `/drivers/${id}`;
    let previous = null;
    setter((prev) => {
      previous = prev;
      const updated = prev.map((item) => (item.id === id ? { ...item, statut: newStatus } : item));
      return updated.sort((a, b) => (a[sortKey] || '').localeCompare(b[sortKey] || ''));
    });
    try {
      await api.patch(endpoint, { statut: newStatus });
      toast.push('Statut mis a jour', 'success');
    } catch (err) {
      setter(previous);
      toast.push(err.response?.data?.message || 'Erreur lors de la mise a jour.', 'error');
    }
  };
  const totalVehicles = Object.values(data.vehicles_by_status).reduce((a, b) => a + b, 0);
  const totalDrivers = Object.values(data.drivers_by_status).reduce((a, b) => a + b, 0);
  const expiringSoon = data.document_alerts.filter((a) => a.status === 'expiring_soon').length;
  const expired = data.document_alerts.filter((a) => a.status === 'expired').length;

  return (
    <div>
      <PageHeader
        eyebrow="Flotte"
        title="Tableau de bord"
        subtitle="Vue d'ensemble vehicules, chauffeurs et alertes"
      />

      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 16, marginBottom: 24 }}>
        <StatCard
          icon={Truck}
          label="Vehicules"
          primary={data.vehicles_by_status.disponible || 0}
          secondary={`${totalVehicles} total`}
          accent="var(--color-vivid-green-dark)"
        />
        <StatCard
          icon={User}
          label="Chauffeurs"
          primary={data.drivers_by_status.actif || 0}
          secondary={`${totalDrivers} total`}
          accent="var(--color-primary)"
        />
        <StatCard
          icon={Calendar}
          label="Missions du jour"
          primary={data.today_missions.length}
          secondary={
            data.unassigned_shipments_count > 0
              ? `${data.unassigned_shipments_count} expeditions non affectees`
              : 'Aucune en attente'
          }
          accent="var(--color-primary)"
        />
        <StatCard
          icon={AlertTriangle}
          label="Documents"
          primary={expired}
          secondary={`${expiringSoon} expirent sous 30j`}
          accent="var(--color-danger)"
        />
      </div>

      <div className="grid md:grid-cols-2" style={{ gap: 16, marginBottom: 24 }}>
        <Card>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <h3 className="section-heading">Statut vehicules</h3>
            <Link to="/dashboard/flotte/vehicules" className="flex items-center" style={{ fontSize: 13, color: 'var(--color-primary)' }}>
              Gerer <ArrowUpRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(data.vehicles_by_status).map(([key, count]) => (
              <div key={key} className="flex items-center justify-between">
                <StatusBadge status={key} variant="left">{VEHICLE_LABELS[key]}</StatusBadge>
                <span style={{ fontWeight: 500, color: 'var(--color-graphite)' }}>{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <h3 className="section-heading">Statut chauffeurs</h3>
            <Link to="/dashboard/flotte/chauffeurs" className="flex items-center" style={{ fontSize: 13, color: 'var(--color-primary)' }}>
              Gerer <ArrowUpRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(data.drivers_by_status).map(([key, count]) => (
              <div key={key} className="flex items-center justify-between">
                <StatusBadge status={key} variant="left">{DRIVER_LABELS[key]}</StatusBadge>
                <span style={{ fontWeight: 500, color: 'var(--color-graphite)' }}>{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom: 24, paddingTop: 8 }}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 16 , marginLeft : 20 , marginTop : 10}}>
          <AlertTriangle size={18} color="var(--color-danger)" style={{ marginTop: 0 }} />
          <h3 className="section-heading">Alertes documents</h3>
        </div>
        {data.document_alerts.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--color-steel)', padding: 12 }}>Aucun document a renouveler</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.document_alerts.map((alert, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between flex-wrap"
                style={{
                  padding: 16,
                  borderRadius: 6,
                  background: alert.status === 'expired' ? 'var(--color-danger-container)' : 'var(--color-warning-container)',
                  gap: 12,
                }}
              >
                <div className="flex items-center" style={{ gap: 8 }}>
                  <Link to={`/dashboard/flotte/vehicules/${alert.vehicule.id}`} style={{ fontWeight: 500, color: 'var(--color-graphite)' }}>
                    <span className="font-mono-data">{alert.vehicule.immatriculation}</span>
                  </Link>
                  <span style={{ fontSize: 13, color: 'var(--color-iron)' }}>- {alert.vehicule.marque_modele}</span>
                </div>
                <div className="flex items-center" style={{ gap: 8, fontSize: 13 }}>
                  <span className="font-mono-data">{alert.type.replace(/_/g, ' ')}</span>
                  <span className={`pill ${alert.status === 'expired' ? 'pill-danger' : 'pill-warning'}`}>
                    {alert.status === 'expired'
                      ? `Expire (${Math.abs(alert.days)}j)`
                      : `${alert.days}j restants`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <Calendar size={18} color="var(--color-primary)" />
            <h3 className="section-heading">Missions du jour</h3>
          </div>
          <Link to="/dashboard/flotte/affectations" className="flex items-center" style={{ fontSize: 13, color: 'var(--color-primary)' }}>
            Voir toutes <ArrowUpRight size={14} />
          </Link>
        </div>
        {data.today_missions.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--color-steel)', padding: 12 }}>Aucune mission prevue aujourd'hui</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.today_missions.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between flex-wrap"
                style={{
                  padding: 14,
                  borderRadius: 6,
                  border: '1px solid var(--color-ash)',
                  gap: 12,
                }}
              >
                <div className="min-w-0">
                  <div style={{ fontWeight: 500, color: 'var(--color-graphite)' }}>
                    {m.ville_depart} → {m.ville_arrivee || 'N/A'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-steel)', marginTop: 4 }}>
                    <span className="font-mono-data">
                      {new Date(m.date_heure_depart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {m.chauffeur && <span> · {m.chauffeur.nom_complet}</span>}
                    {m.vehicule && <span> · <span className="font-mono-data">{m.vehicule.immatriculation}</span></span>}
                  </div>
                </div>
                <StatusBadge status={m.statut} variant="left" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: 24 , marginTop : 40}}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 20 , marginLeft : 26 , marginTop : 25}}>
          <Truck size={20} color="var(--color-primary)" />
          <h3 className="section-heading">Vehicules (Kanban)</h3>
        </div>
        <div style={{ 
          padding: '0 16px' , 
        }}>
          <VehicleKanban vehicles={vehicles} onStatusChange={handleStatusChange} />
        </div>
      </Card>

      <Card style={{ marginBottom: 24 , marginTop : 40}}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 16 , marginLeft : 26 , marginTop : 25}}>
          <User size={18} color="var(--color-primary)" />
          <h3 className="section-heading">Chauffeurs (Kanban)</h3>
        </div>
        <div style={{ padding: '0 16px' }}>
          <DriverKanban drivers={drivers} onStatusChange={handleStatusChange} />
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, primary, secondary, accent }) {
  return (
    <Card style={{ padding: 20 }}>
      <div className="flex items-start justify-between" style={{ marginBottom: 12 }}>
        <span
          className="flex items-center justify-center"
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--color-bone)',
            color: accent,
          }}
        >
          <Icon size={18} />
        </span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--color-graphite)', letterSpacing: '-0.01em' }}>
        {primary}
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-steel)', marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--color-smoke)', marginTop: 6 }}>{secondary}</div>
    </Card>
  );
}
