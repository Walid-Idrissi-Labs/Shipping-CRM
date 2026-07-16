import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn, Menu, X, ChevronRight } from 'lucide-react';

// Only routes that actually exist in App.jsx
const LINKS = [
  { to: '/suivi', label: 'Suivi' },
  { to: '/devis-express', label: 'Devis' },
  { to: '/contact', label: 'Contact' },
  { to: '/faq', label: 'Qui Sommes Nous?' },
];

export default function NavBar({ onMenuClick, menuOpen = false }) {
  const location = useLocation();

  const closeMenu = () => {
    if (menuOpen) onMenuClick();
  };

  // Lock background scroll while the full-screen menu is open
  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  return (
    <header className="lp-navbar">
      <div className="lp-container lp-navbar-inner">
        <Link to="/" className="lp-logo">
          <img
            src="/logos/dpex-logo-gif_final.png"
            alt="DPEX"
            style={{ height: 53, width: 'auto', objectFit: 'contain' }}
          />
        </Link>

        {/* Desktop links with underlines */}
        <nav className="lp-nav-links">
          {LINKS.map((l) => {
            const isActive = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`lp-nav-link${isActive ? ' is-active' : ''}`}
              >
                <span className="nav-link-text">
                  {l.label}
                  <span
                    className="nav-link-underline"
                    style={{ transform: isActive ? 'scaleX(1)' : undefined }}
                  />
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="lp-nav-actions">
          <Link to="/login" className="lp-btn lp-btn-primary">
            <LogIn size={16} /> Connexion
          </Link>
          <button
            className="lp-menu-btn"
            onClick={onMenuClick}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
            type="button"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ===== Mobile full-screen menu ===== */}
      <div className={`lp-mobile-nav${menuOpen ? ' is-open' : ''}`}>
        <div className="lp-mobile-nav-panel">
          <div className="lp-mobile-nav-header">
            <Link to="/" className="lp-logo" onClick={closeMenu}>
              <img
                src="/logos/dpex-logo-gif_final.png"
                alt="DPEX"
                style={{ height: 40, width: 'auto', objectFit: 'contain' }}
              />
            </Link>
            <button
              className="lp-menu-btn"
              onClick={closeMenu}
              aria-label="Fermer le menu"
              type="button"
              style={{ display: 'inline-flex' }}
            >
              <X size={24} />
            </button>
          </div>

          <nav className="lp-mobile-nav-links">
            {LINKS.map((l) => {
              const isActive = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`lp-mobile-nav-link${isActive ? ' is-active' : ''}`}
                  onClick={closeMenu}
                >
                  {l.label}
                  <ChevronRight className="lp-mobile-nav-chevron" size={22} strokeWidth={2} />
                </Link>
              );
            })}
          </nav>

          <div className="lp-mobile-nav-footer">
            <Link to="/login" className="lp-btn lp-btn-secondary" onClick={closeMenu}>
              <LogIn size={16} /> Se connecter
            </Link>
            <Link to="/demande-compte" className="lp-btn lp-btn-primary" onClick={closeMenu}>
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
