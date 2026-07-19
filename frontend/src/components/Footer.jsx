import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-grid">
          <div className="lp-footer-col">
            <img
              src="/logos/logo_noir.png"
              alt="DPEX Maroc"
              style={{
                width: '180px',
                height: 'auto',
                marginBottom: '16px',
                filter: 'grayscale(100%)',
                opacity: 0.95,
              }}
            />
            <p className="lp-footer-desc">
              Transport et logistique au Maroc. Expédiez, suivez et gérez vos envois depuis un seul espace.
            </p>
          </div>
          <div className="lp-footer-col">
            <h5>Services</h5>
            <ul>
              <li><Link to="/devis-express">Devis express</Link></li>
              <li><Link to="/suivi">Suivi de colis</Link></li>
              <li><Link to="/demande-compte">Ouvrir un compte client</Link></li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h5>Votre espace</h5>
            <ul>
              <li><Link to="/login">Se connecter</Link></li>
              <li><Link to="/demande-compte">Demander un compte</Link></li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h5>Entreprise</h5>
            <ul>
              <li><Link to="/qui-sommes-nous">Qui sommes-nous</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <p>&copy; {new Date().getFullYear()} DPEX Maroc. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
