import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, Package, ExternalLink } from 'lucide-react';
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

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

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
            ? 'Devis refuse par le client.'
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
                <Link to={`/dashboard/demandes-devis`} className="btn btn-secondary" title="Voir la demande">
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
                <StatusBadge status={quote.statut} />
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
                  {isRefuse && 'Le client a refuse ce devis.'}
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
                <Link
                  to={`/dashboard/expeditions/nouveau?devisId=${quote.id}`}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  <Package size={14} /> Creer une expedition
                </Link>
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
                Ce devis a ete refuse.
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
          <DetailRow label="Adresse" value={recipientFullAddress || '-'} />
        </DataCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16, marginBottom: 24 }}>
        <DataCard title="Colis" description="Caracteristiques du colis a expedier.">
          <DetailRow label="Type de colis" value={quote.type_colis ? quote.type_colis.replace(/_/g, ' ') : '-'} />
          <DetailRow label="Poids" value={quote.poids ? `${quote.poids} kg` : '-'} />
          <DetailRow label="Dimensions (L x l x H)" value={quote.longueur || quote.largeur || quote.hauteur ? `${quote.longueur || '-'} x ${quote.largeur || '-'} x ${quote.hauteur || '-'} cm` : '-'} />
          <DetailRow label="Nombre de pieces" value={quote.nb_pieces ?? '-'} />
          <DetailRow label="Description" value={quote.description_colis || '-'} />
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
