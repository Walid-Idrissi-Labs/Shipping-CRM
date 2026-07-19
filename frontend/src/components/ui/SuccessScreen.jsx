import { Check } from 'lucide-react';

/**
 * Full-page confirmation screen shown after a public form submits successfully.
 * Replaces the copy-pasted success blocks in QuoteRequest and AccountRequest.
 *
 * `actions` is optional custom markup; if omitted, pass `primaryLabel`/`onPrimary`
 * (and optional secondary) to render standard buttons.
 */
export default function SuccessScreen({
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  actions,
}) {
  return (
    <div className="mx-auto" style={{ maxWidth: 560, padding: '80px 24px' }}>
      <div
        className="surface-canvas animate-fade-in-up text-center"
        style={{
          background: 'var(--color-paper-white)',
          border: '1px solid var(--color-ash)',
          borderRadius: 16,
          padding: 40,
        }}
      >
        <div
          className="mx-auto mb-4 flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 9999,
            background: 'var(--color-success-container)',
            color: 'var(--color-vivid-green-dark)',
          }}
        >
          <Check size={28} />
        </div>
        <h1 className="public-serif" style={{ fontSize: 32, margin: 0 }}>{title}</h1>
        {message && (
          <p style={{ fontSize: 14, color: 'var(--color-iron)', maxWidth: 420, margin: '16px auto 0' }}>
            {message}
          </p>
        )}
        {actions || (primaryLabel && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
            {secondaryLabel && (
              <button type="button" onClick={onSecondary} className="btn btn-secondary">
                {secondaryLabel}
              </button>
            )}
            <button type="button" onClick={onPrimary} className="btn btn-primary">
              {primaryLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
