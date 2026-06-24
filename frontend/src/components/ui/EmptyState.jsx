export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction, actionTo }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center px-6 py-16 animate-fade-in"
      style={{ color: 'var(--color-steel)' }}
    >
      {Icon && (
        <div
          className="mb-4 rounded-full flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            background: 'var(--color-bone)',
            color: 'var(--color-iron)',
          }}
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
        <a href={actionTo} className="btn btn-primary">
          {actionLabel}
        </a>
      )}
    </div>
  );
}
