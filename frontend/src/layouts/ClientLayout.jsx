import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useContext } from 'react';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import LoadingContext from '../contexts/LoadingContext';
import { LayoutDashboard, Package, Receipt, User, LogOut, Menu, FileText } from 'lucide-react';
import { useState } from 'react';

const EXPANDED_WIDTH = 240;

const navGroups = [
  { parent: { path: '/client', label: 'Tableau de Bord', icon: LayoutDashboard } },
  { parent: { path: '/client/mes-expeditions', label: 'Mes Expeditions', icon: Package } },
  { parent: { path: '/client/devis', label: 'Devis', icon: FileText } },
  { parent: { path: '/client/mes-factures', label: 'Mes Factures', icon: Receipt } },
  { parent: { path: '/client/mon-compte', label: 'Mon Compte', icon: User } },
];

function Sidebar({ user, onLogout, location, onNavigate }) {
  return (
    <aside
      className="flex flex-col sidebar-tinted"
      style={{
        width: EXPANDED_WIDTH,
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
          const isExactMatch = location.pathname === group.parent.path;
          const isChildRoute = location.pathname.startsWith(group.parent.path + '/');
          const active = group.parent.path === '/client'
            ? isExactMatch
            : (isExactMatch || isChildRoute);
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
            Deconnexion
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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-40 lg:hidden">
            <Sidebar
              user={user}
              onLogout={handleLogout}
              location={location}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}

      <div
        className="client-main-wrap"
        style={{ paddingLeft: EXPANDED_WIDTH }}
      >
        <header
          className="sticky top-0 z-10 surface-canvas"
          style={{ borderBottom: '1px solid var(--color-ash)', minHeight: 64 }}
        >
          <div
            className="flex items-center gap-4"
            style={{
              padding: '12px 24px',
              maxWidth: 1280,
              margin: '0 auto',
              width: '100%',
            }}
          >
            <button
              className="lg:hidden btn-icon"
              onClick={() => setMobileOpen(true)}
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{
                marginLeft: 'auto',
                padding: '8px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <LogOut size={14} /> Deconnexion
            </button>
          </div>
        </header>

        <main className="app-page">
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
