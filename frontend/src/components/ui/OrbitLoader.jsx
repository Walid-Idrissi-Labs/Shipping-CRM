const PLANE_D =
  'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';

function Plane({ layer }) {
  return (
    <g className={`orbit-plane-${layer}`}>
      <line
        x1={-24}
        y1={0}
        x2={-14}
        y2={0}
        stroke="var(--color-vivid-green)"
        strokeOpacity={0.35}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <line
        x1={-33}
        y1={0}
        x2={-27}
        y2={0}
        stroke="var(--color-vivid-green)"
        strokeOpacity={0.15}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <g transform="rotate(90) translate(-12 -12)">
        <path fill="var(--color-vivid-green)" d={PLANE_D} />
      </g>
    </g>
  );
}

export default function OrbitLoader({ label }) {
  return (
    <div className="orbit-loader" role="status" aria-live="polite">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
      >
        {/* Far side of the orbit: ring + plane pass behind the globe */}
        <g transform="translate(60 60) rotate(-14)">
          <ellipse
            cx={0}
            cy={0}
            rx={52}
            ry={16}
            stroke="var(--color-primary-glow)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray="1 7"
          />
          <Plane layer="back" />
        </g>
        <circle
          cx={60}
          cy={60}
          r={30}
          fill="var(--color-primary-wash)"
          stroke="var(--color-primary)"
          strokeWidth={1.5}
        />
        <g stroke="var(--color-primary)" strokeOpacity={0.28} strokeWidth={1}>
          <ellipse cx={60} cy={60} rx={12} ry={30} />
          <ellipse cx={60} cy={60} rx={22} ry={30} />
          <line x1="32.5" y1={48} x2="87.5" y2={48} />
          <line x1={30} y1={60} x2={90} y2={60} />
          <line x1="32.5" y1={72} x2="87.5" y2={72} />
        </g>
        {/* Near side of the orbit: ring crosses in front of the globe */}
        <g transform="translate(60 60) rotate(-14)">
          <path
            d="M -26.7 13.7 A 52 16 0 0 0 26.7 13.7"
            stroke="var(--color-primary-glow)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray="1 7"
          />
          <Plane layer="front" />
        </g>
      </svg>
      {label && (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}
