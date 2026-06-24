import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Search, UserPlus, LogIn } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'Accueil', icon: Home, color: 'var(--color-primary)', glowRGB: '37, 68, 176' },
  { to: '/devis-express', label: 'Devis Express', icon: FileText, color: '#f97316', glowRGB: '249, 115, 22' },
  { to: '/suivi', label: 'Suivi', icon: Search, color: 'var(--color-primary)', glowRGB: '37, 68, 176' },
  { to: '/demande-compte', label: 'Demande de Compte', icon: UserPlus, color: 'var(--color-vivid-green)', glowRGB: '74, 198, 76' },
  { to: '/login', label: 'Connexion', icon: LogIn, color: 'var(--color-primary)', glowRGB: '37, 68, 176' },
];

export default function GlassDockNav() {
  const location = useLocation();

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 20,
        padding: '24px 16px 16px',
        display: 'flex',
        justifyContent: 'center',
        background: 'transparent',
      }}
    >
      <nav
        className="relative overflow-hidden"
        style={{
          padding: 6,
          borderRadius: 16,
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
        }}
      >
        <ul
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            position: 'relative',
            zIndex: 10,
            flexWrap: 'wrap',
            justifyContent: 'center',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {ITEMS.map(({ to, label, icon: Icon, color, glowRGB }) => {
            const isActive = location.pathname === to;
            return (
              <li key={to} className="relative" style={{ listStyle: 'none' }}>
                <Link
                  to={to}
                  style={{
                    display: 'block',
                    width: '100%',
                    textDecoration: 'none',
                  }}
                >
                  <div
                    className="glass-dock-item"
                    style={{
                      position: 'relative',
                      borderRadius: 12,
                      overflow: 'visible',
                      perspective: 600,
                    }}
                    onMouseEnter={(e) => {
                      const glow = e.currentTarget.querySelector('.glass-dock-glow');
                      if (glow) { glow.style.opacity = '1'; glow.style.transform = 'scale(2)'; }
                    }}
                    onMouseLeave={(e) => {
                      const glow = e.currentTarget.querySelector('.glass-dock-glow');
                      if (glow) { glow.style.opacity = '0'; glow.style.transform = 'scale(0.8)'; }
                    }}
                  >
                    <div
                      className="glass-dock-glow"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 0,
                        pointerEvents: 'none',
                        background: `radial-gradient(circle, rgba(${glowRGB}, 0.15) 0%, rgba(${glowRGB}, 0.06) 50%, rgba(${glowRGB}, 0) 100%)`,
                        opacity: isActive ? '1' : '0',
                        borderRadius: 16,
                        transform: isActive ? 'scale(2)' : 'scale(0.8)',
                        transition: 'opacity 0.3s, transform 0.3s',
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 14px',
                        position: 'relative',
                        zIndex: 10,
                        background: 'transparent',
                        transition: 'background 0.2s',
                        borderRadius: 12,
                        transformStyle: 'preserve-3d',
                        transformOrigin: 'center bottom',
                      }}
                    >
                      <span
                        style={{
                          color: isActive ? color : 'var(--color-graphite)',
                          transition: 'color 0.3s',
                          display: 'inline-flex',
                        }}
                      >
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? 'var(--color-graphite)' : 'var(--color-steel)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
