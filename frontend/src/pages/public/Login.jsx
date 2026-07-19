import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { ChevronLeft, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { FormField } from '../../components/ui/Form';
import Globe from '../../components/ui/Globe';

const HOME_BY_ROLE = {
  prestataire: '/dashboard',
  employe: '/employe/changer-statut',
  client: '/client',
};

const homeFor = (role) => HOME_BY_ROLE[role] || '/client';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to the appropriate home
  if (user) {
    return <Navigate to={homeFor(user.role)} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(identifier, password, remember);
      navigate(homeFor(loggedUser.role));
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setError('Identifiants incorrects. Veuillez réessayer.');
      } else if (status === 419) {
        setError('Votre session a expiré. Veuillez recharger la page et réessayer.');
      } else if (!err.response) {
        setError('Serveur injoignable. Vérifiez votre connexion et réessayez.');
      } else {
        setError(err.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-split"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--color-paper-white)',
      }}
    >
      <div
        className="login-form-side"
        style={{
          flex: '0 0 40%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background:
            'radial-gradient(ellipse 60% 55% at 82% 4%, rgba(74, 198, 76, 0.09), transparent 62%), radial-gradient(ellipse 70% 60% at 8% 0%, rgba(37, 68, 176, 0.12), transparent 58%), var(--color-paper-white)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div
            className="surface-canvas"
            style={{
              background: 'var(--color-paper-white)',
              border: '1px solid var(--color-ash)',
              borderRadius: 16,
              padding: 32,
              boxShadow: '0 24px 60px -24px rgba(37, 68, 176, 0.18)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
                <Link to="/" className="lp-logo" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <img
                    src="/logos/dpex-logo-gif_final.png"
                    alt="DPEX"
                    style={{ height: 50, width: 'auto', objectFit: 'contain' }}
                  />
                </Link>
              </div>
              <h1 className="public-serif" style={{ fontSize: 32 }}>Accédez à votre espace</h1>
            </div>

            {error && (
              <div
                style={{
                  background: 'var(--color-danger-container)',
                  color: 'var(--color-danger)',
                  padding: '10px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <FormField label="Identifiant" required>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email, téléphone ou numéro de compte"
                  className="input"
                  required
                  autoFocus
                />
              </FormField>

              <FormField label="Mot de passe" required>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  className="input"
                  required
                />
              </FormField>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--color-steel)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  marginTop: 4,
                }}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
                Se souvenir de moi
              </label>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }}
              >
                <LogIn size={16} />
                {loading ? 'Connexion...' : 'Se Connecter'}
              </button>
            </form>

            <div
              style={{
                marginTop: 24, fontSize: 13, color: 'var(--color-steel)',
                  borderTop: '1px solid var(--color-ash)', paddingTop: 20, textAlign: 'center',
              }}
            >
              <div style={{ marginBottom: 8 }}>
                Pas encore de compte ?{' '}
                <Link to="/demande-compte">Demander un compte client</Link>
              </div>

            </div>
          </div>
        </div>

        <Link
          to="/"
          className="breadcrumb-home"
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--color-graphite)',
            background: 'transparent',
            zIndex: 3,
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            const u = e.currentTarget.querySelector('.breadcrumb-underline');
            if (u) u.style.transform = 'scaleX(1)';
          }}
          onMouseLeave={(e) => {
            const u = e.currentTarget.querySelector('.breadcrumb-underline');
            if (u) u.style.transform = 'scaleX(0)';
          }}
        >
          <ChevronLeft size={16} />
          <span style={{ position: 'relative' }}>
            Accueil
            <span
              className="breadcrumb-underline"
              style={{
                position: 'absolute',
                bottom: -2,
                left: 0,
                width: '100%',
                height: 1,
                background: 'var(--color-graphite)',
                transform: 'scaleX(0)',
                transformOrigin: 'left',
                transition: 'transform 0.2s ease',
              }}
            />
          </span>
        </Link>
      </div>

      <div
        className="login-globe-side"
        style={{
          flex: '1 1 60%',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--color-bone)',
          padding: 24,
          borderRadius: 32,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
          borderRadius: '32px 32px 0 0',
            overflow: 'hidden',
            background: 'var(--color-bone)',
          }}
        >
          <Globe />

          <div className="login-border-sweep" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
