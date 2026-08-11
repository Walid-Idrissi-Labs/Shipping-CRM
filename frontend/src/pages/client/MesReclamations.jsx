/* eslint-disable react-hooks/set-state-in-effect -- house data-fetch pattern: the effect calls fetchThreads(), which flips `loading` synchronously, same as every list page in this repo */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, X, Send, AlertTriangle, MessageSquare, MessageSquareText, Paperclip } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import StatusBadge from '../../components/ui/StatusBadge';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import { FormField } from '../../components/ui/Form';
import { useUrlPage } from '../../hooks/useUrlPage';
import { useToast } from '../../contexts/ToastContext';
import { formatRelativeTime } from '../../lib/format';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'ouverte', label: 'Ouverte' },
  { value: 'en_traitement', label: 'En traitement' },
  { value: 'resolue', label: 'Résolue' },
];

const typeOptions = [
  { value: '', label: 'Tous les types' },
  { value: 'remarque', label: 'Remarque' },
  { value: 'reclamation', label: 'Réclamation' },
];

const TYPE_LABELS = { remarque: 'Remarque', reclamation: 'Réclamation' };

// The two-line description is what makes the choice legible: "remarque" and
// "réclamation" are close enough in French that a bare label would not be.
const TYPE_CHOICES = [
  {
    value: 'reclamation',
    label: 'Réclamation',
    icon: AlertTriangle,
    description: 'Un problème à signaler : colis endommagé, retard, litige de facturation.',
  },
  {
    value: 'remarque',
    label: 'Remarque',
    icon: MessageSquareText,
    description: 'Un commentaire ou une suggestion sur nos services.',
  },
];

const emptyForm = { type: 'reclamation', sujet: '', message: '', subjectType: '', subjectId: '' };

function TypeTag({ type }) {
  const isReclamation = type === 'reclamation';
  const Icon = isReclamation ? AlertTriangle : MessageSquareText;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: 'var(--color-iron)', whiteSpace: 'nowrap' }}>
      <Icon size={13} strokeWidth={2} color={isReclamation ? 'var(--color-warning)' : 'var(--color-smoke)'} aria-hidden="true" />
      {TYPE_LABELS[type] || type}
    </span>
  );
}

function UnreadDot() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: 'var(--color-primary)',
        boxShadow: '0 0 0 3px var(--color-primary-wash)',
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}

function UnreadPill({ count }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--color-primary)',
        color: 'var(--color-paper-white)',
        borderRadius: 9999,
        padding: '2px 9px',
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {count === 1 ? 'Nouvelle réponse' : `${count} nouvelles réponses`}
    </span>
  );
}

