import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Check } from 'lucide-react';
import { FormField, Section } from '../../components/ui/Form';

const initial = {
  client_name: '', client_address: '', client_city: '', client_country: 'Maroc', client_postal_code: '', client_email: '', client_phone: '',
  recipient_name: '', recipient_company: '', recipient_email: '', recipient_address: '', recipient_city: '', recipient_country: '', recipient_postal_code: '', recipient_phone: '',
  poids: '', longueur: '', largeur: '', hauteur: '', nb_pieces: 1,
  type_colis: 'paquet', type_service: 'national', description_colis: ''
};

export default function QuoteRequest() {
  const [form, setForm] = useState(initial);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erreur lors de la soumission.');
      }
      setSuccess(true);
      setForm(initial);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div>
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
              <button onClick={() => setSuccess(false)} className="btn btn-primary">Nouvelle demande</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .page-header-fade { animation: fadeInUp 0.5s ease forwards; }
        .page-content-fade { animation: fadeInUp 0.5s ease 0.15s forwards; opacity: 0; }
      `}</style>
      <div className="mx-auto" style={{ maxWidth: 1080, padding: '48px 24px 64px' }}>
        <div className="page-header-fade text-center" style={{ marginBottom: 36 }}>
          <div
            className="inline-block mb-3"
            style={{
              fontSize: 12, fontWeight: 500, color: 'var(--color-steel)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}
          >
            
          </div>
          <h1 className="display-headline" style={{ fontSize: 38 }}>Demande de Devis Express</h1>
          <p style={{ fontSize: 14, color: 'var(--color-steel)', maxWidth: 540, margin: '12px auto 0' }}>
            Renseignez les details de votre expedition. Vous recevrez votre devis par email sous peu.
          </p>
        </div>

        <div className="page-content-fade">
          <form
            onSubmit={handleSubmit}
            className="surface-canvas"
            style={{
              background: 'var(--color-paper-white)',
              border: '1px solid var(--color-ash)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
          {error && (
            <div
              style={{
                background: 'var(--color-danger-container)',
                color: 'var(--color-danger)',
                padding: '10px 14px',
                borderRadius: 6,
                fontSize: 13,
                margin: '24px 24px 0',
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)',
              gap: 0,
            }}
            className="qr-grid"
          >
            {/* LEFT COLUMN - Expediteur */}
            <div
              style={{
                padding: '28px 28px 24px',
                borderRight: '1px solid var(--color-ash)',
              }}
              className="qr-left-col"
            >
              <Section
                title="Expediteur"
                description="Vos informations de contact pour la facturation."
              >
                <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                  <FormField label="Nom / Entreprise" required>
                    <input
                      name="client_name"
                      value={form.client_name}
                      onChange={handleChange}
                      placeholder="Nom ou raison sociale"
                      className="input"
                      required
                    />
                  </FormField>
                  <FormField label="Email" required>
                    <input
                      name="client_email"
                      value={form.client_email}
                      onChange={handleChange}
                      placeholder="email@entreprise.com"
                      type="email"
                      className="input"
                      required
                    />
                  </FormField>
                  <FormField label="Telephone" required>
                    <input
                      name="client_phone"
                      value={form.client_phone}
                      onChange={handleChange}
                      placeholder="+212 6XX XX XX XX"
                      className="input"
                      required
                    />
                  </FormField>
                  <FormField label="Adresse" required>
                    <input
                      name="client_address"
                      value={form.client_address}
                      onChange={handleChange}
                      placeholder="Adresse"
                      className="input"
                      required
                    />
                  </FormField>
                  <FormField label="Ville" required>
                    <input
                      name="client_city"
                      value={form.client_city}
                      onChange={handleChange}
                      placeholder="Ville"
                      className="input"
                      required
                    />
                  </FormField>
                  <FormField label="Code postal" required>
                    <input
                      name="client_postal_code"
                      value={form.client_postal_code}
                      onChange={handleChange}
                      placeholder="Code postal"
                      className="input"
                      required
                    />
                  </FormField>
                  <FormField label="Pays" required>
                    <input
                      name="client_country"
                      value={form.client_country}
                      onChange={handleChange}
                      className="input"
                      required
                    />
                  </FormField>
                </div>
              </Section>
            </div>

            {/* RIGHT COLUMN - Destinataire (top) + Colis (bottom) */}
            <div style={{ display: 'flex', flexDirection: 'column' }} className="qr-right-col">
              <div style={{ padding: '28px 28px 24px' }}>
                <Section
                  title="Destinataire"
                  description="Personne ou societe qui receptionnera le colis."
                >
                  <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                    <FormField label="Nom" required>
                      <input
                        name="recipient_name"
                        value={form.recipient_name}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </FormField>
                    <FormField label="Entreprise">
                      <input
                        name="recipient_company"
                        value={form.recipient_company}
                        onChange={handleChange}
                        className="input"
                      />
                    </FormField>
                    <FormField label="Email">
                      <input
                        name="recipient_email"
                        value={form.recipient_email}
                        onChange={handleChange}
                        type="email"
                        className="input"
                      />
                    </FormField>
                    <FormField label="Telephone">
                      <input
                        name="recipient_phone"
                        value={form.recipient_phone}
                        onChange={handleChange}
                        className="input"
                      />
                    </FormField>
                    <FormField label="Adresse" required>
                      <input
                        name="recipient_address"
                        value={form.recipient_address}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </FormField>
                    <FormField label="Ville" required>
                      <input
                        name="recipient_city"
                        value={form.recipient_city}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </FormField>
                    <FormField label="Code postal" required>
                      <input
                        name="recipient_postal_code"
                        value={form.recipient_postal_code}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </FormField>
                    <FormField label="Pays" required>
                      <input
                        name="recipient_country"
                        value={form.recipient_country}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </FormField>
                  </div>
                </Section>
              </div>

              <div
                style={{
                  padding: '24px 28px 28px',
                  borderTop: '1px solid var(--color-ash)',
                }}
              >
                <Section
                  title="Colis"
                  description="Dimensions et caracteristiques du colis."
                >
                  <div
                    className="grid grid-cols-1"
                    style={{ gap: 16 }}
                  >
                    <FormField label="Service souhaite" required>
                      <select
                        name="type_service"
                        value={form.type_service}
                        onChange={handleChange}
                        className="select"
                      >
                        <option value="national">National</option>
                        <option value="international_express_dap">International Express (DAP)</option>
                        <option value="fret_aerien">Fret Aerien</option>
                        <option value="routier_groupage">Routier (Groupage)</option>
                        <option value="maritime_groupage">Maritime (Groupage)</option>
                      </select>
                    </FormField>

                    <div
                      className="grid grid-cols-1 md:grid-cols-3"
                      style={{ gap: 16 }}
                    >
                      <FormField label="Poids (kg)" required>
                        <input
                          name="poids"
                          value={form.poids}
                          onChange={handleChange}
                          type="number"
                          step="0.001"
                          min="0"
                          className="input"
                          required
                        />
                      </FormField>
                      <FormField label="Nb pieces" required>
                        <input
                          name="nb_pieces"
                          value={form.nb_pieces}
                          onChange={handleChange}
                          type="number"
                          min="1"
                          className="input"
                          required
                        />
                      </FormField>
                      <FormField label="Type de colis">
                        <select
                          name="type_colis"
                          value={form.type_colis}
                          onChange={handleChange}
                          className="select"
                        >
                          <option value="document">Document</option>
                          <option value="paquet">Paquet</option>
                          <option value="palette">Palette</option>
                        </select>
                      </FormField>

                      <FormField label="Longueur (cm)" required>
                        <input
                          name="longueur"
                          value={form.longueur}
                          onChange={handleChange}
                          type="number"
                          step="0.01"
                          min="0"
                          className="input"
                          required
                        />
                      </FormField>
                      <FormField label="Largeur (cm)" required>
                        <input
                          name="largeur"
                          value={form.largeur}
                          onChange={handleChange}
                          type="number"
                          step="0.01"
                          min="0"
                          className="input"
                          required
                        />
                      </FormField>
                      <FormField label="Hauteur (cm)" required>
                        <input
                          name="hauteur"
                          value={form.hauteur}
                          onChange={handleChange}
                          type="number"
                          step="0.01"
                          min="0"
                          className="input"
                          required
                        />
                      </FormField>
                    </div>

                    <FormField label="Description" hint="60 caracteres maximum">
                      <input
                        name="description_colis"
                        value={form.description_colis}
                        onChange={handleChange}
                        maxLength={60}
                        placeholder="Description de la marchandise"
                        className="input"
                      />
                    </FormField>
                  </div>
                </Section>
              </div>
            </div>
          </div>

          {/* Submit bar - detached, full width, separated by hairline */}
          <div
            style={{
              borderTop: '1px solid var(--color-ash)',
              background: 'var(--color-bone)',
              padding: '20px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: 13, color: 'var(--color-steel)' }}>
              Vous recevrez votre devis par email sous 24h.
            </div>
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
        </form>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .qr-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .qr-left-col {
            border-right: none !important;
            border-bottom: 1px solid var(--color-ash);
          }
        }
      `}</style>
    </div>
  );
}
