import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DISMISSED = 'auth:tempPasswordNoticeDismissed';

// Shown to a client who is still signing in with the temporary password their
// provider generated at account creation. That password was handed over in an
// email or a WhatsApp message, so it should not stay valid indefinitely — but
// forcing a change on a logistics account someone opens twice a day is the kind
// of friction that makes people stop opening it. So: a dismissible strip, not a
// wall. Dismissal lives in sessionStorage, so it stays gone for this visit and
// asks again next time they sign in.
export default function TempPasswordBanner() {
  const { user } = useAuth();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISSED) === '1',
  );

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED, '1');
    setDismissed(true);
  };

  if (!user?.using_temp_password || dismissed) return null;
  // Already on the page that fixes it — nagging there would be noise.
  if (location.pathname === '/client/mon-compte') return null;

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        marginBottom: 18,
        borderRadius: 10,
        background: 'var(--color-warning-container)',
        border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)',
      }}
    >
      <ShieldAlert size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />

      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-graphite)', flex: 1 }}>
        Vous utilisez encore le mot de passe provisoire de votre compte.{' '}
        <Link
          to="/client/mon-compte"
          style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'underline' }}
        >
          Choisissez le vôtre
        </Link>{' '}
        pour sécuriser votre accès.
      </p>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Masquer ce message"
        className="btn btn-ghost"
        style={{ padding: 4, flexShrink: 0, lineHeight: 0 }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
