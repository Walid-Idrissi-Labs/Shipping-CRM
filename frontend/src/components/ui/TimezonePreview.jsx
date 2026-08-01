import { useEffect, useState } from 'react';

const clockFormatter = (timeZone) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const dateFormatter = (timeZone) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

export default function TimezonePreview({ serverTimeIso, timezone }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!serverTimeIso) return undefined;

    const anchor = new Date(serverTimeIso).getTime();
    const anchoredAt = Date.now();
    const tick = () => setNow(new Date(anchor + (Date.now() - anchoredAt)));

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [serverTimeIso]);

  if (!serverTimeIso) return null;

  return (
    <div className="tz-preview">
      <div className="tz-preview-card">
        <div className="tz-preview-label">
          <span className="tz-preview-dot" />
          Heure du serveur (UTC)
        </div>
        <div className="tz-preview-time font-mono-data">{clockFormatter('UTC').format(now)}</div>
        <div className="tz-preview-date">{dateFormatter('UTC').format(now)}</div>
      </div>

      <div className="tz-preview-card tz-preview-card--accent">
        <div className="tz-preview-label">
          <span className="tz-preview-dot" />
          Aperçu — fuseau sélectionné
        </div>
        <div className="tz-preview-time font-mono-data">{clockFormatter(timezone).format(now)}</div>
        <div className="tz-preview-date">{dateFormatter(timezone).format(now)}</div>
      </div>
    </div>
  );
}
