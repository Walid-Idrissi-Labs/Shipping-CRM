import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Package, Plus, List, ClipboardCheck } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard } from '../../components/ui/DataCard';
import { FormField } from '../../components/ui/Form';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../contexts/ToastContext';
import { useSuccess } from '../../contexts/SuccessModalContext';

const empty = {
    chauffeur_id: '',
    vehicule_id: '',
    ville_depart: 'Casablanca',
    pays_depart: 'Maroc',
    date_heure_depart: '',
    ville_arrivee: '',
    pays_arrivee: '',
    date_heure_arrivee: '',
    expedition_ids: [],
};

export default function AssignmentCreate() {
    const navigate = useNavigate();
    const toast = useToast();
    const success = useSuccess();
    const [form, setForm] = useState(empty);
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/drivers/active').then(({ data }) => setDrivers(data.data || []));
        api.get('/vehicles/available').then(({ data }) => setVehicles(data.data || []));
        api.get('/assignments/unassigned-shipments').then(({ data }) => setShipments(data.data || []));
    }, []);

    const refreshVehiclesFor = async (driver) => {
        const { data } = await api.get('/vehicles/available');
        if (!driver) {
            setVehicles(data.data || []);
            return;
        }
        const types = (driver.types_vehicules || []).map((t) => t.type_vehicule);
        setVehicles((data.data || []).filter((v) => types.includes(v.type_vehicule)));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
        if (name === 'chauffeur_id') {
            const id = parseInt(value);
            refreshVehiclesFor(drivers.find((d) => d.id === id) || null);
        }
    };

    const toggleShipment = (id) => {
        setForm((f) => ({
            ...f,
            expedition_ids: f.expedition_ids.includes(id)
                ? f.expedition_ids.filter((x) => x !== id)
                : [...f.expedition_ids, id],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...form,
                chauffeur_id: form.chauffeur_id || null,
                vehicule_id: form.vehicule_id || null,
                ville_arrivee: form.ville_arrivee || null,
                pays_arrivee: form.pays_arrivee || null,
                date_heure_arrivee: form.date_heure_arrivee || null,
                expedition_ids: form.expedition_ids,
            };
            const { data } = await api.post('/assignments', payload);
            const createdId = data.assignment?.id || data.id;
            toast.push('Affectation creee', 'success');
            success.show({
                title: 'Affectation creee avec succes',
                message: `Le chauffeur et le vehicule sont maintenant lies a ${form.expedition_ids.length} expedition(s).`,
                detail: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-steel)' }}>Mission</span>
                            <span className="font-mono-data" style={{ color: 'var(--color-graphite)', fontWeight: 600 }}>#{createdId || 'A-' + Date.now().toString().slice(-6)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-steel)' }}>Expeditions</span>
                            <span style={{ color: 'var(--color-graphite)', fontWeight: 600 }}>{form.expedition_ids.length}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-steel)' }}>Statut</span>
                            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Planifiee</span>
                        </div>
                    </div>
                ),
                primaryAction: {
                    label: 'Creer une autre',
                    icon: Plus,
                    onClick: () => { success.hide(); navigate('/dashboard/flotte/affectations/nouveau'); },
                },
                secondaryActions: [
                    { label: 'Voir la liste', icon: List, onClick: () => { success.hide(); navigate('/dashboard/flotte/affectations'); } },
                    ...(createdId ? [{ label: 'Voir le detail', icon: ClipboardCheck, onClick: () => { success.hide(); navigate(`/dashboard/flotte/affectations/${createdId}`); } }] : []),
                ],
            });
        } catch (err) {
            toast.push(err.response?.data?.message || 'Erreur lors de la creation', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 960 }}>
            <PageHeader
                title="Nouvelle Affectation"
                subtitle="Creer une mission en affectant chauffeur, vehicule et expeditions"
                breadcrumbs={[
                    { label: 'Flotte', to: '/dashboard/flotte' },
                    { label: 'Affectations', to: '/dashboard/flotte/affectations' },
                    { label: 'Nouvelle' },
                ]}
                actions={
                    <>
                        <button type="button" onClick={() => navigate('/dashboard/flotte/affectations')} className="btn btn-ghost">
                            <ArrowLeft size={14} /> Annuler
                        </button>
                        <button type="submit" form="assignment-form" disabled={loading} className="btn btn-primary">
                            <Save size={14} /> {loading ? 'Creation...' : "Creer l'affectation"}
                        </button>
                    </>
                }
            />

            <form id="assignment-form" onSubmit={handleSubmit}>
                <DataCard title="Personnel & Vehicule" description="Selectionnez le chauffeur et le vehicule pour cette mission.">
                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                        <FormField label="Chauffeur" required>
                            <select name="chauffeur_id" value={form.chauffeur_id} onChange={handleChange} required className="select">
                                <option value="">Selectionner...</option>
                                {drivers.map((d) => (
                                    <option key={d.id} value={d.id}>{d.nom_complet}</option>
                                ))}
                            </select>
                        </FormField>
                        <FormField
                            label="Vehicule"
                            hint={form.chauffeur_id ? 'Filtre pour les vehicules compatibles avec le chauffeur' : 'Tous les vehicules disponibles'}
                        >
                            <select name="vehicule_id" value={form.vehicule_id} onChange={handleChange} className="select">
                                <option value="">Selectionner...</option>
                                {vehicles.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.immatriculation} - {v.marque_modele}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                    </div>
                </DataCard>

                <div style={{ marginTop: 16 }}>
                    <DataCard title="Itineraire" description="Ville de depart, d'arrivee et horaires.">
                        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                            <FormField label="Ville de depart" required><input name="ville_depart" value={form.ville_depart} onChange={handleChange} required className="input" /></FormField>
                            <FormField label="Pays de depart" required><input name="pays_depart" value={form.pays_depart} onChange={handleChange} required className="input" /></FormField>
                            <FormField label="Date / heure de depart" required><input name="date_heure_depart" type="datetime-local" value={form.date_heure_depart} onChange={handleChange} required className="input" /></FormField>
                            <FormField label="Ville d'arrivee"><input name="ville_arrivee" value={form.ville_arrivee} onChange={handleChange} className="input" /></FormField>
                            <FormField label="Pays d'arrivee"><input name="pays_arrivee" value={form.pays_arrivee} onChange={handleChange} className="input" /></FormField>
                            <FormField label="Date / heure d'arrivee"><input name="date_heure_arrivee" type="datetime-local" value={form.date_heure_arrivee} onChange={handleChange} className="input" /></FormField>
                        </div>
                    </DataCard>
                </div>

                <div style={{ marginTop: 16 }}>
                    <DataCard
                        title={`Expeditions a inclure (${form.expedition_ids.length} selectionnees)`}
                        description="Choisissez les expeditions non affectees a ajouter a cette mission."
                    >
                        {shipments.length === 0 ? (
                            <EmptyState
                                icon={Package}
                                title="Aucune expedition non affectee"
                                description="Toutes les expeditions en cours sont deja liees a une mission."
                            />
                        ) : (
                            <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--color-ash)', borderRadius: 8 }}>
                                {shipments.map((s) => {
                                    const isChecked = form.expedition_ids.includes(s.id);
                                    return (
                                        <label
                                            key={s.id}
                                            className="flex items-center"
                                            style={{
                                                padding: '12px 14px',
                                                borderBottom: '1px solid var(--color-ash)',
                                                cursor: 'pointer',
                                                background: isChecked ? 'var(--color-primary-wash)' : 'transparent',
                                                transition: 'background 100ms',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleShipment(s.id)}
                                                style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', flexShrink: 0 }}
                                            />
                                            <div className="min-w-0" style={{ flex: 1, marginLeft: 12 }}>
                                                <div className="font-mono-data" style={{ fontSize: 14 }}>{s.shipping_number}</div>
                                                <div style={{ fontSize: 12, color: 'var(--color-steel)' }}>
                                                    {s.recipient_name} ({s.recipient_city}, {s.recipient_country}) - {s.type_service}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </DataCard>
                </div>
            </form>
        </div>
    );
}
