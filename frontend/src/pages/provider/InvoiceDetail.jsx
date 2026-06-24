import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, X, SquareArrowOutUpRight } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard, DetailRow } from '../../components/ui/DataCard';
import SwipeButton from '../../components/ui/SwipeButton';
import ClientLinkButton from '../../components/ui/ClientLinkButton';
import TruckLoader from '../../components/ui/TruckLoader';
import { useToast } from '../../contexts/ToastContext';

function formatMoney(value) {
  const n = Number(value || 0);
  return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [facture, setFacture] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/invoices/${id}`);
      setFacture(data);
    } catch {
      navigate('/dashboard/factures');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    const { data } = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${facture.numero}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const markAsPaid = async () => {
    try {
      await api.patch(`/invoices/${id}/status`, { statut: 'payee' });
      toast.push('Facture marquée comme payée', 'success');
      fetchInvoice();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors du changement de statut.', 'error');
    }
  };

  const markAsUnpaid = async () => {
    try {
      await api.patch(`/invoices/${id}/status`, { statut: 'impayee' });
      toast.push('Facture marquée comme impayée', 'success');
      fetchInvoice();
    } catch (err) {
      toast.push(err.response?.data?.message || 'Erreur lors du changement de statut.', 'error');
    }
  };

  if (loading) return <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><TruckLoader /></div>;
  if (!facture) return null;

  const isPaid = facture.statut === 'payee';
  const factureType = facture.type_destination === 'national' ? 'National' : 'International';

  return (
    <div>
      <PageHeader
        eyebrow={`Date: ${new Date(facture.date_facture).toLocaleDateString('fr-FR')}`}
        title={`Facture ${facture.numero}`}
        subtitle={`Echeance: ${new Date(facture.date_echeance).toLocaleDateString('fr-FR')}`}
        breadcrumbs={[{ label: 'Factures & Avoirs', to: '/dashboard/factures' }, { label: facture.numero }]}
        actionLabel={facture.avoir ? 'Telecharger Facture' : 'Telecharger PDF'}
        onAction={downloadPdf}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 16, marginBottom: 24 }}>
        <div className="lg:col-span-2">
          <DataCard
            title="Client"
            description={facture.client ? 'Client en compte' : 'Client divers (sans compte)'}
          >
            {facture.client && (
              <ClientLinkButton
                clientId={facture.client.id}
                style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}
              />
            )}
            {facture.client ? (
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                <DetailRow label="Nom" value={facture.client.full_name} />
                <DetailRow label="Compte" value={facture.client.account_number} monospace />
                <DetailRow label="Adresse" value={facture.client.address} />
                <DetailRow label="Ville" value={`${facture.client.postal_code || ''} ${facture.client.city || ''}`} />
                <DetailRow label="ICE" value={facture.client.ice} />
                <DetailRow label="Email" value={facture.client.email} />
                <DetailRow label="Telephone" value={facture.client.phone} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                <DetailRow label="Nom" value={facture.client_divers_nom} />
                <DetailRow label="Adresse" value={facture.client_divers_adresse} />
                <DetailRow label="Telephone" value={facture.client_divers_tel} />
                <DetailRow label="Email" value={facture.client_divers_email} />
              </div>
            )}
          </DataCard>
        </div>

        <div>
          <DataCard title="Paiement" description="Statut et reglement de cette facture.">
            <div
              className={`${isPaid ? 'payment-status-paid' : 'payment-status-unpaid'} payment-badge-pop`}
              style={{
                marginBottom: 18,
                padding: '14px 16px',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                backgroundImage: isPaid
                  ? 'radial-gradient(at 0% 0%, rgba(74, 198, 76, 0.05) 0%, transparent 55%)'
                  : 'radial-gradient(at 0% 0%, rgba(186, 26, 26, 0.04) 0%, transparent 55%)',
              }}
            >
              {isPaid ? (
                <>
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 9999,
                      background: 'rgba(74, 198, 76, 0.2)',
                      color: 'var(--color-vivid-green-dark)',
                    }}
                  >
                    <Check size={24} strokeWidth={2.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--color-vivid-green-dark)',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                      }}
                    >
                      Payée
                    </div>
                    {facture.date_paiement && (
                      <div style={{ fontSize: 12, color: 'var(--color-iron)', marginTop: 2 }}>
                        Reglee le {new Date(facture.date_paiement).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 9999,
                      background: 'rgba(186, 26, 26, 0.12)',
                      color: 'var(--color-danger)',
                    }}
                  >
                    <X size={24} strokeWidth={2.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--color-danger)',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                      }}
                    >
                      Impayée
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-iron)', marginTop: 2 }}>
                      En attente de reglement
                    </div>
                  </div>
                </>
              )}
            </div>

            {isPaid ? (
              <button
                onClick={markAsUnpaid}
                className="btn btn-danger"
                style={{ width: '100%' }}
              >
                <X size={14} /> Marquer comme Impayée
              </button>
            ) : (
              <SwipeButton
                onConfirm={markAsPaid}
                trackText="Marquer comme payée"
                confirmText=""
                completedText="Paiement enregistre"
                height={56}
                threshold={0.7}
                ariaLabel="Glisser pour confirmer le paiement"
              />
            )}
          </DataCard>

          {facture.avoir && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--color-paper-white)',
                border: '1px solid var(--color-ash)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                color: 'var(--color-danger)',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--color-danger)',
                }}
              >
                Il existe un Avoir sur cette facture
              </span>
              <Link
                to="/dashboard/factures?tab=avoirs"
                className="btn-icon"
                aria-label="Voir l'avoir"
                title="Voir l'avoir"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  color: 'var(--color-danger)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                }}
              >
                <SquareArrowOutUpRight size={22} />
              </Link>
            </div>
          )}

          <div
            style={{
              marginTop: 10,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--color-paper-white)',
              border: '1px solid var(--color-ash)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--color-steel)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Type Facture
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-graphite)' }}>
              {factureType}
            </span>
          </div>
        </div>
      </div>

      <DataCard title="Resume fiscal" description="Calculs TVA et total TTC.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FiscalRow label="Non taxable" value={`${formatMoney(facture.non_taxable)} MAD`} />
          <FiscalRow label="Taxable" value={`${formatMoney(facture.taxable)} MAD`} />
          <FiscalRow label={`TVA (${Number(facture.taux_tva).toFixed(2)}%)`} value={`${formatMoney(facture.tva)} MAD`} />
          <div
            className="flex items-center justify-between"
            style={{
              paddingTop: 14, marginTop: 6,
              borderTop: '1px solid var(--color-ash)',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-graphite)' }}>Total TTC</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-primary)', letterSpacing: '-0.01em' }}>
              {formatMoney(facture.ttc)} MAD
            </div>
          </div>
        </div>
      </DataCard>

      <div style={{ marginTop: 16, marginBottom: 24 }}>
        <DataCard title={`Expeditions (${facture.expeditions?.length || 0})`} description="Liste des expeditions liees a cette facture.">
          <table className="table-clean">
            <thead>
              <tr>
                <th>N° d'envoi</th>
                <th>Destinataire</th>
                <th>Service</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {(facture.expeditions || []).map((e) => (
                <tr key={e.id}>
                  <td className="font-mono-data" style={{ color: 'var(--color-primary)' }}>
                    <Link to={`/dashboard/expeditions/${e.id}`} style={{ color: 'inherit' }}>{e.shipping_number}</Link>
                  </td>
                  <td>
                    <div>{e.recipient_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-steel)' }}>{e.recipient_city}, {e.recipient_country}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{(e.type_service || '').replace(/_/g, ' ')}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(e.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataCard>
      </div>

      {facture.avoir ? (
        <div
          style={{
            padding: 16,
            background: 'var(--color-success-container)',
            border: '1px solid var(--color-ash)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>Avoir lie: {facture.avoir.numero}</div>
            <div style={{ fontSize: 13, color: 'var(--color-steel)' }}>TTC: - {formatMoney(Math.abs(facture.avoir.ttc))} MAD</div>
          </div>
        </div>
      ) : (
        <Link to={`/dashboard/avoirs/nouveau?facture_id=${facture.id}`} className="btn btn-primary">
          Creer un Avoir pour cette facture
        </Link>
      )}
    </div>
  );
}

function FiscalRow({ label, value }) {
  return (
    <div className="flex items-center justify-between" style={{ fontSize: 14 }}>
      <span style={{ color: 'var(--color-iron)' }}>{label}</span>
      <span className="font-mono-data" style={{ color: 'var(--color-graphite)' }}>{value}</span>
    </div>
  );
}
