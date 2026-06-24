import { Link } from 'react-router-dom';

export default function DonutChart({
  data = [],
  size = 180,
  thickness = 22,
  centerLabel,
  centerValue,
}) {
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  if (total === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-steel)',
          fontSize: 13,
          margin: '0 auto',
        }}
      >
        Aucune donnee
      </div>
    );
  }

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const slices = data
    .map((slice, idx) => {
      const fraction = slice.value / total;
      const dash = fraction * circumference;
      const gap = circumference - dash;
      return { slice, idx, dash, gap };
    })
    .reduce((acc, item) => {
      const offset = circumference * 0.25 - acc.cumulative;
      const slice = { ...item, offset };
      acc.items.push(slice);
      acc.cumulative += item.dash;
      return acc;
    }, { items: [], cumulative: 0 }).items;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        margin: '0 auto',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-fog)"
          strokeWidth={thickness}
        />
        {slices.map(({ slice, idx, dash, gap, offset }) => {
          const el = (
            <circle
              key={`${slice.label}-${idx}`}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${center} ${center})`}
              style={{
                transition: 'opacity 150ms ease, stroke-width 150ms ease',
                cursor: slice.href ? 'pointer' : 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <title>
                {slice.label}: {slice.value}
              </title>
            </circle>
          );
          return slice.href ? (
            <Link key={`link-${slice.label}-${idx}`} to={slice.href} aria-label={`Voir ${slice.label}`}>
              {el}
            </Link>
          ) : (
            el
          );
        })}
      </svg>
      {(centerLabel || centerValue != null) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {centerValue != null && (
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: 'var(--color-graphite)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {centerValue}
            </div>
          )}
          {centerLabel && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-steel)',
                marginTop: 4,
              }}
            >
              {centerLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
