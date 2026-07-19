import { useEffect, useState } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

export default function PublicLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="public-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(200, 208, 245, 0.35) 0%, rgba(238, 241, 251, 0.25) 50%, transparent 100%), #ffffff' }}>
      <NavBar onMenuClick={() => setMenuOpen((v) => !v)} menuOpen={menuOpen} />
      <main style={{ flex: 1, width: '100%' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
