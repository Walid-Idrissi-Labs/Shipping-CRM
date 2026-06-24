import { useEffect, useRef } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export default function SuccessModal({
  open,
  title,
  message,
  icon: Icon = CheckCircle2,
  detail,
  primaryAction,
  secondaryActions = [],
  onClose,
}) {
  const dialogRef = useRef(null);
  const primaryRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement;
      requestAnimationFrame(() => primaryRef.current?.focus());
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
        previouslyFocused.current?.focus?.();
      };
    }
    return undefined;
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop success-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-title"
        aria-describedby={message ? 'success-msg' : undefined}
        tabIndex={-1}
        className="success-surface"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-paper-white)',
          borderRadius: 16,
          boxShadow: '0 24px 70px rgba(0,0,0,0.22), 0 0 0 1px var(--color-ash)',
          padding: '32px 28px 24px',
          maxWidth: 460,
          width: 'calc(100% - 32px)',
          minHeight: 360,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        <button
          type="button"
          onClick={onClose}
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

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            flex: 1,
          }}
        >
          <div
            className="success-icon-circle"
            style={{
              width: 72,
              height: 72,
              borderRadius: 9999,
              background: 'rgba(74, 198, 76, 0.14)',
              color: 'var(--color-vivid-green-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <Icon size={36} strokeWidth={2.4} />
          </div>

          <h2
            id="success-title"
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--color-graphite)',
              margin: 0,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h2>

          {message && (
            <p
              id="success-msg"
              style={{
                fontSize: 14,
                color: 'var(--color-iron)',
                marginTop: 8,
                marginBottom: 0,
                lineHeight: 1.5,
              }}
            >
              {message}
            </p>
          )}

          {detail && (
            <div
              style={{
                marginTop: 20,
                padding: '14px 16px',
                background: 'var(--color-success-container)',
                borderRadius: 10,
                fontSize: 13,
                color: 'var(--color-graphite)',
                width: '100%',
                boxSizing: 'border-box',
                textAlign: 'left',
              }}
            >
              {detail}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 26,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {primaryAction && (
            <button
              ref={primaryRef}
              type="button"
              onClick={primaryAction.onClick}
              className="btn btn-primary"
              style={{
                padding: '10px 16px',
                width: '100%',
              }}
            >
              {primaryAction.icon ? <primaryAction.icon size={15} /> : null}
              {primaryAction.label}
            </button>
          )}
          {secondaryActions.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {secondaryActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="btn btn-secondary"
                  style={{
                    padding: '10px 12px',
                    flex: 1,
                    fontSize: 13,
                  }}
                >
                  {action.icon ? <action.icon size={14} /> : null}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
