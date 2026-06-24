import { useCallback, useEffect, useRef, useState } from 'react';

function shallowEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

export function useDirtyForm(initialData) {
  const [data, setData] = useState(initialData);
  const [saved, setSavedData] = useState(initialData);
  const [status, setStatus] = useState('initial');
  const revertTimerRef = useRef(null);

  const isDirty = !shallowEqual(data, saved);

  useEffect(() => {
    if (status === 'saved' && isDirty) {
      setStatus('dirty');
    } else if (status === 'initial' && isDirty) {
      setStatus('dirty');
    } else if ((status === 'dirty' || status === 'saving') && !isDirty && status !== 'saving') {
      setStatus('initial');
    }
  }, [isDirty, status]);

  const update = useCallback((patch) => {
    setData((d) => ({ ...d, ...patch }));
  }, []);

  const beginSave = useCallback(() => {
    if (revertTimerRef.current) {
      clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }
    setStatus('saving');
  }, []);

  const succeedSave = useCallback((dataToSave) => {
    if (dataToSave !== undefined) {
      setSavedData(dataToSave);
      setData(dataToSave);
    } else {
      setSavedData((s) => {
        setData(s);
        return s;
      });
    }
    setStatus('saved');
    revertTimerRef.current = setTimeout(() => {
      setStatus((s) => (s === 'saved' ? 'initial' : s));
    }, 2500);
  }, []);

  const failSave = useCallback(() => {
    setStatus('dirty');
  }, []);

  const reset = useCallback((next) => {
    if (revertTimerRef.current) {
      clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }
    setData(next);
    setSavedData(next);
    setStatus('initial');
  }, []);

  useEffect(() => () => {
    if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
  }, []);

  return {
    data,
    setData,
    update,
    status,
    setStatus,
    isDirty,
    beginSave,
    succeedSave,
    failSave,
    reset,
  };
}
