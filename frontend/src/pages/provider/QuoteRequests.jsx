import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Trash2, Eye, X, XCircle, Mail, Phone, MapPin, Package, Clock, Globe } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SortHeader from '../../components/ui/SortHeader';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import { useColumnSort } from '../../hooks/useColumnSort';
import { useUrlPage } from '../../hooks/useUrlPage';
import { useDialog } from '../../contexts/DialogContext';
import { useToast } from '../../contexts/ToastContext';
import { usePendingCounts } from '../../contexts/PendingCountsContext';
import {getCountryName} from '../../components/ui/CountrySelect';

function calculateTotals(colis) {
  if (!colis?.length) return { totalWeight: 0, totalVolume: 0, totalPieces: 0 };
  let totalWeight = 0;
  let totalVolume = 0;
  let totalPieces = 0;
  colis.forEach((item) => {
    const pieces = Number(item.nb_pieces) || 0;
    const weight = Number(item.poids) || 0;
    const length = Number(item.longueur) || 0;
    const width = Number(item.largeur) || 0;
    const height = Number(item.hauteur) || 0;
    totalPieces += pieces;
    totalWeight += pieces * weight;
    if (length > 0 && width > 0 && height > 0) {
      totalVolume += pieces * (length / 100) * (width / 100) * (height / 100);
    }
  });
  return { totalWeight, totalVolume, totalPieces };
}

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'traitee', label: 'Traitee' },
  { value: 'refusee', label: 'Refusee' },
];

