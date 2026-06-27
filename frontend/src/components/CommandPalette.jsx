import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, LayoutDashboard, FileText, Package, Users, Receipt, Truck, UserPlus, ClipboardList, Settings, Car, UserCog, CalendarRange, Undo2 } from 'lucide-react';
import api from '../api/axios';

function getNavByRole(role) {
  if (role === 'prestataire') {
    const groups = [
      { path: '/dashboard', label: 'Tableau de Bord', icon: LayoutDashboard, children: [] },
      { path: '/dashboard/demandes-devis', label: 'Demandes de Devis', icon: ClipboardList, children: [] },
      { path: '/dashboard/devis', label: 'Devis', icon: FileText, children: [] },
      { path: '/dashboard/expeditions', label: 'Expeditions', icon: Package, children: [] },
      { path: '/dashboard/clients', label: 'Clients', icon: Users, children: [] },
      { path: '/dashboard/demandes-compte', label: 'Demandes de Compte', icon: UserPlus, children: [] },
      { path: '/dashboard/factures', label: 'Factures & Avoirs', icon: Receipt, children: [
        { path: '/dashboard/factures', label: 'Factures', icon: Receipt },
        { path: '/dashboard/factures?tab=avoirs', label: 'Avoirs', icon: Undo2 },
      ] },
      { path: '/dashboard/flotte', label: 'Flotte', icon: Truck, children: [
        { path: '/dashboard/flotte/vehicules', label: 'Vehicules', icon: Car },
        { path: '/dashboard/flotte/chauffeurs', label: 'Chauffeurs', icon: UserCog },
        { path: '/dashboard/flotte/affectations', label: 'Affectations', icon: CalendarRange },
      ] },
      { path: '/dashboard/parametres', label: 'Parametres', icon: Settings, children: [] },
    ];

    return groups.reduce((acc, g) => {
      acc.push({ path: g.path, label: g.label, icon: g.icon, category: g.label });
      g.children.forEach((c) => acc.push({ path: c.path, label: c.label, icon: c.icon, category: g.label }));
      return acc;
    }, []);
  }
  return [
    { path: '/client/mes-expeditions', label: 'Mes Expeditions', icon: Package },
    { path: '/client/mes-factures', label: 'Mes Factures', icon: Receipt },
    { path: '/client/mon-compte', label: 'Mon Compte', icon: Settings },
  ];
}

