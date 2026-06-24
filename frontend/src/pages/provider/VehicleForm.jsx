import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Plus, List, Truck } from 'lucide-react';
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
    disponible: 'Disponible',
    en_maintenance: 'En maintenance',
    hors_service: 'Hors service',
};

const empty = {
    immatriculation: '', marque_modele: '', annee_circulation: '', couleur: '',
    type_vehicule: 'camionnette_fourgon_leger', statut: 'disponible',
    exp_controle_technique: '', exp_assurance: '', exp_carte_grise: '',
};

export default function VehicleForm() {
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
        api.get(`/vehicles/${id}`)
            .then(({ data }) => {
                const v = data.vehicule;
                setForm({
                    immatriculation: v.immatriculation || '',
                    marque_modele: v.marque_modele || '',
                    annee_circulation: v.annee_circulation || '',
                    couleur: v.couleur || '',
                    type_vehicule: v.type_vehicule || 'camionnette_fourgon_leger',
                    statut: v.statut || 'disponible',
                    exp_controle_technique: v.exp_controle_technique || '',
                    exp_assurance: v.exp_assurance || '',
                    exp_carte_grise: v.exp_carte_grise || '',
                });
            })
            .catch((err) => toast.error(err.response?.data?.message || 'Erreur de chargement'));
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = { ...form };
            if (!payload.annee_circulation) delete payload.annee_circulation;
            else payload.annee_circulation = parseInt(payload.annee_circulation);
            Object.keys(payload).forEach((k) => {
                if (payload[k] === '') delete payload[k];
            });
            let createdId;
            if (isEdit) {
                await api.patch(`/vehicles/${id}`, payload);
                createdId = id;
                toast.push('Vehicule mis a jour', 'success');
            } else {
                const { data } = await api.post('/vehicles', payload);
                createdId = data.vehicule?.id || data.id;
                toast.push('Vehicule cree', 'success');
            }
            success.show({
                title: isEdit ? 'Vehicule mis a jour' : 'Vehicule cree avec succes',
                message: isEdit
                    ? `Les informations de ${form.immatriculation} ont ete mises a jour.`
                    : `Le vehicule ${form.immatriculation} a ete ajoute a la flotte.`,
                detail: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-steel)' }}>Immatriculation</span>
                            <span className="font-mono-data" style={{ color: 'var(--color-graphite)', fontWeight: 600 }}>{form.immatriculation}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-steel)' }}>Type</span>
                            <span style={{ color: 'var(--color-graphite)' }}>{TYPES[form.type_vehicule] || form.type_vehicule}</span>
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
                    onClick: () => { success.hide(); navigate('/dashboard/flotte/vehicules'); },
                } : {
                    label: 'Ajouter un autre',
                    icon: Plus,
                    onClick: () => { success.hide(); navigate('/dashboard/flotte/vehicules/nouveau'); },
                },
                secondaryActions: [
                    ...(createdId ? [{ label: 'Voir le vehicule', icon: Truck, onClick: () => { success.hide(); navigate(`/dashboard/flotte/vehicules/${createdId}`); } }] : []),
                    { label: 'Voir la liste', icon: List, onClick: () => { success.hide(); navigate('/dashboard/flotte/vehicules'); } },
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
                title={isEdit ? 'Modifier le Vehicule' : 'Nouveau Vehicule'}
                subtitle={isEdit ? `Immatriculation: ${form.immatriculation}` : 'Ajouter un vehicule a la flotte'}
                breadcrumbs={[
                    { label: 'Flotte', to: '/dashboard/flotte' },
                    { label: 'Vehicules', to: '/dashboard/flotte/vehicules' },
                    { label: isEdit ? 'Modifier' : 'Nouveau' },
                ]}
                actions={
                    <>
                        <button type="button" onClick={() => navigate('/dashboard/flotte/vehicules')} className="btn btn-ghost">
                            <ArrowLeft size={14} /> Annuler
                        </button>
                        <button type="submit" form="vehicle-form" disabled={loading} className="btn btn-primary">
                            <Save size={14} /> {loading ? 'Sauvegarde...' : isEdit ? 'Mettre a jour' : 'Ajouter le vehicule'}
                        </button>
                    </>
                }
            />

            <form id="vehicle-form" onSubmit={handleSubmit}>
                {error && (
                    <div style={{ background: 'var(--color-danger-container)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                        {error}
                    </div>
                )}

                <DataCard title="Informations generales" description="Identification et caracteristiques.">
                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                        <FormField label="Immatriculation" required>
                            <input name="immatriculation" value={form.immatriculation} onChange={handleChange} required className="input font-mono-data" placeholder="ex: 12345-A-6" />
                        </FormField>
                        <FormField label="Marque / Modele">
                            <input name="marque_modele" value={form.marque_modele} onChange={handleChange} className="input" />
                        </FormField>
                        <FormField label="Annee de circulation"><input name="annee_circulation" type="number" min="1900" max="2100" value={form.annee_circulation} onChange={handleChange} className="input" /></FormField>
                        <FormField label="Couleur"><input name="couleur" value={form.couleur} onChange={handleChange} className="input" /></FormField>
                        <FormField label="Type" required>
                            <select name="type_vehicule" value={form.type_vehicule} onChange={handleChange} required className="select">
                                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Statut">
                            <select name="statut" value={form.statut} onChange={handleChange} className="select">
                                {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </FormField>
                    </div>
                </DataCard>

                <div style={{ marginTop: 16 }}>
                    <DataCard title="Documents" description="Dates d'expiration des documents officiels.">
                        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16 }}>
                            <FormField label="Controle technique"><input name="exp_controle_technique" type="date" value={form.exp_controle_technique} onChange={handleChange} className="input" /></FormField>
                            <FormField label="Assurance"><input name="exp_assurance" type="date" value={form.exp_assurance} onChange={handleChange} className="input" /></FormField>
                            <FormField label="Carte grise"><input name="exp_carte_grise" type="date" value={form.exp_carte_grise} onChange={handleChange} className="input" /></FormField>
                        </div>
                    </DataCard>
                </div>
            </form>
        </div>
    );
}
