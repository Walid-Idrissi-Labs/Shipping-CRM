import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Check, ChevronLeft, ChevronRight, Mail, Phone, Package, MapPin, Globe } from 'lucide-react';
import { FormField, Section, Row, Column } from '../../components/ui/Form';
import { MultiColisForm } from '../../components/MultiColisForm';
import CountrySelect from '../../components/ui/CountrySelect';
import api, { csrf } from '../../api/axios';

const step1Initial = {
  origin_city: '', origin_country: 'MA',
  recipient_address: '', recipient_city: '', recipient_postal_code: '', recipient_country: 'MA',
  type_service: 'national',
  valeur_declaree: '', devise_valeur: 'MAD'
};

const step2Initial = {
  client_name: '', client_email: '', client_phone: ''
};

export default function QuoteRequest() {
  const [step, setStep] = useState(1);
  const [step1, setStep1] = useState(step1Initial);
  const [step2, setStep2] = useState(step2Initial);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState(1);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // MultiColisForm state
  const [colis, setColis] = useState([{
    nb_pieces: 1,
    poids: '',
    longueur: '',
    largeur: '',
    hauteur: '',
    type_colis: 'paquet',
    description_colis: ''
  }]);

  const handleChange1 = (e) => {
    const { name, value } = e.target;
    setStep1((f) => ({ ...f, [name]: value }));
  };

  const handleChange2 = (e) => {
    const { name, value } = e.target;
    setStep2((f) => ({ ...f, [name]: value }));
  };

  const validateStep1 = () => {
    const required = ['origin_city', 'origin_country', 'recipient_address', 'recipient_city', 'recipient_postal_code', 'recipient_country', 'type_service'];
    for (const field of required) {
      if (!step1[field]) {
        setError(`Le champ ${field.replace(/_/g, ' ')} est requis.`);
        return false;
      }
    }
    // Validate at least one colis has poids and type_colis
    const hasValidColis = colis.some(c => c.poids && c.type_colis);
    if (!hasValidColis) {
      setError('Veuillez renseigner au moins un colis avec un poids et un type.');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    if (!step2.client_name) {
      setError('Le nom est requis.');
      return false;
    }
    if (!step2.client_email && !step2.client_phone) {
      setError('Veuillez renseigner au moins un email ou numero de telephone.');
      return false;
    }
    if (step2.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step2.client_email)) {
      setError('Format d\'email invalide.');
      return false;
    }
    setError('');
    return true;
  };

  const goToStep2 = () => {
    if (!validateStep1()) return;
    setDirection(1);
    setStep(2);
  };

  const goToStep1 = () => {
    setDirection(-1);
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    setError('');

    // Build the payload with colis array
    const payload = { 
      ...step1, 
      ...step2,
      colis: colis.map(c => ({
        nb_pieces: c.nb_pieces,
        poids: c.poids ? Number(c.poids) : 0,
        longueur: c.longueur ? Number(c.longueur) : null,
        largeur: c.largeur ? Number(c.largeur) : null,
        hauteur: c.hauteur ? Number(c.hauteur) : null,
        type_colis: c.type_colis,
        description_colis: c.description_colis || null
      }))
    };
    // Convert empty strings to null at top level (colis array preserved as-is)
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, v === '' ? null : v])
    );

    try {
      // Prime CSRF cookie, then POST via api instance (withCredentials + JSON)
      await csrf();
      const res = await api.post('/quote-requests', cleanPayload);

      if (res.status === 201 || res.status === 200) {
        setSuccess(true);
      } else {
        throw new Error('Erreur lors de la soumission.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Erreur lors de la soumission.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div>
        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div className="mx-auto" style={{ maxWidth: 560, padding: '80px 24px' }}>
          <div
            className="surface-canvas animate-fade-in-up text-center"
            style={{
              background: 'var(--color-paper-white)',
              border: '1px solid var(--color-ash)',
              borderRadius: 16,
              padding: 40,
            }}
          >
            <div
              className="mx-auto mb-4 flex items-center justify-center"
              style={{
                width: 56, height: 56, borderRadius: 9999,
                background: 'var(--color-bone)', color: 'var(--color-vivid-green)',
              }}
            >
              <Check size={28} />
            </div>
            <h1 className="display-headline" style={{ fontSize: 32 }}>Demande envoyee</h1>
            <p style={{ fontSize: 14, color: 'var(--color-iron)', maxWidth: 420, margin: '16px auto 0' }}>
              Notre equipe vous contactera bientot avec une proposition commerciale detaillee.
            </p>
            <div className="flex flex-wrap gap-3 justify-center" style={{ marginTop: 28 }}>
              <button onClick={() => navigate('/')} className="btn btn-secondary">Retour a l'accueil</button>
              <button onClick={() => { setSuccess(false); setStep(1); setStep1(step1Initial); setStep2(step2Initial); setColis([{ nb_pieces: 1, poids: '', longueur: '', largeur: '', hauteur: '', type_colis: 'paquet', description_colis: '' }]); }} className="btn btn-primary">Nouvelle demande</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutRight {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(30px); }
        }
        @keyframes slideOutLeft {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(-30px); }
        }
        .step-enter { animation: slideInRight 0.4s ease forwards; }
        .step-enter-reverse { animation: slideInLeft 0.4s ease forwards; }
        .step-exit { animation: slideOutLeft 0.4s ease forwards; }
        .step-exit-reverse { animation: slideOutRight 0.4s ease forwards; }
        .step-dots { position: fixed; top: 50%; right: 24px; transform: translateY(-50%); display: flex; flex-direction: column; gap: 16px; z-index: 100; }
        .step-dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--color-ash); background: var(--color-paper-white); transition: all 0.3s ease; position: relative; }
        .step-dot.active { background: var(--color-primary); border-color: var(--color-primary); }
        .step-dot::after { content: attr(data-label); position: absolute; right: 20px; top: 50%; transform: translateY(-50%); white-space: nowrap; font-size: 12px; color: var(--color-steel); opacity: 0; pointer-events: none; transition: opacity 0.2s; }
        .step-dot:hover::after { opacity: 1; }
        .step-dot.active::after { opacity: 1; color: var(--color-primary); font-weight: 500; }
        @media (max-width: 768px) { .step-dots { display: none; } }
      `}</style>

      <div className="step-dots" aria-hidden="true">
        <div className={`step-dot ${step === 1 ? 'active' : ''}`} data-label="Origine & Destination" />
        <div className={`step-dot ${step === 2 ? 'active' : ''}`} data-label="Informations Contact" />
      </div>

      <div className="mx-auto" style={{ maxWidth: 1080, padding: '48px 24px 64px' }}>
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <h1 className="display-headline" style={{ fontSize: 38 }}>Demande de Devis Express</h1>
          <p style={{ fontSize: 14, color: 'var(--color-steel)', maxWidth: 540, margin: '12px auto 0' }}>
            Decrivez votre expedition en deux etapes simples.
          </p>
        </div>

        <div ref={containerRef} style={{ position: 'relative', minHeight: 500 }}>
          {step === 1 && (
            <form
              onSubmit={(e) => { e.preventDefault(); goToStep2(); }}
              className="step-enter surface-canvas"
              style={{
                background: 'var(--color-paper-white)',
                border: '1px solid var(--color-ash)',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <div>
                {error && (
                  <div style={{ background: 'var(--color-danger-container)', color: 'var(--color-danger)', padding: '10px 24px', fontSize: 13, borderBottom: '1px solid var(--color-ash)' }}>
                    {error}
                  </div>
                )}

                <div style={{ padding: '28px 28px 0' }}>
                  <Section
                    title="Origine"
                    description="Adresse d'enlèvement du colis."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                      <FormField label="Ville d'origine" required>
                        <input
                          name="origin_city"
                          value={step1.origin_city}
                          onChange={handleChange1}
                          placeholder="Ville d'enlèvement"
                          className="input"
                          required
                        />
                      </FormField>
                      <FormField label="Pays d'origine" required>
                        <CountrySelect
                          name="origin_country"
                          value={step1.origin_country}
                          onChange={handleChange1}
                          required
                        />
                      </FormField>
                    </div>
                  </Section>

                  <Section
                    title="Destination"
                    description="Adresse de livraison du colis."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                      <FormField label="Adresse" required>
                        <input
                          name="recipient_address"
                          value={step1.recipient_address}
                          onChange={handleChange1}
                          placeholder="Adresse de livraison"
                          className="input"
                          required
                        />
                      </FormField>
                      <FormField label="Ville" required>
                        <input
                          name="recipient_city"
                          value={step1.recipient_city}
                          onChange={handleChange1}
                          placeholder="Ville"
                          className="input"
                          required
                        />
                      </FormField>
                      <FormField label="Code postal" required>
                        <input
                          name="recipient_postal_code"
                          value={step1.recipient_postal_code}
                          onChange={handleChange1}
                          placeholder="Code postal"
                          className="input"
                          required
                        />
                      </FormField>
                      <FormField label="Pays" required>
                        <CountrySelect
                          name="recipient_country"
                          value={step1.recipient_country}
                          onChange={handleChange1}
                          required
                        />
                      </FormField>
                    </div>
                  </Section>
                </div>

                <div style={{ padding: '24px 28px', borderTop: '1px solid var(--color-ash)' }}>
                  <MultiColisForm
                    colis={colis}
                    onChange={setColis}
                    showTotals={true}
                  />
                  <FormField label="Valeur Totale Declaree" style={{ marginTop: 12 }} hint="Valeur totale declaree pour l'ensemble des colis.">
                    <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--color-ash)', borderRadius: 8, background: 'var(--color-paper-white)', overflow: 'hidden' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input name="valeur_declaree" value={step1.valeur_declaree} onChange={handleChange1} type="number" step="0.01" min="0" className="input" style={{ borderRadius: 0, borderRight: 'none', border: 'none', boxShadow: 'none' }} />
                      </div>
                      <div style={{ width: 90, borderLeft: '1px solid var(--color-ash)', background: 'var(--color-fog)' }}>
                        <select name="devise_valeur" value={step1.devise_valeur} onChange={handleChange1} className="select" style={{ borderRadius: 0, border: 'none', boxShadow: 'none', background: 'transparent' }}>
                          <option value="MAD">MAD</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                    </div>
                  </FormField>
                  <FormField label="Type de service">
                    <select name="type_service" value={step1.type_service} onChange={handleChange1} className="select">
                      <option value="national">National</option>
                      <option value="international_express_dap">International Express DAP</option>
                      <option value="fret_aerien">Fret Aerien</option>
                      <option value="routier_groupage">Routier (Groupage)</option>
                      <option value="maritime_groupage">Maritime (Groupage)</option>
                    </select>
                  </FormField>
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--color-ash)',
                    background: 'var(--color-bone)',
                    padding: '20px 28px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ minWidth: 200 }}
                  >
                    <ChevronRight size={16} /> Suivant
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 2 && (
            <form
              onSubmit={handleSubmit}
              className={`surface-canvas ${direction === 1 ? 'step-enter' : 'step-enter-reverse'}`}
              style={{
                background: 'var(--color-paper-white)',
                border: '1px solid var(--color-ash)',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <div>
                {error && (
                  <div style={{ background: 'var(--color-danger-container)', color: 'var(--color-danger)', padding: '10px 24px', fontSize: 13, borderBottom: '1px solid var(--color-ash)' }}>
                    {error}
                  </div>
                )}

                <div style={{ padding: '28px 28px 24px' }}>
                  <Section
                    title="Vos informations de contact"
                    description="Nous vous contacterons pour vous envoyer le devis."
                  >
                    <FormField label="Nom" required>
                      <input
                        name="client_name"
                        value={step2.client_name}
                        onChange={handleChange2}
                        placeholder="Votre nom"
                        className="input"
                        required
                      />
                    </FormField>

                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                      <FormField label="Email" hint="Ou telephone ci-dessous">
                        <input
                          name="client_email"
                          value={step2.client_email}
                          onChange={handleChange2}
                          type="email"
                          placeholder="email@exemple.com"
                          className="input"
                        />
                      </FormField>
                      <FormField label="Telephone" hint="Ou email ci-dessus">
                        <input
                          name="client_phone"
                          value={step2.client_phone}
                          onChange={handleChange2}
                          placeholder="+212 6XX XX XX XX"
                          className="input"
                        />
                      </FormField>
                    </div>

                    <p style={{ fontSize: 12, color: 'var(--color-steel)', marginTop: 8 }}>
                      Au moins un des deux champs (email ou telephone) est obligatoire.
                    </p>
                  </Section>
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--color-ash)',
                    background: 'var(--color-bone)',
                    padding: '20px 28px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={goToStep1}
                    className="btn btn-ghost"
                  >
                    <ChevronLeft size={14} /> Retour
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ minWidth: 200 }}
                  >
                    <Send size={16} />
                    {loading ? 'Envoi en cours...' : 'Envoyer la Demande'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}