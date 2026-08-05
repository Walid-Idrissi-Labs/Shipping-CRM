import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useContext } from 'react';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import TempPasswordBanner from '../components/TempPasswordBanner';
import LoadingContext from '../contexts/LoadingContext';
import { LayoutDashboard, Package, Receipt, User, LogOut, Menu, X, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';

const EXPANDED_WIDTH = 240;

const navGroups = [
  { parent: { path: '/client', label: 'Tableau de Bord', short: 'Accueil', icon: LayoutDashboard } },
  { parent: { path: '/client/mes-expeditions', label: 'Mes Expéditions', short: 'Expéditions', icon: Package } },
  { parent: { path: '/client/devis', label: 'Devis', short: 'Devis', icon: FileText } },
  { parent: { path: '/client/mes-factures', label: 'Mes Factures', short: 'Factures', icon: Receipt } },
  { parent: { path: '/client/mon-compte', label: 'Mon Compte', short: 'Compte', icon: User } },
];

function isTabActive(path, pathname) {
  if (path === '/client') return pathname === '/client';
  return pathname === path || pathname.startsWith(path + '/');
}

function Sidebar({ user, onLogout, location, onNavigate, width = EXPANDED_WIDTH }) {
  return (
    <aside
      className="flex flex-col sidebar-tinted"
      style={{
        width,
        background: 'var(--color-sidebar-bg)',
        borderRight: '1px solid var(--color-ash)',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px 18px',
          borderBottom: '1px solid var(--color-ash)',
          minHeight: 64,
        }}
      >
        <Link to="/client" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img
            src="/logos/dpex-logo-gif_final.png"
            alt="Logo"
            style={{
              height: 44,
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </Link>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto sidebar-scroll"
        style={{ padding: '12px' }}
      >
        {navGroups.map((group) => {
          const Icon = group.parent.icon;
          const active = isTabActive(group.parent.path, location.pathname);
          return (
            <Link
              key={group.parent.path}
              to={group.parent.path}
              onClick={onNavigate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
                background: active ? 'var(--color-primary-wash)' : 'transparent',
                color: active ? 'var(--color-primary)' : 'var(--color-iron)',
                marginBottom: 2,
                transition: 'background 150ms ease, color 150ms ease',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--color-bone)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.7} style={{ flexShrink: 0 }} />
              <span>{group.parent.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 14px',
          borderTop: '1px solid var(--color-ash)',
          minHeight: 64,
        }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 32, height: 32, borderRadius: 9999,
            background: 'var(--color-primary-glow)', color: 'var(--color-graphite)',
            fontWeight: 600, fontSize: 13,
          }}
        >
          {user?.client?.full_name?.charAt(0).toUpperCase() || 'C'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-steel)', letterSpacing: '0.02em' }}>
            Espace Client
          </div>
          <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-graphite)' }}>
            {user?.client?.full_name || 'Client'}
          </div>
          <button
            type="button"
            onClick={onLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              color: 'var(--color-steel)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-steel)')}
          >
            <LogOut size={12} />
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const { isLoading } = useContext(LoadingContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const accountActive =
    location.pathname === '/client/mon-compte' ||
    location.pathname.startsWith('/client/mon-compte/');

  return (
    <div className="min-h-screen surface-canvas" style={{ background: 'var(--color-paper-white)' }}>
      <div
        className="hidden lg:flex fixed inset-y-0 left-0 z-20"
        style={{ width: EXPANDED_WIDTH }}
      >
        <Sidebar
          user={user}
          onLogout={handleLogout}
          location={location}
          onNavigate={() => {}}
        />
      </div>

      <div className={`app-drawer${mobileOpen ? ' is-open' : ''}`}>
        <div className="app-drawer-backdrop" onClick={() => setMobileOpen(false)} />
        <div className="app-drawer-panel">
          <button
            type="button"
            className="app-drawer-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
          <Sidebar
            user={user}
            onLogout={handleLogout}
            location={location}
            onNavigate={() => setMobileOpen(false)}
            width="100%"
          />
        </div>
      </div>

      <div
        className="client-main-wrap"
        style={{ paddingLeft: EXPANDED_WIDTH }}
      >
        <header
          className="sticky top-0 z-10"
          style={{
            borderBottom: '1px solid var(--color-ash)',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div
            className="flex items-center gap-3"
            style={{
              padding: '10px 16px',
              maxWidth: 1280,
              margin: '0 auto',
              width: '100%',
              minHeight: 56,
            }}
          >
            <button
              className="lg:hidden btn-icon"
              onClick={() => setMobileOpen(true)}
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>

            <Link
              to="/client"
              className="lg:hidden"
              style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', textDecoration: 'none' }}
            >
              <img
                src="/logos/dpex-logo-gif_final.png"
                alt="DPEX"
                style={{ height: 40, width: 'auto', objectFit: 'contain' }}
              />
            </Link>

            <div className="hidden lg:block" style={{ marginLeft: 'auto' }}>
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <LogOut size={14} /> Déconnexion
              </button>
            </div>

            <Link
              to="/client/mon-compte"
              aria-label="Mon compte"
              className="lg:hidden flex items-center justify-center shrink-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: 9999,
                background: 'var(--color-primary-glow)',
                color: 'var(--color-graphite)',
                fontWeight: 600,
                fontSize: 13,
                textDecoration: 'none',
                boxShadow: accountActive ? '0 0 0 2px var(--color-primary)' : 'none',
                transition: 'box-shadow 150ms ease',
              }}
            >
              {user?.client?.full_name?.charAt(0).toUpperCase() || 'C'}
            </Link>
          </div>

          {/* Mobile section tab bar */}
          <nav className="client-tabbar" aria-label="Sections">
            {navGroups
              .filter((group) => group.parent.path !== '/client/mon-compte')
              .map((group) => {
              const Icon = group.parent.icon;
              const active = isTabActive(group.parent.path, location.pathname);
              return (
                <Link
                  key={group.parent.path}
                  to={group.parent.path}
                  className={`client-tab${active ? ' is-active' : ''}`}
                >
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.7} />
                  <span>{group.parent.short}</span>
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="app-page">
          <TempPasswordBanner />
          <Outlet />
          {isLoading && <LoadingOverlay />}
        </main>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .client-main-wrap { padding-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
