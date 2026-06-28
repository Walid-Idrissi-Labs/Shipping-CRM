import { useState, useEffect, useRef, useLayoutEffect, useCallback }  from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Check, Circle, AlertCircle, Info } from 'lucide-react';
import { GlobeFlights } from '../../components/Globe';
import Tooltip from '../../components/ui/Tooltip';

const STATUSES = [
  { key: 'information_recue', label: 'Information Recue' },
  { key: 'ramasse', label: 'Ramasse' },
  { key: 'en_transit', label: 'En Transit' },
  { key: 'en_cours', label: 'En Cours' },
  { key: 'livre', label: 'Livre' },
];

function formatSousStatut(s) {
  return s.replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function HorizontalTimeline({ events, currentIndex }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 20,
        position: 'relative',
      }}
    >
      {STATUSES.map((status, idx) => {
        const event = [...events]
          .filter((e) => e.statut === status.key)
          .sort((a, b) => new Date(b.date_statut) - new Date(a.date_statut))[0] || null;
        const completed = idx <= currentIndex && currentIndex !== -1;
        const current = idx === currentIndex;
        const isLast = idx === STATUSES.length - 1;
        const dotBg = current
          ? 'var(--color-vivid-green)'
          : completed
            ? 'var(--color-primary)'
            : 'var(--color-bone)';
        const dotBorder = current
          ? 'var(--color-vivid-green)'
          : completed
            ? 'var(--color-primary)'
            : 'var(--color-ash)';
        const lineRightBg = idx < currentIndex ? 'var(--color-primary)' : 'var(--color-ash)';
        const lineLeftBg = completed ? 'var(--color-primary)' : 'var(--color-ash)';
        return (
          <div
            key={status.key}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              minWidth: 0,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {!isLast && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    right: '-50%',
                    top: 23,
                    height: 3,
                    background: lineRightBg,
                    zIndex: 0,
                  }}
                />
              )}
              {!isLast && idx !== 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '-50%',
                    right: '50%',
                    top: 23,
                    height: 3,
                    background: lineLeftBg,
                    zIndex: 0,
                  }}
                />
              )}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: 40,
                  height: 40,
                  borderRadius: 9999,
                  background: dotBg,
                  border: `3px solid ${dotBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-paper-white)',
                  boxShadow: current ? '0 0 0 6px rgba(74,198,76,0.22)' : 'none',
                }}
              >
                {completed ? <Check size={18} strokeWidth={3} /> : <Circle size={8} fill="var(--color-smoke)" />}
              </div>
            </div>
            <div
              style={{
                marginTop: 18,
                textAlign: 'center',
                fontWeight: 600,
                fontSize: 16,
                color: completed ? 'var(--color-graphite)' : 'var(--color-smoke)',
                lineHeight: 1.3,
                wordBreak: 'break-word',
              }}
            >
              {(event && event.sous_statut) ? formatSousStatut(event.sous_statut) : status.label}
            </div>
            {event && (
              <>
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--color-steel)',
                    marginTop: 8,
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}
                >
                  {new Date(event.date_statut).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                {event.description && (
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--color-graphite)',
                      marginTop: 6,
                      textAlign: 'center',
                      lineHeight: 1.4,
                      maxWidth: 180,
                      wordBreak: 'break-word',
                    }}
                  >
                    {event.description}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VerticalTimeline({ events, currentIndex }) {
  return (
    <div style={{ position: 'relative' }}>
      {STATUSES.map((status, idx) => {
        const event = [...events]
          .filter((e) => e.statut === status.key)
          .sort((a, b) => new Date(b.date_statut) - new Date(a.date_statut))[0] || null;
        const completed = idx <= currentIndex && currentIndex !== -1;
        const current = idx === currentIndex;
        const isLast = idx === STATUSES.length - 1;
        return (
          <div
            key={status.key}
            style={{ position: 'relative', paddingLeft: 36, paddingBottom: isLast ? 0 : 22 }}
          >
            {!isLast && (
              <div
                style={{
                  position: 'absolute',
                  left: 11,
                  top: 22,
                  bottom: 0,
                  width: 2,
                  background: idx < currentIndex ? 'var(--color-primary)' : 'var(--color-ash)',
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 28,
                height: 28,
                borderRadius: 9999,
                background: current
                  ? 'var(--color-vivid-green)'
                  : completed
                    ? 'var(--color-primary)'
                    : 'var(--color-bone)',
                border: `2px solid ${
                  current
                    ? 'var(--color-vivid-green)'
                    : completed
                      ? 'var(--color-primary)'
                      : 'var(--color-ash)'
                }`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-paper-white)',
                boxShadow: current ? '0 0 0 4px rgba(74,198,76,0.22)' : 'none',
              }}
            >
              {completed ? <Check size={14} strokeWidth={3} /> : <Circle size={7} fill="var(--color-smoke)" />}
            </div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 15,
                color: completed ? 'var(--color-graphite)' : 'var(--color-smoke)',
                lineHeight: 1.3,
              }}
            >
              {(event && event.sous_statut) ? formatSousStatut(event.sous_statut) : status.label}
            </div>
            {event && (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--color-steel)',
                  marginTop: 4,
                  lineHeight: 1.3,
                }}
              >
                {new Date(event.date_statut).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {event.description && (
                  <span style={{ color: 'var(--color-graphite)', display: 'block', marginTop: 2 }}>
                    {event.description}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
        <p style={{ fontSize: 16, color: 'var(--color-graphite)', marginBottom: 8 }}>Aucun envoi trouve avec ce numero.</p>
        <p style={{ fontSize: 13, color: 'var(--color-steel)' }}>Verifiez le numero et reessayez.</p>
      </div>
    );
  }

  const { data } = item;
  const events = data.events || [];
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
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
      }}
    >
      <div
        className="flex items-center justify-between gap-4 flex-wrap"
        style={{ marginBottom: 32, alignItems: 'center' }}
      >
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 30,
            fontWeight: 300,
            color: 'var(--color-primary)',
            letterSpacing: '0.02em',
          }}
        >
          {data.shipping_number}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 19,
            color: 'var(--color-graphite)',
          }}
        >
          <span>{data.sender_city || '—'}</span>
          <span style={{ color: 'var(--color-smoke)' }}>{'->'}</span>
          <span>{data.recipient_city || '—'}</span>
        </div>
      </div>

      <div className="hidden lg:block">
        <HorizontalTimeline events={events} currentIndex={currentIndex} />
      </div>
      <div className="lg:hidden">
        <VerticalTimeline events={events} currentIndex={currentIndex} />
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
  const autoSearched = useRef(false);
  const abortControllerRef = useRef(null);
  const isSearchingRef = useRef(false);

  const fetchTracking = async (n, signal) => {
    const res = await fetch(`/api/shipments/${n}/tracking`, { signal });
    if (!res.ok) throw new Error('not found');
    return res.json();
  };

  const performSearch = useCallback(async (numbers) => {
    if (isSearchingRef.current) return;
    isSearchingRef.current = true;

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
      if (controller.signal.aborted) return;
      const newResults = settled.map((r, i) => {
        if (r.status === 'fulfilled') {
          return { number: numbers[i], data: r.value };
        }
        return { number: numbers[i], error: r.reason };
      });
      setResults(newResults);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
      isSearchingRef.current = false;
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
    if (autoSearched.current) return;
    const n = searchParams.get('n');
    if (n) {
      const numbers = n.split(',').filter(Boolean);
      const validNumbers = numbers.filter((x) => /^\d{9}$/.test(x));
      if (validNumbers.length > 0) {
        autoSearched.current = true;
        performSearch(validNumbers);
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

    const invalid = numbers.find((n) => !/^\d{9}$/.test(n));
    if (invalid) {
      setError('Chaque numero d\'expedition doit contenir exactement 9 chiffres.');
      return;
    }

    const uniqueNumbers = [...new Set(numbers)];
    setSearchParams({ n: uniqueNumbers.join(',') }, { replace: true });
    autoSearched.current = true;
    performSearch(uniqueNumbers);
  };

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
            <h1 className="display-headline" style={{ fontSize: 36 }}>Où sont mes colis ?</h1>
            <p style={{ fontSize: 14, color: 'var(--color-steel)', maxWidth: 480, margin: '16px auto 0' }}>
              Entrez votre numero d'expedition (9 chiffres) pour consulter le statut de votre envoi.
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
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Search size={16} />
              {loading ? 'Recherche...' : 'Rechercher'}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Tooltip
              placement="bottom"
              content="Saisissez plusieurs numeros (9 chiffres chacun) separes par :  (,) , (;) , (.) ou  (-)"
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
                  Suivi Multiple
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
            <p style={{ fontSize: 13, color: 'var(--color-steel)' }}>Verifiez le numero et reessayez.</p>
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