import { useEffect, useState } from 'react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard } from '../../components/ui/DataCard';
import { FormField, Section } from '../../components/ui/Form';
import SaveStatusButton from '../../components/ui/SaveStatusButton';
import TruckLoader from '../../components/ui/TruckLoader';
import { useDirtyForm } from '../../hooks/useDirtyForm';

const emptyForm = {
  company_name: '', address: '', postal_code: '', city: '', country: 'Maroc',
  phone: '', email: '', website: '', ice: '', rc: '', if_: '', cnss: '', patente: '', login_email: ''
};

const emptyPassword = { old_password: '', new_password: '', new_password_confirmation: '' };

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [pwdMessage, setPwdMessage] = useState(null);

  const settingsForm = useDirtyForm(emptyForm);
  const passwordForm = useDirtyForm(emptyPassword);

  useEffect(() => {
    api.get('/provider/settings').then((res) => {
      const merged = { ...emptyForm, ...res.data };
      settingsForm.reset(merged);
      setLoading(false);
    });
  }, []);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    settingsForm.update({ [name]: value });
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    if (settingsForm.status === 'saving') return;
    settingsForm.beginSave();
    setMessage(null);
    try {
      await api.patch('/provider/settings', settingsForm.data);
      settingsForm.succeedSave();
      setMessage({ type: 'success', text: 'Parametres enregistres.' });
    } catch (err) {
      settingsForm.failSave();
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur.' });
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    passwordForm.update({ [name]: value });
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.status === 'saving') return;
    if (passwordForm.data.new_password !== passwordForm.data.new_password_confirmation) {
      setPwdMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }
    passwordForm.beginSave();
    setPwdMessage(null);
    try {
      await api.patch('/provider/change-password', passwordForm.data);
      passwordForm.succeedSave(emptyPassword);
      setPwdMessage({ type: 'success', text: 'Mot de passe mis a jour.' });
    } catch (err) {
      passwordForm.failSave();
      setPwdMessage({ type: 'error', text: err.response?.data?.message || 'Erreur.' });
    }
  };

  if (loading) return <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><TruckLoader /></div>;

  const Flash = ({ m }) => m && (
    <div
      className="text-sm font-medium animate-fade-in"
      style={{
        background: m.type === 'error' ? 'var(--color-danger-container)' : 'var(--color-success-container)',
        color: m.type === 'error' ? 'var(--color-danger)' : 'var(--color-vivid-green-dark)',
        padding: '10px 14px',
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      {m.text}
    </div>
  );

  return (
    <div className="space-y-6" style={{ maxWidth: 960 }}>
      <PageHeader
        eyebrow="Compte"
        title="Parametres"
        subtitle="Informations de l'entreprise et identifiants"
      />

      <Flash m={message} />

      <form onSubmit={handleSettingsSubmit}>
        <DataCard title="Informations de l'entreprise" description="Coordonnees legales et de contact.">
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
            <FormField label="Nom de l'entreprise" required>
              <input name="company_name" value={settingsForm.data.company_name} onChange={handleFieldChange} className="input" required />
            </FormField>
            <FormField label="Email de connexion">
              <input name="login_email" value={settingsForm.data.login_email} onChange={handleFieldChange} type="email" className="input" />
            </FormField>
            <FormField label="Telephone"><input name="phone" value={settingsForm.data.phone || ''} onChange={handleFieldChange} className="input" /></FormField>
            <FormField label="Email contact"><input name="email" value={settingsForm.data.email || ''} onChange={handleFieldChange} type="email" className="input" /></FormField>
            <FormField label="Site web"><input name="website" value={settingsForm.data.website || ''} onChange={handleFieldChange} className="input" /></FormField>
            <div className="md:col-span-2">
              <FormField label="Adresse"><input name="address" value={settingsForm.data.address || ''} onChange={handleFieldChange} className="input" /></FormField>
            </div>
            <FormField label="Ville"><input name="city" value={settingsForm.data.city || ''} onChange={handleFieldChange} className="input" /></FormField>
            <FormField label="Code Postal"><input name="postal_code" value={settingsForm.data.postal_code || ''} onChange={handleFieldChange} className="input" /></FormField>
            <FormField label="Pays"><input name="country" value={settingsForm.data.country || ''} onChange={handleFieldChange} className="input" /></FormField>
          </div>

          <Section title="Identifiants fiscaux" description="Numéros de registre officiels.">
            <div className="grid grid-cols-2 md:grid-cols-5" style={{ gap: 12 }}>
              <input name="ice" value={settingsForm.data.ice || ''} onChange={handleFieldChange} placeholder="ICE" className="input" />
              <input name="rc" value={settingsForm.data.rc || ''} onChange={handleFieldChange} placeholder="RC" className="input" />
              <input name="if_" value={settingsForm.data.if_ || ''} onChange={handleFieldChange} placeholder="IF" className="input" />
              <input name="cnss" value={settingsForm.data.cnss || ''} onChange={handleFieldChange} placeholder="CNSS" className="input" />
              <input name="patente" value={settingsForm.data.patente || ''} onChange={handleFieldChange} placeholder="Patente" className="input" />
            </div>
          </Section>

          <div className="flex items-center" style={{ marginTop: 24, justifyContent: 'flex-end', gap: 12 }}>
            <SaveStatusButton state={settingsForm.status} />
          </div>
        </DataCard>
      </form>

      <DataCard title="Changer le Mot de Passe" description="Modifiez votre mot de passe de connexion.">
        <Flash m={pwdMessage} />
        <form onSubmit={handlePassword} style={{ maxWidth: 480 }}>
          <FormField label="Ancien mot de passe" required>
            <input
              type="password"
              name="old_password"
              placeholder="Votre mot de passe actuel"
              value={passwordForm.data.old_password}
              onChange={handlePasswordChange}
              className="input"
              required
            />
          </FormField>
          <FormField label="Nouveau mot de passe" required hint="8 caracteres minimum">
            <input
              type="password"
              name="new_password"
              placeholder="Au moins 8 caracteres"
              value={passwordForm.data.new_password}
              onChange={handlePasswordChange}
              className="input"
              required
              minLength={8}
            />
          </FormField>
          <FormField label="Confirmer le nouveau" required>
            <input
              type="password"
              name="new_password_confirmation"
              placeholder="Retapez le nouveau mot de passe"
              value={passwordForm.data.new_password_confirmation}
              onChange={handlePasswordChange}
              className="input"
              required
              minLength={8}
            />
          </FormField>
          <div className="flex items-center" style={{ marginTop: 24, justifyContent: 'flex-end', gap: 12 }}>
            <SaveStatusButton
              state={passwordForm.status}
              initialText="Changer le mot de passe"
              dirtyText="Changer le mot de passe"
              savingText="Mise a jour..."
              savedText="Mot de passe mis a jour"
              iconSize={14}
              initialClassName="btn-save-initial-with-icon"
            />
          </div>
        </form>
      </DataCard>
    </div>
  );
}
