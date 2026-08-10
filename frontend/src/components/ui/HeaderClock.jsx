import { useEffect, useState } from 'react';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/**
 * Live wall clock for the provider top bar. Reads the browser's own clock and
 * timezone, so it shows the same moment the OS does -- which is also what a
 * `datetime-local` field prefills with when you add a shipment status.
 */
export default function HeaderClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let interval;
    // Line the first tick up with the next whole second, otherwise the display
    // lags the system clock by however far into a second the mount happened.
    const align = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 1000);
    }, 1000 - (Date.now() % 1000));

    return () => {
      clearTimeout(align);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="header-clock">
      <span className="header-clock-time font-mono-data">{timeFormatter.format(now)}</span>
      <span className="header-clock-date">{dateFormatter.format(now)}</span>
    </div>
  );
}
