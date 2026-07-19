import { useState, useEffect, useRef, useLayoutEffect, useCallback }  from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, AlertCircle, Info, X } from 'lucide-react';
import { GlobeFlights } from '../../components/Globe';
import Tooltip from '../../components/ui/Tooltip';
import { STATUSES, HorizontalTimeline, VerticalTimeline } from '../../components/ShipmentStatusTimeline';

function TrackingCard({ item }) {
  if (item.error) {
    return (
      <div
        className="surface-canvas animate-fade-in-up"
        style={{
          width: '100%',
          background: 'var(--color-paper-white)',
          border: '1px solid var(--color-ash)',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-mono-data)', fontSize: 24, fontWeight: 300, color: 'var(--color-primary)', letterSpacing: '0.02em' }}>
            {item.number}
          </div>
          <AlertCircle size={20} style={{ color: 'var(--color-danger)' }} />
        </div>
        <p style={{ fontSize: 16, color: 'var(--color-graphite)', marginBottom: 8 }}>Aucun envoi trouvé avec ce numéro.</p>
        <p style={{ fontSize: 13, color: 'var(--color-steel)' }}>Vérifiez le numéro et réessayez.</p>
      </div>
    );
  }

  const { data } = item;
  const events = data.events || [];
  const sousEtapes = data.sous_etapes || {};
  const eventStatuses = new Set(events.map((e) => e.statut));
  const currentIndex = STATUSES.reduce((highest, status, idx) => {
    if (eventStatuses.has(status.key) && idx > highest) return idx;
    return highest;
  }, -1);

  return (
    <div
      className="surface-canvas animate-fade-in-up"
      style={{
        width: '100%',
        background: 'var(--color-paper-white)',
        border: '1px solid var(--color-ash)',
        borderRadius: 16,
        padding: 40,
        boxShadow: '0 8px 10px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
      }}
    >
      <div
        className="flex items-center justify-between gap-4 flex-wrap"
        style={{ marginBottom: 32, alignItems: 'center' }}
      >
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 32,
            fontWeight: 300,
            color: 'var(--color-primary)',
            letterSpacing: '0.01em',
          }}
        >
          {data.shipping_number}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 21,
            color: 'var(--color-graphite)',
          }}
        >
          <span>{data.sender_city || '—'}</span>
          <span style={{ color: 'var(--color-smoke)' }}>{'→'}</span>
          <span>{data.recipient_city || '—'}</span>
        </div>
      </div>

      <div className="hidden lg:block">
        <HorizontalTimeline events={events} currentIndex={currentIndex} sousEtapes={sousEtapes} />
      </div>
      <div className="lg:hidden">
        <VerticalTimeline events={events} currentIndex={currentIndex} sousEtapes={sousEtapes} />
      </div>
    </div>
  );
}

export default function Tracking() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const abortControllerRef = useRef(null);

  const fetchTracking = async (n, signal) => {
    const res = await fetch(`/api/shipments/${n}/tracking`, { signal });
    if (!res.ok) throw new Error('not found');
    return res.json();
  };

  const performSearch = useCallback(async (numbers) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const settled = await Promise.allSettled(
        numbers.map((n) => fetchTracking(n, controller.signal))
      );
      const newResults = settled.map((r, i) => {
        if (r.status === 'fulfilled') {
          return { number: numbers[i], data: r.value };
        }
        return { number: numbers[i], error: r.reason };
      });
      setResults(newResults);
    } catch {
      // ignore — individual results handled via Promise.allSettled
    } finally {
      setLoading(false);
    }
  }, []);

useLayoutEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const n = searchParams.get('n');
    if (n) {
      const numbers = n.split(',').filter(Boolean);
      if (numbers.length > 0) {
        performSearch(numbers);
      }
    }
  }, [searchParams, performSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const numbers = input
      .split(/[ ,;.-]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const uniqueNumbers = [...new Set(numbers)];
    setSearchParams({ n: uniqueNumbers.join(',') }, { replace: true });
  };

  const handleClear = useCallback(() => {
    setSearchParams({}, { replace: true });
    setInput('');
    setResults([]);
    setError('');
    setLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [setSearchParams]);

  return (
    <div
      style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .page-header-fade { animation: fadeInUp 0.5s ease forwards; }
        .page-content-fade { animation: fadeInUp 0.5s ease 0.15s forwards; opacity: 0; }
      `}</style>
      <div
        className="hidden lg:block"
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '-154px',
          bottom: '-154px',
          width: 616,
          height: 616,
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.72,
          clipPath: 'inset(0 0 0 0 round 50%)',
        }}
      >
        <GlobeFlights />
      </div>
      <div
        className="mx-auto"
        style={{ maxWidth: 1280, padding: '64px 32px', position: 'relative', zIndex: 1 }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div className="page-header-fade text-center" style={{ marginBottom: 32 }}>
            <div
              className="inline-block mb-3"
              style={{
                fontSize: 12, fontWeight: 500, color: 'var(--color-steel)',
                textTransform: 'uppercase', letterSpacing: '0.12em',
              }}
            >
              Suivi de colis
            </div>
            <h1 className="public-serif" style={{ fontSize: 40 }}>Où sont mes colis ?</h1>
            <p style={{ fontSize: 14, color: 'var(--color-steel)', maxWidth: 480, margin: '16px auto 0' }}>
              Entrez votre numéro d'expédition (9 chiffres) pour consulter le statut de votre envoi.
            </p>
          </div>

          <div className="page-content-fade">
            <form
            onSubmit={handleSubmit}
            className="surface-canvas flex items-center gap-2"
            style={{
              background: 'var(--color-paper-white)',
              border: '1px solid var(--color-ash)',
              borderRadius: 9999,
              padding: 6,
              boxShadow: 'var(--shadow-subtle)',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: 123456789"
              inputMode="text"
              className="input"
              style={{ border: 'none', boxShadow: 'none', flex: 1, fontSize: 16 }}
              required
            />
            {(searchParams.get('n') || results.length > 0 || error) && (
              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                className="btn btn-ghost"
                style={{
                  padding: '6px 10px',
                  color: 'var(--color-steel)',
                  borderRadius: 9999,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-steel)')}
                title="Effacer la recherche"
              >
                <X size={16} />
              </button>
            )}
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Search size={16} />
              {loading ? 'Recherche...' : 'Rechercher'}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Tooltip
              placement="bottom"
              content="Saisissez plusieurs numéros (9 chiffres chacun) séparés par :  (,) , (;) , (.) ou  (-)"
            >
              {({ onMouseEnter, onMouseLeave }) => (
                <button
                  type="button"
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--color-primary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Info size={14} />
                  Suivi multiple
                </button>
              )}
            </Tooltip>
          </div>
        </div>
      </div>

        {error && (
          <div
            style={{
              marginTop: 24,
              background: 'var(--color-paper-white)',
              border: '1px solid var(--color-ash)',
              borderRadius: 16,
              padding: 32,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-mono-data)', fontSize: 24, fontWeight: 300, color: 'var(--color-primary)', letterSpacing: '0.02em' }}>
                {input}
              </div>
              <AlertCircle size={20} style={{ color: 'var(--color-danger)' }} />
            </div>
            <p style={{ fontSize: 16, color: 'var(--color-graphite)', marginBottom: 8 }}>{error}</p>
            <p style={{ fontSize: 13, color: 'var(--color-steel)' }}>Vérifiez le numéro et réessayez.</p>
          </div>
        )}

        {results.length > 0 && (
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {results.map((item, idx) => (
              <TrackingCard key={`${item.number}-${idx}`} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}