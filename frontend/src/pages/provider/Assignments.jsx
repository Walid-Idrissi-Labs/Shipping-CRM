import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Truck, User, Calendar, MapPin, ChevronRight, ClipboardList } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import SortHeader from '../../components/ui/SortHeader';
import { useColumnSort } from '../../hooks/useColumnSort';
import { useToast } from '../../contexts/ToastContext';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Assignments() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const statut = searchParams.get('statut') || '';
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const { column, direction, toggle, params: sortParams } = useColumnSort('date_heure_depart', 'desc');
    const toast = useToast();

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const params = { ...sortParams };
      if (statut) params.statut = statut;
      const { data } = await api.get('/assignments', { params });
      setAssignments(data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statut, column, direction]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const updateStatus = async (a, statut) => {
    try {
      await api.patch(`/assignments/${a.id}/status`, { statut });
      toast.success(`Statut mis a jour`);
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  return (
    <div>
      <PageHeader
        title="Affectations"
        subtitle="Missions et expeditions affectees"
        actionLabel="Nouvelle Affectation"
        actionTo="/dashboard/flotte/affectations/nouveau"
        actionIcon={ClipboardList}
        breadcrumbs={[{ label: 'Flotte', to: '/dashboard/flotte' }, { label: 'Affectations' }]}
      />

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <select
          value={statut}
          onChange={(e) => updateParam('statut', e.target.value)}
          className="select"
          style={{ maxWidth: 240 }}
        >
          <option value="">Tous les statuts</option>
          <option value="planifiee">Planifiee</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminee</option>
          <option value="annulee">Annulee</option>
        </select>
      </Card>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <Skeleton height={20} width="60%" />
              </div>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Aucune affectation"
            description="Aucune mission ne correspond a ces filtres."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-clean" style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  <SortHeader label="Depart" col="date_heure_depart" currentCol={column} direction={direction} onClick={toggle} />
                  <SortHeader label="Arrivee" col="date_heure_arrivee" currentCol={column} direction={direction} onClick={toggle} />
                  <th>Chauffeur</th>
                  <th>Vehicule</th>
                  <th>Expeditions</th>
                  <SortHeader label="Statut" col="statut" currentCol={column} direction={direction} onClick={toggle} />
                  <th style={{ textAlign: 'right' }}>Actions</th>
                  <th style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/dashboard/flotte/affectations/${a.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ color: 'var(--color-graphite)', fontWeight: 500 }}>{a.ville_depart}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-steel)' }}>{formatDateTime(a.date_heure_depart)}</div>
                    </td>
                    <td>
                      {a.ville_arrivee || '—'}
                      {a.date_heure_arrivee && (
                        <div style={{ fontSize: 12, color: 'var(--color-steel)' }}>{formatDateTime(a.date_heure_arrivee)}</div>
                      )}
                    </td>
                    <td>
                      {a.chauffeur ? (
                        <div className="flex items-center" style={{ gap: 6 }}>
                          <User size={14} color="var(--color-steel)" />
                          {a.chauffeur.nom_complet}
                        </div>
                      ) : <span style={{ color: 'var(--color-steel)' }}>—</span>}
                    </td>
                    <td>
                      {a.vehicule ? (
                        <div className="flex items-center" style={{ gap: 6 }}>
                          <Truck size={14} color="var(--color-steel)" />
                          <span className="font-mono-data">{a.vehicule.immatriculation}</span>
                        </div>
                      ) : <span style={{ color: 'var(--color-steel)' }}>—</span>}
                    </td>
                    <td>
                      <span className="pill pill-info">{(a.expeditions || []).length} colis</span>
                    </td>
                    <td><StatusBadge status={a.statut} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div
                        className="flex items-center justify-end flex-wrap"
                        style={{ gap: 4 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {a.statut === 'planifiee' && (
                          <button onClick={() => updateStatus(a, 'en_cours')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                            Demarrer
                          </button>
                        )}
                        {a.statut === 'en_cours' && (
                          <>
                            <button onClick={() => updateStatus(a, 'terminee')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                              Terminer
                            </button>
                            <button onClick={() => updateStatus(a, 'annulee')} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }}>
                              Annuler
                            </button>
                          </>
                        )}
                        {a.statut === 'annulee' && (
                          <span className="flex items-center italic" style={{ gap: 4, fontSize: 12, color: 'var(--color-smoke)' }}>
                            <MapPin size={12} /> cloturee
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <ChevronRight size={14} style={{ color: 'var(--color-smoke)' }} />
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
