import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldBan } from 'lucide-react';
import api from '../../api/axios';
import { DataCard } from './DataCard';
import Skeleton from './Skeleton';
import { useDialog } from '../../contexts/DialogContext';
import { useToast } from '../../contexts/ToastContext';

/*
 * The undo for IP blocking.
 *
 * Blocking is a one-click decision taken from a demande, so it needs somewhere
 * calm to review those decisions later. The two columns that make this list
 * worth reading are the location — which is how the provider recognises an
 * address weeks later, since the number itself means nothing to them — and the
 * hit counter, which says whether the block is still doing anything at all.
 * Zero hits after a fortnight means the spammer moved on and the entry can go.
 */
export default function BlockedIpsCard() {
  const dialog = useDialog();
  const toast = useToast();
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // A promise chain rather than async/await so no state is set synchronously
  // when the mount effect calls it, matching how the rest of this codebase
  // loads on mount.
  const fetchBlocked = () =>
    api
      .get('/provider/blocked-ips')
      .then(({ data }) => {
        setBlocked(data.data || []);
        setFailed(false);
      })
      .catch(() => {
        // An empty list and a failed load look identical to the provider
        // otherwise, and here the difference matters: one means "nothing is
        // blocked", the other means "you cannot see what is blocked".
        setBlocked([]);
        setFailed(true);
      })
      .finally(() => setLoading(false));

  // Shows the skeleton again, for the retry button and for a refresh after an
  // unblock. The mount path below does not need it: `loading` already starts true.
  const reload = () => {
    setLoading(true);
    fetchBlocked();
  };

  useEffect(() => {
    fetchBlocked();
  }, []);

  const unblock = async (entry) => {
    const ok = await dialog.confirm({
      title: 'Debloquer cette adresse IP ?',
      description: `${entry.ip_address} (${entry.location_label}) pourra de nouveau envoyer des demandes via vos formulaires publics.`,
      confirmText: 'Debloquer',
      cancelText: 'Annuler',
      variant: 'info',
    });
    if (!ok) return;

    try {
      await api.delete(`/provider/blocked-ips/${entry.id}`);
      toast.push('Adresse IP debloquee.', 'success');
      reload();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Le deblocage a echoue.', 'error');
    }
  };

  return (
    <DataCard
      title="Adresses IP bloquees"
      description="Les demandes venant de ces adresses sont refusees sur vos formulaires publics."
    >
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} height={18} width="55%" />
          ))}
        </div>
      ) : failed ? (
        <div style={{ fontSize: 13, color: 'var(--color-danger)' }}>
          La liste n'a pas pu etre chargee.{' '}
          <button type="button" onClick={reload} style={{ textDecoration: 'underline', color: 'inherit' }}>
            Reessayer
          </button>
        </div>
      ) : blocked.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--color-steel)' }}>
          <ShieldCheck size={16} color="var(--color-steel)" />
          Aucune adresse bloquee. Vous pouvez en bloquer une depuis le detail d'une demande de devis ou de compte.
        </div>
      ) : (
        <table className="table-clean">
          <thead>
            <tr>
              <th>Adresse IP</th>
              <th>Localisation</th>
              <th>Bloquee le</th>
              <th>Tentatives refusees</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {blocked.map((entry) => (
              <tr key={entry.id}>
                <td style={{ fontFamily: 'monospace', color: 'var(--color-graphite)' }}>
                  {entry.ip_address}
                  {entry.reason && (
                    <div style={{ fontFamily: 'inherit', fontSize: 11.5, color: 'var(--color-steel)', marginTop: 2 }}>
                      {entry.reason}
                    </div>
                  )}
                </td>
                <td>{entry.location_label}</td>
                <td>{entry.blocked_at ? new Date(entry.blocked_at).toLocaleDateString('fr-FR') : '—'}</td>
                <td>
                  {entry.hits > 0 ? (
                    <span style={{ fontFamily: 'monospace' }}>{entry.hits}</span>
                  ) : (
                    // Said plainly rather than shown as a bare 0, which reads
                    // like a broken block instead of a quiet one.
                    <span style={{ color: 'var(--color-steel)', fontSize: 12.5 }}>Aucune depuis le blocage</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => unblock(entry)}
                    className="btn btn-secondary"
                    style={{ fontSize: 12.5 }}
                  >
                    <ShieldBan size={13} /> Debloquer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DataCard>
  );
}
