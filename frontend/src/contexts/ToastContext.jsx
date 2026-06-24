import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let nextId = 1;

const VARIANTS = {
  success: {
    Icon: CheckCircle2,
    iconColor: 'var(--color-vivid-green-dark)',
    bg: 'var(--color-success-container)',
    border: 'var(--color-vivid-green)',
    textColor: 'var(--color-graphite)',
  },
  error: {
    Icon: AlertCircle,
    iconColor: 'var(--color-danger)',
    bg: '#fef2f2',
    border: '#fecaca',
    textColor: 'var(--color-graphite)',
  },
  warning: {
    Icon: AlertTriangle,
    iconColor: 'var(--color-warning)',
    bg: '#fffbeb',
    border: '#fde68a',
    textColor: 'var(--color-graphite)',
  },
  info: {
    Icon: Info,
    iconColor: 'var(--color-primary)',
    bg: 'var(--color-primary-wash)',
    border: 'var(--color-primary-glow)',
    textColor: 'var(--color-graphite)',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, opts = {}) => {
    const id = nextId++;
    const type = opts.type || 'info';
    const duration = opts.duration ?? 4000;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const value = {
    push,
    success: (message, opts) => push(message, { ...opts, type: 'success' }),
    error: (message, opts) => push(message, { ...opts, type: 'error' }),
    warning: (message, opts) => push(message, { ...opts, type: 'warning' }),
    info: (message, opts) => push(message, { ...opts, type: 'info' }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, dismiss }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 380,
        width: 'calc(100% - 32px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const cfg = VARIANTS[t.type] || VARIANTS.info;
        const { Icon } = cfg;
        return (
          <div
            key={t.id}
            className="animate-fade-in"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 12,
              border: `1px solid ${cfg.border}`,
              background: cfg.bg,
              boxShadow: 'var(--shadow-md)',
              color: cfg.textColor,
            }}
            role="alert"
          >
            <Icon size={20} style={{ color: cfg.iconColor, flexShrink: 0, marginTop: 2 }} />
            <p style={{ flex: 1, fontSize: 14, margin: 0, lineHeight: 1.4 }}>{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              style={{
                flexShrink: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 2,
                color: 'var(--color-smoke)',
              }}
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
