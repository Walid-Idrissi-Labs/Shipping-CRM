import { useEffect, useRef, useState } from 'react';

/*
 * Two cheap traps for the public forms, shared so both behave identically.
 *
 * A honeypot: a field a real visitor never sees, so anything filling it read
 * the markup rather than the page. And a stopwatch: nobody types a full
 * shipping form in under three seconds.
 *
 * Neither is a CAPTCHA, and that is the point. There is nothing for a real
 * person to solve, notice, or fail. The server (see CapturesSubmissionOrigin)
 * decides what to do with these; the form's only job is to report honestly.
 *
 * Pairs with the HoneypotField component, which renders the hidden input.
 */
export function useHumanCheck() {
  // Stamped in a mount effect rather than during render: reading the clock while
  // rendering is an impure call, and a ref set here cannot be restarted by a
  // re-render, which would make a genuinely slow submission look instant.
  const mountedAt = useRef(null);
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const humanCheckFields = () => ({
    company_website: honeypot,
    // Omitted rather than guessed if the stamp is somehow missing. The server
    // treats an absent measurement as something to note, never as grounds to
    // refuse, so a missing value costs a visitor nothing -- whereas inventing a
    // zero here would have the form accuse its own user of being a bot.
    ...(mountedAt.current === null ? {} : { form_elapsed_ms: Date.now() - mountedAt.current }),
  });

  return {
    humanCheckFields,
    honeypotProps: {
      value: honeypot,
      onChange: (e) => setHoneypot(e.target.value),
    },
  };
}
