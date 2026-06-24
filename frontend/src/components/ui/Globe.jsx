import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

const BRAND_PRIMARY = [37 / 255, 68 / 255, 176 / 255];

const DEFAULT_GLOBE_CONFIG = {
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: BRAND_PRIMARY,
  glowColor: [1, 1, 1],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.1 },
    { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 },
    { location: [40.7128, -74.006], size: 0.1 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784], size: 0.06 },
  ],
};

export default function Globe({ className = '', config = DEFAULT_GLOBE_CONFIG }) {
  const phiRef = useRef(0);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const pointerInteracting = useRef(null);
  const dragStartOffset = useRef(0);
  const dragOffset = useRef(0);
  const isPaused = useRef(false);

  const updatePointerInteraction = (value) => {
    pointerInteracting.current = value;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? 'grabbing' : 'grab';
    }
  };

  const updateMovement = (clientX) => {
    if (pointerInteracting.current !== null) {
      dragOffset.current = (clientX - pointerInteracting.current) / 200;
    }
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let globe = null;
    let resizeObserver = null;
    let animationId = null;

    const getSize = () => {
      const width = containerRef.current?.offsetWidth || 600;
      return Math.max(Math.floor(width), 1);
    };

    const init = () => {
      if (!canvasRef.current || globe) return;

      const size = getSize();
      const globeConfig = { ...config };
      delete globeConfig.width;
      delete globeConfig.height;
      delete globeConfig.onRender;
      delete globeConfig.devicePixelRatio;

      try {
        globe = createGlobe(canvasRef.current, {
          ...globeConfig,
          width: size,
          height: size,
          devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        });

        const animate = () => {
          if (!isPaused.current) phiRef.current += 0.004;
          globe.update({
            phi: phiRef.current + dragStartOffset.current + dragOffset.current,
            width: getSize(),
            height: getSize(),
          });
          animationId = requestAnimationFrame(animate);
        };

        animate();

        if (canvasRef.current) {
          canvasRef.current.style.opacity = '1';
        }
      } catch (err) {
        console.error('[Globe] init failed', err);
      }
    };

    init();

    const onResize = () => {
      if (!globe) return;
      const size = getSize();
      globe.update({ width: size, height: size });
    };

    window.addEventListener('resize', onResize);

    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (animationId) cancelAnimationFrame(animationId);
      if (globe) globe.destroy();
    };
  }, [config]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'absolute',
        bottom: -140,
        right: -140,
        width: 'min(100%, 650px)',
        aspectRatio: '1 / 1',
        pointerEvents: 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          opacity: 0,
          transition: 'opacity 600ms ease',
          cursor: 'grab',
          contain: 'layout paint size',
          touchAction: 'none',
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          isPaused.current = true;
          updatePointerInteraction(e.clientX);
        }}
        onPointerUp={() => {
          dragStartOffset.current += dragOffset.current;
          dragOffset.current = 0;
          isPaused.current = false;
          updatePointerInteraction(null);
        }}
        onPointerCancel={() => {
          dragStartOffset.current += dragOffset.current;
          dragOffset.current = 0;
          isPaused.current = false;
          updatePointerInteraction(null);
        }}
        onPointerMove={(e) => updateMovement(e.clientX)}
      />
    </div>
  );
}
