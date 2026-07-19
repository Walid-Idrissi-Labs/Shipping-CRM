export default function Card({ children, className = '', surface = false, style, ...rest }) {
  const baseClass = surface ? 'surface-recessed' : 'surface-canvas';
  return (
    <div
      className={`${baseClass} border border-ash rounded-lg ${className}`}
      style={{
        backgroundColor: surface ? 'var(--color-bone)' : 'var(--color-paper-white)',
        borderColor: 'var(--color-ash)',
        borderRadius: '12px',
        padding: '24px',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
