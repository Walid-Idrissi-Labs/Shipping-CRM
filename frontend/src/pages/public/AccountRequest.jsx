import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Check } from 'lucide-react';
import { FormField, Section } from '../../components/ui/Form';
import api, { csrf } from '../../api/axios';

const MAX_NOTES = 500;
const initial = {
  full_name: '', email: '', phone: '', address: '', city: '', postal_code: '', ice: '', notes: ''
};

export default function AccountRequest() {
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
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Format d\'email invalide.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await csrf();
      await api.post('/account-requests', form);
      setSuccess(true);
      setForm(initial);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erreur lors de l\'envoi.');
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
            <h1 className="public-serif" style={{ fontSize: 32 }}>Demande soumise</h1>
            <p style={{ fontSize: 14, color: 'var(--color-iron)', maxWidth: 420, margin: '16px auto 0' }}>
              Votre demande a été envoyée. Votre compte sera créé sous peu et vos identifiants vous seront communiqués par email.
            </p>
            <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: 28 }}>
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto" style={{ maxWidth: 760, padding: '48px 24px' }}>
        <div className="text-center" style={{ marginBottom: 36 }}>
          <div
            className="inline-block mb-3"
            style={{
              fontSize: 12, fontWeight: 500, color: 'var(--color-steel)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}
          >
            Devenir client
          </div>
          <h1 className="public-serif" style={{ fontSize: 40 }}>Demande de compte client</h1>
          <p style={{ fontSize: 14, color: 'var(--color-steel)', maxWidth: 540, margin: '12px auto 0' }}>
            Renseignez vos informations. Notre équipe validera votre demande et vous communiquera vos identifiants.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="surface-canvas"
          style={{
            background: 'var(--color-paper-white)',
            border: '1px solid var(--color-ash)',
            borderRadius: 16,
            padding: 32,
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
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          <Section title="Informations principales">
            <FormField label="Nom complet / Entreprise" required>
              <input name="full_name" value={form.full_name} onChange={handleChange} className="input" required />
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
              <FormField label="Email" required>
                <input name="email" value={form.email} onChange={handleChange} type="email" className="input" required />
              </FormField>
              <FormField label="Téléphone" required>
                <input name="phone" value={form.phone} onChange={handleChange} className="input" required />
              </FormField>
            </div>
          </Section>

          <Section title="Adresse" description="Optionnel. Peut être complété ultérieurement.">
            <FormField label="Adresse"><input name="address" value={form.address} onChange={handleChange} className="input" /></FormField>
            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16 }}>
              <FormField label="Ville"><input name="city" value={form.city} onChange={handleChange} className="input" /></FormField>
              <FormField label="Code postal"><input name="postal_code" value={form.postal_code} onChange={handleChange} className="input" /></FormField>
              <FormField label="ICE"><input name="ice" value={form.ice} onChange={handleChange} className="input" /></FormField>
            </div>
          </Section>

          <FormField label="Notes supplémentaires" hint={`${form.notes.length} / ${MAX_NOTES} caractères`}>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              maxLength={MAX_NOTES}
              placeholder="Avez-vous une demande particulière ?"
              className="textarea"
            />
          </FormField>

          <div className="flex flex-col sm:flex-row sm:justify-end" style={{ marginTop: 24, gap: 12 }}>
            <button type="button" onClick={() => navigate('/')} className="btn btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Send size={16} />
              {loading ? 'Envoi...' : 'Soumettre la Demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
