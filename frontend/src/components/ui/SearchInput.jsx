import { useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';

export default function SearchInput({
  value,
  onSearch,
  onClear,
  loading = false,
  placeholder = 'Rechercher...',
  className = '',
  style,
}) {
  const [local, setLocal] = useState(value || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(local.trim());
  };

  const handleClear = () => {
    setLocal('');
    if (onClear) onClear();
  };

  const showClear = !!onClear && (
    (local && local.length > 0) ||
    (typeof value === 'string' && value.length > 0)
  );

  return (
    <form onSubmit={handleSubmit} className={className} style={{ position: 'relative', flex: 1, ...style }}>
      <Search
        size={16}
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--color-smoke)',
          pointerEvents: 'none',
        }}
      />
      <input
        type="text"
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="input"
        style={{ paddingLeft: 36, paddingRight: showClear ? 80 : 44, width: '100%' }}
        disabled={loading}
      />
      {showClear && (
        <button
          type="button"
          onClick={handleClear}
          title="Effacer le filtre"
          aria-label="Effacer le filtre"
          style={{
            position: 'absolute',
            right: 42,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            padding: 6,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-steel)',
            cursor: 'pointer',
            borderRadius: 6,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-danger)';
            e.currentTarget.style.background = 'var(--color-danger-container)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-steel)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <X size={14} />
        </button>
      )}
      <button
        type="submit"
        title="Rechercher"
        aria-label="Rechercher"
        style={{
          position: 'absolute',
          right: 6,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'var(--color-primary-wash)',
          borderRadius: 6,
          padding: 6,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--color-primary-glow)',
          color: 'var(--color-primary)',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
      </button>
    </form>
  );
}
