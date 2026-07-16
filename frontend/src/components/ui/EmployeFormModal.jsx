import { useEffect, useState } from 'react';
import { X, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { FormField } from '../ui/Form';

export default function EmployeFormModal({ open, onClose, onSubmit, initialData, loading, title }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || '',
        email: initialData?.email || '',
        password: '',
        password_confirmation: '',
      });
      setErrors({});
    }
  }, [open, initialData]);

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Le nom est requis';
    // Email is now optional
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Format d\'email invalide';
    if (!initialData && !form.password) newErrors.password = 'Le mot de passe est requis';
    if (form.password && form.password.length < 8) newErrors.password = 'Minimum 8 caractères';
    if (form.password !== form.password_confirmation) newErrors.password_confirmation = 'Les mots de passe ne correspondent pas';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // An untouched password must be omitted entirely, not sent as "": the API validates
    // it with `sometimes|min:8`, so an empty string counts as present and 422s.
    const payload = { name: form.name.trim(), email: form.email.trim() };
    if (form.password) {
      payload.password = form.password;
      payload.password_confirmation = form.password_confirmation;
    }
    onSubmit(payload);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={() => onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="dialog-surface"
        style={{
          background: 'var(--color-paper-white)',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px var(--color-ash)',
          padding: '24px',
          maxWidth: 480,
          width: 'calc(100% - 32px)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="btn-icon"
          style={{ position: 'absolute', top: 14, right: 14, color: 'var(--color-smoke)' }}
        >
          <X size={16} />
        </button>

        <h2 id="modal-title" style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-graphite)', margin: '0 0 20px' }}>
          {title || (initialData ? 'Modifier l\'employé' : 'Nouvel Employé')}
        </h2>

        <form onSubmit={handleSubmit}>
          <FormField label="Nom complet" required>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-smoke)' }} />
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Nom complet"
                className="input"
                style={{ paddingLeft: 44 }}
                disabled={loading}
              />
            </div>
            {errors.name && <div style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 4 }}>{errors.name}</div>}
          </FormField>

          <FormField label="Email" hint="Optionnel">
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-smoke)' }} />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="employe@entreprise.com (optionnel)"
                className="input"
                style={{ paddingLeft: 44 }}
                disabled={loading}
              />
            </div>
            {errors.email && <div style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 4 }}>{errors.email}</div>}
          </FormField>

          <FormField label="Mot de passe" required={!initialData} hint={initialData ? 'Laisser vide pour ne pas changer' : 'Minimum 8 caractères'}>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-smoke)' }} />
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder={initialData ? '••••••••' : 'Mot de passe'}
                className="input"
                style={{ paddingLeft: 44, paddingRight: 44 }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-smoke)',
                  cursor: 'pointer',
                  padding: 4,
                }}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <div style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 4 }}>{errors.password}</div>}
          </FormField>

          {!initialData && (
            <FormField label="Confirmer le mot de passe" required>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-smoke)' }} />
                <input
                  name="password_confirmation"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.password_confirmation}
                  onChange={handleChange}
                  placeholder="Confirmer le mot de passe"
                  className="input"
                  style={{ paddingLeft: 44, paddingRight: 44 }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-smoke)',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password_confirmation && <div style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 4 }}>{errors.password_confirmation}</div>}
            </FormField>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : (initialData ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}