export default function QuoteRequests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const statut = searchParams.get('statut') || '';
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailRequest, setDetailRequest] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const dialog = useDialog();
  const toast = useToast();
  const { refresh: refreshPendingCounts } = usePendingCounts();
  const [meta, setMeta] = useState({ lastPage: 1, total: 0, perPage: 25 });
  const { page, setPage, resetPage } = useUrlPage();
  const { column, direction, toggle, params: sortParams } = useColumnSort('created_at', 'desc');

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statut, column, direction, page]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/quote-requests', { params: { search: q, statut, page, ...sortParams } });
      setRequests(data.data || []);
      setMeta({ lastPage: data.last_page || 1, total: data.total ?? 0, perPage: data.per_page || 25 });
      if (data.last_page && page > data.last_page) resetPage();
    } finally {
      setLoading(false);
    }
  };

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const handleSearch = (value) => updateParam('q', value);

  const handleClearAll = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('statut');
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const handleDelete = async (id) => {
    const ok = await dialog.confirm({
      title: 'Supprimer cette demande de devis ?',
      description: 'La demande sera supprimee definitivement. Vous pourrez toujours en recevoir de nouvelles depuis le formulaire public.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      safetyGate: true,
      requiredInput: 'supprimer',
      inputLabel: 'Tapez supprimer pour confirmer',
    });
    if (!ok) return;
    await api.delete(`/quote-requests/${id}`);
    toast.push('Demande supprimee', 'success');
    fetchRequests();
    refreshPendingCounts();
  };

  const handleReject = async (id) => {
    const ok = await dialog.confirm({
      title: 'Refuser cette demande de devis ?',
      description: 'La demande sera marquee comme refusee et restera visible dans l\'historique.',
      confirmText: 'Refuser',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.post(`/quote-requests/${id}/reject`);
      toast.push('Demande refusee', 'success');
      fetchRequests();
      refreshPendingCounts();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur', 'error');
    }
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/quote-requests/${id}`);
      setDetailRequest(data);
    } catch {
      toast.push('Impossible de charger les details.', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailRequest(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const buildDimensions = (r) => {
    const dims = [r.longueur, r.largeur, r.hauteur].filter((v) => v != null && v !== '');
    if (dims.length === 0) return '-';
    return dims.map((d) => `${d} cm`).join(' x ');
  };

  return (
    <div>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutRight {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(100%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .detail-panel-enter { animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .detail-panel-exit { animation: slideOutRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .backdrop-enter { animation: fadeIn 0.2s ease forwards; }
        .backdrop-exit { animation: fadeOut 0.2s ease forwards; }
        .detail-content-enter { animation: fadeIn 0.3s ease 0.1s forwards; opacity: 0; }
      `}</style>

      <PageHeader
        title="Demandes de Devis"
        subtitle="Demandes de devis envoyees par les clients (compte et divers)"
      />

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div className="flex flex-col md:flex-row" style={{ gap: 12, alignItems: 'center' }}>
          <SearchInput value={q} onSearch={handleSearch} onClear={handleClearAll} loading={loading} placeholder="Rechercher par client, email..." className="w-full" />
          <select value={statut} onChange={(e) => updateParam('statut', e.target.value)} className="select" style={{ maxWidth: 220 }}>
            {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ marginBottom: 12 }}><Skeleton height={20} width="55%" /></div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState icon={FileText} title="Aucune demande" description="Aucun resultat ne correspond." />
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <SortHeader label="Date" col="created_at" currentCol={column} direction={direction} onClick={toggle} />
                <SortHeader label="Client" col="client_name" currentCol={column} direction={direction} onClick={toggle} />
                <th>Contact</th>
                <th>Destination</th>
                <th>Service</th>
                <SortHeader label="Statut" col="statut" currentCol={column} direction={direction} onClick={toggle} />
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} style={{ transition: 'background-color 0.15s ease' }}>
                  <td style={{ color: 'var(--color-steel)', whiteSpace: 'nowrap' }}>
                    {formatDate(r.created_at)}
                  </td>
                  <td>{r.client_name}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 13 }}>
                      {r.client_phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={12} style={{ color: 'var(--color-steel)', flexShrink: 0 }} />
                          <span className="font-mono-data" style={{ fontSize: 12 }}>{r.client_phone}</span>
                        </div>
                      )}
                      {r.client_email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={12} style={{ color: 'var(--color-steel)', flexShrink: 0 }} />
                          <span className="font-mono-data" style={{ fontSize: 12 }}>{r.client_email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-steel)', fontSize: 13 }}>
                    {r.recipient_city && r.recipient_country ? (
                      <>
                        <MapPin size={12} style={{ display: 'inline-block', marginRight: 4, color: 'var(--color-iron)' }} />
                        {r.recipient_city}, {getCountryName(r.recipient_country) || r.recipient_country}
                      </>
                    ) : r.recipient_city ? (
                      r.recipient_city
                    ) : r.recipient_country ? (
                      getCountryName(r.recipient_country) || r.recipient_country
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{(r.type_service || '').replace(/_/g, ' ')}</td>
                  <td>
                    {r.quote_id ? (
                      <span className="pill pill-success">Devis cree</span>
                    ) : (
                      <StatusBadge status={r.statut} />
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end" style={{ gap: 4 }}>
                      {!r.quote_id && r.statut === 'en_attente' && (
                        <Link to={`/dashboard/devis/nouveau?demandeId=${r.id}`} className="btn-icon" title="Creer un Devis">
                          <FileText size={16} />
                        </Link>
                      )}
                      {r.statut === 'en_attente' && (
                        <button onClick={() => handleReject(r.id)} className="btn-icon" title="Refuser">
                          <XCircle size={16} color="var(--color-danger)" />
                        </button>
                      )}
                      <button
                        onClick={() => openDetail(r.id)}
                        className="btn-icon"
                        title="Voir les details"
                        disabled={detailLoading}
                      >
                        <Eye size={16} />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="btn-icon" title="Supprimer definitivement">
                        <Trash2 size={16} color="var(--color-danger)" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && requests.length > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <Pagination page={page} lastPage={meta.lastPage} total={meta.total} perPage={meta.perPage} onChange={setPage} />
          </div>
        )}
      </Card>

      {/* Detail Panel Modal */}
      {detailRequest && (
        <>
          <div
            className="backdrop-enter fixed inset-0 z-40"
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              backdropFilter: 'blur(2px)',
            }}
            onClick={closeDetail}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
          />
          <div className="detail-panel-enter fixed right-0 top-0 h-full z-50" style={{ width: 'min(520px, 100vw)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-paper-white)', borderLeft: '1px solid var(--color-ash)', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-ash)', flexShrink: 0 }}>
                <h2 id="detail-title" className="display-headline" style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-graphite)' }}>
                  Demande #{detailRequest.id}
                </h2>
                <button
                  onClick={closeDetail}
                  className="btn-icon"
                  style={{ width: 36, height: 36 }}
                  aria-label="Fermer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {detailLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <div className="spinner" style={{ width: 32, height: 32, border: '3px solid var(--color-ash)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : (
                  <div className="detail-content-enter">
                    {/* Origine Section */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Globe size={18} color="var(--color-primary)" />
                        <span className="display-headline" style={{ fontSize: 16, fontWeight: 600 }}>Origine</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {detailRequest.origin_city && (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Ville</span>
                            <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{detailRequest.origin_city}</span>
                          </div>
                        )}
                        {detailRequest.origin_country && (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Pays</span>
                            <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{getCountryName(detailRequest.origin_country) || detailRequest.origin_country}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Destination Section */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <MapPin size={18} color="var(--color-primary)" />
                        <span className="display-headline" style={{ fontSize: 16, fontWeight: 600 }}>Destination</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {detailRequest.recipient_address && (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Adresse</span>
                            <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{detailRequest.recipient_address}</span>
                          </div>
                        )}
                        {(detailRequest.recipient_city || detailRequest.recipient_postal_code) && (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Ville / CP</span>
                            <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>
                              {[detailRequest.recipient_postal_code, detailRequest.recipient_city].filter(Boolean).join(' ')}
                            </span>
                          </div>
                        )}
                        {detailRequest.recipient_country && (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Pays</span>
                            <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{getCountryName(detailRequest.recipient_country) || detailRequest.recipient_country}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Colis Section */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Package size={18} color="var(--color-primary)" />
                        <span className="display-headline" style={{ fontSize: 16, fontWeight: 600 }}>
                          Colis {detailRequest.colis && detailRequest.colis.length > 1 ? `(${detailRequest.colis.length})` : ''}
                        </span>
                      </div>

                      {detailRequest.colis && detailRequest.colis.length > 0 ? (
                        <>
                          {detailRequest.colis.map((c, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: '6px 12px',
                                padding: '8px 12px',
                                background: 'var(--color-bone)',
                                borderRadius: 6,
                                border: '1px solid var(--color-ash)',
                                marginBottom: 6,
                                fontSize: 12,
                              }}
                            >
                              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Colis {idx + 1}</span>
                              {c.type_colis && (
                                <span style={{ color: 'var(--color-steel)', textTransform: 'capitalize' }}>{c.type_colis}</span>
                              )}
                              {c.nb_pieces && (
                                <span>{c.nb_pieces} pc</span>
                              )}
                              {c.poids != null && (
                                <span style={{ fontFamily: 'monospace' }}>{(c.nb_pieces * c.poids).toFixed(2)} kg</span>
                              )}
                              {c.longueur && c.largeur && c.hauteur && (
                                <span style={{ fontFamily: 'monospace' }}>
                                  {c.longueur}&times;{c.largeur}&times;{c.hauteur} cm
                                </span>
                              )}
                              {c.longueur && c.largeur && c.hauteur && c.nb_pieces && (
                                <span style={{ fontFamily: 'monospace', color: 'var(--color-steel)' }}>
                                  {(c.nb_pieces * (c.longueur/100) * (c.largeur/100) * (c.hauteur/100)).toFixed(3)} m&sup3;
                                </span>
                              )}
                              {c.description_colis && (
                                <span style={{ color: 'var(--color-steel)' }}>{c.description_colis}</span>
                              )}
                            </div>
                          ))}

                          {/* Totaux */}
                          {(() => {
                            const { totalWeight, totalVolume, totalPieces } = calculateTotals(detailRequest.colis);
                            return (
                              <div style={{
                                marginTop: 12,
                                padding: '12px 14px',
                                background: 'var(--color-bone)',
                                borderRadius: 8,
                                border: '1px solid var(--color-ash)',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px 20px',
                              }}>
                                <div>
                                  <div style={{ fontSize: 10, color: 'var(--color-steel)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Poids Total</div>
                                  <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                                    {totalWeight.toFixed(2)} kg
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, color: 'var(--color-steel)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Volume Total</div>
                                  <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                                    {totalVolume.toFixed(3)} m&sup3;
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, color: 'var(--color-steel)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pi&egrave;ces Total</div>
                                  <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                                    {totalPieces}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          {/* Valeur Declaree & Type Service */}
                          {(detailRequest.valeur_declaree != null || detailRequest.type_service) && (
                            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                              {detailRequest.valeur_declaree != null && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ fontSize: 10, color: 'var(--color-steel)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Valeur D&eacute;clar&eacute;e</div>
                                  <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                                    {detailRequest.valeur_declaree} {detailRequest.devise_valeur || 'MAD'}
                                  </div>
                                </div>
                              )}
                              {detailRequest.type_service && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ fontSize: 10, color: 'var(--color-steel)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type de service</div>
                                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-graphite)' }}>
                                    {detailRequest.type_service.replace(/_/g, ' ')}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        // Fallback: old flat fields (pre-migration) or single synthetic colis
                        <>
                          {detailRequest.type_service && (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Service</span>
                              <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{detailRequest.type_service.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                          {detailRequest.valeur_declaree != null && (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Valeur D&eacute;clar&eacute;e</span>
                              <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{detailRequest.valeur_declaree} {detailRequest.devise_valeur || 'MAD'}</span>
                            </div>
                          )}
                          {detailRequest.type_colis && (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Type de colis</span>
                              <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{detailRequest.type_colis}</span>
                            </div>
                          )}
                          {detailRequest.poids != null && (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Poids</span>
                              <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{detailRequest.poids} kg</span>
                            </div>
                          )}
                          {buildDimensions(detailRequest) !== '-' && (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Dimensions (L x l x H)</span>
                              <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{buildDimensions(detailRequest)}</span>
                            </div>
                          )}
                          {detailRequest.nb_pieces && (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Nombre de pi&egrave;ces</span>
                              <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{detailRequest.nb_pieces}</span>
                            </div>
                          )}
                          {detailRequest.description_colis && (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Description</span>
                              <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{detailRequest.description_colis}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Contact Section */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Mail size={18} color="var(--color-primary)" />
                        <span className="display-headline" style={{ fontSize: 16, fontWeight: 600 }}>Contact</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {detailRequest.client_name && (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Nom</span>
                            <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{detailRequest.client_name}</span>
                          </div>
                        )}
                        {detailRequest.client_phone && (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Telephone</span>
                            <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{detailRequest.client_phone}</span>
                          </div>
                        )}
                        {detailRequest.client_email && (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Email</span>
                            <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{detailRequest.client_email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Meta Section */}
                    <div style={{ borderTop: '1px solid var(--color-ash)', paddingTop: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Clock size={18} color="var(--color-primary)" />
                        <span className="display-headline" style={{ fontSize: 16, fontWeight: 600 }}>Informations</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Date de demande</span>
                          <span style={{ color: 'var(--color-graphite)', fontSize: 13 }}>{formatDateTime(detailRequest.created_at)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Statut</span>
                          <StatusBadge status={detailRequest.statut} />
                        </div>
                        {detailRequest.quote_id && (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--color-steel)', minWidth: 100, fontSize: 13 }}>Devis associe</span>
                            <span className="pill pill-success">Devis cree</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 20px', borderTop: '1px solid var(--color-ash)', flexShrink: 0 }}>
                {!detailRequest.quote_id && (
                  <Link
                    to={`/dashboard/devis/nouveau?demandeId=${detailRequest.id}`}
                    className="btn btn-primary"
                    onClick={closeDetail}
                  >
                    <FileText size={14} /> Creer un Devis
                  </Link>
                )}
                <button onClick={closeDetail} className="btn btn-secondary">Fermer</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}