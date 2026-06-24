import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useContext } from 'react';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import LoadingContext from '../contexts/LoadingContext';
import {
  LayoutDashboard, FileText, Package, Users, Receipt, Truck, Settings, LogOut,
  Menu, X, UserPlus, ClipboardList, Search,
  FileEdit, Undo2, Car, UserCog, CalendarRange,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import CommandPalette from '../components/CommandPalette';

const EXPANDED_WIDTH = 240;

const navGroups = [
  {
    parent: { path: '/dashboard', label: 'Tableau de Bord', icon: LayoutDashboard, exact: true },
    children: [],
  },
  {
    parent: { path: '/dashboard/demandes-devis', label: 'Devis', icon: ClipboardList },
    children: [
      { path: '/dashboard/demandes-devis', label: 'Demandes', icon: ClipboardList },
      { path: '/dashboard/devis', label: 'Devis', icon: FileEdit },
    ],
  },
  {
    parent: { path: '/dashboard/expeditions', label: 'Expeditions', icon: Package },
    children: [],
  },
  {
    parent: { path: '/dashboard/clients', label: 'Clients', icon: Users },
    children: [],
  },
  {
    parent: { path: '/dashboard/demandes-compte', label: 'Demandes Compte', icon: UserPlus },
    children: [],
  },
  {
    parent: { path: '/dashboard/factures', label: 'Factures & Avoirs', icon: Receipt },
    children: [
      { path: '/dashboard/factures', label: 'Factures', icon: Receipt },
      { path: '/dashboard/factures?tab=avoirs', label: 'Avoirs', icon: Undo2 },
    ],
  },
  {
    parent: { path: '/dashboard/flotte', label: 'Flotte', icon: Truck },
    children: [
      { path: '/dashboard/flotte/vehicules', label: 'Vehicules', icon: Car },
      { path: '/dashboard/flotte/chauffeurs', label: 'Chauffeurs', icon: UserCog },
      { path: '/dashboard/flotte/affectations', label: 'Affectations', icon: CalendarRange },
    ],
  },
  {
    parent: { path: '/dashboard/parametres', label: 'Parametres', icon: Settings },
    children: [],
  },
];

function isGroupActive(group, pathname, search) {
  if (group.parent.exact) return pathname === group.parent.path;
  if (pathname === group.parent.path || pathname.startsWith(group.parent.path + '/')) return true;
  return group.children.some((c) => isChildActive(c, pathname, search));
}

function isChildActive(child, pathname, search) {
  if (pathname.startsWith(child.path + '/')) return true;
  const [basePath, queryString] = child.path.split('?');
  if (pathname !== basePath) return false;
  if (!queryString) {
    return !new URLSearchParams(search).has('tab');
  }
  const params = new URLSearchParams(search);
  for (const [key, value] of new URLSearchParams(queryString)) {
    if (params.get(key) !== value) return false;
  }
  return true;
}

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
          alignItems: 'center',
          padding: '18px 18px',
          borderBottom: '1px solid var(--color-ash)',
          gap: 10,
          minHeight: 64,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="2" y="2" width="6" height="6" rx="1" fill="#1d1d20" />
          <rect x="14" y="2" width="6" height="6" rx="1" fill="#2544b0" />
          <rect x="2" y="14" width="6" height="6" rx="1" fill="#2544b0" />
          <rect x="14" y="14" width="6" height="6" rx="1" fill="#1d1d20" />
        </svg>
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-graphite)', letterSpacing: '-0.01em' }}>
          Shipping&nbsp;<span style={{ color: 'var(--color-primary)' }}>CRM</span>
        </span>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto sidebar-scroll"
        style={{ padding: '12px' }}
      >
        {navGroups.map((group) => {
          const ParentIcon = group.parent.icon;
          const isParentActive = isGroupActive(group, location.pathname, location.search);
          return (
            <div key={group.parent.path} style={{ marginBottom: 4 }}>
              <Link
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
                  background: isParentActive ? 'var(--color-primary-wash)' : 'transparent',
                  color: isParentActive ? 'var(--color-primary)' : 'var(--color-iron)',
                  marginBottom: 2,
                  transition: 'background 150ms ease, color 150ms ease',
                }}
                onMouseEnter={(e) => { if (!isParentActive) e.currentTarget.style.background = 'var(--color-bone)'; }}
                onMouseLeave={(e) => { if (!isParentActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <ParentIcon size={18} strokeWidth={isParentActive ? 2.2 : 1.7} style={{ flexShrink: 0 }} />
                <span>{group.parent.label}</span>
              </Link>

              {group.children.length > 0 && (
                <div
                  style={{
                    marginTop: 4,
                    paddingLeft: 16,
                    borderLeft: '1px solid var(--color-ash)',
                    marginLeft: 21,
                  }}
                >
                  {group.children.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = isChildActive(child, location.pathname, location.search);
                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={onNavigate}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '7px 12px',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: childActive ? 600 : 500,
                          textDecoration: 'none',
                          background: childActive ? 'var(--color-primary-wash)' : 'transparent',
                          color: childActive ? 'var(--color-primary)' : 'var(--color-steel)',
                          marginBottom: 1,
                          transition: 'background 150ms ease, color 150ms ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!childActive) {
                            e.currentTarget.style.background = 'var(--color-bone)';
                            e.currentTarget.style.color = 'var(--color-graphite)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!childActive) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--color-steel)';
                          }
                        }}
                      >
                        <ChildIcon size={14} strokeWidth={childActive ? 2 : 1.5} style={{ flexShrink: 0 }} />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px',
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
          {user?.provider?.company_name?.charAt(0).toUpperCase() || 'P'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-graphite)' }}>
            {user?.provider?.company_name || 'Prestataire'}
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

export default function ProviderLayout() {
  const { user, logout } = useAuth();
  const { isLoading } = useContext(LoadingContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
        className="provider-main-wrap"
        style={{ paddingLeft: EXPANDED_WIDTH }}
      >
        <header
          className="sticky top-0 z-10 surface-canvas"
          style={{ borderBottom: '1px solid var(--color-ash)' }}
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
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 surface-recessed"
              style={{
                marginLeft: 'auto',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--color-ash)',
                fontSize: 13,
                color: 'var(--color-smoke)',
                background: 'var(--color-bone)',
                minWidth: 260,
                maxWidth: 380,
              }}
            >
              <Search size={15} />
              <span>Rechercher...</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-smoke)' }}>
                {typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')
                  ? '⌘K'
                  : 'Ctrl K'}
              </span>
            </button>
          </div>
        </header>

        <main className="app-page">
          <Outlet />
          {isLoading && <LoadingOverlay />}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} role="prestataire" />
    </div>
  );
}
