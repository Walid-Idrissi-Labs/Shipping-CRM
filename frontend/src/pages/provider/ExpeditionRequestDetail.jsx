import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, Package, ExternalLink, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard, DetailRow } from '../../components/ui/DataCard';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Skeleton from '../../components/ui/Skeleton';
import TruckLoader from '../../components/ui/TruckLoader';
import { useToast } from '../../contexts/ToastContext';
import { useDialog } from '../../contexts/DialogContext';

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

export default function ExpeditionRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const dialog = useDialog();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchRequest = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/expedition-requests/${id}`);
      setRequest(data);
    } catch {
      toast.push('Demande introuvable.', 'error');
      navigate('/dashboard/demandes-expedition');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    const confirmed = await dialog.confirm({
      title: 'Confirmer l\'acceptation',
      message: 'Cela va creer une nouvelle expedition avec les informations fournies. Voulez-vous continuer ?',
      confirmLabel: 'Accepter et creer l\'expedition',
      confirmColor: 'var(--color-vivid-green-dark)',
      cancelLabel: 'Annuler',
    });

    if (!confirmed) return;

    setActionLoading(true);
    try {
      const { data } = await api.post(`/expedition-requests/${id}/accept`);
      toast.push('Expedition creee avec succes.', 'success');
      navigate(`/dashboard/expeditions/${data.shipment.id}`);
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors de la creation.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const confirmed = await dialog.confirm({
      title: 'Confirmer le refus',
      message: 'Cette action marquera la demande comme refusee. Le client ne pourra plus utiliser son lien.',
      confirmLabel: 'Refuser',
      confirmColor: 'var(--color-danger)',
      cancelLabel: 'Annuler',
    });

    if (!confirmed) return;

    setActionLoading(true);
    try {
      await api.post(`/expedition-requests/${id}/reject`);
      toast.push('Demande refusee.', 'success');
      fetchRequest();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors du refus.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1080, display: 'flex', justifyContent: 'center', padding: 32 }}>
        <TruckLoader />
      </div>
    );
  }

  if (!request) return null;

  const isEnAttente = request.statut === 'en_attente';
  const isAcceptee = request.statut === 'acceptee';
  const isRefusee = request.statut === 'refusee';

  const fullSenderAddress = [
    request.sender_address,
    [request.sender_postal_code, request.sender_city].filter(Boolean).join(' '),
    request.sender_country,
  ].filter(Boolean).join(', ');

  const fullRecipientAddress = [
    request.recipient_address,
    [request.recipient_postal_code, request.recipient_city].filter(Boolean).join(' '),
    request.recipient_country,
  ].filter(Boolean).join(', ');

  return (
    <div style={{ maxWidth: 1080 }}>
      <button
        type="button"
        onClick={() => navigate('/dashboard/demandes-expedition')}
        className="btn btn-ghost"
        style={{ marginBottom: 12 }}
      >
        <ArrowLeft size={14} /> Retour aux demandes
      </button>

      <PageHeader
        eyebrow={request.created_at ? `Recue le ${new Date(request.created_at).toLocaleDateString('fr-FR')}` : undefined}
        title={`Demande d'Expedition #${request.id}`}
        subtitle={isEnAttente
          ? 'En attente de votre decision'
          : isAcceptee
            ? 'Expedition creee'
            : 'Demande refusee'}
        breadcrumbs={[{ label: 'Demandes d\'Expedition', to: '/dashboard/demandes-expedition' }, { label: `Demande #${request.id}` }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 16, marginBottom: 24 }}>
        <div className="lg:col-span-2">
          <DataCard title="Origine" description="Devis associe a cette demande.">
            {request.quote ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--color-iron)', marginBottom: 4 }}>Devis lie</div>
                  <div className="font-mono-data" style={{ fontWeight: 600, color: 'var(--color-graphite)' }}>
                    {request.quote.quote_number}
                  </div>
                </div>
                <Link to={`/dashboard/devis/${request.quote.id}`} className="btn btn-secondary" title="Voir le devis">
                  <ExternalLink size={14} /> Voir le devis
                </Link>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--color-iron)' }}>
                Aucun devis associe.
              </div>
            )}
          </DataCard>
        </div>

        <div>
          <DataCard title="Statut" description="Etat de la demande.">
            <div
              className={`payment-status-${request.statut} payment-badge-pop`}
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: isAcceptee
                  ? 'radial-gradient(at 0% 0%, rgba(74, 198, 76, 0.18) 0%, transparent 55%)'
                  : isRefusee
                    ? 'radial-gradient(at 0% 0%, rgba(186, 26, 26, 0.16) 0%, transparent 55%)'
                    : 'radial-gradient(at 0% 0%, rgba(37, 68, 176, 0.10) 0%, transparent 55%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <StatusBadge status={request.statut}>
                  {request.statut === 'en_attente' && 'En attente'}
                  {request.statut === 'acceptee' && 'Acceptee'}
                  {request.statut === 'refusee' && 'Refusee'}
                </StatusBadge>
                <div style={{ fontSize: 13, color: 'var(--color-iron)' }}>
                  {isEnAttente && 'Le client a soumis cette demande. Vous pouvez l\'accepter ou la refuser.'}
                  {isAcceptee && 'Cette demande a ete acceptee et a generee une expedition.'}
                  {isRefusee && 'Cette demande a ete refusee.'}
                </div>
              </div>
            </div>

            {isEnAttente && (
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={actionLoading}
                  className="btn"
                  style={{ flex: 1, background: 'var(--color-vivid-green-dark)', borderColor: 'var(--color-vivid-green-dark)', color: 'white' }}
                >
                  <CheckCircle size={14} /> Accepter
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                >
                  <XCircle size={14} /> Refuser
                </button>
              </div>
            )}
          </DataCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16, marginBottom: 24 }}>
        <DataCard title="Expediteur" description="Informations de l'expediteur fournies par le client.">
          <DetailRow label="Nom" value={request.sender_name} />
          <DetailRow label="Entreprise" value={request.sender_company || '-'} />
          <DetailRow label="Email" value={request.sender_email || '-'} />
          <DetailRow label="Telephone" value={request.sender_phone || '-'} />
          <DetailRow label="Adresse" value={fullSenderAddress || '-'} />
        </DataCard>

        <DataCard title="Destinataire" description="Informations du destinataire.">
          <DetailRow label="Nom" value={request.recipient_name} />
          <DetailRow label="Entreprise" value={request.recipient_company || '-'} />
          <DetailRow label="Telephone" value={request.recipient_phone || '-'} />
          <DetailRow label="Email" value={request.recipient_email || '-'} />
          <DetailRow label="Adresse" value={fullRecipientAddress || '-'} />
        </DataCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16, marginBottom: 24 }}>
        <DataCard title="Colis" description="Caracteristiques des colis a expedier.">
          {request.colis && request.colis.length > 0 ? (
            <>
              {request.colis.map((c, idx) => (
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
                      {calculateTotals(request.colis).totalWeight.toFixed(3)} kg
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-smoke)', textTransform: 'uppercase' }}>Volume Total</span>
                    <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                      {calculateTotals(request.colis).totalVolume.toFixed(4)} m&sup3;
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-smoke)', textTransform: 'uppercase' }}>Nombre Total de Pièces</span>
                    <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                      {calculateTotals(request.colis).totalPieces}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--color-iron)', fontSize: 13 }}>Aucun colis specifie.</div>
          )}
        </DataCard>

        <DataCard title="Service & Valeur" description="Type de service et valeur declaree.">
          <DetailRow label="Type de service" value={(request.type_service || '').replace(/_/g, ' ')} />
          <DetailRow label="Valeur Totale Declaree" value={request.valeur_declaree ? `${formatMoney(request.valeur_declaree)} ${request.devise_valeur || 'MAD'}` : 'Non specifiee'} />
        </DataCard>
      </div>

      {request.quote && request.quote.montant_ttc && (
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Row label="Montant HT du devis" value={`${formatMoney(request.quote.montant_ht)} MAD`} />
            <Row label="Montant TTC du devis" value={`${formatMoney(request.quote.montant_ttc)} MAD`} />
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
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-graphite)' }}>Total Devis</div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  letterSpacing: '-0.01em',
                }}
              >
                {formatMoney(request.quote.montant_ttc)} MAD
              </div>
            </div>
          </div>
        </Card>
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