import { Save, Loader2, CheckCircle2 } from 'lucide-react';

const STATE_STYLES = {
  initial: {
    label: 'Enregistrer',
    className: 'btn-save-initial',
    spinner: false,
  },
  dirty: {
    label: 'Enregistrer',
    className: 'btn btn-primary',
    spinner: false,
  },
  saving: {
    label: 'Enregistrement...',
    className: 'btn btn-primary btn-saving',
    spinner: true,
  },
  saved: {
    label: 'Enregistre avec Succes',
    className: 'btn btn-saved',
    spinner: false,
  },
};

const STATE_ICONS = {
  initial: Save,
  dirty: Save,
  saving: Loader2,
  saved: CheckCircle2,
};

export default function SaveStatusButton({
  state = 'initial',
  disabled = false,
  initialText,
  dirtyText,
  savingText,
  savedText,
  onClick,
  type = 'submit',
  className = '',
  style = {},
  iconSize = 14,
}) {
  const cfg = STATE_STYLES[state] || STATE_STYLES.initial;
  const Icon = STATE_ICONS[state] || Save;
  const label =
    (state === 'initial' && initialText) ||
    (state === 'dirty' && dirtyText) ||
    (state === 'saving' && savingText) ||
    (state === 'saved' && savedText) ||
    cfg.label;

  const isDisabled = disabled || state === 'saving';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={state === 'saving'}
      className={`btn ${cfg.className} ${className}`}
      style={{
        padding: '10px 18px',
        minWidth: 180,
        ...style,
      }}
    >
      <Icon
        size={iconSize}
        className={state === 'saving' ? 'animate-spin' : ''}
        style={{ flexShrink: 0 }}
      />
      <span>{label}</span>
    </button>
  );
}
