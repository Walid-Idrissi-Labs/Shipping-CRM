import { useMinLoading } from '../../hooks';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {Send, Check, ChevronLeft, ChevronRight, AlertCircle} from 'lucide-react';
import {FormField, Section} from '../../components/ui/Form';
import CountrySelect from '../../components/ui/CountrySelect';
import OrbitLoader from '../../components/ui/OrbitLoader';
import api, { csrf } from '../../api/axios';

const step1Initial = {
  sender_name: '', sender_company: '', sender_address: '', sender_city: '', sender_postal_code: '', sender_country: 'MA', sender_email: '', sender_phone: '',
};

const step2Initial = {
  recipient_name: '', recipient_company: '', recipient_address: '', recipient_city: '', recipient_postal_code: '', recipient_country: 'MA', recipient_phone: '', recipient_email: '',
};

const step3Initial = {
  valeur_declaree: '', devise_valeur: 'MAD', type_service: 'national',
};

export default function CompleteExpedition() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [step1, setStep1] = useState(step1Initial);
  const [step2, setStep2] = useState(step2Initial);
  const [step3, setStep3] = useState(step3Initial);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState(1);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const showLoader = useMinLoading(quoteLoading);
  const containerRef = useRef(null);

  // Load quote data on mount
  useEffect(() => {
    fetchQuote();
  }, [token]);

  const fetchQuote = async () => {
    setQuoteLoading(true);
    try {
      const { data } = await api.get(`/expedition-requests/complete/${token}`);
      setQuote(data.quote);
      prefillForm(data.quote);
    } catch (err) {
      setError(err.response?.data?.message || 'Ce lien est invalide ou a expire.');
    } finally {
      setQuoteLoading(false);
    }
  };

  const prefillForm = (q) => {
    // Step 1: Expediteur (from quote client info)
    setStep1((f) => ({
      ...f,
      sender_name: q.client_name || '',
      sender_email: q.client_email || '',
      sender_phone: q.client_phone || '',
      sender_address: q.client_address || '',
      sender_city: q.client_city || '',
      sender_postal_code: q.client_postal_code || '',
      sender_country: q.client_country || 'MA',
    }));

    // Step 2: Destinataire (from quote recipient info - read-only base)
    setStep2((f) => ({
      ...f,
      recipient_name: q.recipient_name || '',
      recipient_company: q.recipient_company || '',
      recipient_address: q.recipient_address || '',
      recipient_city: q.recipient_city || '',
      recipient_postal_code: q.recipient_postal_code || '',
      recipient_country: q.recipient_country || 'MA',
      recipient_phone: q.recipient_phone || '',
    }));

    // Step 3: Colis & Service (from quote)
    setStep3((f) => ({
      ...f,
      type_service: q.type_service || 'national',
      // valeur_declaree and devise_valeur only if present in quote
      valeur_declaree: q.valeur_declaree ?? '',
      devise_valeur: q.devise_valeur || 'MAD',
    }));
  };

  const handleChange1 = (e) => {
    const { name, value } = e.target;
    setStep1((f) => ({ ...f, [name]: value }));
  };

  const handleChange2 = (e) => {
    const { name, value } = e.target;
    setStep2((f) => ({ ...f, [name]: value }));
  };

  const handleChange3 = (e) => {
    const { name, value } = e.target;
    setStep3((f) => ({ ...f, [name]: value }));
  };

  const validateStep1 = () => {
    const required = ['sender_name'];
    for (const field of required) {
      if (!step1[field]) {
        setError(`Le champ ${field.replace(/_/g, ' ')} est requis.`);
        return false;
      }
    }
    if (step1.sender_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step1.sender_email)) {
      setError('Format d\'email invalide.');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    const required = ['recipient_name', 'recipient_address', 'recipient_city', 'recipient_postal_code', 'recipient_country'];
    for (const field of required) {
      if (!step2[field]) {
        setError(`Le champ ${field.replace(/_/g, ' ')} est requis.`);
        return false;
      }
    }
    if (step2.recipient_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step2.recipient_email)) {
      setError('Format d\'email invalide.');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep3 = () => {
    // valeur_declaree is optional
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

  const goToStep3 = () => {
    if (!validateStep2()) return;
    setDirection(1);
    setStep(3);
  };

  const goToStep2Back = () => {
    setDirection(-1);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setLoading(true);
    setError('');

    const payload = {
      ...step1,
      ...step2,
      ...step3,
      // Include colis from quote (read-only)
      colis: quote?.colis || [],
    };

    // Clean empty strings
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, v === '' ? null : v])
    );

    try {
      await csrf();
      const res = await api.post(`/expedition-requests/complete/${token}`, cleanPayload);

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

  if (showLoader) {
    return (
      <div style={{ maxWidth: 560, padding: '80px 24px', margin: '0 auto' }}>
        <div className="surface-canvas text-center" style={{ padding: 40, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><OrbitLoader /></div>
          <p style={{ color: 'var(--color-iron)' }}>Verification du lien...</p>
        </div>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div style={{ maxWidth: 560, padding: '80px 24px', margin: '0 auto' }}>
        <div className="surface-canvas text-center" style={{ padding: 40, borderRadius: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#9888;</div>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>Lien invalide</h1>
          <p style={{ color: 'var(--color-iron)', marginBottom: 24 }}>{error}</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">Retour a l'accueil</button>
        </div>
      </div>
    );
  }

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
              Notre equipe a bien recu votre demande d'expedition. Nous la traiterons dans les meilleurs delais.
            </p>
            <div className="flex flex-wrap gap-3 justify-center" style={{ marginTop: 28 }}>
              <button onClick={() => navigate('/')} className="btn btn-primary">Retour a l'accueil</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const recipientReadOnly = {
    city: quote?.recipient_city,
    postal_code: quote?.recipient_postal_code,
    country: quote?.recipient_country,
  };

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
        <div className={`step-dot ${step === 1 ? 'active' : ''}`} data-label="Expediteur" />
        <div className={`step-dot ${step === 2 ? 'active' : ''}`} data-label="Destinataire" />
        <div className={`step-dot ${step === 3 ? 'active' : ''}`} data-label="Colis & Service" />
      </div>

      <div className="mx-auto" style={{ maxWidth: 1080, padding: '48px 24px 64px' }}>
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <h1 className="display-headline" style={{ fontSize: 38 }}>Completer l'Expedition</h1>
          <p style={{ fontSize: 14, color: 'var(--color-steel)', maxWidth: 540, margin: '12px auto 0' }}>
            Ce lien est unique et expire dans 60 jours. Merci de completer les informations manquantes.
            <br />
            <strong>Devis :</strong> {quote?.quote_number}
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
                    <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {error}
                  </div>
                )}

                <div style={{ padding: '28px 28px 0' }}>
                  <Section
                    title="Expediteur"
                    description="Vos informations d'envoi. Pre-remplies depuis votre demande de devis, modifiables si besoin."
                  >
                    <FormField label="Nom" required>
                      <input
                        name="sender_name"
                        value={step1.sender_name}
                        onChange={handleChange1}
                        placeholder="Votre nom"
                        className="input"
                        required
                      />
                    </FormField>

                    <FormField label="Entreprise">
                      <input
                        name="sender_company"
                        value={step1.sender_company}
                        onChange={handleChange1}
                        placeholder="Nom de l'entreprise (optionnel)"
                        className="input"
                      />
                    </FormField>

                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                      <FormField label="Email">
                        <input
                          name="sender_email"
                          value={step1.sender_email}
                          onChange={handleChange1}
                          type="email"
                          placeholder="email@exemple.com"
                          className="input"
                        />
                      </FormField>
                      <FormField label="Telephone">
                        <input
                          name="sender_phone"
                          value={step1.sender_phone}
                          onChange={handleChange1}
                          placeholder="+212 6XX XX XX XX"
                          className="input"
                        />
                      </FormField>
                    </div>

                    <FormField label="Adresse">
                      <input
                        name="sender_address"
                        value={step1.sender_address}
                        onChange={handleChange1}
                        placeholder="Adresse d'enlevement"
                        className="input"
                      />
                    </FormField>

                    <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16 }}>
                      <FormField label="Ville">
                        <input
                          name="sender_city"
                          value={step1.sender_city}
                          onChange={handleChange1}
                          placeholder="Ville"
                          className="input"
                        />
                      </FormField>
                      <FormField label="Code postal">
                        <input
                          name="sender_postal_code"
                          value={step1.sender_postal_code}
                          onChange={handleChange1}
                          placeholder="Code postal"
                          className="input"
                        />
                      </FormField>
                      <FormField label="Pays">
                        <CountrySelect
                          name="sender_country"
                          value={step1.sender_country}
                          onChange={handleChange1}
                        />
                      </FormField>
                    </div>
                  </Section>
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
              onSubmit={(e) => { e.preventDefault(); goToStep3(); }}
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
                    <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {error}
                  </div>
                )}

                <div style={{ padding: '28px 28px 24px' }}>
                  <Section
                    title="Destinataire"
                    description="Les informations du destinataire. Les champs pre-remplis (depuis votre demande de devis) ne sont pas modifiables."
                  >
                    <div style={{ marginBottom: 20, padding: 16, background: 'var(--color-bone)', borderRadius: 8, border: '1px solid var(--color-ash)' }}>
                      <div style={{ fontSize: 12, color: 'var(--color-smoke)', textTransform: 'uppercase', marginBottom: 8 }}>Informations pre-remplies (non modifiables)</div>
                      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--color-smoke)', display: 'block', marginBottom: 4 }}>Ville</label>
                          <input value={recipientReadOnly.city || '-'} readOnly className="input" style={{ background: 'var(--color-paper-white)', cursor: 'not-allowed' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--color-smoke)', display: 'block', marginBottom: 4 }}>Code postal</label>
                          <input value={recipientReadOnly.postal_code || '-'} readOnly className="input" style={{ background: 'var(--color-paper-white)', cursor: 'not-allowed' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--color-smoke)', display: 'block', marginBottom: 4 }}>Pays</label>
                          <input value={recipientReadOnly.country || '-'} readOnly className="input" style={{ background: 'var(--color-paper-white)', cursor: 'not-allowed' }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ fontSize: 13, color: 'var(--color-graphite)', marginBottom: 12 }}>Informations complementaires (a completer)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                        <FormField label="Nom du destinataire" required>
                          <input
                            name="recipient_name"
                            value={step2.recipient_name}
                            onChange={handleChange2}
                            placeholder="Nom du destinataire"
                            className="input"
                            required
                          />
                        </FormField>
                        <FormField label="Adresse de livraison" required>
                          <input
                            name="recipient_address"
                            value={step2.recipient_address}
                            onChange={handleChange2}
                            placeholder="Adresse de livraison"
                            className="input"
                            required
                          />
                        </FormField>
                        <FormField label="Entreprise">
                          <input
                            name="recipient_company"
                            value={step2.recipient_company}
                            onChange={handleChange2}
                            placeholder="Nom de l'entreprise destinataire"
                            className="input"
                          />
                        </FormField>
                        <FormField label="Telephone">
                          <input
                            name="recipient_phone"
                            value={step2.recipient_phone}
                            onChange={handleChange2}
                            placeholder="+212 6XX XX XX XX"
                            className="input"
                          />
                        </FormField>
                        <FormField label="Email">
                          <input
                            name="recipient_email"
                            value={step2.recipient_email}
                            onChange={handleChange2}
                            type="email"
                            placeholder="email@exemple.com"
                            className="input"
                          />
                        </FormField>
                      </div>
                    </div>
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
                    <ChevronRight size={16} /> Suivant
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 3 && (
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
                    <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {error}
                  </div>
                )}

                <div style={{ padding: '28px 28px 24px' }}>
                  <Section
                    title="Colis"
                    description="Caracteristiques des colis (pre-remplies depuis votre demande de devis, lecture seule)."
                  >
{quote?.colis && quote.colis.length > 0 ? (
                <>
                  {quote.colis.map((c, idx) => (
                    <div key={idx} style={{ padding: '8px', background: 'var(--color-bone)', borderRadius: 6, border: '1px solid var(--color-ash)', marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Colis {idx + 1}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
                        {c.type_colis && <span><strong>Type:</strong> {c.type_colis}</span>}
                        {c.nb_pieces && <span><strong>Pièces:</strong> {c.nb_pieces}</span>}
                        {c.poids != null && <span><strong>Poids/pièce:</strong> {c.poids} kg</span>}
                        {c.poids != null && c.nb_pieces && <span><strong>Poids total:</strong> {(c.nb_pieces * c.poids).toFixed(3)} kg</span>}
                        {c.longueur && c.largeur && c.hauteur && (
                          <span><strong>Dimensions:</strong> {c.longueur} x {c.largeur} x {c.hauteur} cm</span>
                        )}
                        {c.longueur && c.largeur && c.hauteur && c.nb_pieces && (
                          <span><strong>Volume total:</strong> {(c.nb_pieces * (c.longueur/100) * (c.largeur/100) * (c.hauteur/100)).toFixed(4)} m³</span>
                        )}
                        {c.description_colis && <span><strong>Description:</strong> {c.description_colis}</span>}
                      </div>
                    </div>
                  ))}
                </>
                    ) : (
                      <div style={{ color: 'var(--color-iron)', fontSize: 13 }}>
                        Aucune information de colis disponible.
                      </div>
                    )}
                  </Section>

                  <Section
                    title="Valeur Declaree"
                    description="Valeur totale declaree pour l'ensemble des colis (optionnel)."
                    style={{ marginTop: 24 }}
                  >
                    <FormField label="Valeur Totale Declaree">
                      <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--color-ash)', borderRadius: 8, background: 'var(--color-paper-white)', overflow: 'hidden', marginTop: 4 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <input
                            name="valeur_declaree"
                            value={step3.valeur_declaree}
                            onChange={handleChange3}
                            type="number"
                            step="0.01"
                            min="0"
                            className="input"
                            style={{ borderRadius: 0, borderRight: 'none', border: 'none', boxShadow: 'none' }}
                          />
                        </div>
                        <div style={{ width: 90, borderLeft: '1px solid var(--color-ash)', background: 'var(--color-fog)' }}>
                          <select
                            name="devise_valeur"
                            value={step3.devise_valeur}
                            onChange={handleChange3}
                            className="select"
                            style={{ borderRadius: 0, border: 'none', boxShadow: 'none', background: 'transparent' }}
                          >
                            <option value="MAD">MAD</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                          </select>
                        </div>
                      </div>
                    </FormField>

                    <FormField label="Type de service" style={{ marginTop: 12 }}>
                      <select name="type_service" value={step3.type_service} onChange={handleChange3} className="select" disabled>
                        <option value="national">National</option>
                        <option value="international_express_dap">International Express DAP</option>
                        <option value="fret_aerien">Fret Aerien</option>
                        <option value="routier_groupage">Routier (Groupage)</option>
                        <option value="maritime_groupage">Maritime (Groupage)</option>
                      </select>
                      <p style={{ fontSize: 11, color: 'var(--color-smoke)', marginTop: 4 }}>
                        Pre-defini depuis le devis, non modifiable.
                      </p>
                    </FormField>
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
                    onClick={goToStep2Back}
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