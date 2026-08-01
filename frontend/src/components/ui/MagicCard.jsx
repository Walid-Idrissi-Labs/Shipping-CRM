import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * True when the device can actually hover (i.e. not a touch phone/tablet).
 * Starts optimistic so desktop renders the effect on first paint; on touch
 * devices the effect layer is dropped after mount.
 */
function useHoverCapable() {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setOk(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return ok;
}

/**
 * MagicCard — a card whose gradient border and inner spotlight follow the cursor.
 *
 * Adapted from the magicui component for this app: plain React (no framer-motion,
 * no next-themes) and the house blue → green brand palette. Cursor tracking is
 * done through CSS custom properties set imperatively, so moving the mouse never
 * triggers a React re-render.
 *
 * Border behaviour:
 *   - Default: the blue → green gradient border is always on.
 *   - Pass `restingBorderColor` to instead show a solid, subtle ring at rest and
 *     reveal the gradient only on hover ("outlined in X, colours on hover").
 *
 * Pass `disableOnTouch` to render a plain bordered box (no effect, no cursor
 * listeners) on devices that can't hover — e.g. phones.
 *
 * The component owns the box (background, radius, border). Put your padding on
 * the children or via `contentStyle`.
 */
export default function MagicCard({
  children,
  className = '',
  style,
  contentStyle,
  contentClassName = '',
  gradientSize = 260,
  // Inner spotlight that fades in on hover — a soft wash of the primary blue.
  gradientColor = 'rgba(37, 68, 176, 0.10)',
  gradientOpacity = 1,
  // Animated border gradient — the signature blue → green.
  gradientFrom = 'var(--color-primary)',
  gradientTo = 'var(--color-vivid-green)',
  // When set, the gradient border is hidden at rest behind this solid ring and
  // only revealed on hover.
  restingBorderColor = null,
  radius = 16,
  borderWidth = 1,
  background = 'var(--color-paper-white)',
  disableOnTouch = false,
}) {
  const ref = useRef(null);
  const hoverCapable = useHoverCapable();
  const hasResting = restingBorderColor != null;

  const handleMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }, []);

  const handleEnter = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--spot-opacity', String(gradientOpacity));
    el.style.setProperty('--border-opacity', '1');
  }, [gradientOpacity]);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--spot-opacity', '0');
    el.style.setProperty('--border-opacity', hasResting ? '0' : '1');
  }, [hasResting]);

  // Plain, effect-free box for touch devices.
  if (disableOnTouch && !hoverCapable) {
    return (
      <div className={className} style={{ borderRadius: radius, ...style }}>
        <div
          className={contentClassName}
          style={{
            position: 'relative',
            borderRadius: 'inherit',
            background,
            border: `${borderWidth}px solid ${restingBorderColor || 'var(--color-ash)'}`,
            height: '100%',
            ...contentStyle,
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  const innerLayer = {
    position: 'absolute',
    top: borderWidth,
    right: borderWidth,
    bottom: borderWidth,
    left: borderWidth,
    borderRadius: 'inherit',
    pointerEvents: 'none',
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={className}
      style={{
        position: 'relative',
        borderRadius: radius,
        '--mx': '50%',
        '--my': '50%',
        '--spot-opacity': 0,
        '--border-opacity': hasResting ? 0 : 1,
        ...style,
      }}
    >
      {/* 0. Resting ring — a solid, subtle border shown when not hovering. */}
      {hasResting && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background: restingBorderColor,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 1. Gradient rectangle — becomes the border once the bg is laid on top. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: `radial-gradient(${gradientSize}px circle at var(--mx) var(--my), ${gradientFrom}, ${gradientTo}, transparent 100%)`,
          opacity: 'var(--border-opacity)',
          transition: 'opacity 300ms ease',
          pointerEvents: 'none',
        }}
      />

      {/* 2. Solid background, inset by the border width. */}
      <div aria-hidden="true" style={{ ...innerLayer, background }} />

      {/* 3. Spotlight wash, inset, fades in on hover. */}
      <div
        aria-hidden="true"
        style={{
          ...innerLayer,
          background: `radial-gradient(${gradientSize}px circle at var(--mx) var(--my), ${gradientColor}, transparent 100%)`,
          opacity: 'var(--spot-opacity)',
          transition: 'opacity 300ms ease',
        }}
      />

      {/* 4. Content. */}
      <div
        className={contentClassName}
        style={{ position: 'relative', borderRadius: 'inherit', ...contentStyle }}
      >
        {children}
      </div>
    </div>
  );
}
