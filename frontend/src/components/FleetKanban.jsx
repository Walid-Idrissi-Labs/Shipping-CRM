import { useNavigate } from 'react-router-dom';
import KanbanBoard from './KanbanBoard';

const VEHICLE_STATUSES = {
  disponible: 'Disponible',
  en_mission: 'En mission',
  en_maintenance: 'En maintenance',
  hors_service: 'Hors service',
};

const DRIVER_STATUSES = {
  actif: 'Actif',
  en_mission: 'En mission',
  en_conge: 'En conge',
};

const VehicleCard = ({ vehicle }) => (
  <div>
    <div
      className="font-mono-data"
      style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}
    >
      {vehicle.immatriculation}
    </div>
    <div style={{ fontSize: 12, color: 'var(--color-iron)', marginTop: 2 }}>
      {vehicle.marque_modele}
    </div>
  </div>
);

const DriverCard = ({ driver }) => (
  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-graphite)' }}>
    {driver.nom_complet}
  </div>
);

const isNotInMission = (item) => item?.statut !== 'en_mission';

export function VehicleKanban({ vehicles, onStatusChange }) {
  const navigate = useNavigate();
  const sorted = [...vehicles].sort((a, b) =>
    (a.immatriculation || '').localeCompare(b.immatriculation || '')
  );
  const columns = Object.keys(VEHICLE_STATUSES).map((key) => ({
    id: key,
    title: VEHICLE_STATUSES[key],
    items: sorted.filter((v) => v.statut === key),
  }));

  return (
    <KanbanBoard
      columns={columns}
      isDraggable={isNotInMission}
      onDragEnd={(vehicleId, newStatus) => onStatusChange('vehicle', vehicleId, newStatus)}
      renderCard={(vehicle) => <VehicleCard vehicle={vehicle} />}
      onCardClick={(vehicle) => navigate(`/dashboard/flotte/vehicules/${vehicle.id}`)}
    />
  );
}

export function DriverKanban({ drivers, onStatusChange }) {
  const navigate = useNavigate();
  const sorted = [...drivers].sort((a, b) =>
    (a.nom_complet || '').localeCompare(b.nom_complet || '')
  );
  const columns = Object.keys(DRIVER_STATUSES).map((key) => ({
    id: key,
    title: DRIVER_STATUSES[key],
    items: sorted.filter((d) => d.statut === key),
  }));

  return (
    <KanbanBoard
      columns={columns}
      isDraggable={isNotInMission}
      onDragEnd={(driverId, newStatus) => onStatusChange('driver', driverId, newStatus)}
      renderCard={(driver) => <DriverCard driver={driver} />}
      onCardClick={(driver) => navigate(`/dashboard/flotte/chauffeurs/${driver.id}`)}
    />
  );
}
