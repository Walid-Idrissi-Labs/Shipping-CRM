import { useState } from 'react';
import { Copy, CopyCheck } from 'lucide-react';

export default function CopyButton({ value, size = 14, className = '', title = 'Copier' }) {
  const [copied, setCopied] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(String(value)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={copied ? 'Copié !' : title}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        marginLeft: 6,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: copied ? 'var(--color-success, #16a34a)' : 'var(--color-steel)',
        opacity: copied ? 1 : 0.6,
        transition: 'opacity 0.15s, color 0.15s',
        verticalAlign: 'middle',
        lineHeight: 1,
      }}
      onMouseEnter={(e) => { if (!copied) e.currentTarget.style.opacity = '1'; }}
      onMouseLeave={(e) => { if (!copied) e.currentTarget.style.opacity = '0.6'; }}
    >
      {copied ? <CopyCheck size={size} /> : <Copy size={size} />}
    </button>
  );
}
