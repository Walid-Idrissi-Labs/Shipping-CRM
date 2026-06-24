import { useEffect, useState } from 'react';
import { User, Lock, Save, Eye, EyeOff, Check } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import SaveStatusButton from '../../components/ui/SaveStatusButton';
import { useDirtyForm } from '../../hooks/useDirtyForm';
import { useToast } from '../../contexts/ToastContext';

const emptyProfile = {
  full_name: '',
  company_name: '',
  email: '',
  phone: '',
  ice: '',
  address: '',
  postal_code: '',
  city: '',
  country: 'Maroc',
};

const emptyPassword = {
  old_password: '',
  new_password: '',
  new_password_confirmation: '',
};

const countryOptions = ['Maroc', 'France', 'Espagne', 'Allemagne', 'Belgique', 'Italie', 'Pays-Bas', 'Tunisie', 'Algerie'];

export default function MyAccount() {
  const toast = useToast();
  const profileForm = useDirtyForm(emptyProfile);
  const passwordForm = useDirtyForm(emptyPassword);
  const [readOnly, setReadOnly] = useState({
    account_number: '',
    provider_name: '',
    email_login: '',
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => {
        const user = data.user || {};
        const c = user.client || {};
        profileForm.reset({
          full_name: c.full_name || user.name || '',
          company_name: c.company_name || '',
          email: c.email || user.email || '',
          phone: c.phone || '',
          ice: c.ice || '',
          address: c.address || '',
          postal_code: c.postal_code || '',
          city: c.city || '',
          country: c.country || 'Maroc',
        });
        setReadOnly({
          account_number: c.account_number || '-',
          provider_name: c.provider?.company_name || '-',
          email_login: user.email || '-',
        });
        setLoadingProfile(false);
      })
      .catch(() => {
        toast.push('Impossible de charger votre profil.', 'error');
        setLoadingProfile(false);
      });
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    profileForm.update({ [name]: value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (profileForm.status === 'saving') return;
    profileForm.beginSave();
    try {
      await api.patch('/client/profile', profileForm.data);
      profileForm.succeedSave();
      toast.push('Profil mis a jour', 'success');
    } catch (err) {
      profileForm.failSave();
      toast.push(err.response?.data?.message || 'Erreur lors de la sauvegarde.', 'error');
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    passwordForm.update({ [name]: value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.status === 'saving') return;
    if (passwordForm.data.new_password !== passwordForm.data.new_password_confirmation) {
      toast.push('Les nouveaux mots de passe ne correspondent pas.', 'error');
      return;
    }
    passwordForm.beginSave();
    try {
      await api.post('/client/change-password', {
        old_password: passwordForm.data.old_password,
        new_password: passwordForm.data.new_password,
      });
      passwordForm.succeedSave(emptyPassword);
      toast.push('Mot de passe mis a jour', 'success');
    } catch (err) {
      passwordForm.failSave();
      toast.push(err.response?.data?.message || 'Erreur lors du changement de mot de passe.', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Espace Client"
        title="Mon Compte"
        subtitle="Modifier vos informations et securite."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card style={{ padding: 24, marginBottom: 24 }}>
            <div className="flex items-center gap-3 mb-5">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'var(--color-primary-wash)', color: 'var(--color-primary)',
                }}
              >
                <User size={18} />
              </div>
              <div>
                <h3 className="section-heading">Informations personnelles</h3>
                <p style={{ fontSize: 12, color: 'var(--color-steel)', marginTop: 2 }}>
                  Mettez a jour vos informations de contact et adresse.
                </p>
              </div>
            </div>

            {loadingProfile ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ height: 36, background: 'var(--color-fog)', borderRadius: 4 }} />
                ))}
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Nom complet (Contact) *</label>
                    <input
                      type="text"
                      name="full_name"
                      value={profileForm.data.full_name}
                      onChange={handleProfileChange}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">Raison sociale (Entreprise)</label>
                    <input
                      type="text"
                      name="company_name"
                      value={profileForm.data.company_name}
                      onChange={handleProfileChange}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="field-label">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={profileForm.data.email}
                      onChange={handleProfileChange}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">Telephone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileForm.data.phone}
                      onChange={handleProfileChange}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="field-label">ICE</label>
                    <input
                      type="text"
                      name="ice"
                      value={profileForm.data.ice}
                      onChange={handleProfileChange}
                      className="input"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="field-label">Adresse</label>
                    <input
                      type="text"
                      name="address"
                      value={profileForm.data.address}
                      onChange={handleProfileChange}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="field-label">Code postal</label>
                    <input
                      type="text"
                      name="postal_code"
                      value={profileForm.data.postal_code}
                      onChange={handleProfileChange}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="field-label">Ville</label>
                    <input
                      type="text"
                      name="city"
                      value={profileForm.data.city}
                      onChange={handleProfileChange}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="field-label">Pays</label>
                    <select
                      name="country"
                      value={profileForm.data.country}
                      onChange={handleProfileChange}
                      className="select"
                    >
                      {countryOptions.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      {!countryOptions.includes(profileForm.data.country) && profileForm.data.country && (
                        <option value={profileForm.data.country}>{profileForm.data.country}</option>
                      )}
                    </select>
                  </div>
                </div>

                <div
                  className="flex items-center gap-3 mt-6 pt-4"
                  style={{ borderTop: '1px solid var(--color-ash)' }}
                >
                  <SaveStatusButton state={profileForm.status} />
                  <p style={{ fontSize: 12, color: 'var(--color-steel)' }}>
                    Vos modifications sont prises en compte immediatement.
                  </p>
                </div>
              </form>
            )}
          </Card>

          <Card style={{ padding: 24 }}>
            <div className="flex items-center gap-3 mb-5">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'var(--color-bone)', color: 'var(--color-graphite)',
                }}
              >
                <Lock size={18} />
              </div>
              <div>
                <h3 className="section-heading">Securite</h3>
                <p style={{ fontSize: 12, color: 'var(--color-steel)', marginTop: 2 }}>
                  Changez votre mot de passe. Minimum 8 caracteres.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="field-label">Mot de passe actuel</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="old_password"
                      value={passwordForm.data.old_password}
                      onChange={handlePasswordChange}
                      className="input"
                      style={{ paddingRight: 40 }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{
                        right: 10,
                        background: 'transparent',
                        border: 'none',
                        padding: 4,
                        color: 'var(--color-smoke)',
                      }}
                      aria-label={showPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Nouveau mot de passe *</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="new_password"
                      value={passwordForm.data.new_password}
                      onChange={handlePasswordChange}
                      className="input"
                      minLength={8}
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">Confirmer *</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="new_password_confirmation"
                      value={passwordForm.data.new_password_confirmation}
                      onChange={handlePasswordChange}
                      className="input"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                {passwordForm.data.new_password.length > 0 && pendingStrength(passwordForm.data.new_password) && (
                  <div
                    style={{
                      padding: 12,
                      background: 'var(--color-bone)',
                      borderRadius: 4,
                      fontSize: 12,
                      color: 'var(--color-iron)',
                    }}
                  >
                    <p style={{ marginBottom: 6, fontWeight: 500 }}>
                      Votre mot de passe doit contenir:
                    </p>
                    <div className="space-y-1">
                      <ChecklistItem ok={passwordForm.data.new_password.length >= 8} label="Au moins 8 caracteres" />
                      <ChecklistItem ok={/[A-Z]/.test(passwordForm.data.new_password)} label="Une lettre majuscule" />
                      <ChecklistItem ok={/[0-9]/.test(passwordForm.data.new_password)} label="Un chiffre" />
                    </div>
                  </div>
                )}
              </div>

              <div
                className="flex items-center gap-3 mt-6 pt-4"
                style={{ borderTop: '1px solid var(--color-ash)' }}
              >
                <SaveStatusButton
                  state={passwordForm.status}
                  initialText="Changer le mot de passe"
                  dirtyText="Changer le mot de passe"
                  savingText="Mise a jour..."
                  savedText="Mot de passe mis a jour"
                />
              </div>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card style={{ padding: 24 }}>
            <h3 className="section-heading mb-4">Mon Compte</h3>
            <dl className="space-y-3" style={{ fontSize: 13 }}>
              <FieldRow label="Numero de compte" value={readOnly.account_number} mono />
              <FieldRow label="Prestataire" value={readOnly.provider_name} />
              <FieldRow label="Email de connexion" value={readOnly.email_login} />
            </dl>
            <div
              className="mt-5 pt-4"
              style={{ borderTop: '1px solid var(--color-ash)' }}
            >
              <p style={{ fontSize: 12, color: 'var(--color-steel)', lineHeight: 1.6 }}>
                Pour toute modification liee a votre numero de compte ou a votre prestataire, merci de contacter directement le service client.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value, mono }) {
  return (
    <div>
      <dt
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--color-steel)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 2,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontWeight: 500,
          color: 'var(--color-graphite)',
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        }}
      >
        {value || '-'}
      </dd>
    </div>
  );
}

function ChecklistItem({ ok, label }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex items-center justify-center shrink-0"
        style={{
          width: 16, height: 16, borderRadius: 9999,
          background: ok ? 'var(--color-vivid-green)' : 'var(--color-ash)',
          color: ok ? 'var(--color-paper-white)' : 'var(--color-steel)',
          transition: 'background 150ms ease',
        }}
      >
        {ok ? <Check size={11} /> : null}
      </span>
      <span style={{ color: ok ? 'var(--color-graphite)' : 'var(--color-steel)' }}>{label}</span>
    </div>
  );
}

function pendingStrength(pwd) {
  return pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd);
}
