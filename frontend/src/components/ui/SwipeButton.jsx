import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';

const TRACK_BG_DEFAULT = 'var(--color-bone)';
const TRACK_BG_REVEAL = '#bff0be';
const TRACK_BG_COMPLETED = '#4ac64c';

export default function SwipeButton({
  onConfirm,
  trackText = 'Glisser pour confirmer',
  confirmText,
  completedText = 'Confirme',
  disabled = false,
  height = 56,
  threshold = 0.7,
  className = '',
  style = {},
  ariaLabel = 'Swipe to confirm',
}) {
  const trackRef = useRef(null);
  const handleRef = useRef(null);
  const pointerStartX = useRef(0);
  const draggingRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  const handleWidth = Math.min(64, height);
  const maxOffset = trackWidth > 0 ? trackWidth - handleWidth : 0;

  useEffect(() => {
    if (trackRef.current) setTrackWidth(trackRef.current.offsetWidth);
    const onResize = () => {
      if (trackRef.current) setTrackWidth(trackRef.current.offsetWidth);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onPointerDown = useCallback((e) => {
    if (disabled || completed || trackWidth === 0) return;
    draggingRef.current = true;
    pointerStartX.current = e.clientX;
    if (handleRef.current) handleRef.current.setPointerCapture(e.pointerId);
    setOffset(0);
  }, [disabled, completed, trackWidth]);

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current || completed) return;
    const dx = Math.max(0, Math.min(e.clientX - pointerStartX.current, maxOffset));
    setOffset(dx);
  }, [completed, maxOffset]);

  const onPointerUp = useCallback((e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (handleRef.current && handleRef.current.hasPointerCapture(e.pointerId)) {
      handleRef.current.releasePointerCapture(e.pointerId);
    }
    if (completed) return;
    const ratio = maxOffset > 0 ? (offset + handleWidth * 0.15) / trackWidth : 0;
    if (ratio >= threshold) {
      setOffset(maxOffset);
      setCompleted(true);
      onConfirm?.();
      setTimeout(() => {
        setOffset(0);
        setCompleted(false);
      }, 1800);
    } else {
      setOffset(0);
    }
  }, [offset, trackWidth, maxOffset, handleWidth, threshold, completed, onConfirm]);

  const progress = maxOffset > 0 ? Math.min(1, offset / maxOffset) : 0;
  const pillRight = 4 + offset + Math.min(64, height);
  const revealWidth = `${pillRight}px`;

  return (
    <div
      ref={trackRef}
      className={`swipe-track ${className}`}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (completed || disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOffset(maxOffset);
          setCompleted(true);
          onConfirm?.();
          setTimeout(() => {
            setOffset(0);
            setCompleted(false);
          }, 1800);
        }
      }}
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: height / 2,
        background: completed ? TRACK_BG_COMPLETED : TRACK_BG_DEFAULT,
        border: `1px solid ${completed ? 'var(--color-vivid-green)' : 'var(--color-ash)'}`,
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none',
        cursor: disabled ? 'not-allowed' : 'default',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 200ms ease, border-color 200ms ease',
        ...style,
      }}
    >
      <div
        className="swipe-track-reveal"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: revealWidth,
          background: completed ? 'transparent' : TRACK_BG_REVEAL,
          transition: completed
            ? 'background 200ms ease, width 200ms ease'
            : draggingRef.current
              ? 'none'
              : 'width 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          borderRadius: 9999,
          pointerEvents: 'none',
        }}
      />

      <div
        className="swipe-track-text"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '0.01em',
          color: completed ? 'var(--color-paper-white)' : 'var(--color-iron)',
          pointerEvents: 'none',
          paddingLeft: handleWidth,
          paddingRight: 16,
          transition: 'opacity 200ms ease, color 200ms ease',
        }}
      >
        <span
          style={{
            opacity: completed ? 0 : 1 - progress * 0.6,
            fontWeight: 500,
          }}
        >
          {completed ? completedText : trackText}
        </span>
      </div>

      <div
        ref={handleRef}
        className="swipe-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          width: handleWidth,
          height: height - 8,
          borderRadius: (height - 8) / 2,
          background: completed
            ? 'var(--color-paper-white)'
            : 'linear-gradient(135deg, var(--color-vivid-green) 0%, var(--color-vivid-green-dark) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: completed ? 'var(--color-vivid-green-dark)' : 'var(--color-paper-white)',
          boxShadow: completed
            ? '0 0 0 6px rgba(255, 255, 255, 0.45)'
            : '0 4px 12px rgba(74, 198, 76, 0.32)',
          transform: `translateX(${offset}px)`,
          transition: draggingRef.current
            ? 'none'
            : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), background 200ms ease, box-shadow 200ms ease',
          cursor: draggingRef.current ? 'grabbing' : 'grab',
          fontWeight: 600,
          fontSize: 13,
          zIndex: 2,
        }}
      >
        {confirmText ? (
          <span style={{ padding: '0 12px', whiteSpace: 'nowrap' }}>{confirmText}</span>
        ) : (
          <ChevronRight size={22} strokeWidth={2.4} />
        )}
      </div>
    </div>
  );
}
