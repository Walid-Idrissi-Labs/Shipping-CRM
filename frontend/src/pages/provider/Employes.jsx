import { useMinLoading } from '../../hooks';
import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { useDialog } from '../../contexts/DialogContext';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard } from '../../components/ui/DataCard';
import EmployeFormModal from '../../components/ui/EmployeFormModal';
import PageLoader from '../../components/ui/PageLoader';
import Pagination from '../../components/ui/Pagination';
import { useUrlPage } from '../../hooks/useUrlPage';
import { Plus, Edit, Trash2, Search, User, X } from 'lucide-react';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Employes() {
  const { push: toast } = useToast();
  const dialog = useDialog();
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoader = useMinLoading(loading);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ lastPage: 1, total: 0, perPage: 25 });
  const { page, setPage, resetPage } = useUrlPage();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmploye, setEditingEmploye] = useState(null);

  // Without this the list refetched on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      if (search !== debouncedSearch) {
        setDebouncedSearch(search);
        resetPage();
      }
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, debouncedSearch]);

  const fetchEmployes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page });
      if (debouncedSearch) params.append('search', debouncedSearch);

      const { data } = await api.get(`/admin/employes?${params.toString()}`);
      setEmployes(data.data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.last_page && page > data.last_page) resetPage();
    } catch (err) {
      console.error('Failed to fetch employés:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchEmployes();
  }, [fetchEmployes]);

  const handleCreate = () => {
    setEditingEmploye(null);
    setModalOpen(true);
  };

  const handleEdit = (employe) => {
    setEditingEmploye(employe);
    setModalOpen(true);
  };

  const handleDelete = async (employe) => {
    const ok = await dialog.confirm({
      title: 'Supprimer cet employé ?',
      description: `Cette action supprimera définitivement le compte de ${employe.name}.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await api.delete(`/admin/employes/${employe.id}`);
      toast('Employé supprimé', 'success');
      fetchEmployes();
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la suppression';
      toast(msg, 'error');
    }
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editingEmploye) {
        await api.patch(`/admin/employes/${editingEmploye.id}`, payload);
        toast('Employé mis à jour', 'success');
      } else {
        await api.post('/admin/employes', payload);
        toast('Employé créé', 'success');
      }
      setModalOpen(false);
      setEditingEmploye(null);
      fetchEmployes();
    } catch (err) {
      const data = err.response?.data;
      // Surface the first field error (e.g. duplicate email) instead of a generic message.
      const fieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : null;
      toast(fieldError || data?.message || "Erreur lors de l'enregistrement", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Employés"
        title="Gestion des Employés"
        subtitle="Créez et gérez les comptes employés pour la mise à jour des statuts d'expédition."
        actions={
          <button onClick={handleCreate} className="btn btn-primary">
            <Plus size={16} /> Nouvel employé
          </button>
        }
      />

      <DataCard title={`Liste des employés (${meta.total})`} padding={0}>
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--color-ash)' }}>
          <div style={{ position: 'relative', maxWidth: 400 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-smoke)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email..."
              aria-label="Rechercher un employé"
              className="input"
              style={{ width: '100%', paddingLeft: 36, minHeight: 44 }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Effacer la recherche"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'none',
                  color: 'var(--color-smoke)',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: 4,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {showLoader && employes.length === 0 ? (
          <PageLoader variant="table" embedded />
        ) : employes.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-steel)' }}>
            <User size={40} style={{ margin: '0 auto 16px', color: 'var(--color-smoke)' }} />
            <p style={{ fontSize: 16, color: 'var(--color-graphite)', marginBottom: 6 }}>
              {debouncedSearch ? 'Aucun résultat' : 'Aucun employé'}
            </p>
            <p style={{ fontSize: 14 }}>
              {debouncedSearch
                ? `Aucun employé ne correspond à « ${debouncedSearch} ».`
                : 'Créez un premier compte pour permettre la mise à jour des statuts.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: one card per employee */}
            <div className="emp-hide-desktop" style={{ padding: '16px 16px 4px' }}>
              {employes.map((e) => (
                <div key={e.id} className="emp-hist-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-graphite)' }}>{e.name}</div>
                      <div
                        className="font-mono-data"
                        style={{
                          fontSize: 12,
                          color: 'var(--color-primary)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {e.email || '— aucun email —'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-steel)', marginTop: 6 }}>
                        Créé le {formatDate(e.created_at)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => handleEdit(e)}
                        className="emp-row-action"
                        aria-label={`Modifier ${e.name}`}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(e)}
                        className="emp-row-action is-danger"
                        aria-label={`Supprimer ${e.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: the table */}
            <div className="emp-hide-mobile" style={{ overflowX: 'auto' }}>
              <table className="table-clean" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 220 }}>Nom</th>
                    <th>Email</th>
                    <th style={{ width: 180 }}>Créé le</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employes.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--color-graphite)' }}>{e.name}</div>
                      </td>
                      <td>
                        <div className="font-mono-data" style={{ fontSize: 13, color: 'var(--color-primary)' }}>
                          {e.email || <span style={{ color: 'var(--color-smoke)' }}>— aucun email —</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, color: 'var(--color-iron)' }}>{formatDate(e.created_at)}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleEdit(e)}
                            className="emp-row-action"
                            title="Modifier"
                            aria-label={`Modifier ${e.name}`}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(e)}
                            className="emp-row-action is-danger"
                            title="Supprimer"
                            aria-label={`Supprimer ${e.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '0 4px' }}>
              <Pagination page={page} lastPage={meta.lastPage} total={meta.total} perPage={meta.perPage} onChange={setPage} />
            </div>
          </>
        )}
      </DataCard>

      <EmployeFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEmploye(null);
        }}
        initialData={editingEmploye}
        onSubmit={handleSubmit}
        loading={saving}
      />
    </div>
  );
}
