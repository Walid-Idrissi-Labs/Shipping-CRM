/* eslint-disable react-hooks/set-state-in-effect -- `shown` is a delayed mirror of `loading`; updating it from the effect is the point */
import { useEffect, useRef, useState } from 'react';

// Keeps a loading flag visibly true for at least `minMs` so fast responses
// don't make the loader flash and vanish mid-animation.
export function useMinLoading(loading, minMs = 1100) {
  const [shown, setShown] = useState(loading);
  const startRef = useRef(-Infinity);

  useEffect(() => {
    if (loading) {
      startRef.current = performance.now();
      setShown(true);
      return undefined;
    }
    const rest = minMs - (performance.now() - startRef.current);
    if (rest <= 0) {
      setShown(false);
      return undefined;
    }
    const t = setTimeout(() => setShown(false), rest);
    return () => clearTimeout(t);
  }, [loading, minMs]);

  return shown;
}
