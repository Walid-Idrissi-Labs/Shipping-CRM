import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Truck,
  FileText,
  Search,
  LogIn,
  ArrowRight,
  Globe2,
  PackageCheck,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Clock,
  MapPin,
  Calculator,
  Headphones,
  ArrowUpRight,
} from 'lucide-react';

export default function LandingPage() {
  const revealRef = useRef(null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('track');
  const [trackingNumber, setTrackingNumber] = useState('');

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      navigate(`/suivi?n=${encodeURIComponent(trackingNumber.trim())}`);
    }
  };

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
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={revealRef} className="lp-root">
      <style>{`
        :root {
          /* --- Core palette (blue + green + neutrals) --- */
          --color-primary: #2544b0;
          --color-primary-hover: #1c368c;
          --color-primary-wash: #eef1fb;
          --color-primary-glow: #c8d0f5;
          --color-vivid-green: #4ac64c;
          --color-vivid-green-dark: #36a138;
          --color-success-wash: #dcfae0;

          --color-paper-white: #ffffff;
          --color-bone: #f7f7f7;
          --color-fog: #f1f1f1;
          --color-silver: #efefef;
          --color-marble: #fff6df;

          --color-graphite: #1d1d20;
          --color-slate: #42424a;
          --color-iron: #505050;
          --color-steel: #757575;
          --color-smoke: #92939e;
          --color-ash: #e5e7eb;
          --color-mist: #d1d9e4;

          --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          --font-display: 'Playfair Display', ui-serif, Georgia, 'Times New Roman', serif;

          --page-max-width: 1200px;
          --section-gap: 80px;
          --card-padding: 24px;
        }

        .lp-root {
          font-family: var(--font-sans);
          color: var(--color-iron);
          background-color: var(--color-paper-white);
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
        }

        .lp-container {
          max-width: var(--page-max-width);
          margin: 0 auto;
          padding: 0 24px;
        }

        /* --- Navbar (shared with PublicLayout) --- */
        .lp-navbar {
          background: rgba(255, 255, 255, 0.95);
          border-bottom: 1px solid var(--color-ash);
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(8px);
        }
        .lp-navbar-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 64px;
        }
        .lp-logo {
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lp-nav-links {
          display: flex;
          gap: 32px;
        }
        .lp-nav-link {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-iron);
          text-decoration: none;
          transition: color 200ms ease;
        }
        .lp-nav-link:hover,
        .lp-nav-link.is-active { color: var(--color-graphite); }
        .lp-nav-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .lp-menu-btn { display: none; background: none; border: none; cursor: pointer; color: var(--color-graphite); }

        /* --- Buttons --- */
        .lp-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 500;
          border-radius: 9999px;
          text-decoration: none;
          transition: all 200ms ease;
          cursor: pointer;
          border: 1px solid transparent;
        }
        .lp-btn-primary {
          background: var(--color-primary);
          color: var(--color-paper-white);
          box-shadow:
            0 0 0 1px rgba(58, 58, 64, 0.1),
            0 1px 3px 0 rgba(0, 0, 0, 0.1),
            0 1px 2px -1px rgba(0, 0, 0, 0.1),
            0 0 8px 2px rgba(37, 68, 176, 0.35);
        }
        .lp-btn-primary:hover {
          background: var(--color-primary-hover);
        }
        .lp-btn-secondary {
          background: var(--color-paper-white);
          color: var(--color-graphite);
          border-color: var(--color-silver);
          box-shadow: 0 0 0 1px rgba(29, 29, 32, 0.08);
        }
        .lp-btn-secondary:hover {
          background: var(--color-bone);
          border-color: var(--color-mist);
        }
        .lp-text-link {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-primary);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .lp-text-link:hover { text-decoration: underline; }

        /* --- Hero Section --- */
        .lp-hero {
          padding: 80px 0 100px;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(200, 208, 245, 0.35) 0%, rgba(238, 241, 251, 0.25) 50%, transparent 100%),
            var(--color-paper-white);
        }
        .lp-hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }
        .lp-hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--color-paper-white);
          color: var(--color-steel);
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 24px;
          border: 1px solid var(--color-ash);
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
        }
        .lp-hero-eyebrow .dot {
          width: 8px;
          height: 8px;
          background: var(--color-vivid-green);
          border-radius: 50%;
        }
        .lp-hero h1 {
          font-family: var(--font-display);
          font-size: 46px;
          font-weight: 300;
          color: var(--color-graphite);
          line-height: 1.0;
          letter-spacing: -0.025em;
          margin-bottom: 24px;
        }
        .lp-hero p {
          font-size: 16px;
          color: var(--color-steel);
          line-height: 1.63;
          margin-bottom: 32px;
          max-width: 520px;
          font-weight: 400;
        }
        .lp-hero-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 32px;
        }
        .lp-hero-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .lp-hero-list-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: var(--color-slate);
          font-weight: 500;
        }

        /* --- Tracking Widget --- */
        .lp-widget {
          background: var(--color-paper-white);
          border: 1px solid var(--color-ash);
          border-radius: 8px;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(58, 58, 64, 0.1),
            0 1px 3px 0 rgba(0, 0, 0, 0.1),
            0 1px 2px -1px rgba(0, 0, 0, 0.1);
        }
        .lp-widget {
          align-self: center;
        }
        .lp-widget-tabs {
          display: flex;
          background: var(--color-fog);
          border-bottom: 1px solid var(--color-ash);
        }
        .lp-widget-tab {
          flex: 1;
          padding: 16px;
          background: none;
          border: none;
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 500;
          color: var(--color-steel);
          cursor: pointer;
          transition: all 200ms ease;
          border-bottom: 2px solid transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .lp-widget-tab.is-active {
          background: var(--color-paper-white);
          color: var(--color-graphite);
          border-bottom-color: var(--color-primary);
        }
        .lp-widget-content {
          position: relative;
          min-height: 140px;
        }
        .lp-tab-pane {
          position: absolute;
          inset: 24px;
          opacity: 0;
          filter: blur(8px);
          pointer-events: none;
          transition: opacity 0.25s ease, filter 0.25s ease;
        }
        .lp-tab-pane.is-active {
          opacity: 1;
          filter: blur(0);
          pointer-events: auto;
        }
        .lp-tab-pane > * {
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .lp-tab-pane.is-active > * {
          opacity: 1;
          transform: translateY(0);
        }
        .lp-tab-pane.is-active > *:nth-child(1) { transition-delay: 0ms; }
        .lp-tab-pane.is-active > *:nth-child(2) { transition-delay: 80ms; }
        .lp-tab-pane.is-active > *:nth-child(3) { transition-delay: 160ms; }
        .lp-tab-pane.is-active > *:nth-child(4) { transition-delay: 240ms; }
        .lp-tab-pane.is-active > *:nth-child(5) { transition-delay: 320ms; }
        .lp-widget-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--color-smoke);
          margin-bottom: 8px;
          font-weight: 600;
        }
        .lp-widget-input-group { display: flex; gap: 8px; }
        .lp-widget-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid var(--color-mist);
          border-radius: 4px;
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 400;
          color: var(--color-graphite);
          transition: all 200ms ease;
          outline: none;
          background: var(--color-paper-white);
        }
        .lp-widget-input::placeholder { color: var(--color-smoke); }
        .lp-widget-input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-wash);
        }
        .lp-widget-hint {
          margin-top: 12px;
          font-size: 13px;
          color: var(--color-steel);
        }
        .lp-widget-hint a {
          color: var(--color-primary);
          text-decoration: none;
          font-weight: 500;
        }
        .lp-widget-hint a:hover { text-decoration: underline; }

        /* --- Sections --- */
        .lp-section { padding: var(--section-gap) 0; }
        .lp-section-header { text-align: center; margin-bottom: 48px; }
        .lp-section-title {
          font-family: var(--font-sans);
          font-size: 40px;
          font-weight: 300;
          color: var(--color-graphite);
          letter-spacing: -1px;
          line-height: 1.0;
          margin-bottom: 12px;
        }
        .lp-section-subtitle {
          font-size: 16px;
          color: var(--color-steel);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.63;
          font-weight: 400;
        }

        /* --- Quick Actions --- */
        .lp-actions-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .lp-action-card {
          background: var(--color-paper-white);
          border: 1px solid var(--color-ash);
          border-radius: 8px;
          padding: var(--card-padding);
          text-decoration: none;
          transition: all 200ms ease;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .lp-action-card:hover {
          border-color: var(--color-mist);
          transform: translateY(-2px);
          box-shadow:
            rgba(29, 29, 32, 0.08) 0 0 0 1px,
            rgba(0, 0, 0, 0.1) 0 10px 15px -3px,
            rgba(0, 0, 0, 0.1) 0 4px 6px -4px;
        }
        .lp-action-icon {
          width: 40px;
          height: 40px;
          background: var(--color-fog);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-graphite);
          margin-bottom: 16px;
        }
        .lp-action-title {
          font-family: var(--font-sans);
          font-size: 18px;
          font-weight: 500;
          color: var(--color-graphite);
          margin-bottom: 8px;
        }
        .lp-action-desc {
          font-size: 14px;
          color: var(--color-steel);
          margin-bottom: 16px;
          flex-grow: 1;
          line-height: 1.5;
          font-weight: 400;
        }
        .lp-action-link {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-primary);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* --- Segments --- */
        .lp-segments {
          background: var(--color-bone);
          border-top: 1px solid var(--color-ash);
          border-bottom: 1px solid var(--color-ash);
        }
        .lp-segment-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .lp-segment-card {
          background: var(--color-paper-white);
          border: 1px solid var(--color-ash);
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: box-shadow 200ms ease;
        }
        .lp-segment-card:hover {
          box-shadow:
            rgb(239, 239, 239) 0 0 0 2px,
            rgba(0, 0, 0, 0.01) 0 22px 9px 0,
            rgba(0, 0, 0, 0.04) 0 12px 7px 0,
            rgba(0, 0, 0, 0.06) 0 5px 5px 0,
            rgba(0, 0, 0, 0.07) 0 1px 3px 0;
        }
        .lp-segment-visual {
          height: 200px;
          background: var(--color-fog);
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid var(--color-ash);
        }
        .lp-segment-content { padding: 32px; }
        .lp-segment-tag {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-primary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .lp-segment-title {
          font-family: var(--font-sans);
          font-size: 24px;
          font-weight: 300;
          color: var(--color-graphite);
          margin-bottom: 12px;
          line-height: 1.2;
          letter-spacing: -0.048px;
        }
        .lp-segment-desc {
          font-size: 15px;
          color: var(--color-steel);
          margin-bottom: 20px;
          line-height: 1.5;
          font-weight: 400;
        }

        /* --- Value Prop / Features --- */
        .lp-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .lp-feature-item {
          text-align: left;
          padding: 24px;
          border-left: 2px solid var(--color-ash);
          transition: border-color 200ms ease;
        }
        .lp-feature-item:hover { border-left-color: var(--color-primary); }
        .lp-feature-icon { color: var(--color-graphite); margin-bottom: 16px; }
        .lp-feature-title {
          font-family: var(--font-sans);
          font-size: 18px;
          font-weight: 500;
          color: var(--color-graphite);
          margin-bottom: 8px;
        }
        .lp-feature-desc {
          font-size: 14px;
          color: var(--color-steel);
          line-height: 1.5;
          font-weight: 400;
        }

        /* --- Capabilities Strip --- */
        .lp-capabilities {
          background: var(--color-bone);
          border-top: 1px solid var(--color-ash);
          border-bottom: 1px solid var(--color-ash);
          padding: 60px 0;
        }
        .lp-capabilities-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
          text-align: left;
        }
        .lp-cap-item h4 {
          font-family: var(--font-sans);
          font-size: 18px;
          font-weight: 500;
          color: var(--color-graphite);
          margin-bottom: 8px;
        }
        .lp-cap-item p {
          font-size: 14px;
          color: var(--color-steel);
          line-height: 1.6;
          font-weight: 400;
        }

        /* --- Final CTA --- */
        .lp-cta {
          background: var(--color-paper-white);
          border-top: 1px solid var(--color-ash);
          border-bottom: 1px solid var(--color-ash);
          padding: 80px 0;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .lp-cta::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          height: 100%;
          background: radial-gradient(ellipse 60% 80% at 50% 50%, rgba(238, 241, 251, 0.6) 0%, transparent 70%);
          pointer-events: none;
        }
        .lp-cta h2 {
          font-family: var(--font-sans);
          font-size: 40px;
          font-weight: 300;
          color: var(--color-graphite);
          margin-bottom: 16px;
          letter-spacing: -1px;
          line-height: 1.0;
          position: relative;
        }
        .lp-cta p {
          font-size: 16px;
          color: var(--color-steel);
          margin-bottom: 32px;
          position: relative;
          font-weight: 400;
        }
        .lp-cta-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          position: relative;
        }

        /* --- Footer --- */
        .lp-footer {
          background: var(--color-paper-white);
          color: var(--color-iron);
          padding: 60px 0 30px;
          border-top: 1px solid var(--color-ash);
        }
        .lp-footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
        }
        .lp-footer-col h5 {
          color: var(--color-graphite);
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .lp-footer-col ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .lp-footer-col a {
          color: var(--color-steel);
          text-decoration: none;
          font-size: 14px;
          font-weight: 400;
          transition: color 200ms ease;
        }
        .lp-footer-col a:hover { color: var(--color-graphite); }
        .lp-footer-brand {
          font-family: var(--font-sans);
          font-size: 18px;
          font-weight: 500;
          color: var(--color-graphite);
          margin-bottom: 16px;
          display: block;
          letter-spacing: -0.002em;
        }
        .lp-footer-desc {
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 24px;
          max-width: 300px;
          color: var(--color-steel);
          font-weight: 400;
        }
        .lp-footer-bottom {
          border-top: 1px solid var(--color-ash);
          padding-top: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: var(--color-smoke);
        }
        .lp-footer-legal { display: flex; gap: 24px; }
        .lp-footer-legal a {
          color: var(--color-smoke);
          text-decoration: none;
          font-size: 13px;
        }
        .lp-footer-legal a:hover { color: var(--color-graphite); }

        /* --- Animations --- */
        .lp-root [data-reveal] {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 600ms ease, transform 600ms ease;
        }
        .lp-root [data-reveal].is-revealed { opacity: 1; transform: translateY(0); }

        /* --- Responsive --- */
        @media (max-width: 960px) {
          .lp-hero-grid, .lp-actions-grid, .lp-segment-grid, .lp-features-grid, .lp-capabilities-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .lp-footer-grid { grid-template-columns: 1fr 1fr; }
          .lp-nav-links { display: none; }
          .lp-menu-btn { display: flex; }
          .lp-hero h1 { font-size: 36px; }
          .lp-section-title { font-size: 32px; }
          .lp-cta h2 { font-size: 32px; }
        }
        @media (max-width: 600px) {
          .lp-footer-grid { grid-template-columns: 1fr; }
          .lp-footer-bottom { flex-direction: column; gap: 16px; }
          .lp-widget-input-group { flex-direction: column; }
          .lp-hero-actions { flex-direction: column; }
          .lp-cta-actions { flex-direction: column; align-items: center; }
        }
      `}</style>

      {/* Hero Section */}
      <section className="lp-hero">
        <div className="lp-container lp-hero-grid">
          <div data-reveal>
  
            <h1>Ne Perdez pas votre temps, On a la Solution.</h1>
            <p>
              Devis express, expéditions nationales et internationales, facturation et flotte terrain réunis dans une interface claire, rapide et fiable. Conçu pour les entreprises qui veulent avancer.
            </p>
            <div className="lp-hero-actions">
              <Link to="/devis-express" className="lp-btn lp-btn-primary">
                Demander un devis <ArrowRight size={16} />
              </Link>
              <Link to="/demande-compte" className="lp-btn lp-btn-secondary">
                Ouvrir un compte
              </Link>
            </div>
            <div className="lp-hero-list" style={{marginLeft: '20px'}}>
              <div className="lp-hero-list-item">
                <CheckCircle2 size={18} color="var(--color-vivid-green)" strokeWidth={2} />
                Sans engagement, tarifs transparents
              </div>
              <div className="lp-hero-list-item">
                <CheckCircle2 size={18} color="var(--color-vivid-green)" strokeWidth={2} />
                Couverture nationale et européenne
              </div>
            </div>
          </div>

          {/* Tracking Widget */}
          <div className="lp-widget" data-reveal>
            <div className="lp-widget-tabs">
              <button
                className={`lp-widget-tab ${activeTab === 'track' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('track')}
              >
                <Search size={16} /> Suivre
              </button>
              {/* <button
                className={`lp-widget-tab ${activeTab === 'ship' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('ship')}
              >
                <Truck size={16} /> Expedier
              </button> */}
              <button
                className={`lp-widget-tab ${activeTab === 'quote' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('quote')}
              >
                <Calculator size={16} /> Devis
              </button>
            </div>
<div className="lp-widget-content">
              <div className={`lp-tab-pane ${activeTab === 'track' ? 'is-active' : ''}`}>
                <form onSubmit={handleTrackSubmit}>
                  <div className="lp-widget-label">Numero de suivi</div>
                  <div className="lp-widget-input-group">
                    <input
                      type="text"
                      className="lp-widget-input"
                      placeholder="Ex: 123456789"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                    />
                    <button type="submit" className="lp-btn lp-btn-primary">Suivre</button>
                  </div>
                </form>
                <div className="lp-widget-hint">
                  Suivez plusieurs colis ? <Link to="/suivi">Suivi multiple</Link>
                </div>
              </div>
              <div className={`lp-tab-pane ${activeTab === 'quote' ? 'is-active' : ''}`}>
                <div className="lp-widget-label">Demander un devis</div>

                <Link to="/devis-express" className="lp-btn lp-btn-primary" style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}>
                  Acceder Page demande Devis Express <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header" data-reveal>
            <h2 className="lp-section-title">Tout ce dont vous avez besoin, a portee de clic</h2>
            <p className="lp-section-subtitle">Quatre raccourcis pour demarrer en moins de 30 secondes, que vous soyez client ou nouveau prospect.</p>
          </div>
          <div className="lp-actions-grid">
            <Link to="/expedier" className="lp-action-card" data-reveal>
              <div className="lp-action-icon"><FileText size={20} strokeWidth={1.5} /></div>
              <h3 className="lp-action-title">Creer une expedition</h3>
              <p className="lp-action-desc">Imprimez vos etiquettes et planifiez un enlèvement en quelques minutes.</p>
              <span className="lp-action-link">Commencer <ArrowRight size={14} /></span>
            </Link>
            <Link to="/suivi" className="lp-action-card" data-reveal>
              <div className="lp-action-icon"><Search size={20} strokeWidth={1.5} /></div>
              <h3 className="lp-action-title">Suivre un colis</h3>
              <p className="lp-action-desc">Obtenez des mises a jour en temps reel sur l'acheminement de vos envois.</p>
              <span className="lp-action-link">Suivre maintenant <ArrowRight size={14} /></span>
            </Link>
            <Link to="/tarifs" className="lp-action-card" data-reveal>
              <div className="lp-action-icon"><Calculator size={20} strokeWidth={1.5} /></div>
              <h3 className="lp-action-title">Obtenir un tarif</h3>
              <p className="lp-action-desc">Estimez le cout de vos expeditions avant meme de creer un compte.</p>
              <span className="lp-action-link">Calculer <ArrowRight size={14} /></span>
            </Link>
            <Link to="/agences" className="lp-action-card" data-reveal>
              <div className="lp-action-icon"><MapPin size={20} strokeWidth={1.5} /></div>
              <h3 className="lp-action-title">Trouver une agence</h3>
              <p className="lp-action-desc">Localisez les points relais et centres de service pres de chez vous.</p>
              <span className="lp-action-link">Localiser <ArrowRight size={14} /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* Segments (B2C / B2B) */}
      <section className="lp-section lp-segments">
        <div className="lp-container">
          <div className="lp-section-header" data-reveal>
            <h2 className="lp-section-title">Une solution adaptee a chaque profil</h2>
            <p className="lp-section-subtitle">Que vous expediez un colis unique ou que vous geriez une chaine d'approvisionnement complete.</p>
          </div>
          <div className="lp-segment-grid">
            {/* Particuliers */}
            <div className="lp-segment-card" data-reveal>
              <div className="lp-segment-visual" style={{ background: 'var(--color-fog)' }}>
                <svg viewBox="0 0 400 200" style={{ width: '100%', height: '100%' }}>
                  <rect x="0" y="0" width="400" height="200" fill="#f1f1f1" />
                  <path d="M0 150 Q100 100 200 120 T400 80" stroke="#e5e7eb" strokeWidth="2" fill="none" />
                  <circle cx="200" cy="120" r="8" fill="var(--color-primary)" />
                  <circle cx="200" cy="120" r="16" fill="var(--color-primary)" fillOpacity="0.15" />
                  <g transform="translate(180, 80)">
                    <rect width="40" height="30" rx="2" fill="#ffffff" stroke="#d1d9e4" strokeWidth="2" />
                    <rect x="0" y="10" width="40" height="10" fill="#e5e7eb" />
                  </g>
                </svg>
              </div>
              <div className="lp-segment-content">
                <div className="lp-segment-tag">Pour les particuliers</div>
                <h3 className="lp-segment-title">Expedition ponctuelle simple</h3>
                <p className="lp-segment-desc">Pas besoin de compte. Saisissez les dimensions, obtenez votre tarif immediat et imprimez votre etiquette.</p>
                <Link to="/devis-express" className="lp-btn lp-btn-secondary">Expedier un colis</Link>
              </div>
            </div>

            {/* Entreprises */}
            <div className="lp-segment-card" data-reveal>
              <div className="lp-segment-visual" style={{ background: 'var(--color-graphite)' }}>
                <svg viewBox="0 0 400 200" style={{ width: '100%', height: '100%' }}>
                  <rect x="0" y="0" width="400" height="200" fill="#1d1d20" />
                  <rect x="40" y="140" width="30" height="40" fill="#42424a" />
                  <rect x="80" y="100" width="30" height="80" fill="#42424a" />
                  <rect x="120" y="60" width="30" height="120" fill="#42424a" />
                  <rect x="160" y="120" width="30" height="60" fill="#42424a" />
                  <path d="M20 160 L380 160" stroke="#757575" strokeWidth="1" strokeDasharray="4 4" />
                </svg>
              </div>
              <div className="lp-segment-content">
                <div className="lp-segment-tag">Pour les entreprises</div>
                <h3 className="lp-segment-title">Logistique sur mesure & API</h3>
                <p className="lp-segment-desc">Volume regulier, flotte dediee, integration API et reporting. Un account manager a votre ecoute.</p>
                <Link to="/demande-compte" className="lp-btn lp-btn-primary">Solutions B2B <ArrowRight size={16} /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Prop / Features */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header" data-reveal>
            <h2 className="lp-section-title">Concu pour les exigences du transport moderne</h2>
          </div>
          <div className="lp-features-grid">
            <div className="lp-feature-item" data-reveal>
              <div className="lp-feature-icon"><Globe2 size={28} strokeWidth={1.5} /></div>
              <h3 className="lp-feature-title">Couverture etendue</h3>
              <p className="lp-feature-desc">National et international avec un suivi de bout en bout, du ramassage jusqu'a la livraison finale.</p>
            </div>
            <div className="lp-feature-item" data-reveal>
              <div className="lp-feature-icon"><ShieldCheck size={28} strokeWidth={1.5} /></div>
              <h3 className="lp-feature-title">Securite des donnees</h3>
              <p className="lp-feature-desc">Vos expeditions et documents sont proteges par une infrastructure conforme et chiffree.</p>
            </div>
            <div className="lp-feature-item" data-reveal>
              <div className="lp-feature-icon"><Clock size={28} strokeWidth={1.5} /></div>
              <h3 className="lp-feature-title">Disponibilite 24/7</h3>
              <p className="lp-feature-desc">Gerez vos logistiques a toute heure, depuis n'importe ou, sans dependre d'un support telefonique.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Strip */}
      <section className="lp-capabilities">
        <div className="lp-container">
          <div className="lp-capabilities-grid">
            <div className="lp-cap-item" data-reveal>
              <Headphones size={24} color="var(--color-primary)" strokeWidth={1.5} style={{ marginBottom: '16px' }} />
              <h4>Support Dedi</h4>
              <p>Une equipe logistique disponible pour resoudre les exceptions et optimiser vos tournees.</p>
            </div>
            <div className="lp-cap-item" data-reveal>
              <PackageCheck size={24} color="var(--color-primary)" strokeWidth={1.5} style={{ marginBottom: '16px' }} />
              <h4>Traçabilite Complete</h4>
              <p>Visibilite en temps reel sur chaque etape de la chaine d'approvisionnement et preuve de livraison numerique.</p>
            </div>
            <div className="lp-cap-item" data-reveal>
              <Building2 size={24} color="var(--color-primary)" strokeWidth={1.5} style={{ marginBottom: '16px' }} />
              <h4>Integration Systeme</h4>
              <p>Connectez votre CMS ou ERP via notre API pour automatiser la creation d'etiquettes et les mises a jour de statut.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="lp-cta">
        <div className="lp-container" data-reveal>
          <h2>Pret a simplifier votre logistique ?</h2>
          <p>Ouvrez votre compte aujourd'hui et accedez a l'integralite de la plateforme.</p>
          <div className="lp-cta-actions">
            <Link to="/demande-compte" className="lp-btn lp-btn-primary">
              Creer un Compte Client
            </Link>
            <Link to="/contact" className="lp-btn lp-btn-secondary">
              Contacter Nous
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}