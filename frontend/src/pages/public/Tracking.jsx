import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Check, Circle } from 'lucide-react';
import { GlobeFlights } from '../../components/Globe';

const STATUSES = [
  { key: 'information_recue', label: 'Information Recue' },
  { key: 'ramasse', label: 'Ramasse' },
  { key: 'en_transit', label: 'En Transit' },
  { key: 'en_cours', label: 'En Cours de Livraison' },
  { key: 'livre', label: 'Livre' },
];

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
        const event = events.find((e) => e.statut === status.key);
        const completed = !!event;
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
        const lineBg = completed ? 'var(--color-primary)' : 'var(--color-ash)';
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
                    background: lineBg,
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
                    background: lineBg,
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
              {status.label}
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
        const event = events.find((e) => e.statut === status.key);
        const completed = !!event;
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
                  background: completed ? 'var(--color-primary)' : 'var(--color-ash)',
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
              {status.label}
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

export default function Tracking() {
  const [number, setNumber] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const autoSearched = useRef(false);

  const performSearch = async (n) => {
    if (!n) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`/api/shipments/${n}/tracking`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      setResult(data);
    } catch {
      setError('Aucun envoi trouve avec ce numero.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoSearched.current) return;
    const n = searchParams.get('n');
    if (n && /^\d{9}$/.test(n)) {
      autoSearched.current = true;
      setNumber(n);
      performSearch(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!number) return;
    setSearchParams({ n: number }, { replace: true });
    performSearch(number);
  };

  const currentIndex = result ? STATUSES.findIndex((s) => s.key === result.current_status) : -1;
  const events = result ? result.events : [];

  return (
    <div
      style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}
    >
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
          <div className="text-center" style={{ marginBottom: 32 }}>
            <div
              className="inline-block mb-3"
              style={{
                fontSize: 12, fontWeight: 500, color: 'var(--color-steel)',
                textTransform: 'uppercase', letterSpacing: '0.12em',
              }}
            >
              Suivi de colis
            </div>
            <h1 className="display-headline" style={{ fontSize: 36 }}>Où est mon colis ?</h1>
            <p style={{ fontSize: 14, color: 'var(--color-steel)', maxWidth: 480, margin: '16px auto 0' }}>
              Entrez votre numero d'expedition (9 chiffres) pour consulter le statut de votre envoi.
            </p>
          </div>

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
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="Numero d'expedition"
              inputMode="numeric"
              className="input"
              style={{ border: 'none', boxShadow: 'none', flex: 1, fontSize: 16 }}
              required
            />
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Search size={16} />
              {loading ? 'Recherche...' : 'Rechercher'}
            </button>
          </form>

          {error && (
            <div
              style={{
                marginTop: 24,
                padding: '12px 16px',
                background: 'var(--color-danger-container)',
                color: 'var(--color-danger)',
                borderRadius: 8,
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          {!result && !error && !loading && (
            <div className="text-center" style={{ marginTop: 40, fontSize: 13, color: 'var(--color-smoke)' }}>
              Astuce : le numero d'expedition vous a ete communique par email lors de la creation du colis.
            </div>
          )}
        </div>

{result && (
             <div style={{ marginTop: 40 }}>
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
                  {result.shipping_number}
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
                  <span>{result.sender_city || '—'}</span>
                  <span style={{ color: 'var(--color-smoke)' }}>{'->'}</span>
                  <span>{result.recipient_city || '—'}</span>
                </div>
              </div>

              <div className="hidden lg:block">
                <HorizontalTimeline events={events} currentIndex={currentIndex} />
              </div>
              <div className="lg:hidden">
                <VerticalTimeline events={events} currentIndex={currentIndex} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
