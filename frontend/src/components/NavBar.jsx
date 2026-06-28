import { Link, useLocation } from 'react-router-dom';
import { LogIn, Menu, X } from 'lucide-react';

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
          <Link to="/login" className="lp-text-link">
            <LogIn size={16} /> Connexion
          </Link>
          <Link to="/demande-compte" className="lp-btn lp-btn-primary">
            Creer un compte
          </Link>
          <button
            className="lp-menu-btn"
            onClick={onMenuClick}
            aria-label="Ouvrir le menu"
            type="button"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ===== Mobile slide-in menu ===== */}
      <div className={`lp-mobile-nav${menuOpen ? ' is-open' : ''}`}>
        {/* Backdrop */}
        <div className="lp-mobile-nav-backdrop" onClick={closeMenu} />

        {/* Panel */}
        <div className="lp-mobile-nav-panel">
          <div className="lp-mobile-nav-header">
            <Link to="/" className="lp-logo" onClick={closeMenu}>
              <img
                src="/logos/dpex-logo-gif_final.png"
                alt="NexoLog"
                style={{ height: 36, width: 'auto', objectFit: 'contain' }}
              />
            </Link>
            <button
              className="lp-menu-btn"
              onClick={closeMenu}
              aria-label="Fermer le menu"
              type="button"
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
                </Link>
              );
            })}
          </nav>

          <div className="lp-mobile-nav-footer">
            <Link to="/login" className="lp-text-link" onClick={closeMenu}>
              <LogIn size={16} /> Connexion
            </Link>
            <Link to="/demande-compte" className="lp-btn lp-btn-primary" onClick={closeMenu}>
              Creer un compte
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}