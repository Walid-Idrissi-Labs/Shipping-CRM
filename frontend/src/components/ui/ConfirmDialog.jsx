import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

const VARIANT_STYLES = {
  danger: {
    iconBg: 'rgba(220, 53, 69, 0.1)',
    iconColor: 'var(--color-danger)',
    icon: AlertTriangle,
    confirmClass: 'btn-danger',
  },
  warning: {
    iconBg: 'rgba(245, 158, 11, 0.1)',
    iconColor: '#f59e0b',
    icon: AlertTriangle,
    confirmClass: 'btn-warning',
  },
  info: {
    iconBg: 'var(--color-primary-wash)',
    iconColor: 'var(--color-primary)',
    icon: Info,
    confirmClass: 'btn-primary-cta',
  },
  success: {
    iconBg: 'rgba(74, 198, 76, 0.12)',
    iconColor: 'var(--color-vivid-green)',
    icon: CheckCircle2,
    confirmClass: 'btn-success',
  },
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'info',
  safetyGate = false,
  requiredInput = '',
  inputLabel = '',
  inputPlaceholder = '',
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.info;
  const Icon = style.icon;

  const [typed, setTyped] = useState('');
  const [shake, setShake] = useState(false);
  const exactMatch = !safetyGate || typed === requiredInput;

  useEffect(() => {
    if (open) {
      setTyped('');
      setShake(false);
      previouslyFocused.current = document.activeElement;
      requestAnimationFrame(() => {
        if (safetyGate) {
          inputRef.current?.focus();
        } else if (variant === 'danger') {
          dialogRef.current?.focus();
        } else {
          confirmRef.current?.focus();
        }
      });
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
        previouslyFocused.current?.focus?.();
      };
    }
    return undefined;
  }, [open, variant, safetyGate]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
        return;
      }
      if (e.key === 'Enter') {
        const tag = document.activeElement?.tagName;
        if (tag === 'BUTTON') return;
        if (safetyGate) {
          if (exactMatch) {
            e.preventDefault();
            onConfirm?.();
          } else {
            e.preventDefault();
            setShake(false);
            requestAnimationFrame(() => setShake(true));
            setTimeout(() => setShake(false), 500);
            inputRef.current?.focus();
          }
          return;
        }
        e.preventDefault();
        onConfirm?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onConfirm, onCancel, safetyGate, exactMatch]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? 'dialog-desc' : undefined}
        tabIndex={-1}
        className="dialog-surface"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-paper-white)',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px var(--color-ash)',
          padding: '24px',
          maxWidth: 480,
          width: 'calc(100% - 32px)',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Fermer"
          className="btn-icon"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            color: 'var(--color-smoke)',
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              background: style.iconBg,
              color: style.iconColor,
              flexShrink: 0,
            }}
          >
            <Icon size={20} strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1" style={{ paddingRight: 28 }}>
            <h2
              id="dialog-title"
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--color-graphite)',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {title}
            </h2>

            {description && (
              <p
                id="dialog-desc"
                style={{
                  fontSize: 13.5,
                  color: 'var(--color-iron)',
                  marginTop: 6,
                  marginBottom: 0,
                  lineHeight: 1.5,
                }}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {safetyGate && (
          <div style={{ marginTop: 18 }}>
            <label
              htmlFor="dialog-safety-input"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-graphite)',
                marginBottom: 6,
              }}
            >
              {inputLabel || (
                <>
                  Tapez{' '}
                  <span
                    className="font-mono-data"
                    style={{
                      background: 'var(--color-danger-container)',
                      color: 'var(--color-danger)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {requiredInput}
                  </span>{' '}
                  pour confirmer
                </>
              )}
            </label>

            <input
              ref={inputRef}
              id="dialog-safety-input"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={inputPlaceholder || requiredInput}
              className={shake ? 'animate-shake' : ''}
              style={{
                width: '100%',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--color-bone)',
                border: `1px solid ${exactMatch ? 'var(--color-vivid-green)' : 'var(--color-ash)'}`,
                color: 'var(--color-graphite)',
                outline: 'none',
                transition: 'border-color 150ms ease, box-shadow 150ms ease',
                boxShadow: exactMatch ? '0 0 0 3px rgba(74, 198, 76, 0.18)' : 'none',
              }}
            />

            {typed && !exactMatch && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-danger)',
                  marginTop: 6,
                }}
              >
                Le texte doit correspondre exactement.
              </div>
            )}
          </div>
        )}

        <div
          className="flex items-center justify-end gap-2"
          style={{ marginTop: 22, flexWrap: 'wrap' }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            style={{ padding: '8px 16px' }}
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => {
              if (!exactMatch) return;
              onConfirm?.();
            }}
            disabled={!exactMatch}
            className={`btn ${style.confirmClass}`}
            style={{
              padding: '8px 16px',
              opacity: exactMatch ? 1 : 0.45,
              cursor: exactMatch ? 'pointer' : 'not-allowed',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
