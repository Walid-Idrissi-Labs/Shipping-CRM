export default function Card({ children, className = '', surface = false, ...rest }) {
  const baseClass = surface ? 'surface-recessed' : 'surface-canvas';
  return (
    <div
      className={`${baseClass} border border-ash rounded-lg ${className}`}
      style={{
        backgroundColor: surface ? 'var(--color-bone)' : 'var(--color-paper-white)',
        borderColor: 'var(--color-ash)',
        borderRadius: '8px',
        padding: '24px',
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
