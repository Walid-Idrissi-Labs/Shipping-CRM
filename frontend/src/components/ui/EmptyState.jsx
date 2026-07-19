import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction, actionTo, tone }) {
  const toneClass = `icon-tile-${['primary', 'success', 'warning', 'danger'].includes(tone) ? tone : 'neutral'}`;
  return (
    <div
      className="flex flex-col items-center justify-center text-center px-6 py-16 animate-fade-in"
      style={{ color: 'var(--color-steel)' }}
    >
      {Icon && (
        <div
          className={`icon-tile ${toneClass} mb-4 rounded-full`}
          style={{ width: 56, height: 56 }}
        >
          <Icon size={24} />
        </div>
      )}
      <h3 className="section-heading mb-2">{title}</h3>
      {description && (
        <p style={{ maxWidth: 420, fontSize: 14, marginBottom: actionLabel || actionTo ? 16 : 0 }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn btn-primary">
          {actionLabel}
        </button>
      )}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn btn-primary">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
