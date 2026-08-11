import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useContext } from 'react';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import LoadingContext from '../contexts/LoadingContext';
import { PendingCountsProvider, usePendingCounts } from '../contexts/PendingCountsContext';
import {
  LayoutDashboard, Package, Users, Receipt, Truck, Settings, LogOut,
  Menu, X, UserPlus, ClipboardList, Search, RefreshCw,
  FileEdit, Undo2, Car, UserCog, CalendarRange, ScreenShare,
  User, History, Activity, MessageSquareWarning,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useVisiblePoll } from '../hooks';
import CommandPalette from '../components/CommandPalette';
import HeaderClock from '../components/ui/HeaderClock';

const EXPANDED_WIDTH = 240;

// Same reasoning as the client badge: slow enough to be invisible on the
// hosting, fast enough that someone parked on one page still finds out.
const PENDING_POLL_MS = 120_000;

// Paths whose untreated-demande count drives the green sidebar outline.
// Cleared only when a demande is actually accepted/refused (see
// usePendingCounts), never by simply visiting the page.
const PENDING_COUNT_PATHS = {
  '/dashboard/demandes-devis': 'quote_requests',
  '/dashboard/demandes-compte': 'account_requests',
  '/dashboard/demandes-expedition': 'expedition_requests',
  // Unlike the demandes above, this one clears by reading the conversation
  // rather than by accepting or refusing anything -- see pendingCounts().
  '/dashboard/reclamations': 'reclamations',
};

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
    children: [
      { path: '/dashboard/demandes-expedition', label: 'Demandes d\'Expedition', icon: ClipboardList },
    ],
  },
  {
    parent: { path: '/dashboard/clients', label: 'Clients', icon: Users },
    children: [],
  },
  {
    parent: { path: '/dashboard/activite-clients', label: 'Activite Clients', icon: Activity },
    children: [],
  },
  {
    parent: { path: '/dashboard/demandes-compte', label: 'Demandes Compte', icon: UserPlus },
    children: [],
  },
  {
    parent: { path: '/dashboard/reclamations', label: 'Réclamations', icon: MessageSquareWarning },
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
  {
    parent: { path: '/dashboard/employes', label: 'Employés', icon: User },
    children: [
      { path: '/dashboard/employes', label: 'Liste', icon: User },
      { path: '/dashboard/employes/historique', label: 'Historique', icon: History },
    ],
  },
  {
    parent: { path: '/', label: 'Retour à l\'accueil', icon: ScreenShare },
    children: [],
  },
];

function isGroupActive(group, pathname, search) {
  if (group.parent.exact) return pathname === group.parent.path;
  if (pathname === group.parent.path || pathname.startsWith(group.parent.path + '/')) return true;
  return group.children.some((c) => isChildActive(c, pathname, search));
}

