export default function Skeleton({ width = '100%', height = 16, className = '', rounded = 4 }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{
        width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof rounded === 'number' ? `${rounded}px` : rounded,
      }}
    />
  );
}
