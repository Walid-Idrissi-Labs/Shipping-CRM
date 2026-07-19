import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Mail,
  Copy,
  Check,
  Calculator,
  Search,
  Building2,
  ExternalLink,
} from 'lucide-react';

function FacebookIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.09 0 2.24.19 2.24.19v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}

const EMAIL = 'sales@dpex-maroc.com';
const FACEBOOK_URL = 'https://facebook.com/dpex.sarl.maroc';
const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent(
  'Demande d’information — DPEX'
)}&body=${encodeURIComponent('Bonjour,\n\nJe souhaite obtenir des informations concernant :\n\n')}`;

export default function Contact() {
  const revealRef = useRef(null);
  const [copied, setCopied] = useState(false);

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = EMAIL;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={revealRef} className="ct-root lp-root">
      <style>{`
        .ct-root {
          --font-serif: 'Fraunces', var(--font-display), ui-serif, Georgia, serif;
          font-family: var(--font-sans);
          color: var(--color-iron);
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
          overflow-x: clip;
        }
        .ct-root .lp-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

        .ct-root .ct-eyebrow {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-steel);
          margin-bottom: 16px;
        }

        /* ---------- HERO ---------- */
        .ct-hero {
          position: relative;
          overflow: clip;
          padding: 88px 0 56px;
          background:
            radial-gradient(ellipse 60% 60% at 84% 4%, rgba(74, 198, 76, 0.06), transparent 62%),
            radial-gradient(ellipse 72% 65% at 6% 0%, rgba(37, 68, 176, 0.10), transparent 58%),
            var(--color-paper-white);
        }
        .ct-hero-inner { max-width: 720px; }
        .ct-hero h1 {
          font-family: var(--font-serif);
          font-weight: 340;
          font-size: 54px;
          line-height: 1.03;
          letter-spacing: -0.025em;
          color: var(--color-graphite);
          margin: 0;
          font-optical-sizing: auto;
        }
        .ct-hero h1 em { font-style: italic; font-weight: 400; color: var(--color-primary); }
        .ct-hero-lead {
          margin: 22px 0 0;
          font-size: 18px;
          line-height: 1.6;
          color: var(--color-steel);
          max-width: 560px;
        }

        /* ---------- MAIN GRID ---------- */
        .ct-main { padding: 8px 0 88px; }
        .ct-grid { display: grid; grid-template-columns: 1.35fr 1fr; gap: 24px; align-items: start; }

        /* Email card (primary) */
        .ct-card {
          background: var(--color-paper-white);
          border: 1px solid var(--color-ash);
          border-radius: 18px;
          padding: 36px;
        }
        .ct-card-ico {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 22px;
        }
        .ct-card-ico.is-blue { background: var(--color-primary-wash); color: var(--color-primary); }
        .ct-card-ico.is-fb { background: rgba(37, 68, 176, 0.09); color: var(--color-primary); }
        .ct-card-label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--color-steel);
          margin-bottom: 8px;
        }
        .ct-card h3 {
          font-family: var(--font-serif);
          font-weight: 360;
          font-size: 24px;
          letter-spacing: -0.015em;
          color: var(--color-graphite);
          margin: 0 0 6px;
        }
        .ct-card-sub { font-size: 15px; line-height: 1.6; color: var(--color-steel); margin: 0 0 24px; }

        .ct-email-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          padding: 16px 18px;
          background: var(--color-bone);
          border: 1px solid var(--color-ash);
          border-radius: 12px;
          margin-bottom: 18px;
        }
        .ct-email-addr {
          font-size: 16px;
          font-weight: 500;
          color: var(--color-graphite);
          word-break: break-all;
        }
        .ct-copy-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          border-radius: 9999px;
          border: 1px solid var(--color-mist);
          background: var(--color-paper-white);
          font-family: var(--font-sans);
          font-size: 13px;
          font-weight: 500;
          color: var(--color-slate);
          cursor: pointer;
          transition: all 180ms ease;
          white-space: nowrap;
        }
        .ct-copy-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
        .ct-copy-btn.is-copied { border-color: var(--color-vivid-green-dark); color: var(--color-vivid-green-dark); }

        .ct-card-actions { display: flex; flex-wrap: wrap; gap: 12px; }

        .ct-fb-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14.5px;
          font-weight: 600;
          color: var(--color-primary);
          text-decoration: none;
        }
        .ct-fb-link svg:last-child { transition: transform 200ms ease; }
        .ct-fb-link:hover svg:last-child { transform: translate(2px, -2px); }

        /* Side column: quick links */
        .ct-side { display: flex; flex-direction: column; gap: 24px; }
        .ct-quick {
          background: var(--color-paper-white);
          border: 1px solid var(--color-ash);
          border-radius: 18px;
          padding: 28px;
        }
        .ct-quick h4 {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-steel);
          margin: 0 0 18px;
        }
        .ct-quick-list { display: flex; flex-direction: column; gap: 10px; }
        .ct-quick-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border: 1px solid var(--color-ash);
          border-radius: 12px;
          text-decoration: none;
          background: var(--color-paper-white);
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }
        .ct-quick-item:hover {
          transform: translateY(-2px);
          border-color: var(--color-mist);
          box-shadow: rgba(0, 0, 0, 0.05) 0 12px 22px -14px;
        }
        .ct-quick-item-ico {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary-wash);
          color: var(--color-primary);
        }
        .ct-quick-item-txt { flex: 1; }
        .ct-quick-item-txt strong { display: block; font-size: 15px; font-weight: 600; color: var(--color-graphite); }
        .ct-quick-item-txt span { font-size: 13px; color: var(--color-steel); }
        .ct-quick-item-arrow { color: var(--color-smoke); transition: transform 180ms ease, color 180ms ease; }
        .ct-quick-item:hover .ct-quick-item-arrow { transform: translateX(3px); color: var(--color-primary); }

        /* ---------- REVEAL ---------- */
        .ct-root [data-reveal] {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 640ms cubic-bezier(0.22, 1, 0.36, 1), transform 640ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ct-root [data-reveal].is-revealed { opacity: 1; transform: translateY(0); }
        .ct-root [data-reveal][data-delay="1"] { transition-delay: 90ms; }
        .ct-root [data-reveal][data-delay="2"] { transition-delay: 180ms; }
        @media (prefers-reduced-motion: reduce) {
          .ct-root [data-reveal] { opacity: 1; transform: none; transition: none; }
        }

        /* ---------- RESPONSIVE ---------- */
        @media (max-width: 880px) {
          .ct-hero { padding: 64px 0 48px; }
          .ct-hero h1 { font-size: 42px; }
          .ct-grid { grid-template-columns: 1fr; }
          .ct-card { padding: 28px; }
        }
        @media (max-width: 560px) {
          .ct-hero h1 { font-size: 36px; letter-spacing: -0.03em; }
          .ct-hero-lead { font-size: 15px; }
          .ct-card-actions { flex-direction: column; }
          .ct-card-actions .lp-btn { width: 100%; justify-content: center; }
          .ct-email-row { flex-direction: column; align-items: stretch; }
          .ct-copy-btn { justify-content: center; }
        }
      `}</style>

      {/* ============================== HERO ============================== */}
      <section className="ct-hero">
        <div className="lp-container">
          <div className="ct-hero-inner" data-reveal>
            <span className="ct-eyebrow">Contact</span>
            <h1>
              Parlons de votre <em>prochain</em> envoi.
            </h1>
            <p className="ct-hero-lead">
              Une question, un devis sur mesure ou un besoin particulier ? Notre équipe est
              joignable par e-mail et sur les réseaux — nous vous répondons rapidement.
            </p>
          </div>
        </div>
      </section>

      {/* ============================== MAIN ============================== */}
      <section className="ct-main">
        <div className="lp-container ct-grid">
          {/* Email + Facebook */}
          <div className="ct-card" data-reveal>
            <div className="ct-card-ico is-blue"><Mail size={24} strokeWidth={1.7} /></div>
            <div className="ct-card-label">Par e-mail</div>
            <h3>Écrivez-nous</h3>
            <p className="ct-card-sub">
              Le moyen le plus direct pour toute demande commerciale, devis ou information.
            </p>

            <div className="ct-email-row">
              <span className="ct-email-addr">{EMAIL}</span>
              <button
                type="button"
                className={`ct-copy-btn${copied ? ' is-copied' : ''}`}
                onClick={handleCopy}
                aria-live="polite"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copié' : 'Copier'}
              </button>
            </div>

            <div className="ct-card-actions">
              <a href={MAILTO} className="lp-btn lp-btn-primary">
                <Mail size={16} /> Envoyer un e-mail
              </a>
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-btn lp-btn-secondary"
              >
                <FacebookIcon size={16} /> Facebook
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div className="ct-side" data-reveal data-delay="1">
            <div className="ct-quick">
              <h4>Aller plus vite</h4>
              <div className="ct-quick-list">
                <Link to="/devis-express" className="ct-quick-item">
                  <div className="ct-quick-item-ico"><Calculator size={20} strokeWidth={1.7} /></div>
                  <div className="ct-quick-item-txt">
                    <strong>Devis express</strong>
                    <span>Un tarif en quelques minutes</span>
                  </div>
                  <ArrowRight size={18} className="ct-quick-item-arrow" />
                </Link>
                <Link to="/suivi" className="ct-quick-item">
                  <div className="ct-quick-item-ico"><Search size={20} strokeWidth={1.7} /></div>
                  <div className="ct-quick-item-txt">
                    <strong>Suivre un colis</strong>
                    <span>Localisez votre expédition</span>
                  </div>
                  <ArrowRight size={18} className="ct-quick-item-arrow" />
                </Link>
                <Link to="/demande-compte" className="ct-quick-item">
                  <div className="ct-quick-item-ico"><Building2 size={20} strokeWidth={1.7} /></div>
                  <div className="ct-quick-item-txt">
                    <strong>Ouvrir un compte</strong>
                    <span>Tarifs négociés et suivi consolidé</span>
                  </div>
                  <ArrowRight size={18} className="ct-quick-item-arrow" />
                </Link>
              </div>
            </div>

            <div className="ct-quick">
              <h4>Suivez-nous</h4>
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="ct-fb-link"
              >
                <FacebookIcon size={18} /> facebook.com/dpex.sarl.maroc <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
