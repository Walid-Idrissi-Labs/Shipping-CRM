import { Check, Circle } from 'lucide-react';

// Mirrors PasswordController::passwordRules() on the server. Shown live under a
// new-password field so the requirements are visible while the user types
// instead of arriving as a rejection after they submit — being told "invalide"
// with no idea which rule you broke is what makes people give up on a form.
// Kept unexported: a file that exports both a component and other values breaks
// Fast Refresh (react-refresh/only-export-components). If another surface ever
// needs these, they belong in src/lib/ alongside the other shared helpers.
const PASSWORD_RULES = [
  { key: 'length', label: '8 caractères minimum', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'Une lettre majuscule', test: (v) => /\p{Lu}/u.test(v) },
  { key: 'lower', label: 'Une lettre minuscule', test: (v) => /\p{Ll}/u.test(v) },
  { key: 'numbers', label: 'Un chiffre', test: (v) => /\d/.test(v) },
];

export default function PasswordRules({ value = '' }) {
  // Nothing typed yet: stay quiet rather than greeting the user with a list of
  // things they have already failed.
  if (!value) return null;

  return (
    <ul
      style={{
        listStyle: 'none',
        margin: '8px 0 0',
        padding: 0,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px 16px',
      }}
    >
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li
            key={rule.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: met ? 'var(--color-vivid-green-dark)' : 'var(--color-steel)',
            }}
          >
            {met ? <Check size={13} strokeWidth={2.6} /> : <Circle size={13} strokeWidth={2} />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
