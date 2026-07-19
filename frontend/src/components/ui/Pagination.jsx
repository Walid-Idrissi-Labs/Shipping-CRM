import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Shared pager: result summary on the left, numbered pages with ellipsis on
 * the right. Renders nothing on a single page.
 *
 * <Pagination page={p} lastPage={n} total={t} perPage={pp} onChange={setPage} />
 *
 * `total` / `perPage` are optional — without them the summary shows Page X / Y.
 * Pair `onChange` with useUrlPage() so the page number lives in the URL.
 */

function pageWindow(page, lastPage) {
  const wanted = new Set([1, lastPage, page - 1, page, page + 1]);
  // Keep the control a stable width near the edges.
  if (page <= 3) [2, 3, 4].forEach((n) => wanted.add(n));
  if (page >= lastPage - 2) [lastPage - 1, lastPage - 2, lastPage - 3].forEach((n) => wanted.add(n));

  const pages = [...wanted].filter((n) => n >= 1 && n <= lastPage).sort((a, b) => a - b);
  const items = [];
  let prev = 0;
  for (const n of pages) {
    if (n - prev > 1) items.push('ellipsis-' + n);
    items.push(n);
    prev = n;
  }
  return items;
}

export default function Pagination({ page, lastPage, total, perPage, onChange }) {
  if (!lastPage || lastPage <= 1) return null;

  const go = (next) => {
    if (next >= 1 && next <= lastPage && next !== page) {
      onChange(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const hasSummary = total != null && perPage != null;
  const from = hasSummary ? (page - 1) * perPage + 1 : null;
  const to = hasSummary ? Math.min(page * perPage, total) : null;

  return (
    <nav className="pagination-bar" aria-label="Pagination">
      <div className="pagination-summary">
        {hasSummary
          ? <>{from}&#8202;&ndash;&#8202;{to} sur {total} r&eacute;sultat{total > 1 ? 's' : ''}</>
          : <>Page {page} / {lastPage}</>}
      </div>

      <div className="pagination-pages">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page === 1}
          className="page-btn page-btn-nav"
          aria-label="Page précédente"
        >
          <ChevronLeft size={15} />
        </button>

        {pageWindow(page, lastPage).map((item) =>
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              onClick={() => go(item)}
              className={`page-btn ${item === page ? 'is-active' : ''}`}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="page-ellipsis" aria-hidden="true">&hellip;</span>
          )
        )}

        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page === lastPage}
          className="page-btn page-btn-nav"
          aria-label="Page suivante"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </nav>
  );
}
