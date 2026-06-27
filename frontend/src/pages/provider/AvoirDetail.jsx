import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileDown, SquareArrowOutUpRight } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import { DataCard, DetailRow } from '../../components/ui/DataCard';
import TruckLoader from '../../components/ui/TruckLoader';
import ClientLinkButton from '../../components/ui/ClientLinkButton';

function formatMoney(value) {
  const n = Number(Math.abs(value || 0));
  return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function AvoirDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [avoir, setAvoir] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvoir();
  }, [id]);

  const fetchAvoir = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/credit-notes/${id}`);
      setAvoir(data);
    } catch {
      navigate('/dashboard/factures?tab=avoirs');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    try {
      const { data } = await api.get(`/credit-notes/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${avoir.numero}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      navigate('/dashboard/factures?tab=avoirs');
    }
  };

  if (loading) return <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><TruckLoader /></div>;
  if (!avoir) return null;

  const avoirType = avoir.type_destination === 'national' ? 'National' : 'International';
  const linkedFacture = avoir.facture;

  return (
    <div>
      <PageHeader
        eyebrow={`Avoir emis`}
        title={`Avoir ${avoir.numero}`}
        subtitle={`Type: ${avoirType}`}
        breadcrumbs={[
          { label: 'Factures & Avoirs', to: '/dashboard/factures?tab=avoirs' },
          { label: avoir.numero },
        ]}
        actionLabel="Telecharger PDF"
        onAction={downloadPdf}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 16, marginBottom: 24 }}>
        <div className="lg:col-span-2">
          <DataCard
            title="Client"
            description="Client concerne par cet avoir."
          >
            {avoir.client && (
              <ClientLinkButton
                clientId={avoir.client.id}
                style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}
              />
            )}
            {avoir.client ? (
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                <DetailRow label="Nom" value={avoir.client.full_name} />
                <DetailRow label="Compte" value={avoir.client.account_number} monospace />
                <DetailRow label="Adresse" value={avoir.client.address} />
                <DetailRow label="Ville" value={`${avoir.client.postal_code || ''} ${avoir.client.city || ''}`} />
                <DetailRow label="ICE" value={avoir.client.ice} />
                <DetailRow label="Email" value={avoir.client.email} />
                <DetailRow label="Telephone" value={avoir.client.phone} />
              </div>
            ) : (
              <div style={{ color: 'var(--color-steel)', fontStyle: 'italic' }}>
                Client divers — sans compte client associe.
              </div>
            )}
          </DataCard>
        </div>

        <div>
          <DataCard title="Origine" description="Facture d'origine a laquelle cet avoir est rattache.">
            {linkedFacture ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div
                  className="flex items-center justify-between"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--color-paper-white)',
                    border: '1px solid var(--color-ash)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: 'var(--color-steel)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Facture d'origine
                    </div>
                    <div
                      className="font-mono-data"
                      style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-primary)', marginTop: 2 }}
                    >
                      {linkedFacture.numero}
                    </div>
                  </div>
                  <Link
                    to={`/dashboard/factures/${linkedFacture.id}`}
                    className="btn-icon"
                    aria-label="Voir la facture"
                    title="Voir la facture"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      background: 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SquareArrowOutUpRight size={22} />
                  </Link>
                </div>

                {linkedFacture.date_facture && (
                  <DetailRow
                    label="Date de la facture"
                    value={new Date(linkedFacture.date_facture).toLocaleDateString('fr-FR')}
                  />
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--color-steel)', fontStyle: 'italic' }}>
                Facture d'origine introuvable.
              </div>
            )}
          </DataCard>
        </div>
      </div>

      <DataCard title="Resume fiscal" description="Calculs TVA et montant de l'avoir (valeurs negatives).">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FiscalRow label="Non taxable" value={`- ${formatMoney(avoir.non_taxable)} MAD`} />
          <FiscalRow label="Taxable" value={`- ${formatMoney(avoir.taxable)} MAD`} />
          <FiscalRow
            label={`TVA (${Number(avoir.taux_tva).toFixed(2)}%)`}
            value={`- ${formatMoney(avoir.tva)} MAD`}
          />
          <div
            className="flex items-center justify-between"
            style={{
              paddingTop: 14,
              marginTop: 6,
              borderTop: '1px solid var(--color-ash)',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-graphite)' }}>
              Total Avoir
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: 'var(--color-danger)',
                letterSpacing: '-0.01em',
              }}
            >
              - {formatMoney(avoir.ttc)} MAD
            </div>
          </div>
        </div>
      </DataCard>

      <div style={{ marginTop: 16 }}>
        <Link
          to="/dashboard/factures?tab=avoirs"
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={14} />
          Retour aux avoirs
        </Link>
      </div>
    </div>
  );
}

function FiscalRow({ label, value }) {
  return (
    <div className="flex items-center justify-between" style={{ fontSize: 14 }}>
      <span style={{ color: 'var(--color-iron)' }}>{label}</span>
      <span className="font-mono-data" style={{ color: 'var(--color-danger)' }}>{value}</span>
    </div>
  );
}
