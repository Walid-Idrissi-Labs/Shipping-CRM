import OrbitLoader from './OrbitLoader';

function DetailSkeleton() {
  return (
    <>
      <div className="skeleton-bar" style={{ width: 240, maxWidth: '60%', height: 26 }} />
      <div className="skeleton-bar" style={{ width: 150, maxWidth: '40%', height: 12 }} />
      <div className="page-skeleton-grid">
        <div className="skeleton-card">
          {[90, 70, 82, 55, 68].map((w, i) => (
            <div key={i} className="skeleton-bar" style={{ width: `${w}%`, height: 12 }} />
          ))}
        </div>
        <div className="skeleton-card">
          {[80, 62, 74].map((w, i) => (
            <div key={i} className="skeleton-bar" style={{ width: `${w}%`, height: 12 }} />
          ))}
        </div>
      </div>
    </>
  );
}

function TableSkeleton() {
  return (
    <>
      <div className="page-skeleton-toolbar">
        <div className="skeleton-bar" style={{ width: 260, maxWidth: '55%', height: 36 }} />
        <div className="skeleton-bar" style={{ width: 120, height: 36, marginLeft: 'auto' }} />
      </div>
      <div className="skeleton-bar" style={{ height: 36 }} />
      {[92, 97, 88, 95, 90, 96].map((w, i) => (
        <div key={i} className="skeleton-bar" style={{ width: `${w}%`, height: 26 }} />
      ))}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="skeleton-bar" style={{ width: 220, maxWidth: '55%', height: 26 }} />
      <div className="page-skeleton-tiles">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton-bar" style={{ height: 86 }} />
        ))}
      </div>
      <div className="page-skeleton-grid">
        <div className="skeleton-card" style={{ minHeight: 220 }} />
        <div className="skeleton-card" style={{ minHeight: 220 }} />
      </div>
    </>
  );
}

const SKELETONS = {
  detail: DetailSkeleton,
  table: TableSkeleton,
  dashboard: DashboardSkeleton,
};

// Full-height loading state: a page-shaped skeleton under a blurred veil,
// with the orbit loader centered on the content area. `embedded` is for use
// inside cards/sections where filling the viewport would be too tall.
export default function PageLoader({ variant = 'detail', embedded = false, label }) {
  const Skeleton = SKELETONS[variant] || DetailSkeleton;
  return (
    <div className={`page-loader${embedded ? ' page-loader-embedded' : ''}`}>
      <div className="page-skeleton" aria-hidden="true">
        <Skeleton />
      </div>
      <div className="page-loader-veil">
        <OrbitLoader label={label} />
      </div>
    </div>
  );
}
