import { createContext, useCallback, useContext, useState } from 'react';
import api from '../api/axios';

// Counts of untreated (en_attente) demandes — devis, compte, expedition — used
// to drive the green sidebar outline. Cleared only when a demande is actually
// accepted/refused, never by merely visiting its page.
const PendingCountsContext = createContext({ counts: {}, refresh: () => {} });

export function PendingCountsProvider({ children }) {
  const [counts, setCounts] = useState({});

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/pending-counts');
      setCounts(data || {});
    } catch {
      // Non-critical UI affordance — a failed refresh just leaves the
      // previous counts in place.
    }
  }, []);

  return (
    <PendingCountsContext.Provider value={{ counts, refresh }}>
      {children}
    </PendingCountsContext.Provider>
  );
}

export function usePendingCounts() {
  return useContext(PendingCountsContext);
}
