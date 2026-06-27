import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, FileDown, X, CalendarDays } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard, DetailRow } from '../../components/ui/DataCard';
import Card from '../../components/ui/Card';
import TruckLoader from '../../components/ui/TruckLoader';
import { useToast } from '../../contexts/ToastContext';

function formatMoney(value) {
  const n = Number(value || 0);
  return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getDaysLeft(dateEcheance) {
  if (!dateEcheance) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const echeance = new Date(dateEcheance);
  echeance.setHours(0, 0, 0, 0);
  const diffMs = echeance.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getDaysLeftInfo(daysLeft) {
  if (daysLeft === null) return { label: '-', variant: 'neutral' };
  if (daysLeft < 0) return { label: `Retard de ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''}`, variant: 'overdue' };
  if (daysLeft === 0) return { label: 'Echéance aujourd\'hui', variant: 'urgent' };
  if (daysLeft <= 3) return { label: `Expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`, variant: 'urgent' };
  if (daysLeft <= 7) return { label: `Reste ${daysLeft} jours`, variant: 'warning' };
  return { label: `Reste ${daysLeft} jours`, variant: 'ok' };
}

export default function ClientInvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [facture, setFacture] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/my/invoices/${id}`);
      setFacture(data);
    } catch {
      toast.push('Facture introuvable.', 'error');
      navigate('/client/mes-factures');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    try {
      const { data } = await api.get(`/my/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${facture.numero || `FA ${facture.numero_n}/${facture.annee}`}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.push('Erreur lors du telechargement du PDF.', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1080, display: 'flex', justifyContent: 'center', padding: 32 }}>
        <TruckLoader />
      </div>
    );
  }

  if (!facture) return null;

  const isPaid = facture.statut === 'payee';
  const totalTtc = Number(facture.ttc || 0);

  return (
    <div style={{ maxWidth: 1080 }}>
      <button
        type="button"
        onClick={() => navigate('/client/mes-factures')}
        className="btn btn-ghost"
        style={{ marginBottom: 12 }}
      >
        <ArrowLeft size={14} /> Retour aux factures
      </button>

      <PageHeader
        title={`Facture ${facture.numero || `FA ${facture.numero_n}/${facture.annee}`}`}
        breadcrumbs={[
          { label: 'Mes Factures', to: '/client/mes-factures' },
          { label: facture.numero || `FA ${facture.numero_n}/${facture.annee}` },
        ]}
        actionLabel="Telecharger PDF"
        onAction={downloadPdf}
        actionIcon={FileDown}
      />

      <DateBanner
        dateFacture={facture.date_facture}
        dateEcheance={facture.date_echeance}
        isPaid={isPaid}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 16, marginBottom: 24 }}>
        <div className="lg:col-span-2">
          <DataCard title="Details de la facture">
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
              <DetailRow label="Numero" value={facture.numero || `FA ${facture.numero_n}/${facture.annee}`} monospace />
              <DetailRow label="Type" value={facture.type_destination === 'national' ? 'National' : 'International'} />
              <DetailRow label="Statut" value={isPaid ? 'Payee' : 'Impayee'} />
            </div>
          </DataCard>
        </div>

        <div>
          <DataCard title="Paiement" description="Statut de cette facture.">
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
                      Payee
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
                      Impayee
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-iron)', marginTop: 2 }}>
                      En attente de reglement
                    </div>
                  </div>
                </>
              )}
            </div>
          </DataCard>
        </div>
      </div>

      <Card style={{ padding: 24, marginTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <RowSet label="Montant HT" value={`${formatMoney(facture.taxable)} MAD`} />
          <RowSet label="Montant TVA" value={`${formatMoney(facture.tva)} MAD`} />
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
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-graphite)' }}>Total TTC</div>
            <div
              style={{
                fontSize: totalTtc > 0 ? 24 : 16,
                fontWeight: 700,
                color: 'var(--color-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {totalTtc > 0 ? `${formatMoney(totalTtc)} MAD` : '-'}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 24 }}>
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
                <tr
                  key={e.id}
                  onClick={() => navigate(`/client/mes-expeditions/${e.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="font-mono-data" style={{ color: 'var(--color-primary)' }}>
                    {e.shipping_number}
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
    </div>
  );
}

function RowSet({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: 'var(--color-iron)' }}>{label}</span>
      <span className="font-mono-data" style={{ color: 'var(--color-graphite)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function DateBanner({ dateFacture, dateEcheance, isPaid }) {
  const daysLeft = getDaysLeft(dateEcheance);
  const daysInfo = getDaysLeftInfo(daysLeft);

  const variantStyles = {
    overdue: {
      bg: 'var(--color-danger-container)',
      text: 'var(--color-danger)',
      iconBg: 'rgba(186, 26, 26, 0.12)',
    },
    urgent: {
      bg: 'var(--color-warning-container)',
      text: 'var(--color-warning)',
      iconBg: 'rgba(249, 115, 22, 0.12)',
    },
    warning: {
      bg: 'var(--color-warning-container)',
      text: 'var(--color-warning)',
      iconBg: 'rgba(249, 115, 22, 0.12)',
    },
    ok: {
      bg: 'var(--color-success-container)',
      text: 'var(--color-vivid-green-dark)',
      iconBg: 'rgba(74, 198, 76, 0.12)',
    },
    neutral: {
      bg: 'var(--color-fog)',
      text: 'var(--color-steel)',
      iconBg: 'var(--color-ash)',
    },
  };

  const style = variantStyles[daysInfo.variant];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr auto',
        gap: 16,
        alignItems: 'center',
        marginBottom: 16,
        padding: '18px 20px',
        borderRadius: 14,
        background: 'var(--color-paper-white)',
        border: '1px solid var(--color-mist)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-steel)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Date de facture
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-graphite)' }}>
          {formatDate(dateFacture)}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-steel)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Date d'échéance
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: isPaid ? 'var(--color-vivid-green-dark)' : 'var(--color-graphite)' }}>
          {formatDate(dateEcheance)}
        </div>
        {isPaid && (
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-vivid-green-dark)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Check size={12} strokeWidth={2.5} /> Payée
          </div>
        )}
      </div>

      {!isPaid && daysLeft !== null && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 9999,
            background: style.bg,
            border: `1px solid ${style.text}20`,
            justifySelf: 'end',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9999,
              background: style.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CalendarDays size={16} strokeWidth={2.5} style={{ color: style.text }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: style.text, whiteSpace: 'nowrap' }}>
            {daysInfo.label}
          </div>
        </div>
      )}
    </div>
  );
}
