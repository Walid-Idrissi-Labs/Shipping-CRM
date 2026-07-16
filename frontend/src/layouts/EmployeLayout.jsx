import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, History, ScanLine } from 'lucide-react';

const TABS = [
  { id: 'changer-statut', label: 'Scanner', icon: ScanLine },
  { id: 'mon-historique', label: 'Historique', icon: History },
];

export default function EmployeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab =
    TABS.find((t) => location.pathname.startsWith(`/employe/${t.id}`))?.id || 'changer-statut';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-paper-white)' }}>
      <header
        className="sticky top-0 z-10"
        style={{
          borderBottom: '1px solid var(--color-ash)',
          background: 'color-mix(in srgb, var(--color-paper-white) 88%, transparent)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div
          className="flex items-center gap-3"
          style={{
            padding: '8px 16px',
            maxWidth: 1200,
            margin: '0 auto',
            width: '100%',
            minHeight: 56,
          }}
        >
          <Link to="/employe/changer-statut" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <img
              src="/logos/dpex-logo-gif_final.png"
              alt="DPEX"
              style={{ height: 36, width: 'auto', objectFit: 'contain' }}
            />
          </Link>

          <nav className="emp-headtabs" style={{ marginLeft: 24 }} aria-label="Sections">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  to={`/employe/${tab.id}`}
                  className={`emp-headtab${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.2 : 1.7} />
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2" style={{ marginLeft: 'auto', minWidth: 0 }}>
            <div className="text-right min-w-0 hidden sm:block">
              <div
                className="truncate"
                style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-steel)', letterSpacing: '0.02em' }}
              >
                Espace Employé
              </div>
              <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-graphite)' }}>
                {user?.name || user?.email}
              </div>
            </div>
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 34,
                height: 34,
                borderRadius: 9999,
                background: 'var(--color-primary-glow)',
                color: 'var(--color-graphite)',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'E'}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Déconnexion"
              title="Déconnexion"
              className="flex items-center justify-center shrink-0"
              style={{
                width: 38,
                height: 38,
                border: 'none',
                background: 'none',
                borderRadius: 9999,
                color: 'var(--color-steel)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-steel)')}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="emp-main">
        <Outlet />
      </main>

      <nav className="emp-tabbar" aria-label="Navigation principale">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              to={`/employe/${tab.id}`}
              className={`emp-tabbar-item${isActive ? ' is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="emp-tabbar-icon">
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.7} />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
