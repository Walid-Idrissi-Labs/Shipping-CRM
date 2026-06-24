import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, FileText, Save, ArrowLeft, Check } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard } from '../../components/ui/DataCard';
import { FormField } from '../../components/ui/Form';

const EMPTY_FORM = {
  full_name: '', company_name: '', email: '', phone: '', ice: '', address: '', postal_code: '', city: '', country: 'Maroc'
};

export default function ClientCreate() {
  const [searchParams] = useSearchParams();
  const demandeId = searchParams.get('demandeId');

  const navigate = useNavigate();
  const toast = useToast();
  const toastShown = useRef(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [created, setCreated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demande, setDemande] = useState(null);
  const [peekOpen, setPeekOpen] = useState(true);

  useEffect(() => {
    if (!demandeId) {
      setDemande(null);
      return;
    }
    setLoading(true);
    api.get(`/account-requests/${demandeId}`)
      .then((res) => {
        const d = res.data;
        if (d.statut === 'approuvee') {
          if (!toastShown.current) {
            toast.warning('Cette demande a deja ete approuvee.');
            toastShown.current = true;
          }
          if (d.client_id) {
            navigate(`/dashboard/clients/${d.client_id}`, { replace: true });
          } else {
            navigate('/dashboard/demandes-compte', { replace: true });
          }
          return;
        }
        if (d.statut === 'rejetee') {
          if (!toastShown.current) {
            toast.error('Cette demande a ete rejetee.');
            toastShown.current = true;
          }
          navigate('/dashboard/demandes-compte', { replace: true });
          return;
        }
        setDemande(d);
        setForm({
          full_name: d.full_name || '',
          company_name: d.company_name || '',
          email: d.email || '',
          phone: d.phone || '',
          ice: d.ice || '',
          address: d.address || '',
          postal_code: d.postal_code || '',
          city: d.city || '',
          country: d.country || 'Maroc',
        });
      })
      .catch((err) => {
        if (!toastShown.current) {
          toast.error(err.response?.status === 404 ? 'Demande introuvable.' : 'Erreur lors du chargement de la demande.');
          toastShown.current = true;
        }
        navigate('/dashboard/demandes-compte', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [demandeId, navigate, toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/clients', form);
      if (demandeId && demande?.statut === 'en_attente') {
        try {
          await api.patch(`/account-requests/${demandeId}/approve`, { client_id: data.client.id });
        } catch (err) {
          toast.warning('Client cree, mais la demande n\'a pas pu etre marquee comme approuvee.');
        }
      }
      setCreated(data);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la creation.');
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div style={{ maxWidth: 560 }}>
        <PageHeader title="Client cree" />
        <DataCard style={{ padding: 32, textAlign: 'center' }}>
          <div
            className="mx-auto flex items-center justify-center"
            style={{
              width: 56, height: 56, borderRadius: 9999,
              background: 'var(--color-bone)', color: 'var(--color-vivid-green-dark)',
              marginBottom: 16,
            }}
          >
            <Check size={28} />
          </div>
          <h1 className="display-headline" style={{ fontSize: 28 }}>Compte cree avec succes</h1>
          <div
            style={{
              padding: 16, borderRadius: 8, background: 'var(--color-bone)',
              display: 'inline-block', textAlign: 'left', marginTop: 24,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--color-steel)', textTransform: 'uppercase' }}>Numero de compte</div>
            <div className="font-mono-data" style={{ fontSize: 22, color: 'var(--color-primary)', fontWeight: 500 }}>{created.account_number}</div>
            <div style={{ fontSize: 12, color: 'var(--color-steel)', textTransform: 'uppercase', marginTop: 12 }}>Mot de passe temporaire</div>
            <div className="font-mono-data" style={{ fontSize: 18, color: 'var(--color-graphite)', fontWeight: 500 }}>{created.origin_password}</div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--color-iron)', marginTop: 24, maxWidth: 420, margin: '24px auto 0' }}>
            Communiquez ces identifiants au client pour sa premiere connexion.
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-steel)', marginTop: 8, fontStyle: 'italic' }}>
            Ce mot de passe reste consultable a tout moment depuis la fiche du client.
          </p>
          <div className="flex flex-wrap justify-center" style={{ marginTop: 24, gap: 10 }}>
            <button
              onClick={() => {
                setCreated(null);
                setDemande(null);
                navigate('/dashboard/clients/nouveau');
              }}
              className="btn btn-primary"
            >
              Creer un Autre
            </button>
            <button
              onClick={() => navigate(`/dashboard/clients/${created.client.id}`)}
              className="btn btn-secondary"
            >
              Voir la Fiche du Client
            </button>
            <button
              onClick={() => navigate('/dashboard/clients')}
              className="btn btn-ghost"
            >
              Retour a la Liste
            </button>
          </div>
        </DataCard>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <PageHeader
        title={demandeId ? 'Creer le Client depuis la Demande' : 'Nouveau Client'}
        subtitle={demandeId ? 'Verifiez et completez les informations avant la creation' : 'Cree un compte client et genere ses identifiants'}
      />

      {demandeId && demande && (
        <div
          className="animate-fade-in-up"
          style={{
            background: 'var(--color-paper-white)',
            border: '1px solid var(--color-ash)',
            borderLeft: '3px solid var(--color-primary)',
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
            backgroundImage: 'radial-gradient(at 100% 0%, rgba(224,201,255,0.15) 0%, transparent 50%)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center" style={{ gap: 8 }}>
              <FileText size={18} color="var(--color-primary)" />
              <h3 style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Informations de la Demande
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setPeekOpen((v) => !v)}
              className="btn-icon"
            >
              {peekOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {peekOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ marginTop: 16, gap: '12px 24px', fontSize: 13 }}>
              <PeekField label="Nom complet" value={demande.full_name} />
              <PeekField label="Raison sociale" value={demande.company_name} />
              <PeekField label="Email" value={demande.email} />
              <PeekField label="Telephone" value={demande.phone} />
              <PeekField label="ICE" value={demande.ice} />
              <PeekField label="Adresse" value={demande.address} />
              <PeekField label="Ville" value={demande.city} />
              <PeekField label="Code Postal" value={demande.postal_code} />
              <PeekField label="Pays" value={demande.country} />
              <PeekField label="Soumis le" value={demande.created_at ? new Date(demande.created_at).toLocaleString('fr-FR') : null} />
              <div className="md:col-span-2" style={{ marginTop: 8 }}>
                <div className="field-label">Notes supplementaires</div>
                <div
                  className="whitespace-pre-wrap"
                  style={{
                    background: 'var(--color-paper-white)',
                    border: '1px solid var(--color-ash)',
                    borderRadius: 6,
                    padding: 12,
                    color: 'var(--color-graphite)',
                  }}
                >
                  {demande.notes || '—'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ background: 'var(--color-danger-container)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <DataCard
          title={demandeId ? 'Edition des informations' : 'Informations du Nouveau Client'}
          description="Les champs marques d'un * sont obligatoires."
          actions={
            <>
              <button type="submit" disabled={loading} className="btn btn-primary">
                <Save size={14} />
                {loading ? 'Creation...' : 'Creer le Client'}
              </button>
              <button type="button" onClick={() => navigate(demandeId ? '/dashboard/demandes-compte' : '/dashboard/clients')} className="btn btn-ghost">
                <ArrowLeft size={14} />
                Annuler
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
            <FormField label="Nom complet (Contact)" required>
              <input name="full_name" value={form.full_name} onChange={handleChange} className="input" required />
            </FormField>
            <FormField label="Raison sociale (Entreprise)">
              <input name="company_name" value={form.company_name} onChange={handleChange} className="input" />
            </FormField>
            <FormField label="Email" required>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="input" required />
            </FormField>
            <FormField label="Telephone">
              <input name="phone" value={form.phone} onChange={handleChange} className="input" />
            </FormField>
            <FormField label="ICE">
              <input name="ice" value={form.ice} onChange={handleChange} className="input" />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Adresse">
                <input name="address" value={form.address} onChange={handleChange} className="input" />
              </FormField>
            </div>
            <FormField label="Ville">
              <input name="city" value={form.city} onChange={handleChange} className="input" />
            </FormField>
            <FormField label="Code Postal">
              <input name="postal_code" value={form.postal_code} onChange={handleChange} className="input" />
            </FormField>
            <FormField label="Pays">
              <input name="country" value={form.country} onChange={handleChange} className="input" />
            </FormField>
          </div>
        </DataCard>
      </form>
    </div>
  );
}

function PeekField({ label, value }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <div style={{ color: 'var(--color-graphite)' }}>{value || '—'}</div>
    </div>
  );
}
