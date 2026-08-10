import { useState } from 'react';
import { Globe, ShieldBan, ShieldCheck, AlertTriangle, Info } from 'lucide-react';
import api from '../../api/axios';
import { useDialog } from '../../contexts/DialogContext';
import { useToast } from '../../contexts/ToastContext';

/*
 * "Origine de la demande" — the IP, the approximate location, and the evidence
 * needed to decide whether to block it. Shared by the devis detail panel and the
 * compte request row so both tell the same story the same way.
 *
 * The design principle here is that blocking is a judgement, not a button. An
 * address that has already produced real business gets said out loud, and the
 * confirmation asks for more than a click when the evidence points the other
 * way — because a company office is a single address for everyone in it, and a
 * Moroccan carrier can put thousands of subscribers behind one.
 */

const Row = ({ label, children, mono }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
    <span style={{ color: 'var(--color-steel)', minWidth: 108, fontSize: 12, flexShrink: 0 }}>{label}</span>
    <span
      style={{
        color: 'var(--color-graphite)',
        fontSize: 13,
        fontFamily: mono ? 'monospace' : undefined,
        wordBreak: 'break-all',
      }}
    >
      {children}
    </span>
  </div>
);

const Notice = ({ tone, icon: Icon, children }) => {
  const tones = {
    warning: { bg: 'var(--color-bone)', fg: 'var(--color-graphite)', accent: 'var(--color-warning, #B26B00)' },
    danger: { bg: 'var(--color-danger-container)', fg: 'var(--color-danger)', accent: 'var(--color-danger)' },
    info: { bg: 'var(--color-bone)', fg: 'var(--color-iron)', accent: 'var(--color-steel)' },
  }[tone];

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        background: tones.bg,
        color: tones.fg,
        borderLeft: `2px solid ${tones.accent}`,
        borderRadius: 4,
        padding: '8px 10px',
        fontSize: 12,
        lineHeight: 1.45,
        marginTop: 10,
      }}
    >
      <Icon size={14} color={tones.accent} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
};

// The soft tells recorded at submission. Phrased as observations rather than
// verdicts: none of them is conclusive, which is exactly why they are shown to
// a person instead of acted on automatically.
const BOT_SIGNALS = {
  sans_mesure_de_saisie: "Le formulaire a ete envoye sans passer par la saisie habituelle du site.",
  sans_navigateur: "La demande n'a pas ete envoyee depuis un navigateur web classique.",
};