export default function MesReclamations() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const statut = searchParams.get('statut') || '';
  const type = searchParams.get('type') || '';

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [meta, setMeta] = useState({ lastPage: 1, total: 0, perPage: 25 });
  const { page, setPage, resetPage } = useUrlPage();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  // null = not yet fetched; fetched lazily the first time the form opens.
  const [subjects, setSubjects] = useState(null);
  const [subjectsError, setSubjectsError] = useState(false);

  const fetchThreads = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get('/my/reclamations', { params: { search: q, statut, type, page } });
      setThreads(data.data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.last_page && page > data.last_page) resetPage();
    } catch {
      // Without this, a failed request left the list at [] and rendered the
      // "aucune conversation" empty state, indistinguishable from genuinely
      // having none.
      setThreads([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statut, type, page]);

  const fetchSubjects = async () => {
    setSubjectsError(false);
    try {
      const { data } = await api.get('/my/reclamations/subjects');
      setSubjects({ shipments: data.shipments || [], invoices: data.invoices || [] });
    } catch {
      // The attach selector is optional: a failure must not block the form,
      // so we degrade to an inline note instead of an error screen.
      setSubjectsError(true);
    }
  };

  const openForm = () => {
    setFormOpen(true);
    if (!subjects) fetchSubjects();
  };

  const closeForm = () => {
    setFormOpen(false);
    setFieldErrors({});
  };

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const handleClearAll = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('statut');
    next.delete('type');
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const canSubmit = form.sujet.trim().length > 0 && form.message.trim().length > 0 && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setFieldErrors({});
    try {
      const payload = { type: form.type, sujet: form.sujet.trim(), message: form.message.trim() };
      if (form.subjectType && form.subjectId) {
        payload.subject_type = form.subjectType;
        payload.subject_id = Number(form.subjectId);
      }
      const { data } = await api.post('/my/reclamations', payload);
      toast.push('Votre demande a bien été transmise. Notre équipe vous répondra ici.', 'success');
      // Land inside the new conversation rather than back on the list: it
      // confirms the message went through and shows where the reply will come.
      navigate(`/client/reclamations/${data.id}`);
    } catch (err) {
      setFieldErrors(err.response?.data?.errors || {});
      toast.push(err.response?.data?.message || "Erreur lors de l'envoi de votre demande.", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const subjectList = form.subjectType === 'shipment' ? subjects?.shipments : subjects?.invoices;

  return (
    <div>
      <PageHeader
        eyebrow="Espace Client"
        title="Remarques & Réclamations"
        subtitle="Signalez un problème ou faites-nous part d'une remarque. Notre équipe vous répond directement ici."
        actions={
          <button
            type="button"
            onClick={formOpen ? closeForm : openForm}
            className={formOpen ? 'btn btn-secondary' : 'btn btn-primary'}
            aria-expanded={formOpen}
          >
            {formOpen ? <X size={14} /> : <Plus size={14} />} {formOpen ? 'Fermer' : 'Nouvelle réclamation'}
          </button>
        }
      />

      {formOpen && (
        <Card className="animate-fade-in" style={{ padding: 24, marginBottom: 16 }}>
          <div className="flex items-start justify-between" style={{ gap: 12, marginBottom: 18 }}>
            <div>
              <h2 className="section-heading">Nouvelle réclamation</h2>
              <p style={{ fontSize: 13, color: 'var(--color-steel)', marginTop: 4 }}>
                Décrivez votre situation, notre équipe vous répondra dans cette conversation.
              </p>
            </div>
            <button type="button" onClick={closeForm} className="btn-icon" title="Fermer le formulaire" aria-label="Fermer le formulaire">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <FormField label="Type de demande" required error={fieldErrors.type?.[0]}>
              <div role="radiogroup" aria-label="Type de demande" className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>
                {TYPE_CHOICES.map((c) => {
                  const active = form.type === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setField('type', c.value)}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        transition: 'border-color 150ms ease, background 150ms ease, box-shadow 150ms ease',
                        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-mist)'}`,
                        background: active ? 'var(--color-primary-wash)' : 'var(--color-paper-white)',
                        boxShadow: active ? '0 0 0 2px var(--color-primary-glow)' : 'none',
                        fontFamily: 'inherit',
                      }}
                    >
                      <c.icon
                        size={18}
                        strokeWidth={1.8}
                        color={active ? 'var(--color-primary)' : 'var(--color-steel)'}
                        style={{ flexShrink: 0, marginTop: 2 }}
                        aria-hidden="true"
                      />
                      <span>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: active ? 'var(--color-primary)' : 'var(--color-graphite)' }}>
                          {c.label}
                        </span>
                        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--color-iron)', marginTop: 2, lineHeight: 1.45 }}>
                          {c.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </FormField>

            <FormField label="Sujet" required error={fieldErrors.sujet?.[0]} hint="150 caractères maximum.">
              <input
                value={form.sujet}
                onChange={(e) => setField('sujet', e.target.value)}
                className="input"
                maxLength={150}
                placeholder="Ex. : Colis endommagé à la livraison"
                aria-label="Sujet de la demande"
                required
              />
            </FormField>

            <FormField label="Votre message" required error={fieldErrors.message?.[0]}>
              <textarea
                value={form.message}
                onChange={(e) => setField('message', e.target.value)}
                className="textarea"
                rows={5}
                maxLength={4000}
                placeholder="Décrivez la situation le plus précisément possible : numéro concerné, dates, ce qui s'est passé..."
                aria-label="Message"
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <span
                  style={{
                    fontSize: 12,
                    color: form.message.length > 3800 ? 'var(--color-danger)' : 'var(--color-smoke)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {form.message.length} / 4000
                </span>
              </div>
            </FormField>

            <FormField
              label="Rattacher à"
              error={fieldErrors.subject_id?.[0] || fieldErrors.subject_type?.[0]}
              hint={subjectsError ? undefined : 'Facultatif — associez cette demande à une expédition ou une facture.'}
            >
              {subjectsError ? (
                <div style={{ fontSize: 13, color: 'var(--color-steel)' }}>
                  Vos expéditions et factures n'ont pas pu être chargées.{' '}
                  <button
                    type="button"
                    onClick={fetchSubjects}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-primary)', fontSize: 13, fontFamily: 'inherit' }}
                  >
                    Réessayer
                  </button>
                  {' '}— vous pouvez aussi envoyer votre demande sans rattachement.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row" style={{ gap: 10 }}>
                  <select
                    value={form.subjectType}
                    onChange={(e) => setForm((f) => ({ ...f, subjectType: e.target.value, subjectId: '' }))}
                    className="select"
                    style={{ maxWidth: 220 }}
                    aria-label="Type d'élément à rattacher"
                  >
                    <option value="">Aucun</option>
                    <option value="shipment">Une expédition</option>
                    <option value="facture">Une facture</option>
                  </select>
                  {form.subjectType && (
                    <select
                      value={form.subjectId}
                      onChange={(e) => setField('subjectId', e.target.value)}
                      className="select"
                      style={{ maxWidth: 320 }}
                      disabled={!subjects}
                      aria-label={form.subjectType === 'shipment' ? 'Expédition concernée' : 'Facture concernée'}
                    >
                      <option value="">{subjects ? 'Sélectionner...' : 'Chargement...'}</option>
                      {(subjectList || []).map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </FormField>

            <div className="flex" style={{ gap: 10, marginTop: 4 }}>
              <button type="submit" disabled={!canSubmit} className="btn btn-primary">
                <Send size={14} /> {submitting ? 'Envoi...' : 'Envoyer'}
              </button>
              <button type="button" onClick={closeForm} className="btn btn-ghost">
                Annuler
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div className="flex flex-col md:flex-row" style={{ gap: 12, alignItems: 'center' }}>
          <SearchInput
            value={q}
            onSearch={(v) => updateParam('q', v)}
            onClear={handleClearAll}
            loading={loading}
            placeholder="Rechercher par référence, sujet..."
          />
          <select
            value={type}
            onChange={(e) => updateParam('type', e.target.value)}
            className="select"
            style={{ maxWidth: 180 }}
            aria-label="Filtrer par type"
          >
            {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={statut}
            onChange={(e) => updateParam('statut', e.target.value)}
            className="select"
            style={{ maxWidth: 200 }}
            aria-label="Filtrer par statut"
          >
            {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <Skeleton height={20} width="55%" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <EmptyState
            icon={AlertTriangle}
            tone="danger"
            title="Chargement impossible"
            description="Vos réclamations n'ont pas pu être récupérées. Vérifiez votre connexion puis réessayez."
            actionLabel="Réessayer"
            onAction={fetchThreads}
          />
        ) : threads.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Aucune conversation"
            description={
              q || statut || type
                ? 'Aucune conversation ne correspond à vos filtres.'
                : 'Un problème avec un envoi, une facture, ou simplement une remarque ? Ouvrez une conversation, notre équipe vous répond ici.'
            }
            actionLabel={!q && !statut && !type ? 'Nouvelle réclamation' : undefined}
            onAction={!q && !statut && !type ? openForm : undefined}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="list-table-wrap">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Type</th>
                    <th>Sujet</th>
                    <th>Statut</th>
                    <th>Dernière activité</th>
                  </tr>
                </thead>
                <tbody>
                  {threads.map((r) => {
                    const unread = r.unread_count > 0;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => navigate(`/client/reclamations/${r.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            {unread && <UnreadDot />}
                            <span className="font-mono-data" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                              {r.reference}
                            </span>
                          </span>
                        </td>
                        <td><TypeTag type={r.type} /></td>
                        <td>
                          <div style={{ fontWeight: unread ? 600 : 500, color: 'var(--color-graphite)' }}>{r.sujet}</div>
                          {r.subject_label && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-steel)', marginTop: 2 }}>
                              <Paperclip size={12} strokeWidth={2} aria-hidden="true" /> {r.subject_label}
                            </div>
                          )}
                        </td>
                        <td><StatusBadge status={r.statut} /></td>
                        <td>
                          <div style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{formatRelativeTime(r.last_message_at)}</div>
                          {unread && (
                            <div style={{ marginTop: 4 }}>
                              <UnreadPill count={r.unread_count} />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="list-card-stack">
              {threads.map((r) => {
                const unread = r.unread_count > 0;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => navigate(`/client/reclamations/${r.id}`)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      background: 'var(--color-paper-white)',
                      border: '1px solid var(--color-ash)',
                      borderLeft: `3px solid ${unread ? 'var(--color-primary)' : 'var(--color-ash)'}`,
                      borderRadius: 10,
                      padding: '12px 14px',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div className="flex items-center justify-between" style={{ gap: 8 }}>
                      <span className="font-mono-data" style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 12.5 }}>
                        {r.reference}
                      </span>
                      <StatusBadge status={r.statut} variant="left" />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: unread ? 600 : 500, color: 'var(--color-graphite)', marginTop: 6 }}>
                      {r.sujet}
                    </div>
                    {r.subject_label && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-steel)', marginTop: 3 }}>
                        <Paperclip size={12} strokeWidth={2} aria-hidden="true" /> {r.subject_label}
                      </div>
                    )}
                    <div className="flex items-center justify-between" style={{ gap: 8, marginTop: 8 }}>
                      <TypeTag type={r.type} />
                      {unread ? (
                        <UnreadPill count={r.unread_count} />
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--color-steel)' }}>{formatRelativeTime(r.last_message_at)}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {!loading && threads.length > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <Pagination page={page} lastPage={meta.lastPage} total={meta.total} perPage={meta.perPage} onChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
