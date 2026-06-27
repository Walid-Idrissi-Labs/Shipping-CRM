import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, ArrowLeft, Plus, List, Package, ClipboardPaste, ArrowLeftRight } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard } from '../../components/ui/DataCard';
import { FormField } from '../../components/ui/Form';
import { useToast } from '../../contexts/ToastContext';
import { useSuccess } from '../../contexts/SuccessModalContext';

const initialRecipient = {
  recipient_name: '', recipient_company: '', recipient_address: '', recipient_city: '', recipient_postal_code: '', recipient_country: '', recipient_phone: '', recipient_email: '',
};

const initialPackage = {
  poids: '', longueur: '', largeur: '', hauteur: '', nb_pieces: 1,
  valeur_declaree: '', devise_valeur: 'MAD', type_colis: 'paquet', description_colis: '', type_service: 'national',
};

export default function ClientShipmentCreate() {
  const [searchParams] = useSearchParams();
  const copyFrom = searchParams.get('copyFrom');
  const [sender, setSender] = useState({
    sender_name: '', sender_company: '', sender_address: '', sender_city: '', sender_postal_code: '',
    sender_country: 'Maroc', sender_email: '', sender_phone: '',
  });
  const [recipient, setRecipient] = useState(initialRecipient);
  const [pkg, setPkg] = useState(initialPackage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copySource, setCopySource] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();
  const success = useSuccess();

  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => {
        const c = data.user?.client || {};
        const baseSender = {
          sender_name: c.full_name || data.user?.name || '',
          sender_company: c.company_name || '',
          sender_address: c.address || '',
          sender_city: c.city || '',
          sender_postal_code: c.postal_code || '',
          sender_country: c.country || 'Maroc',
          sender_email: c.email || data.user?.email || '',
          sender_phone: c.phone || '',
        };
        if (!copyFrom) {
          setSender(baseSender);
        } else {
          api.get(`/my/expeditions/${copyFrom}`)
            .then((res) => {
              const s = res.data.shipment || res.data || {};
              setCopySource({ id: s.id, shipping_number: s.shipping_number });
              setSender({
                sender_name: s.sender_name || baseSender.sender_name,
                sender_company: s.sender_company ?? baseSender.sender_company,
                sender_address: s.sender_address || baseSender.sender_address,
                sender_city: s.sender_city || baseSender.sender_city,
                sender_postal_code: s.sender_postal_code ?? baseSender.sender_postal_code,
                sender_country: s.sender_country || baseSender.sender_country,
                sender_email: s.sender_email || baseSender.sender_email,
                sender_phone: s.sender_phone || baseSender.sender_phone,
              });
              setRecipient({
                recipient_name: s.recipient_name || '',
                recipient_company: s.recipient_company || '',
                recipient_address: s.recipient_address || '',
                recipient_city: s.recipient_city || '',
                recipient_postal_code: s.recipient_postal_code || '',
                recipient_country: s.recipient_country || '',
                recipient_phone: s.recipient_phone || '',
                recipient_email: s.recipient_email || '',
              });
              setPkg({
                poids: s.poids ?? '',
                longueur: s.longueur ?? '',
                largeur: s.largeur ?? '',
                hauteur: s.hauteur ?? '',
                nb_pieces: s.nb_pieces ?? 1,
                valeur_declaree: s.valeur_declaree ?? '',
                devise_valeur: s.devise_valeur || 'MAD',
                type_colis: s.type_colis || 'paquet',
                description_colis: s.description_colis || '',
                type_service: s.type_service || 'national',
              });
            })
            .catch(() => {
              toast.push('Impossible de charger l\'expedition source.', 'error');
              setSender(baseSender);
            });
        }
      })
      .catch(() => {
        toast.push('Impossible de charger votre profil.', 'error');
      });
  }, [copyFrom, toast]);

  const handleSender = (e) => {
    const { name, value } = e.target;
    setSender((s) => ({ ...s, [name]: value }));
  };

  const handleRecipient = (e) => {
    const { name, value } = e.target;
    setRecipient((r) => ({ ...r, [name]: value }));
  };

  const handlePackage = (e) => {
    const { name, value } = e.target;
    setPkg((p) => ({ ...p, [name]: value }));
  };

  const handleSwap = () => {
    setSender((prev) => ({
      ...prev,
      sender_name: recipient.recipient_name,
      sender_company: recipient.recipient_company,
      sender_address: recipient.recipient_address,
      sender_city: recipient.recipient_city,
      sender_postal_code: recipient.recipient_postal_code,
      sender_country: recipient.recipient_country,
      sender_phone: recipient.recipient_phone,
      sender_email: recipient.recipient_email ?? prev.sender_email,
    }));
    setRecipient((prev) => ({
      ...prev,
      recipient_name: sender.sender_name,
      recipient_company: sender.sender_company,
      recipient_address: sender.sender_address,
      recipient_city: sender.sender_city,
      recipient_postal_code: sender.sender_postal_code,
      recipient_country: sender.sender_country,
      recipient_phone: sender.sender_phone,
      recipient_email: sender.sender_email ?? prev.recipient_email,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const all = { ...sender, ...recipient, ...pkg };
      const payload = Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v === '' ? null : v]));
      const { data } = await api.post('/my/expeditions', payload);
      const createdId = data.shipment.id;
      toast.push('Expedition creee', 'success');
      success.show({
        title: 'Expedition creee avec succes',
        message: `Votre expedition #${createdId} a ete enregistree. Vous pouvez suivre son traitement en temps reel.`,
        detail: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-steel)' }}>Numero</span>
              <span className="font-mono-data" style={{ color: 'var(--color-graphite)', fontWeight: 600 }}>
                {data.shipment.shipping_number || `EXP-${String(createdId).padStart(6, '0')}`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-steel)' }}>Statut</span>
              <span style={{ color: 'var(--color-vivid-green-dark)', fontWeight: 600 }}>Information recue</span>
            </div>
          </div>
        ),
        primaryAction: {
          label: 'Voir mes expeditions',
          icon: Package,
          onClick: () => { success.hide(); navigate('/client/mes-expeditions'); },
        },
        secondaryActions: [
          { label: 'Creer une autre', icon: Plus, onClick: () => { success.hide(); navigate('/client/expeditions/nouveau'); } },
          { label: 'Voir la liste', icon: List, onClick: () => { success.hide(); navigate('/client/mes-expeditions'); } },
        ],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la creation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={copySource ? `Nouvelle Expedition (depuis copie)` : 'Nouvelle Expedition'}
        subtitle={copySource
          ? 'Donnees pre-remplies depuis une expedition existante. Vous pouvez tout modifier.'
          : 'Pre-remplissage automatique depuis votre fiche client.'}
        breadcrumbs={copySource
          ? [{ label: 'Mes Expeditions', to: '/client/mes-expeditions' }, { label: copySource.shipping_number, to: `/client/mes-expeditions/${copySource.id}` }, { label: 'Copier' }]
          : [{ label: 'Mes Expeditions', to: '/client/mes-expeditions' }, { label: 'Nouvelle' }]}
        actions={
          <>
            <button type="button" onClick={() => navigate('/client/mes-expeditions')} className="btn btn-ghost">
              <ArrowLeft size={14} /> Annuler
            </button>
            <button type="submit" form="exp-form" disabled={loading} className="btn btn-primary">
              <Send size={14} /> {loading ? 'Creation...' : "Creer l'Expedition"}
            </button>
          </>
        }
      />

      <form id="exp-form" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div style={{ background: 'var(--color-danger-container)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}

        {copySource && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-ash)',
              borderLeft: '3px solid var(--color-primary)',
              background: 'var(--color-primary-wash)',
              fontSize: 13,
              color: 'var(--color-graphite)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <ClipboardPaste size={16} color="var(--color-primary)" />
            <span>
              Les champs ont ete pre-remplis depuis l'expedition{' '}
              <strong className="font-mono-data">{copySource.shipping_number}</strong>. Un nouveau numero d'expedition et un nouveau statut vous seront attribues. Vous pouvez tout modifier.
            </span>
          </div>
        )}

        <div className="split-expedition">
          <div className="split-side">
            <DataCard
              title="Expediteur"
              description="Vos informations de contact, pre-remplies depuis votre profil. Modifiez-les si necessaire."
              style={{ marginTop : 55 , paddingTop : 20 }}
            >
              <div className="grid grid-cols-1" style={{ gap: 16 }}>
                <FormField label="Nom" required><input name="sender_name" value={sender.sender_name} onChange={handleSender} className="input" required /></FormField>
                <FormField label="Entreprise"><input name="sender_company" value={sender.sender_company} onChange={handleSender} className="input" /></FormField>
                <FormField label="Email" required><input name="sender_email" value={sender.sender_email} onChange={handleSender} type="email" className="input" required /></FormField>
                <FormField label="Telephone" required><input name="sender_phone" value={sender.sender_phone} onChange={handleSender} className="input" required /></FormField>
                <FormField label="Adresse" required><input name="sender_address" value={sender.sender_address} onChange={handleSender} className="input" required /></FormField>
                <FormField label="Ville" required><input name="sender_city" value={sender.sender_city} onChange={handleSender} className="input" required /></FormField>
                <FormField label="Code postal"><input name="sender_postal_code" value={sender.sender_postal_code} onChange={handleSender} className="input" /></FormField>
                <FormField label="Pays" required><input name="sender_country" value={sender.sender_country} onChange={handleSender} className="input" required /></FormField>
              </div>
            </DataCard>
          </div>

          <div className="split-divider" aria-hidden="true">
            <button
              type="button"
              onClick={handleSwap}
              className="swap-btn"
              title="Inverser les informations expediteur et destinataire"
            >
              <ArrowLeftRight size={14} />
              Inverser infos
            </button>
            <svg className="split-svg" viewBox="0 0 100 120" preserveAspectRatio="none">
              <polyline
                points="100,0 100,60 0,60 0,120"
                fill="none"
                stroke="var(--color-ash)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="split-line" />
          </div>

          <div className="split-side">
            <DataCard title="Destinataire" description="Personne physique ou morale qui recevra le colis." style={{ marginTop : 55 , paddingTop : 20 }}>
              <div className="grid grid-cols-1" style={{ gap: 16 }}>
                <FormField label="Nom" required><input name="recipient_name" value={recipient.recipient_name} onChange={handleRecipient} className="input" required /></FormField>
                <FormField label="Entreprise"><input name="recipient_company" value={recipient.recipient_company} onChange={handleRecipient} className="input" /></FormField>
                <FormField label="Email"><input name="recipient_email" value={recipient.recipient_email} onChange={handleRecipient} type="email" className="input" /></FormField>
                <FormField label="Telephone" required><input name="recipient_phone" value={recipient.recipient_phone} onChange={handleRecipient} className="input" required /></FormField>
                <FormField label="Adresse" required><input name="recipient_address" value={recipient.recipient_address} onChange={handleRecipient} className="input" required /></FormField>
                <FormField label="Ville" required><input name="recipient_city" value={recipient.recipient_city} onChange={handleRecipient} className="input" required /></FormField>
                <FormField label="Code postal" required><input name="recipient_postal_code" value={recipient.recipient_postal_code} onChange={handleRecipient} className="input" required /></FormField>
                <FormField label="Pays" required><input name="recipient_country" value={recipient.recipient_country} onChange={handleRecipient} className="input" required /></FormField>
              </div>
            </DataCard>
          </div>
        </div>

        <DataCard title="Colis" description="Dimensions et caracteristiques.">
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 16 }}>
            <FormField label="Poids (kg)"><input name="poids" value={pkg.poids} onChange={handlePackage} type="number" step="0.001" min="0" className="input" /></FormField>
            <FormField label="Longueur (cm)"><input name="longueur" value={pkg.longueur} onChange={handlePackage} type="number" step="0.01" min="0" className="input" /></FormField>
            <FormField label="Largeur (cm)"><input name="largeur" value={pkg.largeur} onChange={handlePackage} type="number" step="0.01" min="0" className="input" /></FormField>
            <FormField label="Hauteur (cm)"><input name="hauteur" value={pkg.hauteur} onChange={handlePackage} type="number" step="0.01" min="0" className="input" /></FormField>
            <FormField label="Pieces"><input name="nb_pieces" value={pkg.nb_pieces} onChange={handlePackage} type="number" min="1" className="input" /></FormField>
            <FormField label="Valeur Declaree">
              <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--color-ash)', borderRadius: 8, background: 'var(--color-paper-white)', overflow: 'hidden' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input name="valeur_declaree" value={pkg.valeur_declaree} onChange={handlePackage} type="number" step="0.01" min="0" className="input" style={{ borderRadius: 0, borderRight: 'none', border: 'none', boxShadow: 'none' }} />
                </div>
                <div style={{ width: 90, borderLeft: '1px solid var(--color-ash)', background: 'var(--color-fog)' }}>
                  <select name="devise_valeur" value={pkg.devise_valeur} onChange={handlePackage} className="select" style={{ borderRadius: 0, border: 'none', boxShadow: 'none', background: 'transparent' }}>
                    <option value="MAD">MAD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
            </FormField>
            <FormField label="Type de colis">
              <select name="type_colis" value={pkg.type_colis} onChange={handlePackage} className="select">
                <option value="document">Document</option>
                <option value="paquet">Paquet</option>
                <option value="palette">Palette</option>
              </select>
            </FormField>
            <FormField label="Type de service" required>
              <select name="type_service" value={pkg.type_service} onChange={handlePackage} className="select">
                <option value="national">National</option>
                <option value="international_express_dap">International Express DAP</option>
                <option value="fret_aerien">Fret Aerien</option>
                <option value="routier_groupage">Routier (Groupage)</option>
                <option value="maritime_groupage">Maritime (Groupage)</option>
              </select>
            </FormField>
          </div>
          <FormField label="Description du colis" hint="60 caracteres maximum">
            <input name="description_colis" value={pkg.description_colis} onChange={handlePackage} maxLength={60} className="input" />
          </FormField>
        </DataCard>

        <div className="flex" style={{ gap: 10 }}>
          <button type="submit" disabled={loading} className="btn btn-primary">
            <Send size={14} />
            {loading ? 'Creation...' : "Creer l'Expedition"}
          </button>
          <button type="button" onClick={() => navigate('/client/mes-expeditions')} className="btn btn-ghost">
            <ArrowLeft size={14} />
            Annuler
          </button>
        </div>
      </form>

      <style>{`
        .split-expedition {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 120px minmax(0, 1fr);
          gap: 0;
          margin-top: 48px;
          width: 100%;
        }
        .split-side { min-width: 0; }
        .split-divider {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 4px;
          min-width: 0;
        }
        .swap-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          white-space: nowrap;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          color: #ffffff;
          background: var(--color-primary);
          border: 1px solid var(--color-primary);
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
          cursor: pointer;
          margin-bottom: 16px;
          z-index: 2;
        }
        .swap-btn:hover {
          background: #ffffff;
          color: var(--color-primary);
          border-color: var(--color-primary);
        }
        .split-divider .split-line {
          flex: 1;
          width: 2px;
          background: var(--color-ash);
          border-radius: 2px;
        }
        .split-svg { display: none; }

        @media (max-width: 767px) {
          .split-expedition {
            grid-template-columns: 1fr;
            margin-top: 16px;
          }
          .split-side { padding: 0; }
          .split-divider {
            flex-direction: column;
            position: relative;
            height: 120px;
            padding: 16px 0;
            justify-content: center;
          }
          .split-divider .split-line { display: none; }
          .split-svg {
            display: block;
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
          }
          .split-divider .swap-btn {
            margin-bottom: 0;
            position: relative;
            z-index: 2;
            background: var(--color-surface);
            color: var(--color-primary);
            border: 1px solid var(--color-primary);
          }
          .split-divider .swap-btn:hover {
            background: var(--color-primary);
            color: #ffffff;
          }
        }
      `}</style>
    </div>
  );
}