export default function SubmissionOrigin({ origin, onChange }) {
  const dialog = useDialog();
  const toast = useToast();
  const [working, setWorking] = useState(false);

  if (!origin) return null;

  if (!origin.ip_address) {
    return (
      <Section>
        <div style={{ fontSize: 12.5, color: 'var(--color-steel)' }}>
          {origin.unavailable_reason || "Origine inconnue pour cette demande."}
        </div>
      </Section>
    );
  }

  const { geo, history, is_blocked: isBlocked, is_your_own_ip: isOwnIp, proxy_misconfigured: proxied } = origin;
  const accepted = history?.accepted_requests ?? 0;
  const total = history?.total_requests ?? 0;

  const block = async () => {
    // Everything known about the address goes into the confirmation, so the
    // decision is made with the evidence in view rather than from memory.
    const lines = [
      `Adresse : ${origin.ip_address}${geo?.label ? ` — ${geo.label}` : ''}.`,
      total > 0
        ? `${total} demande${total > 1 ? 's' : ''} envoyee${total > 1 ? 's' : ''} depuis cette adresse, dont ${accepted} acceptee${accepted > 1 ? 's' : ''}.`
        : null,
      accepted > 0
        ? "Attention : des demandes venant de cette adresse ont deja ete acceptees. Il peut s'agir d'un vrai client, ou d'un bureau ou d'un operateur mobile dont l'adresse est partagee par de nombreuses personnes."
        : null,
      'Les demandes venant de cette adresse seront refusees. Vous pourrez la debloquer a tout moment depuis Parametres.',
    ].filter(Boolean);

    const ok = await dialog.confirm({
      title: 'Bloquer cette adresse IP ?',
      description: lines.join(' '),
      confirmText: 'Bloquer',
      cancelText: 'Annuler',
      variant: 'danger',
      // Extra friction precisely when the evidence argues against blocking.
      // A spam address blocks with one click; one that has produced real
      // business makes you stop and type.
      safetyGate: accepted > 0,
      requiredInput: accepted > 0 ? 'bloquer' : '',
      inputLabel: accepted > 0 ? 'Tapez bloquer pour confirmer' : '',
    });
    if (!ok) return;

    setWorking(true);
    try {
      await api.post('/provider/blocked-ips', { ip_address: origin.ip_address });
      toast.push('Adresse IP bloquee.', 'success');
      onChange?.();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Le blocage a echoue.', 'error');
    } finally {
      setWorking(false);
    }
  };

  const unblock = async () => {
    setWorking(true);
    try {
      const { data } = await api.get('/provider/blocked-ips');
      const entry = (data.data || []).find((b) => b.ip_address === origin.ip_address);
      if (!entry) {
        toast.push('Cette adresse ne figure plus dans la liste des adresses bloquees.', 'error');
        onChange?.();
        return;
      }
      await api.delete(`/provider/blocked-ips/${entry.id}`);
      toast.push('Adresse IP debloquee.', 'success');
      onChange?.();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Le deblocage a echoue.', 'error');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Section>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Row label="Adresse IP" mono>{origin.ip_address}</Row>
        <Row label="Localisation">{geo?.label || 'Localisation inconnue'}</Row>
        {geo?.org && <Row label="Fournisseur">{geo.org}</Row>}
        {total > 0 && (
          <Row label="Historique">
            {total} demande{total > 1 ? 's' : ''} depuis cette adresse
            {accepted > 0 && `, dont ${accepted} acceptee${accepted > 1 ? 's' : ''}`}
          </Row>
        )}
      </div>

      {proxied && (
        <Notice tone="warning" icon={AlertTriangle}>
          L'adresse enregistree est une adresse interne au serveur, pas celle du visiteur. Toutes les
          demandes se ressemblent donc, et le blocage ne fonctionnera pas correctement. La configuration
          de l'hebergement doit etre ajustee — signalez-le a votre developpeur.
        </Notice>
      )}

      {origin.bot_signal && (
        <Notice tone="warning" icon={AlertTriangle}>
          {BOT_SIGNALS[origin.bot_signal] || 'Signaux inhabituels detectes lors de la saisie.'}
        </Notice>
      )}

      {isOwnIp && (
        <Notice tone="info" icon={Info}>
          Cette demande vient de votre propre connexion. Elle ne peut pas etre bloquee.
        </Notice>
      )}

      {accepted > 0 && !isBlocked && (
        <Notice tone="info" icon={Info}>
          Des demandes venant de cette adresse ont deja ete acceptees. Un bureau ou un operateur mobile
          peut partager une meme adresse entre de nombreuses personnes.
        </Notice>
      )}

      {isBlocked ? (
        <>
          <Notice tone="danger" icon={ShieldBan}>
            Cette adresse est bloquee. Les nouvelles demandes venant de cette adresse sont refusees.
          </Notice>
          <button
            type="button"
            onClick={unblock}
            disabled={working}
            className="btn btn-secondary"
            style={{ marginTop: 12, fontSize: 12.5 }}
          >
            <ShieldCheck size={14} /> Debloquer cette adresse
          </button>
        </>
      ) : (
        !isOwnIp && !proxied && (
          <button
            type="button"
            onClick={block}
            disabled={working}
            className="btn btn-secondary"
            style={{ marginTop: 14, fontSize: 12.5, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
          >
            <ShieldBan size={14} /> Bloquer cette adresse IP
          </button>
        )
      )}
    </Section>
  );
}

function Section({ children }) {
  return (
    <div style={{ borderTop: '1px solid var(--color-ash)', paddingTop: 16, marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Globe size={18} color="var(--color-primary)" />
        <span className="display-headline" style={{ fontSize: 16, fontWeight: 600 }}>Origine de la demande</span>
      </div>
      {children}
    </div>
  );
}
