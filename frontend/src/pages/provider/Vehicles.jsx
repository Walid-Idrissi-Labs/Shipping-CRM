import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Truck, AlertTriangle, Clock, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import SortHeader from '../../components/ui/SortHeader';
import { useColumnSort } from '../../hooks/useColumnSort';
import { useToast } from '../../contexts/ToastContext';
import { useDialog } from '../../contexts/DialogContext';
import TruckLoader from '../../components/ui/TruckLoader';

const TYPE_LABELS = {
  camionnette_fourgon_leger: 'Camionnette',
  fourgon_grand_volume: 'Fourgon grand volume',
  camion_porteur: 'Camion porteur',
  semi_remorque_tracteur: 'Semi-remorque',
  vehicule_frigorifique: 'Frigorifique',
  moto_scooter: 'Moto/Scooter',
  utilitaire_bache_plateau: 'Bache/Plateau',
};

const DOC_FIELDS = [
  { field: 'exp_controle_technique', label: 'CT' },
  { field: 'exp_assurance', label: 'ASSUR' },
  { field: 'exp_carte_grise', label: 'CG' },
];

function DocBadges({ vehicule }) {
  const today = new Date();
  return (
    <div className="flex flex-wrap" style={{ gap: 4 }}>
      {DOC_FIELDS.map(({ field, label }) => {
        if (!vehicule[field]) return <span key={field} style={{ fontSize: 11, color: 'var(--color-smoke)' }}>-</span>;
        const diffDays = Math.floor((new Date(vehicule[field]) - today) / (1000 * 60 * 60 * 24));
        const isExpired = diffDays < 0;
        const isExpiring = diffDays >= 0 && diffDays <= 30;
        if (isExpired) {
          return (
            <span key={field} className="pill pill-danger" title={`Expire le ${vehicule[field]}`}>
              <AlertTriangle size={10} /> {label}
            </span>
          );
        }
        if (isExpiring) {
          return (
            <span key={field} className="pill pill-warning" title={`Expire le ${vehicule[field]}`}>
              <Clock size={10} /> {label}
            </span>
          );
        }
        return (
          <span key={field} className="pill pill-success" title={`Expire le ${vehicule[field]}`}>
            {label}
          </span>
        );
      })}
    </div>
  );
}

export default function Vehicles() {
  const [vehicules, setVehicules] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { column, direction, toggle, params: sortParams } = useColumnSort('immatriculation', 'asc');
  const toast = useToast();
  const dialog = useDialog();

  const fetchVehicules = async () => {
    setLoading(true);
    try {
      const params = { ...sortParams };
      if (search) params.search = search;
      if (filter) params.statut = filter;
      const { data } = await api.get('/vehicles', { params });
      setVehicules(data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchVehicules, 250);
    return () => clearTimeout(t);
  }, [search, filter, column, direction]);

  const handleDelete = async (v) => {
    const ok = await dialog.confirm({
      title: `Supprimer le vehicule ${v.immatriculation} ?`,
      description: 'Le vehicule sera retire de la flotte et detache de toute affectation en cours.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      safetyGate: true,
      requiredInput: 'supprimer',
      inputLabel: 'Tapez supprimer pour confirmer',
    });
    if (!ok) return;
    try {
      await api.delete(`/vehicles/${v.id}`);
      toast.push(`Vehicule ${v.immatriculation} supprime`, 'success');
      fetchVehicules();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Vehicules"
        subtitle="Gestion de la flotte de vehicules"
        actionLabel="Nouveau Vehicule"
        actionTo="/dashboard/flotte/vehicules/nouveau"
        actionIcon={Truck}
        breadcrumbs={[{ label: 'Flotte', to: '/dashboard/flotte' }, { label: 'Vehicules' }]}
      />

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div className="flex flex-col sm:flex-row" style={{ gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-smoke)' }}
            />
            <input
              type="text"
              placeholder="Rechercher (immat, marque)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="select" style={{ maxWidth: 220 }}>
            <option value="">Tous les statuts</option>
            <option value="disponible">Disponible</option>
            <option value="en_mission">En mission</option>
            <option value="en_maintenance">En maintenance</option>
            <option value="hors_service">Hors service</option>
          </select>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-clean" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <SortHeader label="Immatriculation" col="immatriculation" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Vehicule" col="marque_modele" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Type" col="type_vehicule" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Statut" col="statut" currentCol={column} direction={direction} onClick={toggle} />
                <th>Documents</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center' }}>
                    <TruckLoader />
                  </td>
                </tr>
              ) : vehicules.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--color-steel)' }}>
                    Aucun vehicule
                  </td>
                </tr>
              ) : (
                vehicules.map((v) => (
                  <tr key={v.id}>
                    <td className="font-mono-data" style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
                      <Link to={`/dashboard/flotte/vehicules/${v.id}`} style={{ color: 'inherit' }}>
                        {v.immatriculation}
                      </Link>
                    </td>
                    <td>
                      <div style={{ color: 'var(--color-graphite)', fontWeight: 500 }}>{v.marque_modele || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-steel)' }}>
                        {[v.couleur, v.annee_circulation].filter(Boolean).join(' - ') || ''}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--color-iron)' }}>
                      {TYPE_LABELS[v.type_vehicule] || v.type_vehicule}
                    </td>
                    <td>
                      <span className={`pill ${v.statut === 'disponible' ? 'pill-success' : v.statut === 'en_mission' ? 'pill-warning' : v.statut === 'en_maintenance' ? 'pill-neutral' : 'pill-danger'}`}>
                        {v.statut.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td><DocBadges vehicule={v} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end" style={{ gap: 4 }}>
                        <Link to={`/dashboard/flotte/vehicules/${v.id}`} className="btn-icon" title="Voir">
                          <Search size={16} />
                        </Link>
                        {v.statut !== 'en_mission' && (
                          <button onClick={() => handleDelete(v)} className="btn-icon" title="Supprimer">
                            <Trash2 size={16} color="var(--color-danger)" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
