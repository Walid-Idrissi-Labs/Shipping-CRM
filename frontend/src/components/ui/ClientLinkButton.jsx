import { useNavigate } from 'react-router-dom';
import { SquareArrowOutUpRight } from 'lucide-react';

export default function ClientLinkButton({ clientId, style }) {
  const navigate = useNavigate();

  if (!clientId) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/dashboard/clients/${clientId}`)}
      aria-label="Voir Client"
      title="Voir Client"
      className="client-link-button"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
        height: 32,
        padding: 0,
        borderRadius: 8,
        border: '1px solid var(--color-ash)',
        background: 'var(--color-paper-white)',
        color: 'var(--color-graphite)',
        cursor: 'pointer',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        transition: 'width 200ms ease, background 160ms ease, border-color 160ms ease, color 160ms ease',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.01em',
        ...style,
      }}
    >
      <span
        style={{
          flex: 1,
          paddingLeft: 10,
          paddingRight: 2,
          overflow: 'hidden',
          transition: 'max-width 900ms ease, padding 900ms ease',
          whiteSpace: 'nowrap',
        }}
        className="client-link-button-label"
      >
        Voir Client
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          flexShrink: 0,
        }}
      >
        <SquareArrowOutUpRight size={15} strokeWidth={2.2} />
      </span>
    </button>
  );
}
