import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

function TooltipArrow({ placement, className, style }) {
  return (
    <div
      style={style}
      className={clsx(
        'absolute w-1.5 h-1.5 rotate-45 bg-vivid-green shadow-sm',
        {
          'bottom-[-4px] left-1/2 -translate-x-1/2': placement === 'top',
          'top-[-4px] left-1/2 -translate-x-1/2': placement === 'bottom',
          'right-[-4px] top-1/2 -translate-y-1/2': placement === 'left',
          'left-[-4px] top-1/2 -translate-y-1/2': placement === 'right',
        },
        className
      )}
    />
  );
}

export default function Tooltip({ content, placement = 'bottom', children }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

const getTooltipStyles = () => {
    const base = {
      position: 'absolute',
      zIndex: 50,
      padding: '6px 10px',
      fontSize: '12px',
      fontWeight: 500,
      color: 'var(--color-paper-white)',
      backgroundColor: 'var(--color-vivid-green)',
      borderRadius: '6px',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
      pointerEvents: 'auto',
    };

    const offsets = {
      bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' },
      top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' },
      left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' },
      right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' },
    };

    return { ...base, ...offsets[placement] };
  };

  const triggerNode = typeof children === 'function'
    ? children({ onMouseEnter: () => setIsOpen(true), onMouseLeave: () => setIsOpen(false) })
    : children;

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} ref={triggerRef}>
      {triggerNode}
      {isOpen && (
        <div ref={tooltipRef} style={getTooltipStyles()} className="animate-fade-in">
          <TooltipArrow placement={placement} style={{ backgroundColor: 'var(--color-vivid-green)' }} />
          {content}
        </div>
      )}
    </div>
  );
}