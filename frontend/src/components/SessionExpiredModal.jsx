import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FormField } from './ui/Form';

// Shown over whatever the user was doing when the session lapsed. Deliberately
// does NOT navigate: sending someone to /login mid-form throws away everything
// they had typed. They sign back in here and carry on with the page intact.
//
// This outer component holds no state of its own, so the dialog below mounts
// fresh every time the session lapses and initialises its fields from props —
// no effect needed to reset them between openings.
export default function SessionExpiredModal() {
  const { user, sessionExpired, reauthenticate, logout } = useAuth();

  if (!sessionExpired) return null;

  return (
    <ReauthDialog
      defaultIdentifier={user?.email || ''}
      onReauthenticate={reauthenticate}
      onLogout={logout}
    />
  );
}

function ReauthDialog({ defaultIdentifier, onReauthenticate, onLogout }) {
  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onReauthenticate(identifier, password);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) setError('Mot de passe incorrect.');
      else if (!err.response) setError('Serveur injoignable. Vérifiez votre connexion.');
      else setError(err.response?.data?.message || 'Connexion impossible. Veuillez réessayer.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        className="dialog-surface"
        style={{
          background: 'var(--color-paper-white)',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px var(--color-ash)',
          padding: 24,
          maxWidth: 420,
          width: 'calc(100% - 32px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div
            className="icon-tile icon-tile-primary rounded-full"
            style={{ width: 40, height: 40, flexShrink: 0 }}
          >
            <LockKeyhole size={18} />
          </div>
          <h2 id="session-expired-title" className="section-heading" style={{ margin: 0 }}>
            Reconnectez-vous
          </h2>
        </div>

        <p style={{ fontSize: 13, color: 'var(--color-steel)', marginBottom: 16 }}>
          Votre session a expiré. Entrez votre mot de passe pour continuer — votre travail
          en cours est conservé.
        </p>

        {error && (
          <div
            style={{
              background: 'var(--color-danger-container)',
              color: 'var(--color-danger)',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FormField label="Identifiant" required>
            <input
              className="input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </FormField>
          <FormField label="Mot de passe" required>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </FormField>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
            <button type="button" className="btn btn-ghost" onClick={onLogout} disabled={busy}>
              Se déconnecter
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Connexion...' : 'Continuer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
