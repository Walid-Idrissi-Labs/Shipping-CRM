import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, Trash2, User, UserPlus } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import SortHeader from '../../components/ui/SortHeader';
import SearchInput from '../../components/ui/SearchInput';
import { useColumnSort } from '../../hooks/useColumnSort';
import { useToast } from '../../contexts/ToastContext';
import { useDialog } from '../../contexts/DialogContext';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const TYPE_LABELS_SHORT = {
  camionnette_fourgon_leger: 'Camionnette',
  fourgon_grand_volume: 'Fourgon g.',
  camion_porteur: 'Camion',
  semi_remorque_tracteur: 'Semi',
  vehicule_frigorifique: 'Frigo',
  moto_scooter: 'Moto',
  utilitaire_bache_plateau: 'Bache',
};

export default function Drivers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const statut = searchParams.get('statut') || '';
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { column, direction, toggle, params: sortParams } = useColumnSort('nom_complet', 'asc');
  const toast = useToast();
  const dialog = useDialog();

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const params = { ...sortParams };
      if (q) params.search = q;
      if (statut) params.statut = statut;
      const { data } = await api.get('/drivers', { params });
      setDrivers(data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statut, column, direction]);

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

  const handleDelete = async (d) => {
    const ok = await dialog.confirm({
      title: `Supprimer ${d.nom_complet} ?`,
      description: 'Le chauffeur sera retire du planning et de toutes les affectations a venir.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      safetyGate: true,
      requiredInput: 'supprimer',
      inputLabel: 'Tapez supprimer pour confirmer',
    });
    if (!ok) return;
    try {
      await api.delete(`/drivers/${d.id}`);
      toast.push(`${d.nom_complet} supprime`, 'success');
      fetchDrivers();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Chauffeurs"
        subtitle="Gestion du personnel de conduite"
        actionLabel="Nouveau Chauffeur"
        actionTo="/dashboard/flotte/chauffeurs/nouveau"
        actionIcon={UserPlus}
        breadcrumbs={[{ label: 'Flotte', to: '/dashboard/flotte' }, { label: 'Chauffeurs' }]}
      />

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div className="flex flex-col sm:flex-row" style={{ gap: 12, alignItems: 'center' }}>
          <SearchInput value={q} onSearch={handleSearch} onClear={handleClearAll} loading={loading} placeholder="Rechercher (nom, telephone, email)..." style={{ maxWidth: 420 }} />
          <select value={statut} onChange={(e) => updateParam('statut', e.target.value)} className="select" style={{ maxWidth: 220 }}>
            <option value="">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="en_mission">En mission</option>
            <option value="en_conge">En conge</option>
          </select>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <Skeleton height={20} width="40%" />
              </div>
            ))}
          </div>
        ) : drivers.length === 0 ? (
          <EmptyState icon={User} title="Aucun chauffeur" description="Aucun chauffeur pour cette recherche." />
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <SortHeader label="Nom" col="nom_complet" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Telephone" col="telephone" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Email" col="email" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Statut" col="statut" currentCol={column} direction={direction} onClick={toggle} />
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500, color: 'var(--color-graphite)' }}>
                    <Link to={`/dashboard/flotte/chauffeurs/${d.id}`} style={{ color: 'inherit' }}>
                      {d.nom_complet}
                    </Link>
                  </td>
                  <td>
                    <div>{d.telephone || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-steel)' }}>{d.email}</div>
                  </td>
                  <td>
                    <div className="flex flex-wrap" style={{ gap: 4 }}>
                      {(d.types_vehicules || []).map((t) => (
                        <span key={t.type_vehicule} className="pill pill-info">
                          {TYPE_LABELS_SHORT[t.type_vehicule] || t.type_vehicule}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`pill ${d.statut === 'actif' ? 'pill-success' : d.statut === 'en_mission' ? 'pill-warning' : 'pill-info'}`}>
                      {d.statut.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end" style={{ gap: 4 }}>
                      <Link to={`/dashboard/flotte/chauffeurs/${d.id}`} className="btn-icon" title="Voir">
                        <Search size={16} />
                      </Link>
                      {d.statut !== 'en_mission' && (
                        <button onClick={() => handleDelete(d)} className="btn-icon" title="Supprimer">
                          <Trash2 size={16} color="var(--color-danger)" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
