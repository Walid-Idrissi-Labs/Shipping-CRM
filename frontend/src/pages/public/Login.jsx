import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { FormField } from '../../components/ui/Form';
import Globe from '../../components/ui/Globe';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    if (user.role === 'prestataire') navigate('/dashboard', { replace: true });
    else navigate('/client/mes-expeditions', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(identifier, password);
      if (loggedUser.role === 'prestataire') navigate('/dashboard');
      else navigate('/client/mes-expeditions');
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects. Veuillez reessayer.');
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
          background: 'var(--color-paper-white)',
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
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div
                className="inline-block mb-3"
                style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--color-steel)',
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                }}
              >
                Connexion
              </div>
              <h1 className="display-headline" style={{ fontSize: 30 }}>Accedez a votre espace</h1>
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
                  placeholder="Email, telephone ou numero de compte"
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

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }}
              >
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
            color: 'var(--color-ink)',
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
                background: '#1a1a1a',
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
