/* eslint-disable react-hooks/set-state-in-effect -- house data-fetch pattern: the effect calls fetchThread(), which flips `loading` synchronously, same as every detail page in this repo */
import { useMinLoading, useVisiblePoll, threadPollInterval } from '../../hooks';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Headset, Check, CheckCircle2, ExternalLink, Paperclip, AlertTriangle, MessageSquareText } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard, DetailRow } from '../../components/ui/DataCard';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import PageLoader from '../../components/ui/PageLoader';
import { useToast } from '../../contexts/ToastContext';
import { useDialog } from '../../contexts/DialogContext';
import { formatDate, formatDateTime } from '../../lib/format';

const TYPE_LABELS = { remarque: 'Remarque', reclamation: 'Réclamation' };

const STATUS_OPTIONS = [
  { value: 'ouverte', label: 'Ouverte', description: 'Nouvelle demande, en attente de prise en charge.' },
  { value: 'en_traitement', label: 'En traitement', description: 'Le dossier est en cours de traitement.' },
  { value: 'resolue', label: 'Résolue', description: 'Clôt le dossier. Une réponse du client la rouvrira.' },
];

// Same correspondence rendering as the client side (local copy on purpose —
// to be deduplicated once the feature settles): hairline-separated blocks,
// team replies in brand blue, client messages neutral.
function ThreadMessages({ messages, newIds }) {
  if (!messages.length) {
    return (
      <div style={{ fontSize: 14, color: 'var(--color-steel)', padding: '16px 0' }}>
        Aucun message dans cette conversation.
      </div>
    );
  }
  return (
    <div>
      {messages.map((m, i) => {
        const isTeam = m.author_role === 'prestataire';
        return (
          <article
            key={m.id}
            className={newIds?.has(m.id) ? 'animate-fade-in' : undefined}
            style={{
              display: 'flex',
              gap: 12,
              padding: '18px 0',
              borderTop: i > 0 ? '1px solid var(--color-fog)' : 'none',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isTeam ? 'var(--color-primary-wash)' : 'var(--color-bone)',
                color: isTeam ? 'var(--color-primary)' : 'var(--color-iron)',
                border: `1px solid ${isTeam ? 'var(--color-primary-glow)' : 'var(--color-ash)'}`,
              }}
            >
              {isTeam ? (
                <Headset size={15} strokeWidth={2} />
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {(m.author_name || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-baseline justify-between" style={{ gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: isTeam ? 'var(--color-primary)' : 'var(--color-graphite)' }}>
                  {m.author_name}
                </span>
                <time style={{ fontSize: 12, color: 'var(--color-smoke)', whiteSpace: 'nowrap' }}>
                  {formatDateTime(m.created_at)}
                </time>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.65, color: 'var(--color-graphite)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {m.corps}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function ReclamationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const dialog = useDialog();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const showLoader = useMinLoading(loading);
  const [corps, setCorps] = useState('');
  const [corpsError, setCorpsError] = useState('');
  const [sending, setSending] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [newMessageIds, setNewMessageIds] = useState(() => new Set());

  // Ids already on screen, so a message that arrives from a background refresh
  // can be told apart from one that was always there and faded in.
  const seenMessageIds = useRef(null);

  const applyThread = (data) => {
    const ids = (data.messages || []).map((m) => m.id);
    if (seenMessageIds.current) {
      const fresh = ids.filter((messageId) => !seenMessageIds.current.has(messageId));
      if (fresh.length) setNewMessageIds(new Set(fresh));
    }
    seenMessageIds.current = new Set(ids);
    setThread(data);
  };

  // `silent` is what the poll uses: no page loader, and no navigating away on
  // failure — a momentary network blip must not throw someone off the page
  // while they are half-way through writing a reply.
  const fetchThread = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/reclamations/${id}`);
      applyThread(data);
    } catch {
      if (!silent) {
        toast.push('Réclamation introuvable.', 'error');
        navigate('/dashboard/reclamations');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    seenMessageIds.current = null;
    fetchThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fast while an exchange is live, slower as it goes quiet, paused when the
  // tab is hidden. Suspended during a send or a status change so a poll cannot
  // land on top of the refetch those already perform.
  // No useCallback needed: the hook holds the callback in a ref, so a fresh
  // closure each render never restarts the timer.
  useVisiblePoll(
    () => fetchThread({ silent: true }),
    threadPollInterval(thread?.last_message_at),
    { enabled: !!thread && !sending && !statusLoading },
  );

  const canSend = corps.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setCorpsError('');
    try {
      await api.post(`/reclamations/${id}/messages`, { corps: corps.trim() });
      setCorps('');
      // Refetch instead of appending: replying to a conversation résolue
      // reopens it server-side, and the statut must follow. Silent, or sending
      // a reply would blank the conversation behind the page loader for over a
      // second — the opposite of feeling live.
      await fetchThread({ silent: true });
    } catch (err) {
      setCorpsError(err.response?.data?.errors?.corps?.[0] || '');
      toast.push(err.response?.data?.message || "Erreur lors de l'envoi de la réponse.", 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const changeStatus = async (next) => {
    if (!thread || next === thread.statut || statusLoading) return;
    if (next === 'resolue') {
      const ok = await dialog.confirm({
        title: 'Marquer comme résolue ?',
        description: 'Le client verra la conversation comme résolue. Une nouvelle réponse de sa part la rouvrira automatiquement.',
        confirmText: 'Marquer résolue',
        cancelText: 'Annuler',
        variant: 'success',
      });
      if (!ok) return;
    }
    setStatusLoading(true);
    try {
      const { data } = await api.patch(`/reclamations/${id}/status`, { statut: next });
      // The PATCH response is the updated thread but may omit the messages
      // array — keep the one already loaded in that case.
      setThread((t) => ({ ...t, ...data, messages: data.messages || t?.messages || [] }));
      toast.push('Statut mis à jour.', 'success');
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors du changement de statut.', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  if (showLoader) {
    return <PageLoader variant="detail" />;
  }

  if (!thread) return null;

  const isResolue = thread.statut === 'resolue';
  const TypeIcon = thread.type === 'reclamation' ? AlertTriangle : MessageSquareText;

  return (
    <div style={{ maxWidth: 1080 }}>
      <button
        type="button"
        onClick={() => navigate('/dashboard/reclamations')}
        className="btn btn-ghost"
        style={{ marginBottom: 12 }}
      >
        <ArrowLeft size={14} /> Retour aux réclamations
      </button>

      <PageHeader
        eyebrow={TYPE_LABELS[thread.type] || thread.type}
        title={thread.sujet}
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Remarques & Réclamations', to: '/dashboard/reclamations' },
          { label: thread.reference },
        ]}
      />

      <div className="flex items-center" style={{ gap: 14, flexWrap: 'wrap', marginTop: -12, marginBottom: 20 }}>
        <span className="font-mono-data" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
          {thread.reference}
        </span>
        <StatusBadge status={thread.statut} variant="left" />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-steel)' }}>
          <TypeIcon size={13} strokeWidth={2} aria-hidden="true" />
          Ouverte le {formatDate(thread.created_at)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 16, alignItems: 'start' }}>
        <div className="lg:col-span-2">
          <Card style={{ padding: '8px 24px 20px' }}>
            <ThreadMessages messages={thread.messages || []} newIds={newMessageIds} />

            <div style={{ borderTop: '1px solid var(--color-ash)', paddingTop: 16, marginTop: 8 }}>
              {isResolue && (
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'var(--color-bone)',
                    border: '1px solid var(--color-ash)',
                    fontSize: 13,
                    color: 'var(--color-iron)',
                    marginBottom: 12,
                  }}
                >
                  <CheckCircle2 size={16} color="var(--color-vivid-green-dark)" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                  <span>
                    Conversation marquée comme résolue. Une nouvelle réponse la rouvrira en traitement.
                  </span>
                </div>
              )}
              <label className="field-label" htmlFor="reclamation-reply">Votre réponse</label>
              <textarea
                id="reclamation-reply"
                value={corps}
                onChange={(e) => setCorps(e.target.value)}
                onKeyDown={handleKeyDown}
                className="textarea"
                rows={4}
                maxLength={4000}
                placeholder="Écrivez votre réponse au client..."
                disabled={sending}
              />
              {corpsError && (
                <div style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 4 }}>{corpsError}</div>
              )}
              <div className="flex items-center justify-between" style={{ gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 12,
                    color: corps.length > 3800 ? 'var(--color-danger)' : 'var(--color-smoke)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {corps.length} / 4000
                </span>
                <div className="flex items-center" style={{ gap: 12 }}>
                  <span className="hidden sm:inline" style={{ fontSize: 12, color: 'var(--color-smoke)' }}>
                    Ctrl + Entrée pour envoyer
                  </span>
                  <button type="button" onClick={handleSend} disabled={!canSend} className="btn btn-primary">
                    <Send size={14} /> {sending ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col" style={{ gap: 16 }}>
          <DataCard title="Client" description="Auteur de la demande." padding={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <DetailRow label="Nom" value={thread.client?.full_name} />
              <DetailRow label="Société" value={thread.client?.company_name || '—'} />
              {thread.client?.id && (
                <Link
                  to={`/dashboard/clients/${thread.client.id}`}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'center' }}
                  title="Ouvrir la fiche client"
                >
                  <ExternalLink size={14} /> Fiche client
                </Link>
              )}
            </div>
          </DataCard>

          <DataCard title="Dossier lié" description="Expédition ou facture concernée." padding={16}>
            {thread.subject_label ? (
              thread.subject_link ? (
                <Link
                  to={thread.subject_link}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500 }}
                  title={`Consulter : ${thread.subject_label}`}
                >
                  <Paperclip size={14} strokeWidth={2} aria-hidden="true" /> {thread.subject_label}
                </Link>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--color-graphite)' }}>
                  <Paperclip size={14} strokeWidth={2} aria-hidden="true" /> {thread.subject_label}
                </div>
              )
            ) : (
              <div style={{ fontSize: 13, color: 'var(--color-steel)' }}>Aucun dossier rattaché.</div>
            )}
          </DataCard>

          <DataCard title="Statut" description="L'état visible par le client." padding={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STATUS_OPTIONS.map((opt) => {
                const active = thread.statut === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => changeStatus(opt.value)}
                    disabled={statusLoading || active}
                    aria-pressed={active}
                    aria-label={`Passer le statut à ${opt.label}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      textAlign: 'left',
                      cursor: active ? 'default' : 'pointer',
                      opacity: statusLoading && !active ? 0.6 : 1,
                      border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-ash)'}`,
                      background: active ? 'var(--color-primary-wash)' : 'var(--color-paper-white)',
                      transition: 'border-color 150ms ease, background 150ms ease',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: active ? 'var(--color-primary)' : 'var(--color-graphite)' }}>
                        {opt.label}
                      </span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--color-iron)', marginTop: 1, lineHeight: 1.4 }}>
                        {opt.description}
                      </span>
                    </span>
                    {active && <Check size={16} color="var(--color-primary)" strokeWidth={2.2} style={{ flexShrink: 0 }} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </DataCard>
        </div>
      </div>
    </div>
  );
}
