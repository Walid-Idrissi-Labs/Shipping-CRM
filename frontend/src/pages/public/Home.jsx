import { Link } from 'react-router-dom';
import { Truck, FileText, Search, UserPlus, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div>
      <div className="mx-auto" style={{ maxWidth: 1200, padding: '80px 24px' }}>
        <div className="text-center" style={{ maxWidth: 760, margin: '0 auto' }}>
          <div
            className="inline-block mb-5"
            style={{
              fontSize: 12, fontWeight: 500, color: 'var(--color-steel)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}
          >
            CRM Logistique
          </div>
          <h1 className="display-headline" style={{ marginBottom: 24 }}>
            Expediez, suivez et gerez vos factures en un seul endroit.
          </h1>
          <p
            style={{
              fontSize: 17, color: 'var(--color-iron)', lineHeight: 1.6,
              marginBottom: 40, maxWidth: 600, margin: '0 auto 40px',
            }}
          >
            Plateforme complete pour les prestataires logistiques: devis express, expeditions, facturation, flotte et equipe terrain, dans une seule interface claire et precise.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/devis-express" className="btn btn-primary">
              Demander un Devis Express
              <ArrowRight size={16} />
            </Link>
            <Link to="/suivi" className="btn btn-secondary">
              <Search size={16} />
              Suivre un Colis
            </Link>
          </div>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          style={{ gap: 16, marginTop: 80 }}
        >
          <FeatureCard
            icon={FileText}
            title="Devis Express"
            description="Obtenez rapidement une proposition commerciale pour vos expeditions nationales et internationales."
            to="/devis-express"
          />
          <FeatureCard
            icon={Search}
            title="Suivi en temps reel"
            description="Suivez chaque colis a chaque etape, sans compte requis, a partir d'un simple numero d'envoi."
            to="/suivi"
          />
          <FeatureCard
            icon={Truck}
            title="Connexion"
            description="Accedez a vos expeditions, factures et documents depuis un tableau de bord dedie."
            to="/login"
          />
          <FeatureCard
            icon={UserPlus}
            title="Demande de Compte"
            description="Ouvrez un compte client en quelques minutes et beneficiez de tarifs et services personnalises."
            to="/demande-compte"
          />
        </div>


      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, to }) {
  return (
    <Link
      to={to}
      className="block surface-canvas animate-fade-in-up"
      style={{
        background: 'var(--color-paper-white)',
        border: '1px solid var(--color-ash)',
        borderRadius: 12,
        padding: 24,
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 150ms ease, transform 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-mist)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-ash)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <Icon size={24} color="var(--color-graphite)" style={{ marginBottom: 16 }} />
      <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-graphite)', marginBottom: 8 }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--color-steel)', lineHeight: 1.5 }}>{description}</p>
    </Link>
  );
}