function isChildActive(child, pathname, search) {
  // For child paths that match the parent path exactly (e.g., /dashboard/employes)
  // Only match exactly, not with startsWith
  if (child.path === '/dashboard/employes') {
    return pathname === child.path;
  }
  // The Factures tab shares its pathname with the Avoirs tab (which adds ?tab=avoirs),
  // so it is only active on the default view — i.e. when no ?tab param is present.
  if (child.path === '/dashboard/factures') {
    return pathname === child.path && !new URLSearchParams(search).has('tab');
  }
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

function hasPendingBadge(path, pendingCounts) {
  const key = PENDING_COUNT_PATHS[path];
  return key ? (pendingCounts?.[key] || 0) > 0 : false;
}

function Sidebar({ user, onLogout, location, onNavigate, pendingCounts, width = EXPANDED_WIDTH }) {
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
        <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
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
          const ParentIcon = group.parent.icon;
          const isParentActive = isGroupActive(group, location.pathname, location.search);
          // Several groups point at the same route as their first child (Employés/Liste,
          // Factures/Factures). Filling both reads as two selected tabs at once, so only
          // the most specific match gets the fill; the parent keeps the accent colour to
          // show which section you are in.
          const childActive = group.children.some((c) => isChildActive(c, location.pathname, location.search));
          const isParentFilled = isParentActive && !childActive;
          const parentPending = hasPendingBadge(group.parent.path, pendingCounts);
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
                  background: isParentFilled ? 'var(--color-primary-wash)' : 'transparent',
                  color: isParentActive ? 'var(--color-primary)' : 'var(--color-iron)',
                  marginBottom: 2,
                  boxShadow: parentPending ? 'inset 0 0 0 1.5px var(--color-vivid-green)' : 'none',
                  transition: 'background 150ms ease, color 150ms ease',
                }}
                onMouseEnter={(e) => { if (!isParentFilled) e.currentTarget.style.background = 'var(--color-bone)'; }}
                onMouseLeave={(e) => { if (!isParentFilled) e.currentTarget.style.background = 'transparent'; }}
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
                    const childPending = hasPendingBadge(child.path, pendingCounts);
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
                          boxShadow: childPending ? 'inset 0 0 0 1.5px var(--color-vivid-green)' : 'none',
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
          {user?.provider?.company_name?.charAt(0).toUpperCase() || 'A'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-steel)', letterSpacing: '0.02em' }}>
            Espace Prestataire
          </div>
          <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-graphite)' }}>
            {user?.provider?.company_name || user?.name || 'Admin'}
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
  return (
    <PendingCountsProvider>
      <ProviderLayoutInner />
    </PendingCountsProvider>
  );
}

function ProviderLayoutInner() {
  const { user, logout } = useAuth();
  const { isLoading } = useContext(LoadingContext);
  const { counts: pendingCounts, refresh: refreshPendingCounts } = usePendingCounts();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    refreshPendingCounts();
    // Refetch on every navigation so the outline clears as soon as a
    // demande is treated on its own page (accept flows navigate away).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Plus a slow poll, so a réclamation arriving while someone sits on the
  // dashboard raises its outline without waiting for the next click. Paused
  // while the tab is hidden.
  useVisiblePoll(refreshPendingCounts, PENDING_POLL_MS);

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

  const handleHardRefresh = async () => {
    // A plain reload() can still be served from a stale cached document by
    // the browser. Force-revalidate the current URL first so the reload
    // that follows is guaranteed to pick up fresh content — the same
    // outcome as Ctrl+Shift+R.
    try {
      await fetch(window.location.pathname + window.location.search, {
        cache: 'reload',
        credentials: 'include',
      });
    } catch {
      // Network hiccup — still reload below, no worse than a plain refresh.
    }
    window.location.reload();
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
          pendingCounts={pendingCounts}
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
            pendingCounts={pendingCounts}
            width="100%"
          />
        </div>
      </div>

      <div
        className="provider-main-wrap"
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

            <HeaderClock />

            <div className="flex items-center" style={{ marginLeft: 'auto', gap: 8 }}>
              <button
                type="button"
                onClick={handleHardRefresh}
                className="flex items-center surface-recessed provider-refresh-trigger"
                style={{
                  padding: 9,
                  borderRadius: 8,
                  border: '1px solid var(--color-ash)',
                  color: 'var(--color-smoke)',
                  background: 'var(--color-bone)',
                }}
                title="Actualiser la page"
                aria-label="Actualiser la page"
              >
                <RefreshCw size={15} />
              </button>

              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="flex items-center gap-2 surface-recessed provider-search-trigger"
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-ash)',
                  fontSize: 13,
                  color: 'var(--color-smoke)',
                  background: 'var(--color-bone)',
                }}
              >
                <Search size={15} />
                <span className="provider-search-label">Rechercher...</span>
                <span className="provider-search-kbd" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-smoke)' }}>
                  {typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')
                    ? '⌘K'
                    : 'Ctrl K'}
                </span>
              </button>
            </div>
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
