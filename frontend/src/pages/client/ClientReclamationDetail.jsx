/* eslint-disable react-hooks/set-state-in-effect -- house data-fetch pattern: the effect calls fetchThread(), which flips `loading` synchronously, same as every detail page in this repo */
import { useMinLoading, useVisiblePoll, threadPollInterval } from '../../hooks';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Headset, CheckCircle2, Paperclip, AlertTriangle, MessageSquareText } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import PageLoader from '../../components/ui/PageLoader';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, formatDateTime } from '../../lib/format';

const TYPE_LABELS = { remarque: 'Remarque', reclamation: 'Réclamation' };

// Correspondence-style thread: full-width blocks separated by hairlines, no
// chat bubbles. The team's replies carry the brand blue (monogram + name) so
// "notre équipe a répondu" reads at a glance; the client's own messages stay
// neutral. Same rendering on the provider side — dedup later if warranted.
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

export default function ClientReclamationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const showLoader = useMinLoading(loading);
  const [corps, setCorps] = useState('');
  const [corpsError, setCorpsError] = useState('');
  const [sending, setSending] = useState(false);
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

  // `silent` is what the poll uses: no page loader, and — crucially — no
  // navigating away on failure. A momentary network blip must not throw
  // someone off the page while they are half-way through writing a reply.
  const fetchThread = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/my/reclamations/${id}`);
      applyThread(data);
    } catch {
      if (!silent) {
        toast.push('Conversation introuvable.', 'error');
        navigate('/client/reclamations');
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
  // tab is hidden. Suspended mid-send so a poll cannot land on top of the
  // refetch that the send itself performs.
  // No useCallback needed: the hook holds the callback in a ref, so a fresh
  // closure each render never restarts the timer.
  useVisiblePoll(
    () => fetchThread({ silent: true }),
    threadPollInterval(thread?.last_message_at),
    { enabled: !!thread && !sending },
  );

  const canSend = corps.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setCorpsError('');
    try {
      await api.post(`/my/reclamations/${id}/messages`, { corps: corps.trim() });
      setCorps('');
      // No optimistic insert: refetching also picks up the statut reopening
      // that the server performs when replying to a conversation résolue.
      // Silent, or sending a reply would blank the conversation behind the
      // page loader for over a second — the opposite of feeling live.
      await fetchThread({ silent: true });
    } catch (err) {
      setCorpsError(err.response?.data?.errors?.corps?.[0] || '');
      toast.push(err.response?.data?.message || "Erreur lors de l'envoi de votre réponse.", 'error');
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

  if (showLoader) {
    return <PageLoader variant="detail" />;
  }

  if (!thread) return null;

  const isResolue = thread.statut === 'resolue';
  const TypeIcon = thread.type === 'reclamation' ? AlertTriangle : MessageSquareText;

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => navigate('/client/reclamations')}
          className="btn btn-ghost"
        >
          <ArrowLeft size={14} /> Retour aux réclamations
        </button>
      </div>

      <PageHeader
        eyebrow={TYPE_LABELS[thread.type] || thread.type}
        title={thread.sujet}
        breadcrumbs={[
          { label: 'Remarques & Réclamations', to: '/client/reclamations' },
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
        {thread.subject_link && thread.subject_label && (
          <Link
            to={thread.subject_link}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13 }}
            title={`Consulter : ${thread.subject_label}`}
          >
            <Paperclip size={13} strokeWidth={2} aria-hidden="true" /> {thread.subject_label}
          </Link>
        )}
      </div>

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
                Cette conversation a été marquée comme résolue. Si le problème persiste, répondez
                ci-dessous : elle sera automatiquement rouverte auprès de notre équipe.
              </span>
            </div>
          )}
          <label className="field-label" htmlFor="reclamation-reply">Répondre</label>
          <textarea
            id="reclamation-reply"
            value={corps}
            onChange={(e) => setCorps(e.target.value)}
            onKeyDown={handleKeyDown}
            className="textarea"
            rows={4}
            maxLength={4000}
            placeholder="Écrivez votre réponse..."
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
  );
}
