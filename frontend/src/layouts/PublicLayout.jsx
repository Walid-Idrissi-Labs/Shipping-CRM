import { useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import GlassDockNav from '../components/GlassDockNav';

export default function PublicLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="hero-wash" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          paddingTop: 12,
          background: 'transparent',
        }}
      >
        {/* Logo island */}
        <div
          style={{
            position: 'absolute',
            left: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="2" y="2" width="6" height="6" rx="1" fill="var(--color-graphite)" />
              <rect x="14" y="2" width="6" height="6" rx="1" fill="var(--color-primary)" />
              <rect x="2" y="14" width="6" height="6" rx="1" fill="var(--color-primary)" />
              <rect x="14" y="14" width="6" height="6" rx="1" fill="var(--color-graphite)" />
            </svg>
            <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-graphite)', letterSpacing: '-0.01em' }}>
              Shipping <span style={{ color: 'var(--color-primary)' }}>CRM</span>
            </span>
          </Link>
        </div>
        <GlassDockNav />
      </div>


      <main style={{ flex: 1, width: '100%' }}>
        <Outlet />
      </main>

      <footer
        style={{
          background: 'var(--color-paper-white)',
          borderTop: '1px solid var(--color-ash)',
          padding: '24px 0',
          marginTop: 64,
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: 13,
            color: 'var(--color-steel)',
          }}
        >
          <div>© {new Date().getFullYear()} Shipping CRM. Tous droits reserves.</div>
          <nav style={{ display: 'flex', gap: 20 }}>
            <Link to="/devis-express" style={{ fontSize: 13, color: 'var(--color-steel)', textDecoration: 'none' }}>Devis</Link>
            <Link to="/suivi" style={{ fontSize: 13, color: 'var(--color-steel)', textDecoration: 'none' }}>Suivi</Link>
            <Link to="/demande-compte" style={{ fontSize: 13, color: 'var(--color-steel)', textDecoration: 'none' }}>Compte</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export const View = PublicLayout;
