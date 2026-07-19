import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Page number synced to the URL (?page=N) so refreshing, sharing a link or
 * using the back button lands on the same page. Page 1 keeps the URL clean.
 *
 * const { page, setPage, resetPage } = useUrlPage();
 * - setPage(n): navigates (pushes history) — used by the pager controls.
 * - resetPage(): silently returns to page 1 (replaces history) — call it
 *   whenever a search/filter/tab change invalidates the current page.
 */
export function useUrlPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const setPage = useCallback((next) => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      if (!next || next <= 1) sp.delete('page');
      else sp.set('page', String(next));
      return sp;
    });
  }, [setSearchParams]);

  const resetPage = useCallback(() => {
    setSearchParams((prev) => {
      if (!prev.has('page')) return prev;
      const sp = new URLSearchParams(prev);
      sp.delete('page');
      return sp;
    }, { replace: true });
  }, [setSearchParams]);

  return { page, setPage, resetPage };
}
