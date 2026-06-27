import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, ExternalLink, Package } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard, DetailRow } from '../../components/ui/DataCard';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import TruckLoader from '../../components/ui/TruckLoader';
import { useToast } from '../../contexts/ToastContext';
import { useDialog } from '../../contexts/DialogContext';

function formatMoney(value) {
  const n = Number(value || 0);
  return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function ClientQuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const dialog = useDialog();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchQuote = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/my/quotes/${id}`);
      setQuote(data);
    } catch {
      toast.push('Devis introuvable.', 'error');
      navigate('/client/devis');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    const labels = { accepte: 'Accepter', refuse: 'Refuser' };
    const descriptions = {
      accepte: 'Vous confirmez ce devis. Votre demande sera prise en compte.',
      refuse: 'Vous refusez ce devis. Action irreversible.',
    };
    const ok = await dialog.confirm({
      title: `${labels[newStatus]} ce devis ?`,
      description: descriptions[newStatus],
      confirmText: labels[newStatus],
      cancelText: 'Annuler',
      variant: newStatus === 'accepte' ? 'success' : 'danger',
    });
    if (!ok) return;
    setIsActing(true);
    try {
      await api.patch(`/my/quotes/${id}/status`, { statut: newStatus });
      toast.push(`Devis ${newStatus === 'accepte' ? 'accepte' : 'refuse'}.`, 'success');
      fetchQuote();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors du changement de statut.', 'error');
    } finally {
      setIsActing(false);
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
        onClick={() => navigate('/client/devis')}
        className="btn btn-ghost"
        style={{ marginBottom: 12 }}
      >
        <ArrowLeft size={14} /> Retour aux devis
      </button>

      <PageHeader
        eyebrow={quote.created_at ? `Cree le ${new Date(quote.created_at).toLocaleDateString('fr-FR')}` : undefined}
        title={`Devis ${quote.quote_number}`}
        subtitle={
          isAccepte
            ? 'Vous avez accepte ce devis.'
            : isRefuse
              ? 'Vous avez refuse ce devis.'
              : 'Proposition commerciale recue.'
        }
        breadcrumbs={[{ label: 'Devis', to: '/client/devis' }, { label: quote.quote_number }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 16, marginBottom: 24 }}>
        <div className="lg:col-span-2">
          <DataCard title="Origine" description="Contexte de ce devis.">
            {quote.request ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--color-iron)', marginBottom: 4 }}>
                    Depuis une demande de devis
                  </div>
                  <div className="font-mono-data" style={{ fontWeight: 600, color: 'var(--color-graphite)' }}>
                    Demande #{quote.request.id}
                  </div>
                </div>
                <Link
                  to={`/client/devis?tab=demandes&q=${encodeURIComponent('#' + quote.request.id)}`}
                  className="btn btn-secondary"
                  title="Voir la demande"
                >
                  <ExternalLink size={14} /> Voir la demande
                </Link>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--color-iron)' }}>
                Devis emis manuellement.
              </div>
            )}
          </DataCard>
        </div>

        <div>
          <DataCard title="Statut" description="Etat du devis.">
            <div
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
                <div style={{ fontSize: 13, color: 'var(--color-iron)' }}>
                  {isAccepte && 'Vous avez accepte ce devis.'}
                  {isRefuse && 'Vous avez refuse ce devis.'}
                  {isEnvoye && 'En attente de votre reponse.'}
                </div>
              </div>
            </div>

            {isEnvoye && (
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => updateStatus('accepte')}
                  disabled={isActing}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  <Check size={14} /> Accepter
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus('refuse')}
                  disabled={isActing}
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                >
                  <X size={14} /> Refuser
                </button>
              </div>
            )}

            {isAccepte && quote.shipment && (
              <div style={{ marginTop: 18 }}>
                <Link
                  to={`/client/mes-expeditions?focus=${quote.shipment.id}`}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  <Package size={14} /> Voir l'expedition
                </Link>
              </div>
            )}

            {isRefuse && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-iron)' }}>
                Vous avez refuse ce devis. Contactez-nous pour toute precision.
              </div>
            )}
          </DataCard>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DataCard title="Vos coordonnees">
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

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DataCard title="Colis" description="Caracteristiques du colis a expedier.">
          <DetailRow label="Type de colis" value={quote.type_colis ? quote.type_colis.replace(/_/g, ' ') : '-'} />
          <DetailRow label="Poids" value={quote.poids ? `${quote.poids} kg` : '-'} />
          <DetailRow
            label="Dimensions (L x l x H)"
            value={quote.longueur || quote.largeur || quote.hauteur
              ? `${quote.longueur || '-'} x ${quote.largeur || '-'} x ${quote.hauteur || '-'} cm`
              : '-'}
          />
          <DetailRow label="Nombre de pieces" value={quote.nb_pieces ?? '-'} />
          <DetailRow label="Description" value={quote.description_colis || '-'} />
        </DataCard>

        <DataCard title="Service">
          <DetailRow label="Type de service" value={(quote.type_service || '').replace(/_/g, ' ')} />
        </DataCard>
      </div>

      <Card style={{ padding: 24, marginTop: 24 }}>
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
