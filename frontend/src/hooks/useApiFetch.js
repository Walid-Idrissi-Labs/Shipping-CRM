import { useState, useEffect, useCallback, useRef } from 'react';

export function useApiFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const run = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher(...args);
      if (mounted.current) setData(result);
      return result;
    } catch (err) {
      if (mounted.current) setError(err);
      throw err;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    mounted.current = true;
    run().catch(() => {});
    return () => {
      mounted.current = false;
    };
  }, deps);

  return { data, error, loading, refetch: run, setData };
}
