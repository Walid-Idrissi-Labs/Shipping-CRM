import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-grid">
          <div className="lp-footer-col">
            <img
              src="/logos/logo_noir.png"
              alt="Logo"
              style={{
                width: '200px',
                height: 'auto',
                marginBottom: '16px',
                filter: 'grayscale(100%)',
                opacity: 0.95,
              }}
            />
            <span className="lp-footer-brand">DPEX Maroc</span>
            <p className="lp-footer-desc">
                Ne Perdez plus votre Temps, On a la Solution.
            </p>
          </div>
          <div className="lp-footer-col">
            <h5>Produits</h5>
            <ul>
              <li><Link to="/devis-express">Devis Express</Link></li>
              <li><Link to="/suivi">Suivi colis</Link></li>
              <li><Link to="/demande-compte">Ouvrir un Compte Client</Link></li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h5>Entreprise</h5>
            <ul>
              <li><Link to="/a-propos">A propos</Link></li>
              <li><Link to="/carrieres">Qui Sommes Nous?</Link></li>
              <li><Link to="/partenaires">Partenaires</Link></li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h5>Support</h5>
            <ul>
              <li><Link to="/aide">Centre d'aide</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/api">API Developpeurs</Link></li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h5>Juridique</h5>
            <ul>
              <li><Link to="/cgu">CGU</Link></li>
              <li><Link to="/confidentialite">Confidentialite</Link></li>
              <li><Link to="/cookies">Cookies</Link></li>
              <li><Link to="/mentions-legales">Mentions legales</Link></li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <p>&copy; {new Date().getFullYear()} DPEX Maroc. Tous droits reserves.</p>
<div className="lp-footer-legal" style={{ display: 'flex', gap: '16px' }}>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: 'var(--color-smoke)', fontSize: '13px' }}>
              Instagram
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ color: 'var(--color-smoke)', fontSize: '13px' }}>
              Facebook
            </a>

          </div>
        </div>
      </div>
    </footer>
  );
}