import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Plane,
  Truck,
  Ship,
  Target,
  Layers,
  PiggyBank,
  ShieldCheck,
  Timer,
  Handshake,
  Zap,
  Award,
  Heart,
  Globe2,
} from 'lucide-react';

export default function QuiSommesNous() {
  const revealRef = useRef(null);

  useEffect(() => {
    const root = revealRef.current;
    if (!root) return undefined;
    const targets = root.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-revealed'));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={revealRef} className="ab-root lp-root">
      <style>{`
        .ab-root {
          --font-serif: 'Fraunces', var(--font-display), ui-serif, Georgia, serif;
          font-family: var(--font-sans);
          color: var(--color-iron);
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
          overflow-x: clip;
        }
        .ab-root .lp-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

        .ab-root .ab-eyebrow {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-steel);
          margin-bottom: 16px;
        }
        .ab-root .ab-serif {
          font-family: var(--font-serif);
          font-weight: 340;
          color: var(--color-graphite);
          letter-spacing: -0.02em;
          line-height: 1.05;
          font-optical-sizing: auto;
        }
        .ab-root .ab-serif em { font-style: italic; font-weight: 400; color: var(--color-primary); }

        .ab-root .ab-section { padding: 88px 0; position: relative; }
        .ab-root .ab-section-head { max-width: 680px; margin: 0 0 48px; }
        .ab-root .ab-section-head.is-center { margin-left: auto; margin-right: auto; text-align: center; }
        .ab-root .ab-section-title {
          font-family: var(--font-serif);
          font-weight: 340;
          font-size: 42px;
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: var(--color-graphite);
          font-optical-sizing: auto;
          margin: 0;
        }
        .ab-root .ab-section-sub {
          margin-top: 16px;
          font-size: 17px;
          line-height: 1.6;
          color: var(--color-steel);
        }

        /* ---------- HERO ---------- */
        .ab-hero {
          position: relative;
          overflow: clip;
          padding: 96px 0 80px;
          border-bottom: 1px solid var(--color-ash);
          background:
            radial-gradient(ellipse 60% 55% at 84% 6%, rgba(74, 198, 76, 0.07), transparent 62%),
            radial-gradient(ellipse 72% 60% at 6% 0%, rgba(37, 68, 176, 0.10), transparent 58%),
            var(--color-paper-white);
        }
        .ab-hero-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 56px;
          align-items: center;
        }
        .ab-hero h1 {
          font-family: var(--font-serif);
          font-weight: 340;
          font-size: 56px;
          line-height: 1.03;
          letter-spacing: -0.025em;
          color: var(--color-graphite);
          margin: 0;
          font-optical-sizing: auto;
        }
        .ab-hero h1 em { font-style: italic; font-weight: 400; color: var(--color-primary); }
        .ab-hero-lead {
          margin: 24px 0 0;
          font-size: 18px;
          line-height: 1.6;
          color: var(--color-steel);
          max-width: 540px;
        }
        .ab-hero-actions { margin-top: 32px; display: flex; flex-wrap: wrap; gap: 12px; }

        /* Hero side stat panel */
        .ab-hero-panel {
          justify-self: end;
          width: 100%;
          max-width: 400px;
          background: var(--color-paper-white);
          border: 1px solid var(--color-ash);
          border-radius: 16px;
          padding: 8px;
          box-shadow:
            rgb(239, 239, 239) 0 0 0 1px,
            rgba(0, 0, 0, 0.02) 0 22px 40px 0,
            rgba(0, 0, 0, 0.05) 0 12px 20px 0,
            rgba(0, 0, 0, 0.06) 0 4px 8px 0;
        }
        .ab-hero-stat {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 16px;
          border-radius: 12px;
        }
        .ab-hero-stat + .ab-hero-stat { border-top: 1px solid var(--color-ash); }
        .ab-hero-stat-ico {
          flex-shrink: 0;
          width: 46px;
          height: 46px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary-wash);
          color: var(--color-primary);
        }
        .ab-hero-stat-num {
          font-family: var(--font-serif);
          font-weight: 380;
          font-size: 26px;
          line-height: 1;
          color: var(--color-graphite);
          letter-spacing: -0.02em;
        }
        .ab-hero-stat-label { font-size: 13.5px; color: var(--color-steel); margin-top: 4px; }

        /* ---------- PRESENTATION (split) ---------- */
        .ab-split { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        .ab-split-copy p {
          font-size: 16px;
          line-height: 1.7;
          color: var(--color-steel);
          margin: 0 0 18px;
        }
        .ab-split-copy p strong { color: var(--color-slate); font-weight: 600; }
        .ab-modes { display: grid; grid-template-columns: 1fr; gap: 14px; }
        .ab-mode {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 22px 24px;
          background: var(--color-paper-white);
          border: 1px solid var(--color-ash);
          border-radius: 14px;
          transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
        }
        .ab-mode:hover {
          transform: translateY(-2px);
          border-color: var(--color-mist);
          box-shadow: rgba(0, 0, 0, 0.05) 0 14px 28px -14px;
        }
        .ab-mode-ico {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(74, 198, 76, 0.12);
          color: var(--color-vivid-green-dark);
        }
        .ab-mode h4 { font-size: 16px; font-weight: 600; color: var(--color-graphite); margin: 0 0 3px; }
        .ab-mode p { font-size: 14px; color: var(--color-steel); margin: 0; line-height: 1.5; }

        /* ---------- MISSION / STRATEGY duo ---------- */
        .ab-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .ab-pillar {
          padding: 36px;
          border: 1px solid var(--color-ash);
          border-radius: 18px;
          background: var(--color-paper-white);
        }
        .ab-pillar-ico {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary-wash);
          color: var(--color-primary);
          margin-bottom: 22px;
        }
        .ab-pillar h3 {
          font-family: var(--font-serif);
          font-weight: 360;
          font-size: 26px;
          letter-spacing: -0.015em;
          color: var(--color-graphite);
          margin: 0 0 14px;
        }
        .ab-pillar-quote {
          font-size: 16.5px;
          line-height: 1.6;
          color: var(--color-slate);
          margin: 0 0 18px;
        }
        .ab-pillar ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
        .ab-pillar li {
          display: flex;
          gap: 12px;
          font-size: 15px;
          line-height: 1.5;
          color: var(--color-steel);
        }
        .ab-pillar li::before {
          content: '';
          flex-shrink: 0;
          width: 7px;
          height: 7px;
          margin-top: 8px;
          border-radius: 50%;
          background: var(--color-vivid-green);
        }

        /* ---------- WHY (3 cards) ---------- */
        .ab-why { background: var(--color-bone); border-top: 1px solid var(--color-ash); }
        .ab-why-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
        .ab-why-card {
          padding: 32px 28px;
          background: var(--color-paper-white);
          border: 1px solid var(--color-ash);
          border-radius: 16px;
          transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
        }
        .ab-why-card:hover {
          transform: translateY(-3px);
          border-color: var(--color-mist);
          box-shadow: rgba(0, 0, 0, 0.06) 0 18px 34px -16px;
        }
        .ab-why-ico {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary-wash);
          color: var(--color-primary);
          margin-bottom: 20px;
        }
        .ab-why-metric {
          font-family: var(--font-serif);
          font-weight: 380;
          font-size: 34px;
          line-height: 1;
          letter-spacing: -0.02em;
          color: var(--color-primary);
          margin-bottom: 12px;
        }
        .ab-why-card h3 { font-size: 18px; font-weight: 600; color: var(--color-graphite); margin: 0 0 8px; }
        .ab-why-card p { font-size: 14.5px; line-height: 1.6; color: var(--color-steel); margin: 0; }

        /* ---------- VALUES ---------- */
        .ab-values { background: var(--color-bone); border-bottom: 1px solid var(--color-ash); }
        .ab-values-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .ab-value {
          text-align: center;
          padding: 28px 20px;
        }
        .ab-value-ico {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px;
          background: rgba(37, 68, 176, 0.09);
          color: var(--color-primary);
        }
        .ab-value h4 { font-size: 16px; font-weight: 600; color: var(--color-graphite); margin: 0 0 6px; }
        .ab-value p { font-size: 14px; line-height: 1.5; color: var(--color-steel); margin: 0; }

        /* ---------- CTA ---------- */
        .ab-cta {
          position: relative;
          overflow: hidden;
          padding: 96px 0;
          text-align: center;
          background:
            radial-gradient(ellipse 55% 120% at 50% 0%, rgba(37, 68, 176, 0.09), transparent 60%),
            radial-gradient(ellipse 40% 90% at 78% 100%, rgba(74, 198, 76, 0.08), transparent 60%),
            var(--color-paper-white);
        }
        .ab-cta h2 {
          font-family: var(--font-serif);
          font-weight: 340;
          font-size: 44px;
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: var(--color-graphite);
          margin: 0 0 16px;
        }
        .ab-cta p { font-size: 18px; line-height: 1.6; color: var(--color-steel); margin: 0 auto 30px; max-width: 540px; }
        .ab-cta-actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }

        /* ---------- REVEAL ---------- */
        .ab-root [data-reveal] {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 640ms cubic-bezier(0.22, 1, 0.36, 1), transform 640ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ab-root [data-reveal].is-revealed { opacity: 1; transform: translateY(0); }
        .ab-root [data-reveal][data-delay="1"] { transition-delay: 80ms; }
        .ab-root [data-reveal][data-delay="2"] { transition-delay: 160ms; }
        .ab-root [data-reveal][data-delay="3"] { transition-delay: 240ms; }
        @media (prefers-reduced-motion: reduce) {
          .ab-root [data-reveal] { opacity: 1; transform: none; transition: none; }
        }

        /* ---------- RESPONSIVE ---------- */
        @media (max-width: 1024px) {
          .ab-why-grid { grid-template-columns: 1fr; }
          .ab-values-grid { grid-template-columns: repeat(2, 1fr); gap: 32px 20px; }
        }
        @media (max-width: 880px) {
          .ab-hero { padding: 72px 0 64px; }
          .ab-hero-grid { grid-template-columns: 1fr; gap: 40px; }
          .ab-hero h1 { font-size: 44px; }
          .ab-hero-panel { justify-self: stretch; max-width: none; }
          .ab-section { padding: 64px 0; }
          .ab-section-title { font-size: 34px; }
          .ab-split { grid-template-columns: 1fr; gap: 36px; }
          .ab-duo { grid-template-columns: 1fr; }
          .ab-cta h2 { font-size: 36px; }
        }
        @media (max-width: 560px) {
          .ab-hero h1 { font-size: 38px; letter-spacing: -0.03em; }
          .ab-hero-lead { font-size: 15px; }
          .ab-hero-actions { flex-direction: column; }
          .ab-hero-actions .lp-btn { width: 100%; }
          .ab-values-grid { grid-template-columns: 1fr; }
          .ab-section-title { font-size: 30px; }
          .ab-cta h2 { font-size: 30px; }
          .ab-cta-actions { flex-direction: column; }
          .ab-cta-actions .lp-btn { width: 100%; }
        }
      `}</style>

      {/* ============================== HERO ============================== */}
      <section className="ab-hero">
        <div className="lp-container ab-hero-grid">
          <div data-reveal>
            <span className="ab-eyebrow">Qui sommes-nous</span>
            <h1>
              La logistique, <em>accessible</em> à tous.
            </h1>
            <p className="ab-hero-lead">
              DPEX est née d'une ambition simple : rendre les services d'expédition et de
              logistique accessibles, efficaces et économiques — pour les entreprises comme
              pour les particuliers, à l'échelle nationale et internationale.
            </p>
            <div className="ab-hero-actions">
              <Link to="/devis-express" className="lp-btn lp-btn-primary">
                Demander un devis <ArrowRight size={16} />
              </Link>
              <Link to="/contact" className="lp-btn lp-btn-secondary">
                Nous contacter
              </Link>
            </div>
          </div>

          <div className="ab-hero-panel" data-reveal data-delay="1">
            <div className="ab-hero-stat">
              <div className="ab-hero-stat-ico"><Globe2 size={22} strokeWidth={1.7} /></div>
              <div>
                <div className="ab-hero-stat-num">220+</div>
                <div className="ab-hero-stat-label">Destinations desservies</div>
              </div>
            </div>
            <div className="ab-hero-stat">
              <div className="ab-hero-stat-ico"><PiggyBank size={22} strokeWidth={1.7} /></div>
              <div>
                <div className="ab-hero-stat-num">jusqu'à −70 %</div>
                <div className="ab-hero-stat-label">D'économies à l'international</div>
              </div>
            </div>
            <div className="ab-hero-stat">
              <div className="ab-hero-stat-ico"><Layers size={22} strokeWidth={1.7} /></div>
              <div>
                <div className="ab-hero-stat-num">3 modes</div>
                <div className="ab-hero-stat-label">Aérien · Routier · Maritime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== PRESENTATION ============================== */}
      <section className="ab-section">
        <div className="lp-container ab-split">
          <div className="ab-split-copy" data-reveal>
            <span className="ab-eyebrow">Présentation</span>
            <h2 className="ab-section-title" style={{ marginBottom: 22 }}>
              Un partenaire logistique pour chaque envoi
            </h2>
            <p>
              <strong>DPEX S.A.R.L.</strong> est une entreprise de transport et de logistique
              qui propose des solutions adaptées à tous types d'envois, qu'il s'agisse
              d'importation ou d'exportation.
            </p>
            <p>
              Nous personnalisons notre service selon les besoins spécifiques de chaque client
              et nous engageons à <strong>simplifier vos opérations logistiques</strong> et à
              garantir un acheminement sécurisé de vos marchandises, en vous accompagnant sur
              l'ensemble de vos besoins de transport national et international.
            </p>
          </div>

          <div className="ab-modes" data-reveal data-delay="1">
            <div className="ab-mode">
              <div className="ab-mode-ico"><Plane size={24} strokeWidth={1.6} /></div>
              <div>
                <h4>Aérien</h4>
                <p>La rapidité pour vos envois urgents, partout dans le monde.</p>
              </div>
            </div>
            <div className="ab-mode">
              <div className="ab-mode-ico"><Truck size={24} strokeWidth={1.6} /></div>
              <div>
                <h4>Routier</h4>
                <p>Un maillage national fiable, du ramassage à la livraison.</p>
              </div>
            </div>
            <div className="ab-mode">
              <div className="ab-mode-ico"><Ship size={24} strokeWidth={1.6} /></div>
              <div>
                <h4>Maritime</h4>
                <p>La solution économique pour vos volumes importants.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== MISSION / STRATEGY ============================== */}
      <section className="ab-section" style={{ paddingTop: 0 }}>
        <div className="lp-container">
          <div className="ab-duo">
            <div className="ab-pillar" data-reveal>
              <div className="ab-pillar-ico"><Target size={24} strokeWidth={1.7} /></div>
              <h3>Notre objectif</h3>
              <p className="ab-pillar-quote">
                « Vous permettre d'accéder aux solutions d'expédition les plus avantageuses
                pour vos envois nationaux et internationaux. »
              </p>
              <ul>
                <li>Rechercher les meilleures offres du marché</li>
                <li>Proposer des tarifs compétitifs</li>
                <li>Offrir des devis transparents incluant tous les frais</li>
                <li>Fournir un accompagnement personnalisé, import comme export</li>
              </ul>
            </div>

            <div className="ab-pillar" data-reveal data-delay="1">
              <div className="ab-pillar-ico"><Layers size={24} strokeWidth={1.7} /></div>
              <h3>Notre stratégie</h3>
              <p className="ab-pillar-quote">
                « Rassembler au sein d'une même plateforme les solutions des principaux acteurs
                du transport express national et international. »
              </p>
              <ul>
                <li>Un accès simplifié à plus de 220 destinations</li>
                <li>Un partenariat avec des transporteurs reconnus</li>
                <li>Des coûts et des délais optimisés à chaque envoi</li>
                <li>Un service complet de porte-à-porte, à l'enlèvement comme à la livraison</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== WHY DPEX ============================== */}
      <section className="ab-section ab-why">
        <div className="lp-container">
          <div className="ab-section-head is-center" data-reveal>
            <span className="ab-eyebrow">Pourquoi choisir DPEX</span>
            <h2 className="ab-section-title">Trois raisons de nous faire confiance</h2>
          </div>
          <div className="ab-why-grid">
            <div className="ab-why-card" data-reveal>
              <div className="ab-why-ico"><PiggyBank size={24} strokeWidth={1.7} /></div>
              <div className="ab-why-metric">−70 %</div>
              <h3>Économies significatives</h3>
              <p>
                Grâce à des accords négociés avec les grands transporteurs, jusqu'à −70 % sur
                vos envois internationaux et jusqu'à −50 % sur vos envois nationaux au Maroc.
              </p>
            </div>
            <div className="ab-why-card" data-reveal data-delay="1">
              <div className="ab-why-ico"><ShieldCheck size={24} strokeWidth={1.7} /></div>
              <div className="ab-why-metric">Fiabilité</div>
              <h3>Service fiable et professionnel</h3>
              <p>
                Nous nous appuyons sur des transporteurs express reconnus à l'international,
                choisis pour leur fiabilité et leur expertise logistique.
              </p>
            </div>
            <div className="ab-why-card" data-reveal data-delay="2">
              <div className="ab-why-ico"><Timer size={24} strokeWidth={1.7} /></div>
              <div className="ab-why-metric">Instantané</div>
              <h3>Gain de temps considérable</h3>
              <p>
                Fini les comparaisons manuelles : recevez immédiatement les meilleures options
                disponibles, adaptées à votre besoin, votre budget et votre destination.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== VALUES ============================== */}
      <section className="ab-section ab-values">
        <div className="lp-container">
          <div className="ab-section-head is-center" data-reveal>
            <span className="ab-eyebrow">Nos valeurs</span>
            <h2 className="ab-section-title">Ce qui nous fait avancer</h2>
          </div>
          <div className="ab-values-grid">
            <div className="ab-value" data-reveal>
              <div className="ab-value-ico"><Handshake size={26} strokeWidth={1.6} /></div>
              <h4>Proximité</h4>
              <p>Un interlocuteur à votre écoute, proche de vos réalités.</p>
            </div>
            <div className="ab-value" data-reveal data-delay="1">
              <div className="ab-value-ico"><Zap size={26} strokeWidth={1.6} /></div>
              <h4>Réactivité</h4>
              <p>Des réponses rapides et des solutions sans attente.</p>
            </div>
            <div className="ab-value" data-reveal data-delay="2">
              <div className="ab-value-ico"><Award size={26} strokeWidth={1.6} /></div>
              <h4>Excellence</h4>
              <p>Une qualité de service irréprochable, à chaque étape.</p>
            </div>
            <div className="ab-value" data-reveal data-delay="3">
              <div className="ab-value-ico"><Heart size={26} strokeWidth={1.6} /></div>
              <h4>Confiance</h4>
              <p>L'engagement de nos équipes au service de vos envois.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== CTA ============================== */}
      <section className="ab-cta">
        <div className="lp-container" data-reveal>
          <h2>Envie d'en savoir plus ?</h2>
          <p>
            Demandez un devis en quelques minutes ou échangez directement avec notre équipe —
            nous vous accompagnons sur tous vos besoins d'expédition.
          </p>
          <div className="ab-cta-actions">
            <Link to="/devis-express" className="lp-btn lp-btn-primary">
              Demander un devis <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="lp-btn lp-btn-secondary">
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
