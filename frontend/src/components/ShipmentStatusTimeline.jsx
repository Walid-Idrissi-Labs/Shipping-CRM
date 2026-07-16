import { Check, Circle, Fullscreen } from 'lucide-react';

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

function HorizontalTimeline({ events, currentIndex, sousEtapes = {} }) {
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

        const sousEtapesForStatus = sousEtapes[status.key] || [];
        const sousEtapeCount = sousEtapesForStatus.length;

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
                width: 45,
                height: 45,
                borderRadius: 9999,
                background: dotBg,
                border: `3px solid ${dotBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-paper-white)',
                boxShadow: current ? '0 0 0 6px rgba(74,198,76,0.22)' : 'none',
                zIndex: 99,
              }}
            >
              {completed ? <Check size={22} strokeWidth={2} /> : <Circle size={10} fill="var(--color-smoke)" />}
            </div>

            {!isLast && (
              <div
                style={{
                  position: 'absolute',
                  left: '050%',
                  top: 20,
                  right: '-50%',
                  height: 4,
                  background: lineRightBg,
                  zIndex: 1,
                }}
              />
            )}
            {!isLast && idx !== 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: '0%',
                  top: 20,
                  right: '+50%',
                  height: 2,
                  background: lineLeftBg,
                  zIndex: 1,
                }}
              />
            )}

            {/* status text */}
            <div
              style={{
                marginTop: 20,
                textAlign: 'center',
                fontWeight: 600,
                fontSize: 17,
                color: completed ? 'var(--color-graphite)' : 'var(--color-smoke)',
                lineHeight: 1.3,
                wordBreak: 'break-word',
                maxWidth: '100%',
              }}
            >
              {(event && event.sous_statut) ? formatSousStatut(event.sous_statut) : status.label}
            </div>

            {event && (
              <div style={{ textAlign: 'center', marginTop: 8, maxWidth: '100%' }}>
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--color-steel)',
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
                      lineHeight: 1.4,
                      maxWidth: 180,
                      wordBreak: 'break-word',
                    }}
                  >
                    {event.description}
                  </div>
                )}
              </div>
            )}

            {sousEtapeCount > 0 && (
              <div
                style={{
                  position: 'relative',
                  marginTop: 14,
                  paddingLeft: 0,
                  paddingTop: 10,
                  width: '95%',
                  boxSizing: 'border-box',
                }}
              >
                {/* vertical line for the substep branch */}
                {/* <div
                  style={{
                    position: 'absolute',
                    left: 89,
                    top: -200,
                    bottom: 0,
                    width: 2,
                    background: completed ? 'var(--color-primary)' : 'var(--color-ash)',
                    zIndex: 1,
                  }}
                /> */}
                {sousEtapesForStatus.map((se, si) => (
                  <div
                    key={se.id}
                    style={{
                      position: 'relative',
                      paddingLeft: 2,
                      marginBottom: si === sousEtapesForStatus.length - 1 ? 0 : 16,
                    }}
                  >
                    {/* weird vertical lines */}
                    {/* <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: si === sousEtapesForStatus.length - 1 ? 0 : 52,
                        width: 2,
                        background: completed ? 'var(--color-primary)' : 'var(--color-ash)',
                        zIndex: 1,
                      }}
                    /> */}
                    {/* small Horizontal line connecting the main status to the sub-step */}
                    {/* <div
                      style={{
                        position: 'absolute',
                        left: -10,
                        top: 0,
                        width: 2,
                        height: 40,
                        background: 'var(--color-primary)',
                        borderRadius: 1,
                      }}
                    /> */}
                    {/* Dots */}
                    <div
                      style={{
                        position: 'absolute',
                        left: -4,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 13,
                        height: 13,
                        borderRadius: 9999,
                        background: 'var(--color-primary)',
                        border: '2px solid var(--color-bone)',
                        boxShadow: '0 0 0 3px var(--color-ash)',
                        zIndex: 2,
                      }}
                    />
                    <div
                      style={{
                        background: 'var(--color-bone)',
                        border: '1px solid var(--color-ash)',
                        borderRadius: 6,
                        padding: '8px 13px',
                        fontSize: 13,
                        color: 'var(--color-graphite)',
                        lineHeight: 1.4,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        minWidth: 200,
                        maxWidth: 300,
                      }}
                    >
                      <span>{se.description}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-steel)' }}>
                        {new Date(se.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VerticalTimeline({ events, currentIndex, sousEtapes = {} }) {
  return (
    <div style={{ position: 'relative', paddingLeft: 0 }}>
      {STATUSES.map((status, idx) => {
        const event = [...events]
          .filter((e) => e.statut === status.key)
          .sort((a, b) => new Date(b.date_statut) - new Date(a.date_statut))[0] || null;
        const completed = idx <= currentIndex && currentIndex !== -1;
        const current = idx === currentIndex;
        const isLast = idx === STATUSES.length - 1;

        const sousEtapesForStatus = sousEtapes[status.key] || [];
        const sousEtapeCount = sousEtapesForStatus.length;

        return (
          <div
            key={status.key}
            style={{ position: 'relative' }}
          >
            {/* main vertical line connecting the main statuses */}
            {!isLast && (
              <div
                style={{
                  position: 'absolute',
                  left: 2,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: idx < currentIndex ? 'var(--color-primary)' : 'var(--color-ash)',
                  zIndex: 1,
                }}
              />
            )}

            {/* containing main statuses */}
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 20,
                left: -11,
                zIndex: 200,
              }}
            >
              <div
                style={{
                  flexShrink: 0,
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
                  boxShadow: current ? '0 0 0 4px rgba(74,198,76,0.32)' : 'none',
                }}
              >
                {completed ? <Check size={11} strokeWidth={3} /> : <Circle size={7} fill="var(--color-smoke)" />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
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
                    {event.sous_statut && (
                      <span
                        style={{
                          color: 'var(--color-steel)',
                          display: 'block',
                          marginTop: 4,
                          marginBottom: 8,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {formatSousStatut(event.sous_statut)}
                      </span>
                    )}
                    {event.description && (
                      <span style={{ color: 'var(--color-graphite)', display: 'block', marginTop: 2 }}>
                        {event.description}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* // vertical line connecting the main status to the sub-steps */}
              {/* looks weird */}
              {/* {sousEtapeCount > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: 14,
                    width: 0,
                    height: 16 + sousEtapeCount * 52,
                    background: idx < currentIndex ? 'var(--color-primary)' : 'var(--color-ash)',
                    zIndex: 1,
                  }}
                />
              )} */}
            </div>

            {sousEtapeCount > 0 && (
              <div style={{ paddingLeft: 40, marginTop: 8 }}>
                {sousEtapesForStatus.map((se, si) => (
                  <div
                    key={se.id}
                    style={{
                      position: 'relative',
                      marginBottom: si === sousEtapesForStatus.length - 1 ? 8 : 16,
                    }}
                  >
                    {/* wasted vertical line */}
                    <div
                      style={{
                        position: 'absolute',
                        left: -27,
                        top: 0,
                        bottom: si === sousEtapesForStatus.length - 1 ? 0 : 52,
                        width: 0,
                        background: idx < currentIndex ? 'var(--color-primary)' : 'var(--color-ash)',
                        zIndex: 1,
                      }}
                    />
                    {/* little horizontal line connecting the vertical line to the sub-step */}
                    <div
                      style={{
                        position: 'absolute',
                        left: -35,
                        top: 24,
                        width: 0,
                        height: 0,
                        background: 'var(--color-primary)',
                        borderRadius: 1,
                      }}
                    />
                    {/* little dot for the sub-step */}
                    <div
                      style={{
                        position: 'absolute',
                        left: -44,
                        top: 20,
                        width: 14,
                        height: 14,
                        borderRadius: 9999,
                        background: 'var(--color-primary)',
                        border: '2px solid var(--color-paper-white)',
                        boxShadow: '0 0 0 1px var(--color-ash)',
                        zIndex: 2,
                      }}
                    />
                    {/* substatus card */}
                    <div
                      style={{
                        paddingLeft: 9,
                        background: 'var(--color-bone)',
                        border: '1px solid var(--color-ash)',
                        borderRadius: 6,
                        paddingTop: 8,
                        paddingBottom: 8,
                        paddingRight: 10,
                        fontSize: 13,
                        color: 'var(--color-graphite)',
                        lineHeight: 1.4,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        minWidth: 200,
                        maxWidth: 500,
                      }}
                    >
                      <span>{se.description}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-steel)' }}>
                        {new Date(se.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLast && <div style={{ height: 16 }} />}
          </div>
        );
      })}
    </div>
  );
}

function ShipmentStatusTimeline({ events, sousEtapes = {} }) {
  const eventStatuses = new Set(events.map((e) => e.statut));
  const currentIndex = STATUSES.reduce((highest, status, idx) => {
    if (eventStatuses.has(status.key) && idx > highest) return idx;
    return highest;
  }, -1);

  return (
    <>
      <div className="hidden lg:block">
        <HorizontalTimeline events={events} currentIndex={currentIndex} sousEtapes={sousEtapes} />
      </div>
      <div className="lg:hidden">
        <VerticalTimeline events={events} currentIndex={currentIndex} sousEtapes={sousEtapes} />
      </div>
    </>
  );
}

export { STATUSES, formatSousStatut, ShipmentStatusTimeline, HorizontalTimeline, VerticalTimeline };
