import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useColumnSort(defaultCol = 'created_at', defaultDir = 'desc') {
  const [searchParams, setSearchParams] = useSearchParams();

  const column = searchParams.get('sort_by') || defaultCol;
  const direction = searchParams.get('sort_dir') || defaultDir;

  const toggle = useCallback(
    (col) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('page', '1');
      if (col === column) {
        newParams.set('sort_dir', direction === 'asc' ? 'desc' : 'asc');
      } else {
        newParams.set('sort_by', col);
        newParams.set('sort_dir', 'asc');
      }
      setSearchParams(newParams, { replace: false });
    },
    [searchParams, setSearchParams, column, direction]
  );

  const params = {};
  const sb = searchParams.get('sort_by');
  const sd = searchParams.get('sort_dir');
  if (sb) params.sort_by = sb;
  if (sd) params.sort_dir = sd;

  return { column, direction, toggle, params };
}
