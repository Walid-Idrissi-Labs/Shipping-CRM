import Breadcrumbs from './Breadcrumbs';

function ActionBtn({ Icon, className, children, actionTo, onAction }) {
  const content = (
    <>
      {Icon && <Icon size={16} aria-hidden="true" />}
      <span>{children}</span>
    </>
  );
  if (onAction) {
    return (
      <button type="button" onClick={onAction} className={className}>
        {content}
      </button>
    );
  }
  if (actionTo) {
    return (
      <a href={actionTo} className={className}>
        {content}
      </a>
    );
  }
  return null;
}

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  actionLabel,
  actionTo,
  onAction,
  actionIcon: ActionIcon,
  breadcrumbs,
  actions,
  display = false,
}) {
  const useElegante = Boolean(ActionIcon);

  return (
    <div style={{ marginBottom: 28 }}>
      {breadcrumbs && (
        <div style={{ marginBottom: 16 }}>
          <Breadcrumbs items={breadcrumbs} />
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div
              className="text-xs font-medium uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-steel)' }}
            >
              {eyebrow}
            </div>
          )}
          {display ? (
            <h1 className="display-headline">{title}</h1>
          ) : (
            <h1 className="page-heading">{title}</h1>
          )}
          {subtitle && (
            <p style={{ color: 'var(--color-steel)', marginTop: 8, fontSize: 14, maxWidth: 640 }}>
              {subtitle}
            </p>
          )}
        </div>
        {(actionLabel || actions) && (
          <div className="flex flex-wrap items-center gap-2 self-start">
            {actionLabel && (
              <ActionBtn
                Icon={ActionIcon}
                className={useElegante ? 'boton-elegante' : 'btn btn-primary'}
                actionTo={actionTo}
                onAction={onAction}
              >
                {actionLabel}
              </ActionBtn>
            )}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
