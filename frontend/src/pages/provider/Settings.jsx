import { useMinLoading } from '../../hooks';
import { useEffect, useState } from 'react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard } from '../../components/ui/DataCard';
import { FormField, Section } from '../../components/ui/Form';
import SaveStatusButton from '../../components/ui/SaveStatusButton';
import PageLoader from '../../components/ui/PageLoader';
import TimezonePreview from '../../components/ui/TimezonePreview';
import { useDirtyForm } from '../../hooks/useDirtyForm';

const emptyForm = {
  company_name: '', address: '', postal_code: '', city: '', country: 'Maroc',
  phone: '', email: '', website: '', ice: '', rc: '', if_: '', cnss: '', patente: '', login_email: '',
  bank_name: '', bank_rib: '', bank_swift: '', bank_account_name: '', bank_agence: '',
  per_page_expeditions: 25, per_page_factures: 25, timezone: 'Africa/Casablanca'
};

const TIMEZONE_OPTIONS = [
  { value: 'Africa/Casablanca', label: 'Casablanca — Maroc (UTC+1)' },
  { value: 'Europe/Paris', label: 'Paris — France (UTC+1/+2)' },
  { value: 'Europe/Madrid', label: 'Madrid — Espagne (UTC+1/+2)' },
  { value: 'Europe/London', label: 'Londres — Royaume-Uni (UTC+0/+1)' },
  { value: 'UTC', label: 'UTC' },
];

const emptyPassword = { old_password: '', new_password: '', new_password_confirmation: '' };

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

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const showLoader = useMinLoading(loading);
  const [message, setMessage] = useState(null);
  const [pwdMessage, setPwdMessage] = useState(null);
  const [serverTime, setServerTime] = useState(null);

  const settingsForm = useDirtyForm(emptyForm);
  const passwordForm = useDirtyForm(emptyPassword);

  useEffect(() => {
    api.get('/provider/settings').then((res) => {
      const merged = { ...emptyForm, ...res.data };
      settingsForm.reset(merged);
      setServerTime(res.data.server_time);
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

  if (showLoader) return <PageLoader variant="detail" />;

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
              <FormField label="ICE"><input name="ice" value={settingsForm.data.ice || ''} onChange={handleFieldChange} className="input" /></FormField>
              <FormField label="RC"><input name="rc" value={settingsForm.data.rc || ''} onChange={handleFieldChange} className="input" /></FormField>
              <FormField label="IF"><input name="if_" value={settingsForm.data.if_ || ''} onChange={handleFieldChange} className="input" /></FormField>
              <FormField label="CNSS"><input name="cnss" value={settingsForm.data.cnss || ''} onChange={handleFieldChange} className="input" /></FormField>
              <FormField label="Patente"><input name="patente" value={settingsForm.data.patente || ''} onChange={handleFieldChange} className="input" /></FormField>
            </div>
          </Section>

          <Section title="Coordonnées bancaires" description="Affichées dans le bloc de règlement de vos factures.">
            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 12 }}>
              <FormField label="Banque"><input name="bank_name" value={settingsForm.data.bank_name || ''} onChange={handleFieldChange} className="input" placeholder="Ex : Attijariwafa Bank" /></FormField>
              <FormField label="Agence"><input name="bank_agence" value={settingsForm.data.bank_agence || ''} onChange={handleFieldChange} className="input" placeholder="Ex : Agence Casablanca Maârif" /></FormField>
              <FormField label="Intitulé du compte" hint="Ordre des chèques">
                <input name="bank_account_name" value={settingsForm.data.bank_account_name || ''} onChange={handleFieldChange} className="input" placeholder="Nom du titulaire du compte" />
              </FormField>
              <FormField label="RIB / N° de compte"><input name="bank_rib" value={settingsForm.data.bank_rib || ''} onChange={handleFieldChange} className="input" placeholder="24 chiffres" /></FormField>
              <FormField label="SWIFT / BIC"><input name="bank_swift" value={settingsForm.data.bank_swift || ''} onChange={handleFieldChange} className="input" placeholder="Optionnel" /></FormField>
            </div>
          </Section>

          <Section title="Affichage des listes" description="Nombre de lignes par page dans vos tableaux (entre 5 et 100).">
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16, maxWidth: 480 }}>
              <FormField label="Expéditions par page">
                <input
                  name="per_page_expeditions"
                  type="number"
                  min={5}
                  max={100}
                  step={5}
                  value={settingsForm.data.per_page_expeditions ?? 25}
                  onChange={handleFieldChange}
                  className="input"
                />
              </FormField>
              <FormField label="Factures par page">
                <input
                  name="per_page_factures"
                  type="number"
                  min={5}
                  max={100}
                  step={5}
                  value={settingsForm.data.per_page_factures ?? 25}
                  onChange={handleFieldChange}
                  className="input"
                />
              </FormField>
            </div>
          </Section>

          <Section
            title="Fuseau horaire"
            description="Utilisé pour valider les dates de statut d'expédition et éviter les rejets liés au décalage horaire avec le serveur."
          >
            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16, alignItems: 'start' }}>
              <FormField label="Fuseau horaire de l'entreprise">
                <select
                  name="timezone"
                  value={settingsForm.data.timezone || 'Africa/Casablanca'}
                  onChange={handleFieldChange}
                  className="select"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </FormField>
              <TimezonePreview serverTimeIso={serverTime} timezone={settingsForm.data.timezone || 'Africa/Casablanca'} />
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