export default function CommandPalette({ open, onClose, role }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ shipments: [], clients: [], invoices: [], quotes: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const navItems = useMemo(() => getNavByRole(role), [role]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults({ shipments: [], clients: [], invoices: [], quotes: [] });
      return;
    }
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !query || query.length < 2) {
      setResults({ shipments: [], clients: [], invoices: [], quotes: [] });
      return;
    }
    let cancelled = false;
    setLoading(true);
    const q = query.toLowerCase();
    const tasks = [];
    if (role === 'prestataire') {
      tasks.push(api.get('/shipments', { params: { search: q } }).then((r) => ({ key: 'shipments', data: (r.data.data || []).slice(0, 5) })));
      tasks.push(api.get('/clients', { params: { search: q } }).then((r) => ({ key: 'clients', data: (r.data.data || []).slice(0, 5) })));
      tasks.push(api.get('/invoices', { params: { search: q } }).then((r) => ({ key: 'invoices', data: (r.data.data || []).slice(0, 5) })));
      tasks.push(api.get('/quotes', { params: { search: q } }).then((r) => ({ key: 'quotes', data: (r.data.data || []).slice(0, 5) })));
    } else {
      tasks.push(api.get('/my/shipments', { params: { search: q } }).then((r) => ({ key: 'shipments', data: (r.data.data || []).slice(0, 5) })));
    }
    Promise.all(tasks)
      .then((arr) => {
        if (cancelled) return;
        const merged = { shipments: [], clients: [], invoices: [], quotes: [] };
        arr.forEach((item) => { merged[item.key] = item.data; });
        setResults(merged);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [open, query, role]);

  const filteredNav = useMemo(() => {
    if (!query) return navItems;
    const q = query.toLowerCase();
    return navItems.filter((i) => i.label.toLowerCase().includes(q));
  }, [navItems, query]);

  if (!open) return null;

  const go = (path) => {
    onClose();
    navigate(path);
  };

  const total = filteredNav.length +
    results.shipments.length +
    results.clients.length +
    results.invoices.length +
    results.quotes.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.4)', padding: '80px 16px 16px' }}
      onClick={onClose}
    >
      <div
        className="w-full surface-canvas"
        style={{
          maxWidth: 560,
          background: 'var(--color-paper-white)',
          borderRadius: 12,
          boxShadow: '0 30px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3" style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-ash)' }}>
          <Search size={18} color="var(--color-steel)" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher partout..."
            style={{
              flex: 1, fontSize: 15, padding: 4, border: 'none', outline: 'none',
              background: 'transparent', color: 'var(--color-graphite)',
            }}
          />
          <button className="btn-icon" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div style={{ maxHeight: 420, overflowY: 'auto', padding: '8px 0' }}>
          {filteredNav.length > 0 && (
            <Section label="Navigation">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => go(item.path)}
                    className="flex items-center justify-between w-full text-left"
                    style={{
                      padding: '10px 16px', fontSize: 14, background: 'none', border: 'none',
                      cursor: 'pointer', color: 'var(--color-iron)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bone)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={16} color="var(--color-steel)" />
                      {item.label}
                    </span>
                    {item.category && (
                      <span style={{ fontSize: 11, color: 'var(--color-smoke)' }}>
                        {item.category}
                      </span>
                    )}
                  </button>
                );
              })}
            </Section>
          )}

          {results.shipments.length > 0 && (
            <Section label="Expeditions">
              {results.shipments.map((s) => (
                <button
                  key={s.id}
                  onClick={() => go(role === 'prestataire' ? `/dashboard/expeditions/${s.id}` : `/client/mes-expeditions/${s.id}`)}
                  className="flex items-center justify-between w-full text-left"
                  style={{
                    padding: '10px 16px', fontSize: 14, background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--color-iron)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bone)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span>
                    <span className="font-mono-data" style={{ color: 'var(--color-primary)', marginRight: 12 }}>
                      {s.shipping_number}
                    </span>
                    {s.recipient_name}
                  </span>
                </button>
              ))}
            </Section>
          )}

          {results.clients?.length > 0 && (
            <Section label="Clients">
              {results.clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => go(`/dashboard/clients/${c.id}`)}
                  className="flex items-center gap-3 w-full text-left"
                  style={{
                    padding: '10px 16px', fontSize: 14, background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--color-iron)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bone)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span className="font-mono-data" style={{ color: 'var(--color-primary)', marginRight: 8 }}>
                    {c.account_number}
                  </span>
                  {c.full_name}
                </button>
              ))}
            </Section>
          )}

          {results.invoices?.length > 0 && (
            <Section label="Factures">
              {results.invoices.map((i) => (
                <button
                  key={i.id}
                  onClick={() => go(`/dashboard/factures/${i.id}`)}
                  className="flex items-center w-full text-left"
                  style={{
                    padding: '10px 16px', fontSize: 14, background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--color-iron)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bone)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span className="font-mono-data" style={{ color: 'var(--color-primary)', marginRight: 12 }}>
                    {i.numero}
                  </span>
                  {i.client?.full_name || i.client_divers_nom || 'Client divers'}
                </button>
              ))}
            </Section>
          )}

          {results.quotes?.length > 0 && (
            <Section label="Devis">
              {results.quotes.map((q) => (
                <button
                  key={q.id}
                  onClick={() => go(`/dashboard/devis/${q.id}`)}
                  className="flex items-center w-full text-left"
                  style={{
                    padding: '10px 16px', fontSize: 14, background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--color-iron)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bone)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span className="font-mono-data" style={{ color: 'var(--color-primary)', marginRight: 12 }}>
                    {q.quote_number || q.numero}
                  </span>
                  {q.client_name}
                </button>
              ))}
            </Section>
          )}

          {total === 0 && (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-steel)', fontSize: 14 }}>
              {loading ? 'Recherche...' : 'Aucun resultat'}
            </div>
          )}
        </div>

        <div
          className="flex items-center gap-4"
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--color-ash)',
            background: 'var(--color-bone)',
            fontSize: 11,
            color: 'var(--color-steel)',
          }}
        >
          <span>↑↓ Naviguer</span>
          <span>Enter Selectionner</span>
          <span>Esc Fermer</span>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 500, color: 'var(--color-steel)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      {children}
    </div>
  );
}
