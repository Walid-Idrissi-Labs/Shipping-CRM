import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, Package, ExternalLink, Copy, Link as LinkIcon, RefreshCw, Eye } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard, DetailRow } from '../../components/ui/DataCard';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Skeleton from '../../components/ui/Skeleton';
import TruckLoader from '../../components/ui/TruckLoader';
import { useToast } from '../../contexts/ToastContext';

function formatMoney(value) {
  const n = Number(value || 0);
  return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function calculateTotals(colis) {
  if (!colis || !colis.length) return { totalWeight: 0, totalVolume: 0, totalPieces: 0 };
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
      const volumeM3 = (length / 100) * (width / 100) * (height / 100);
      totalVolume += pieces * volumeM3;
    }
  });
  return { totalWeight, totalVolume, totalPieces };
}

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linkData, setLinkData] = useState(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchQuote = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/quotes/${id}`);
      setQuote(data);
    } catch {
      toast.push('Devis introuvable.', 'error');
      navigate('/dashboard/devis');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      await api.patch(`/quotes/${id}/status`, { statut: newStatus });
      toast.push('Statut mis a jour.', 'success');
      fetchQuote();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors du changement de statut.', 'error');
    }
  };

  const isPublicQuote = quote && !quote.client_id;

  const generateLink = async () => {
    setLinkLoading(true);
    try {
      const { data } = await api.post(`/quotes/${id}/generate-link`);
      setLinkData(data);
      setShowLink(true);
      toast.push('Lien genere avec succes.', 'success');
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors de la generation du lien.', 'error');
    } finally {
      setLinkLoading(false);
    }
  };

  const cancelLink = async () => {
    try {
      await api.post(`/quotes/${id}/cancel-link`);
      setLinkData(null);
      setShowLink(false);
      toast.push('Lien annule.', 'success');
      fetchQuote();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors de l\'annulation.', 'error');
    }
  };

  const regenerateLink = async () => {
    setLinkLoading(true);
    try {
      const { data } = await api.post(`/quotes/${id}/generate-link`);
      setLinkData(data);
      toast.push('Nouveau lien genere.', 'success');
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors de la regeneration.', 'error');
    } finally {
      setLinkLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1080, display: 'flex', justifyContent: 'center', padding: 32 }}>
        <TruckLoader />
      </div>
    );
  }

  if (!quote) return null;

  const isEnvoye = quote.statut === 'envoye';
  const isAccepte = quote.statut === 'accepte';
  const isRefuse = quote.statut === 'refuse';

  const fullAddress = [
    quote.client_address,
    [quote.client_postal_code, quote.client_city].filter(Boolean).join(' '),
    quote.client_country,
  ].filter(Boolean).join(', ');

  const recipientFullAddress = [
    quote.recipient_address,
    [quote.recipient_postal_code, quote.recipient_city].filter(Boolean).join(' '),
    quote.recipient_country,
  ].filter(Boolean).join(', ');

  return (
    <div style={{ maxWidth: 1080 }}>
      <button
        type="button"
        onClick={() => navigate('/dashboard/devis')}
        className="btn btn-ghost"
        style={{ marginBottom: 12 }}
      >
        <ArrowLeft size={14} /> Retour aux devis
      </button>

      <PageHeader
        eyebrow={quote.created_at ? `Cree le ${new Date(quote.created_at).toLocaleDateString('fr-FR')}` : undefined}
        title={`Devis ${quote.quote_number}`}
        subtitle={isAccepte
          ? 'Devis accepte par le client.'
          : isRefuse
            ? quote.client_id
              ? 'Rejetee par le client.'
              : 'Devis refuse.'
            : 'Proposition commerciale envoyee au client.'}
        breadcrumbs={[{ label: 'Devis', to: '/dashboard/devis' }, { label: quote.quote_number }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 16, marginBottom: 24 }}>
        <div className="lg:col-span-2">
          <DataCard title="Origine" description="Comment ce devis a ete cree.">
            {quote.request ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--color-iron)', marginBottom: 4 }}>Depuis une demande de devis</div>
                  <div className="font-mono-data" style={{ fontWeight: 600, color: 'var(--color-graphite)' }}>
                    Demande #{quote.request.id}
                  </div>
                </div>
                <Link to={`/dashboard/demandes-devis?q=${encodeURIComponent(`#${quote.request.id}`)}`} className="btn btn-secondary" title="Voir la demande">
                  <ExternalLink size={14} /> Voir la demande
                </Link>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--color-iron)' }}>
                Devis cree manuellement (sans demande prealable).
              </div>
            )}
          </DataCard>
        </div>

        <div>
          <DataCard title="Statut" description="Etat du devis.">
            <div
              className={`payment-status-${quote.statut} payment-badge-pop`}
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: isAccepte
                  ? 'radial-gradient(at 0% 0%, rgba(74, 198, 76, 0.18) 0%, transparent 55%)'
                  : isRefuse
                    ? 'radial-gradient(at 0% 0%, rgba(186, 26, 26, 0.16) 0%, transparent 55%)'
                    : 'radial-gradient(at 0% 0%, rgba(37, 68, 176, 0.10) 0%, transparent 55%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <StatusBadge status={quote.statut}>
                  {quote.statut === 'refuse' && quote.client_id ? 'Rejetee par le client' : undefined}
                </StatusBadge>
                {!isEnvoye && (
                  <button
                    type="button"
                    onClick={() => updateStatus('envoye')}
                    className="btn btn-icon"
                    title="Revenir a 'envoye'"
                  >
                    <X size={14} />
                  </button>
                )}
                <div style={{ fontSize: 13, color: 'var(--color-iron)' }}>
                  {isAccepte && 'Le client a accepte ce devis.'}
                  {isRefuse && (quote.client_id
                    ? 'Le client a rejete ce devis.'
                    : 'Devis refuse.')}
                  {isEnvoye && 'En attente de reponse du client.'}
                </div>
              </div>
            </div>

            {isEnvoye && (
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => updateStatus('accepte')}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  <Check size={14} /> Accepté
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus('refuse')}
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                >
                  <X size={14} /> Refusé
                </button>
              </div>
            )}

            {isAccepte && !quote.shipment && (
              <div style={{ marginTop: 18 }}>
                {isPublicQuote ? (
                  <>
                    {!linkData && !showLink && (
                      <button
                        type="button"
                        onClick={generateLink}
                        disabled={linkLoading}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                      >
                        <LinkIcon size={14} /> Generer le lien pour le client
                      </button>
                    )}
                    {(linkData || showLink) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', background: 'var(--color-bg)', border: '1px solid var(--color-ash)', borderRadius: 8, padding: '8px 12px' }}>
                            <input
                              type="text"
                              value={linkData?.url || ''}
                              readOnly
                              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'monospace', fontSize: 13, color: 'var(--color-graphite)' }}
                            />
                            <button
                              type="button"
                              onClick={() => copyToClipboard(linkData?.url)}
                              className="btn btn-icon btn-ghost"
                              style={{ padding: 4 }}
                              title="Copier le lien"
                            >
                              <Copy size={14} color={copySuccess ? 'var(--color-vivid-green)' : 'var(--color-iron)'} />
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={regenerateLink}
                            disabled={linkLoading}
                            className="btn btn-secondary"
                          >
                            <RefreshCw size={14} /> Regenerer le lien
                          </button>
                          <button
                            type="button"
                            onClick={cancelLink}
                            className="btn btn-ghost"
                          >
                            <X size={14} /> Annuler le lien
                          </button>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--color-smoke)', margin: 0 }}>
                          Ce lien expire dans 60 jours. Une fois utilise par le client, il devient invalide.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={`/dashboard/expeditions/nouveau?devisId=${quote.id}`}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    <Package size={14} /> Creer une expedition
                  </Link>
                )}
              </div>
            )}

            {isAccepte && quote.shipment && (
              <div style={{ marginTop: 12, fontSize: 13 }}>
                <span style={{ color: 'var(--color-iron)' }}>Expedition creee: </span>
                <Link
                  to={`/dashboard/expeditions/${quote.shipment.id}`}
                  className="font-mono-data"
                  style={{ fontWeight: 600, color: 'var(--color-primary)' }}
                >
                  {quote.shipment.shipping_number}
                </Link>
              </div>
            )}

            {isRefuse && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-iron)' }}>
                {quote.client_id
                  ? 'Ce devis a ete rejete par le client.'
                  : 'Ce devis a ete refuse.'}
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => updateStatus('envoye')}
                    className="btn btn-ghost"
                  >
                    Annuler le refus
                  </button>
                </div>
              </div>
            )}
          </DataCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16, marginBottom: 24 }}>
        <DataCard title="Client" description={quote.client ? 'Client en compte' : 'Client divers'}>
          <DetailRow label="Nom" value={quote.client_name} />
          <DetailRow label="Email" value={quote.client_email} />
          <DetailRow label="Telephone" value={quote.client_phone} />
          <DetailRow label="Adresse" value={fullAddress || '-'} />
        </DataCard>

        <DataCard title="Destinataire" description="Personne physique ou morale qui recevra le colis.">
          <DetailRow label="Nom" value={quote.recipient_name} />
          <DetailRow label="Entreprise" value={quote.recipient_company} />
          <DetailRow label="Telephone" value={quote.recipient_phone} />
          <DetailRow label="Adresse" value={quote.recipient_address || '-'} />
          <DetailRow label="Ville" value={quote.recipient_city || '-'} />
          <DetailRow label="Code postal" value={quote.recipient_postal_code || '-'} />
          <DetailRow label="Pays" value={quote.recipient_country || '-'} />
        </DataCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16, marginBottom: 24 }}>
        <DataCard title="Colis" description="Caracteristiques du colis a expedier.">
          {quote.colis && quote.colis.length > 0 ? (
            <>
              {quote.colis.map((c, idx) => (
                <div key={idx} style={{ padding: '8px', background: 'var(--color-bg)', borderRadius: 6, border: '1px solid var(--color-border)', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Colis {idx + 1}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
                    {c.type_colis && <span><strong>Type:</strong> {c.type_colis}</span>}
                    {c.nb_pieces && <span><strong>Pièces:</strong> {c.nb_pieces}</span>}
                    {c.poids != null && <span><strong>Poids/pièce:</strong> {c.poids} kg</span>}
                    {c.poids != null && c.nb_pieces && <span><strong>Poids total:</strong> {(c.nb_pieces * c.poids).toFixed(3)} kg</span>}
                    {c.longueur && c.largeur && c.hauteur && (
                      <span><strong>Dimensions:</strong> {c.longueur} x {c.largeur} x {c.hauteur} cm</span>
                    )}
                    {c.longueur && c.largeur && c.hauteur && c.nb_pieces && (
                      <span><strong>Volume total:</strong> {(c.nb_pieces * (c.longueur/100) * (c.largeur/100) * (c.hauteur/100)).toFixed(4)} m³</span>
                    )}
                    {c.description_colis && <span><strong>Description:</strong> {c.description_colis}</span>}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: 16, background: 'var(--color-bg)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>Totaux</h4>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-smoke)', textTransform: 'uppercase' }}>Poids Total</span>
                    <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                      {calculateTotals(quote.colis).totalWeight.toFixed(3)} kg
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-smoke)', textTransform: 'uppercase' }}>Volume Total</span>
                    <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                      {calculateTotals(quote.colis).totalVolume.toFixed(4)} m&sup3;
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-smoke)', textTransform: 'uppercase' }}>Nombre Total de Pièces</span>
                    <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                      {calculateTotals(quote.colis).totalPieces}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <DetailRow label="Type de colis" value={quote.type_colis ? quote.type_colis.replace(/_/g, ' ') : '-'} />
              <DetailRow label="Poids" value={quote.poids ? `${quote.poids} kg` : '-'} />
              <DetailRow label="Dimensions (L x l x H)" value={quote.longueur || quote.largeur || quote.hauteur ? `${quote.longueur || '-'} x ${quote.largeur || '-'} x ${quote.hauteur || '-'} cm` : '-'} />
              <DetailRow label="Nombre de pieces" value={quote.nb_pieces ?? '-'} />
              <DetailRow label="Description" value={quote.description_colis || '-'} />
            </>
          )}
        </DataCard>

        <DataCard title="Service">
          <DetailRow label="Type de service" value={(quote.type_service || '').replace(/_/g, ' ')} />
        </DataCard>
      </div>

      <Card style={{ padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Row label="Montant HT" value={`${formatMoney(quote.montant_ht)} MAD`} />
          <Row label="Montant TTC" value={`${formatMoney(quote.montant_ttc)} MAD`} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 14,
              marginTop: 6,
              borderTop: '1px solid var(--color-ash)',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-graphite)' }}>Total</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--color-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {formatMoney(quote.montant_ttc)} MAD
            </div>
          </div>
        </div>
      </Card>

      {quote.shipment && (
        <div style={{ marginTop: 24 }}>
          <DataCard
            title="Expedition liee"
            description="La requete a donne lieu a une expedition effective."
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <DetailRow label="Numero d''envoi" value={quote.shipment.shipping_number} monospace />
              <Link to={`/dashboard/expeditions/${quote.shipment.id}`} className="btn btn-secondary">
                <ExternalLink size={14} /> Voir l'expedition
              </Link>
            </div>
          </DataCard>
        </div>
      )}

      {quote.client && (
        <div style={{ marginTop: 24 }}>
          <DataCard title="Fiche client" description="Acceder a la fiche complete du client.">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <DetailRow label="Compte" value={quote.client.account_number} monospace />
              <Link to={`/dashboard/clients/${quote.client.id}`} className="btn btn-secondary">
                <ExternalLink size={14} /> Voir le client
              </Link>
            </div>
          </DataCard>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: 'var(--color-iron)' }}>{label}</span>
      <span className="font-mono-data" style={{ color: 'var(--color-graphite)' }}>{value}</span>
    </div>
  );
}
