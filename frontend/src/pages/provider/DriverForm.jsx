import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Plus, List, UserCog } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard } from '../../components/ui/DataCard';
import { FormField } from '../../components/ui/Form';
import { useToast } from '../../contexts/ToastContext';
import { useSuccess } from '../../contexts/SuccessModalContext';

const TYPES = {
    camionnette_fourgon_leger: 'Camionnette / Fourgon leger',
    fourgon_grand_volume: 'Fourgon grand volume',
    camion_porteur: 'Camion porteur',
    semi_remorque_tracteur: 'Semi-remorque / Tracteur',
    vehicule_frigorifique: 'Vehicule frigorifique',
    moto_scooter: 'Moto / Scooter',
    utilitaire_bache_plateau: 'Utilitaire bache / Plateau',
};

const STATUSES = {
    actif: 'Actif',
    en_conge: 'En conge',
};

const empty = {
    nom_complet: '', telephone: '', email: '',
    statut: 'actif', types_vehicules: [],
};

export default function DriverForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const success = useSuccess();
    const [form, setForm] = useState(empty);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const isEdit = Boolean(id);

    useEffect(() => {
        if (!isEdit) return;
        api.get(`/drivers/${id}`)
            .then(({ data }) => {
                const d = data.chauffeur;
                setForm({
                    nom_complet: d.nom_complet || '',
                    telephone: d.telephone || '',
                    email: d.email || '',
                    statut: d.statut || 'actif',
                    types_vehicules: (d.types_vehicules || []).map((t) => t.type_vehicule),
                });
            })
            .catch((err) => toast.error(err.response?.data?.message || 'Erreur de chargement'));
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    };

    const toggleType = (type) => {
        setForm((f) => {
            const exists = f.types_vehicules.includes(type);
            return {
                ...f,
                types_vehicules: exists
                    ? f.types_vehicules.filter((t) => t !== type)
                    : [...f.types_vehicules, type],
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = { ...form };
            Object.keys(payload).forEach((k) => {
                if (payload[k] === '') delete payload[k];
            });
            let createdId;
            if (isEdit) {
                await api.patch(`/drivers/${id}`, payload);
                createdId = id;
                toast.push('Chauffeur mis a jour', 'success');
            } else {
                const { data } = await api.post('/drivers', payload);
                createdId = data.chauffeur?.id || data.id;
                toast.push('Chauffeur cree', 'success');
            }
            success.show({
                title: isEdit ? 'Chauffeur mis a jour' : 'Chauffeur cree avec succes',
                message: isEdit
                    ? `Les informations de ${form.nom_complet} ont ete mises a jour.`
                    : `${form.nom_complet} a ete ajoute a la flotte.`,
                detail: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-steel)' }}>Nom</span>
                            <span style={{ color: 'var(--color-graphite)', fontWeight: 600 }}>{form.nom_complet}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-steel)' }}>Vehicules habilites</span>
                            <span style={{ color: 'var(--color-graphite)', fontWeight: 600 }}>{form.types_vehicules.length}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-steel)' }}>Statut</span>
                            <span style={{ color: 'var(--color-vivid-green-dark)', fontWeight: 600 }}>{STATUSES[form.statut] || form.statut}</span>
                        </div>
                    </div>
                ),
                primaryAction: isEdit ? {
                    label: 'Voir la liste',
                    icon: List,
                    onClick: () => { success.hide(); navigate('/dashboard/flotte/chauffeurs'); },
                } : {
                    label: 'Ajouter un autre',
                    icon: Plus,
                    onClick: () => { success.hide(); navigate('/dashboard/flotte/chauffeurs/nouveau'); },
                },
                secondaryActions: [
                    ...(createdId ? [{ label: 'Voir le chauffeur', icon: UserCog, onClick: () => { success.hide(); navigate(`/dashboard/flotte/chauffeurs/${createdId}`); } }] : []),
                    { label: 'Voir la liste', icon: List, onClick: () => { success.hide(); navigate('/dashboard/flotte/chauffeurs'); } },
                ],
            });
        } catch (err) {
            const msg = err.response?.data?.message || 'Erreur lors de la sauvegarde.';
            setError(msg);
            toast.push(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 960 }}>
            <PageHeader
                title={isEdit ? 'Modifier le Chauffeur' : 'Nouveau Chauffeur'}
                subtitle={isEdit ? form.nom_complet : 'Ajouter un chauffeur a la flotte'}
                breadcrumbs={[
                    { label: 'Flotte', to: '/dashboard/flotte' },
                    { label: 'Chauffeurs', to: '/dashboard/flotte/chauffeurs' },
                    { label: isEdit ? 'Modifier' : 'Nouveau' },
                ]}
                actions={
                    <>
                        <button type="button" onClick={() => navigate('/dashboard/flotte/chauffeurs')} className="btn btn-ghost">
                            <ArrowLeft size={14} /> Annuler
                        </button>
                        <button type="submit" form="driver-form" disabled={loading} className="btn btn-primary">
                            <Save size={14} /> {loading ? 'Sauvegarde...' : isEdit ? 'Mettre a jour' : 'Ajouter le chauffeur'}
                        </button>
                    </>
                }
            />

            <form id="driver-form" onSubmit={handleSubmit}>
                {error && (
                    <div style={{ background: 'var(--color-danger-container)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                        {error}
                    </div>
                )}

                <DataCard title="Informations personnelles" description="Nom et coordonnees.">
                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                        <FormField label="Nom Complet" required><input name="nom_complet" value={form.nom_complet} onChange={handleChange} required className="input" /></FormField>
                        <FormField label="Telephone"><input name="telephone" value={form.telephone} onChange={handleChange} className="input" /></FormField>
                        <FormField label="Email"><input name="email" type="email" value={form.email} onChange={handleChange} className="input" /></FormField>
                        <FormField label="Statut">
                            <select name="statut" value={form.statut} onChange={handleChange} className="select">
                                {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </FormField>
                    </div>
                </DataCard>

                <div style={{ marginTop: 16 }}>
                    <DataCard
                        title="Vehicules habilites"
                        description="Types de vehicules que ce chauffeur peut conduire."
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 8 }}>
                            {Object.entries(TYPES).map(([k, v]) => {
                                const active = form.types_vehicules.includes(k);
                                return (
                                    <label
                                        key={k}
                                        className="flex items-center"
                                        style={{
                                            padding: '12px 14px',
                                            border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-ash)'}`,
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            background: active ? 'var(--color-primary-wash)' : 'var(--color-paper-white)',
                                            transition: 'all 150ms ease',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={active}
                                            onChange={() => toggleType(k)}
                                            style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
                                        />
                                        <span style={{ fontSize: 14, color: 'var(--color-graphite)', marginLeft: 10 }}>{v}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </DataCard>
                </div>
            </form>
        </div>
    );
}
