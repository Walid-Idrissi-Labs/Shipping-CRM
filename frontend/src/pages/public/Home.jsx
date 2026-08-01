import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  ArrowUpRight,
  Globe2,
  Calculator,
  LogIn,
  Truck,
  Package,
  ShieldCheck,
  Headphones,
  Radar,
  Earth,
  ReceiptText,
  Boxes,
  Building2,
} from 'lucide-react';
import MagicCard from '../../components/ui/MagicCard';

// Hero background map — cities (x/y in % of the map box) and flight routes.
const HERO_CITIES = [
  { x: 16, y: 30, c: 'primary' },
  { x: 28, y: 38, c: 'green', lg: true },
  { x: 22, y: 55, c: 'primary' },
  { x: 38, y: 29, c: 'green' },
  { x: 44, y: 46, c: 'primary', lg: true },
  { x: 35, y: 63, c: 'green' },
  { x: 53, y: 39, c: 'primary' },
  { x: 60, y: 52, c: 'green', lg: true },
  { x: 68, y: 33, c: 'primary' },
  { x: 74, y: 59, c: 'green' },
  { x: 81, y: 42, c: 'primary', lg: true },
  { x: 89, y: 51, c: 'green' },
  { x: 64, y: 69, c: 'primary' },
];

const HERO_FLIGHTS = [
  { a: 1, b: 4, c: 'green', dur: 5.4, delay: 0 },
  { a: 4, b: 7, c: 'primary', dur: 6.2, delay: 1.1 },
  { a: 7, b: 10, c: 'green', dur: 5.8, delay: 2.4 },
  { a: 0, b: 4, c: 'primary', dur: 7.1, delay: 0.6 },
  { a: 4, b: 8, c: 'green', dur: 6.5, delay: 3.0 },
  { a: 7, b: 12, c: 'primary', dur: 5.0, delay: 1.8 },
  { a: 10, b: 11, c: 'green', dur: 4.6, delay: 3.6 },
];

// Quadratic-bezier arc between two cities, bowed upward like a flight path.
const heroArc = (a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lift = Math.hypot(dx, dy) * 0.42 + 5;
  const cx = (a.x + b.x) / 2;
  const cy = Math.min(a.y, b.y) - lift;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
};

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
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={revealRef} className="lp-root">
      <style>{`
        .lp-root {
          --font-serif: 'Fraunces', var(--font-display), ui-serif, Georgia, serif;
          font-family: var(--font-sans);
          color: var(--color-iron);
          background: var(--color-paper-white);
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
          overflow-x: clip;
        }
        .lp-root .lp-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* ---------- Shared type ---------- */
        .lp-root .lp-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px 6px 10px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid var(--color-ash);
          box-shadow: var(--shadow-secondary);
          backdrop-filter: blur(6px);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-slate);
        }
        .lp-root .lp-eyebrow .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--color-vivid-green);
          box-shadow: 0 0 0 4px rgba(74, 198, 76, 0.16);
        }
        .lp-root .lp-eyebrow.is-blue .dot {
          background: var(--color-primary);
          box-shadow: 0 0 0 4px rgba(37, 68, 176, 0.14);
        }

        .lp-root .lp-serif {
          font-family: var(--font-serif);
          font-weight: 340;
          color: var(--color-graphite);
          letter-spacing: -0.02em;
          line-height: 1.04;
          font-optical-sizing: auto;
        }
        .lp-root .lp-serif em {
          font-style: italic;
          font-weight: 380;
          color: var(--color-primary);
        }

        .lp-root .lp-section {
          padding: 88px 0;
          position: relative;
        }
        .lp-root .lp-section-head {
          max-width: 660px;
          margin: 0 0 44px;
        }
        .lp-root .lp-section-head.is-center {
          margin-left: auto;
          margin-right: auto;
          text-align: center;
        }
        .lp-root .lp-kicker {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-steel);
          margin-bottom: 14px;
        }
        .lp-root .lp-section-title {
          font-family: var(--font-serif);
          font-weight: 340;
          font-size: 42px;
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: var(--color-graphite);
          font-optical-sizing: auto;
        }
        .lp-root .lp-section-sub {
          margin-top: 16px;
          font-size: 17px;
          line-height: 1.6;
          color: var(--color-steel);
          font-weight: 400;
        }

        /* ---------- Buttons (landing-scoped niceties) ---------- */
        .lp-root .lp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 22px;
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 500;
          border-radius: 9999px;
          text-decoration: none;
          cursor: pointer;
          border: 1px solid transparent;
          transition: transform 200ms ease, background 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
        }
        .lp-root .lp-btn-primary {
          background: var(--color-primary);
          color: #fff;
          box-shadow:
            0 0 0 1px rgba(58, 58, 64, 0.1),
            0 1px 3px 0 rgba(0, 0, 0, 0.1),
            0 8px 20px -8px rgba(37, 68, 176, 0.55);
        }
        .lp-root .lp-btn-primary:hover {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
          box-shadow:
            0 0 0 1px rgba(58, 58, 64, 0.12),
            0 2px 4px 0 rgba(0, 0, 0, 0.1),
            0 14px 28px -10px rgba(37, 68, 176, 0.6);
        }
        .lp-root .lp-btn-secondary {
          background: var(--color-paper-white);
          color: var(--color-graphite);
          border-color: var(--color-ash);
          box-shadow: 0 0 0 1px rgba(29, 29, 32, 0.05);
        }
        .lp-root .lp-btn-secondary:hover {
          background: var(--color-bone);
          border-color: var(--color-mist);
          transform: translateY(-1px);
        }

        /* ========================================================= HERO */
        .lp-hero {
          position: relative;
          overflow: clip;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: calc(100vh - 69px);
          min-height: calc(100svh - 69px);
          padding: 56px 0;
          background:
            radial-gradient(ellipse 60% 55% at 82% 4%, rgba(74, 198, 76, 0.07), transparent 62%),
            radial-gradient(ellipse 70% 60% at 8% 0%, rgba(37, 68, 176, 0.10), transparent 58%),
            var(--color-paper-white);
        }
        .lp-hero > .lp-container { width: 100%; }
        .lp-hero::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: 0;
          height: 1px;
          background: var(--color-ash);
        }

        /* --- Dotted world map --- */
        .lp-hero-map {
          position: absolute;
          top: -6%;
          right: -8%;
          width: 70%;
          height: 112%;
          pointer-events: none;
          z-index: 0;
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 30%, #000 92%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, #000 30%, #000 92%, transparent 100%);
        }
        .lp-map-layer {
          position: absolute;
          inset: 0;
          -webkit-mask: url('/world-map.svg') center / contain no-repeat;
          mask: url('/world-map.svg') center / contain no-repeat;
        }
        .lp-map-tint {
          background: linear-gradient(120deg,
            rgba(37, 68, 176, 0.9) 0%,
            rgba(37, 68, 176, 0.5) 58%,
            rgba(74, 198, 76, 0.4) 100%);
          opacity: 0.16;
        }
        .lp-map-dots {
          background-image: radial-gradient(circle, rgba(74, 198, 76, 0.7) 0.9px, transparent 1.15px);
          background-size: 7px 7px;
          opacity: 0.55;
        }
        .lp-map-hub {
          position: absolute;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }
        .lp-map-hub::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: inherit;
          opacity: 0.35;
          animation: lpPulse 2.8s ease-out infinite;
        }
        .lp-map-hub--lg { width: 12px; height: 12px; }
        @keyframes lpPulse {
          0% { transform: scale(1); opacity: 0.5; }
          70% { transform: scale(3.4); opacity: 0; }
          100% { transform: scale(3.4); opacity: 0; }
        }

        /* --- Flight routes --- */
        .lp-map-flights {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .lp-flight-line {
          fill: none;
          stroke: rgba(37, 68, 176, 0.2);
          stroke-width: 1;
          stroke-linecap: round;
          vector-effect: non-scaling-stroke;
        }
        .lp-flight-comet {
          fill: none;
          stroke-width: 2;
          stroke-linecap: round;
          vector-effect: non-scaling-stroke;
          stroke-dasharray: 2.6 97.4;
          stroke-dashoffset: 100;
          animation: lpFlight linear infinite;
        }
        @keyframes lpFlight {
          0%   { stroke-dashoffset: 100; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }

        .lp-hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          grid-template-areas:
            "head widget"
            "actions widget";
          column-gap: 56px;
          row-gap: 30px;
          align-items: center;
        }
        .lp-hero-head { grid-area: head; }
        .lp-hero h1 {
          font-family: var(--font-serif);
          font-weight: 340;
          font-size: 58px;
          line-height: 1.02;
          letter-spacing: -0.025em;
          color: var(--color-graphite);
          margin: 0;
          font-optical-sizing: auto;
        }
        .lp-hero h1 em {
          font-style: italic;
          font-weight: 400;
          color: var(--color-primary);
        }
        .lp-hero-lead {
          margin: 22px 0 0;
          font-size: 18px;
          line-height: 1.6;
          color: var(--color-steel);
          max-width: 520px;
          font-weight: 400;
        }
        .lp-hero-actions {
          grid-area: actions;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .lp-hero-meta {
          margin: 28px 0 0;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-steel);
          letter-spacing: 0.01em;
        }
        .lp-hero-meta span {
          color: var(--color-mist);
          margin: 0 10px;
          font-weight: 400;
        }

        /* --- Hero widget --- */
        .lp-hero-widget {
          grid-area: widget;
          justify-self: end;
          width: 100%;
          max-width: 420px;
          box-shadow:
            rgb(239, 239, 239) 0 0 0 1px,
            rgba(0, 0, 0, 0.02) 0 22px 40px 0,
            rgba(0, 0, 0, 0.05) 0 12px 20px 0,
            rgba(0, 0, 0, 0.06) 0 4px 8px 0;
          border-radius: 16px;
        }
        .lp-widget-tabs {
          display: flex;
          gap: 4px;
          padding: 8px;
          background: var(--color-bone);
          border-bottom: 1px solid var(--color-ash);
        }
        .lp-widget-tab {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 12px;
          border: none;
          border-radius: 9999px;
          background: transparent;
          font-family: var(--font-sans);
          font-size: 13.5px;
          font-weight: 500;
          color: var(--color-steel);
          cursor: pointer;
          transition: all 180ms ease;
        }
        .lp-widget-tab:hover { color: var(--color-graphite); }
        .lp-widget-tab.is-active {
          background: var(--color-paper-white);
          color: var(--color-primary);
          box-shadow: 0 0 0 1px rgba(37, 68, 176, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);
        }
        .lp-widget-body {
          position: relative;
          padding: 22px;
          min-height: 190px;
        }
        .lp-tab-pane {
          position: absolute;
          inset: 22px;
          opacity: 0;
          transform: translateY(6px);
          filter: blur(6px);
          pointer-events: none;
          transition: opacity 260ms ease, transform 260ms ease, filter 260ms ease;
        }
        .lp-tab-pane.is-active {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
          pointer-events: auto;
        }
        .lp-widget-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          font-weight: 600;
          color: var(--color-smoke);
          margin-bottom: 10px;
        }
        .lp-widget-input-group { display: flex; gap: 8px; }
        .lp-widget-input {
          flex: 1;
          min-width: 0;
          padding: 11px 14px;
          border: 1px solid var(--color-mist);
          border-radius: 9999px;
          font-family: var(--font-sans);
          font-size: 14px;
          color: var(--color-graphite);
          background: var(--color-paper-white);
          outline: none;
          transition: all 160ms ease;
        }
        .lp-widget-input::placeholder { color: var(--color-smoke); }
        .lp-widget-input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-wash);
        }
        .lp-widget-hint {
          margin-top: 14px;
          font-size: 13px;
          color: var(--color-steel);
        }
        .lp-widget-hint a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
        .lp-widget-hint a:hover { text-decoration: underline; }
        .lp-widget-copy {
          font-size: 14px;
          line-height: 1.6;
          color: var(--color-steel);
          margin: 0 0 18px;
        }

        /* ========================================================= TRUST BAND */
        .lp-band {
          border-top: 1px solid var(--color-ash);
          border-bottom: 1px solid var(--color-ash);
          background: var(--color-bone);
        }
        .lp-band-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px 36px;
          padding-top: 52px;
          padding-bottom: 52px;
        }
        .lp-band-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 12px 0;
        }
        .lp-band-ico {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(37, 68, 176, 0.09);
          color: var(--color-primary);
          margin-bottom: 18px;
          opacity: 0;
          transform: translateY(10px) scale(0.82);
          transition:
            opacity 520ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 560ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .lp-band-item.is-revealed .lp-band-ico {
          opacity: 1;
          transform: none;
        }
        .lp-band-item:nth-child(1) .lp-band-ico { transition-delay: 100ms; }
        .lp-band-item:nth-child(2) .lp-band-ico { transition-delay: 190ms; }
        .lp-band-item:nth-child(3) .lp-band-ico { transition-delay: 280ms; }
        .lp-band-item:nth-child(4) .lp-band-ico { transition-delay: 370ms; }
        .lp-band-item h3 {
          font-size: 17px;
          font-weight: 600;
          color: var(--color-graphite);
          letter-spacing: -0.01em;
          margin: 0;
        }
        .lp-band-item p {
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-steel);
          margin: 0;
          max-width: 220px;
        }

        /* ========================================================= SERVICES */
        .lp-cards-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .lp-card-shell {
          display: flex;
          height: 100%;
          text-decoration: none;
          border-radius: 14px;
          transition: transform 200ms ease, box-shadow 200ms ease;
        }
        .lp-card-shell:hover {
          transform: translateY(-3px);
          box-shadow:
            rgba(0, 0, 0, 0.08) 0 16px 28px -12px,
            rgba(0, 0, 0, 0.05) 0 4px 8px -4px;
        }
        .lp-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 24px;
        }
        .lp-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary);
          background: var(--color-primary-wash);
          margin-bottom: 18px;
        }
        .lp-card h3 {
          font-size: 17px;
          font-weight: 600;
          color: var(--color-graphite);
          margin: 0 0 8px;
        }
        .lp-card p {
          font-size: 14px;
          line-height: 1.55;
          color: var(--color-steel);
          margin: 0 0 18px;
          flex: 1;
        }
        .lp-card-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-primary);
        }
        .lp-card-shell:hover .lp-card-link svg { transform: translateX(3px); }
        .lp-card-link svg { transition: transform 200ms ease; }

        /* ========================================================= HOW IT WORKS */
        .lp-how { background: var(--color-bone); border-top: 1px solid var(--color-ash); border-bottom: 1px solid var(--color-ash); }
        .lp-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          position: relative;
        }
        .lp-steps::before {
          content: '';
          position: absolute;
          top: 22px;
          left: 12%;
          right: 12%;
          height: 2px;
          background: repeating-linear-gradient(90deg, var(--color-mist) 0 6px, transparent 6px 14px);
          z-index: 0;
        }
        .lp-step { position: relative; z-index: 1; }
        .lp-step-num {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: var(--color-paper-white);
          border: 1px solid var(--color-ash);
          box-shadow: var(--shadow-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-serif);
          font-size: 20px;
          font-weight: 400;
          color: var(--color-primary);
          margin-bottom: 18px;
        }
        .lp-step h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-graphite);
          margin: 0 0 8px;
        }
        .lp-step p {
          font-size: 14.5px;
          line-height: 1.6;
          color: var(--color-steel);
          margin: 0;
          max-width: 300px;
        }

        /* ========================================================= SEGMENTS */
        .lp-seg-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .lp-seg {
          border-radius: 18px;
          border: 1px solid var(--color-ash);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: var(--color-paper-white);
          transition: box-shadow 220ms ease, transform 220ms ease;
        }
        .lp-seg:hover {
          transform: translateY(-2px);
          box-shadow:
            rgb(239, 239, 239) 0 0 0 1px,
            rgba(0, 0, 0, 0.05) 0 18px 34px -14px,
            rgba(0, 0, 0, 0.04) 0 6px 12px -6px;
        }
        .lp-seg-visual {
          height: 168px;
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid var(--color-ash);
        }
        .lp-seg-visual.is-light {
          background:
            radial-gradient(circle at 30% 30%, rgba(37, 68, 176, 0.10), transparent 55%),
            var(--color-bone);
        }
        .lp-seg-visual.is-dark {
          background:
            radial-gradient(circle at 72% 22%, rgba(74, 198, 76, 0.26), transparent 55%),
            radial-gradient(circle at 20% 80%, rgba(37, 68, 176, 0.4), transparent 55%),
            var(--color-graphite);
        }
        .lp-seg-visual-dots {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(37, 68, 176, 0.35) 1px, transparent 1.4px);
          background-size: 16px 16px;
          -webkit-mask-image: linear-gradient(180deg, transparent, #000 60%);
          mask-image: linear-gradient(180deg, transparent, #000 60%);
        }
        .lp-seg-visual.is-dark .lp-seg-visual-dots {
          background-image: radial-gradient(circle, rgba(255, 255, 255, 0.18) 1px, transparent 1.4px);
        }
        .lp-seg-visual-icon {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        }
        .lp-seg-visual.is-light .lp-seg-visual-icon { color: var(--color-primary); opacity: 0.55; }
        .lp-seg-visual.is-dark .lp-seg-visual-icon { color: #fff; opacity: 0.85; }
        .lp-seg-body { padding: 28px; display: flex; flex-direction: column; flex: 1; }
        .lp-seg-tag {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-primary);
          margin-bottom: 12px;
        }
        .lp-seg h3 {
          font-family: var(--font-serif);
          font-weight: 360;
          font-size: 25px;
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: var(--color-graphite);
          margin: 0 0 10px;
        }
        .lp-seg p {
          font-size: 15px;
          line-height: 1.6;
          color: var(--color-steel);
          margin: 0 0 22px;
          flex: 1;
        }

        /* ========================================================= FEATURES */
        .lp-feat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .lp-feat {
          padding: 28px 26px;
          border: 1px solid var(--color-ash);
          border-radius: 14px;
          background: var(--color-paper-white);
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }
        .lp-feat:hover {
          border-color: var(--color-mist);
          box-shadow: rgba(0, 0, 0, 0.04) 0 10px 24px -14px;
        }
        .lp-feat-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(74, 198, 76, 0.12);
          color: var(--color-vivid-green-dark);
          margin-bottom: 18px;
        }
        .lp-feat h3 { font-size: 18px; font-weight: 600; color: var(--color-graphite); margin: 0 0 8px; }
        .lp-feat p { font-size: 14.5px; line-height: 1.6; color: var(--color-steel); margin: 0; }

        /* ========================================================= CTA */
        .lp-cta {
          position: relative;
          overflow: hidden;
          padding: 96px 0;
          text-align: center;
          border-top: 1px solid var(--color-ash);
          background:
            radial-gradient(ellipse 55% 120% at 50% 0%, rgba(37, 68, 176, 0.09), transparent 60%),
            radial-gradient(ellipse 40% 90% at 78% 100%, rgba(74, 198, 76, 0.08), transparent 60%),
            var(--color-paper-white);
        }
        .lp-cta h2 {
          font-family: var(--font-serif);
          font-weight: 340;
          font-size: 46px;
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: var(--color-graphite);
          margin: 0 0 16px;
        }
        .lp-cta p {
          font-size: 18px;
          line-height: 1.6;
          color: var(--color-steel);
          margin: 0 auto 30px;
          max-width: 520px;
        }
        .lp-cta-actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }

        /* ========================================================= REVEAL */
        .lp-root [data-reveal] {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 640ms cubic-bezier(0.22, 1, 0.36, 1), transform 640ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lp-root [data-reveal].is-revealed { opacity: 1; transform: translateY(0); }
        .lp-root [data-reveal][data-delay="1"] { transition-delay: 80ms; }
        .lp-root [data-reveal][data-delay="2"] { transition-delay: 160ms; }
        .lp-root [data-reveal][data-delay="3"] { transition-delay: 240ms; }
        @media (prefers-reduced-motion: reduce) {
          .lp-root [data-reveal] { opacity: 1; transform: none; transition: none; }
          .lp-band-ico { opacity: 1; transform: none; transition: none; }
          .lp-map-hub::before { animation: none; }
          .lp-flight-comet { animation: none; opacity: 0; }
        }

        /* ========================================================= RESPONSIVE */
        @media (max-width: 1024px) {
          .lp-hero h1 { font-size: 50px; }
          .lp-cards-4 { grid-template-columns: repeat(2, 1fr); }
          .lp-band-row { grid-template-columns: repeat(2, 1fr); gap: 40px 32px; }
          .lp-feat-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 880px) {
          .lp-hero { min-height: 0; display: block; padding: 64px 0 72px; }
          .lp-hero-map { width: 92%; right: -14%; top: auto; bottom: -6%; height: 70%; opacity: 0.6; }
          .lp-hero-grid {
            grid-template-columns: 1fr;
            grid-template-areas: "head" "widget" "actions";
            column-gap: 0;
            row-gap: 26px;
          }
          .lp-hero-widget { justify-self: stretch; max-width: none; }
          .lp-hero h1 { font-size: 44px; }
          .lp-section { padding: 64px 0; }
          .lp-section-title { font-size: 34px; }
          .lp-steps { grid-template-columns: 1fr; gap: 28px; }
          .lp-steps::before { display: none; }
          .lp-seg-grid { grid-template-columns: 1fr; }
          .lp-cta h2 { font-size: 36px; }
        }
        @media (max-width: 560px) {
          .lp-hero h1 { font-size: 39px; letter-spacing: -0.03em; }
          .lp-hero-lead { font-size: 15px; line-height: 1.55; margin-top: 16px; }
          .lp-hero-meta { display: none; }
          .lp-cards-4 { grid-template-columns: 1fr; }
          .lp-band-row { grid-template-columns: 1fr; }
          .lp-hero-actions, .lp-cta-actions { flex-direction: column; }
          .lp-hero-actions .lp-btn, .lp-cta-actions .lp-btn { width: 100%; }
          .lp-widget-input-group { flex-direction: column; }
          .lp-widget-input-group .lp-btn { width: 100%; }
          .lp-tab-pane { position: relative; inset: auto; opacity: 1; transform: none; filter: none; pointer-events: auto; display: none; }
          .lp-tab-pane.is-active { display: block; }
          .lp-widget-body { min-height: 0; }
          .lp-section-title { font-size: 30px; }
          .lp-cta h2 { font-size: 32px; }
        }
      `}</style>

      {/* ============================== HERO ============================== */}
      <section className="lp-hero">
        <div className="lp-hero-map" aria-hidden="true">
          <div className="lp-map-layer lp-map-tint" />
          <div className="lp-map-layer lp-map-dots" />

          <svg
            className="lp-map-flights"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {HERO_FLIGHTS.map((f, i) => {
              const d = heroArc(HERO_CITIES[f.a], HERO_CITIES[f.b]);
              const stroke =
                f.c === 'green' ? 'var(--color-vivid-green)' : 'var(--color-primary)';
              return (
                <g key={i}>
                  <path className="lp-flight-line" d={d} pathLength="100" />
                  <path
                    className="lp-flight-comet"
                    d={d}
                    pathLength="100"
                    style={{
                      stroke,
                      animationDuration: `${f.dur}s`,
                      animationDelay: `${f.delay}s`,
                      filter: `drop-shadow(0 0 4px ${stroke})`,
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {HERO_CITIES.map((city, i) => (
            <span
              key={i}
              className={`lp-map-hub${city.lg ? ' lp-map-hub--lg' : ''}`}
              style={{
                top: `${city.y}%`,
                left: `${city.x}%`,
                background:
                  city.c === 'green' ? 'var(--color-vivid-green)' : 'var(--color-primary)',
              }}
            />
          ))}
        </div>

        <div className="lp-container lp-hero-grid">
          <div className="lp-hero-head" data-reveal>
            <h1>
              Vos expéditions, <em>livrées</em> sans friction.
            </h1>
            <p className="lp-hero-lead">
              Devis immédiat, enlèvement à domicile, suivi de bout en bout et facturation
              intégrée — le tout dans une plateforme claire, pensée pour les entreprises qui
              veulent avancer.
            </p>
            <p className="lp-hero-meta">
              Express<span>·</span>National<span>·</span>International<span>·</span>Sur mesure
            </p>
          </div>

          <div className="lp-hero-actions" data-reveal data-delay="2">
            <Link to="/devis-express" className="lp-btn lp-btn-primary">
              Demander un devis <ArrowRight size={16} />
            </Link>
            <Link to="/demande-compte" className="lp-btn lp-btn-secondary">
              Ouvrir un compte
            </Link>
          </div>

          {/* Track / Quote widget */}
          <div className="lp-hero-widget" data-reveal data-delay="1">
            <MagicCard radius={16} contentStyle={{ overflow: 'hidden' }}>
            <div className="lp-widget-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'track'}
                className={`lp-widget-tab ${activeTab === 'track' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('track')}
              >
                <Search size={15} /> Suivre
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'quote'}
                className={`lp-widget-tab ${activeTab === 'quote' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('quote')}
              >
                <Calculator size={15} /> Devis
              </button>
            </div>

            <div className="lp-widget-body">
              <div className={`lp-tab-pane ${activeTab === 'track' ? 'is-active' : ''}`}>
                <form onSubmit={handleTrackSubmit}>
                  <div className="lp-widget-label">Numéro de suivi</div>
                  <div className="lp-widget-input-group">
                    <input
                      type="text"
                      className="lp-widget-input"
                      placeholder="Ex : 123456789"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      aria-label="Numéro de suivi"
                    />
                    <button type="submit" className="lp-btn lp-btn-primary">
                      Suivre
                    </button>
                  </div>
                </form>
                <div className="lp-widget-hint">
                  Plusieurs colis à suivre ? <Link to="/suivi">Suivi multiple</Link>
                </div>
              </div>

              <div className={`lp-tab-pane ${activeTab === 'quote' ? 'is-active' : ''}`}>
                <div className="lp-widget-label">Devis express</div>
                <p className="lp-widget-copy">
                  Indiquez l'origine, la destination et les dimensions — vous recevez votre
                  tarif rapidement, sans créer de compte.
                </p>
                <Link
                  to="/devis-express"
                  className="lp-btn lp-btn-primary"
                  style={{ width: '100%' }}
                >
                  Obtenir mon devis <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
            </MagicCard>
          </div>
        </div>
      </section>

      {/* ============================== TRUST BAND ============================== */}
      <section className="lp-band">
        <div className="lp-container lp-band-row">
          <div className="lp-band-item" data-reveal>
            <div className="lp-band-ico"><Radar size={26} strokeWidth={1.6} /></div>
            <h3>Suivi en temps réel</h3>
            <p>Chaque étape tracée, de l'enlèvement à la livraison.</p>
          </div>
          <div className="lp-band-item" data-reveal data-delay="1">
            <div className="lp-band-ico"><Earth size={26} strokeWidth={1.6} /></div>
            <h3>National & international</h3>
            <p>Le Maroc et au-delà, avec un seul interlocuteur.</p>
          </div>
          <div className="lp-band-item" data-reveal data-delay="2">
            <div className="lp-band-ico"><Truck size={26} strokeWidth={1.6} /></div>
            <h3>Enlèvement à domicile</h3>
            <p>Nous récupérons vos colis à l'adresse de votre choix.</p>
          </div>
          <div className="lp-band-item" data-reveal data-delay="3">
            <div className="lp-band-ico"><ReceiptText size={26} strokeWidth={1.6} /></div>
            <h3>Facturation intégrée</h3>
            <p>Devis, bons et factures réunis au même endroit.</p>
          </div>
        </div>
      </section>

      {/* ============================== SERVICES ============================== */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head is-center" data-reveal>
            <span className="lp-kicker">Nos services</span>
            <h2 className="lp-section-title">Tout ce qu'il vous faut, en un clic</h2>
            <p className="lp-section-sub">
              Quatre raccourcis pour démarrer en moins d'une minute, que vous soyez client
              établi ou nouveau venu.
            </p>
          </div>
          <div className="lp-cards-4">
            <Link to="/devis-express" className="lp-card-shell" data-reveal>
              <MagicCard radius={14} gradientSize={240} gradientColor="rgba(37, 68, 176, 0.06)" contentClassName="lp-card" style={{ width: '100%' }}>
                <div className="lp-card-icon"><Calculator size={22} strokeWidth={1.7} /></div>
                <h3>Obtenir un devis</h3>
                <p>Estimez le coût de votre envoi avant même de créer un compte.</p>
                <span className="lp-card-link">Calculer <ArrowRight size={14} /></span>
              </MagicCard>
            </Link>
            <Link to="/suivi" className="lp-card-shell" data-reveal data-delay="1">
              <MagicCard radius={14} gradientSize={240} gradientColor="rgba(37, 68, 176, 0.06)" contentClassName="lp-card" style={{ width: '100%' }}>
                <div className="lp-card-icon"><Search size={22} strokeWidth={1.7} /></div>
                <h3>Suivre un colis</h3>
                <p>Localisez vos expéditions en temps réel, à toute heure du jour.</p>
                <span className="lp-card-link">Suivre <ArrowRight size={14} /></span>
              </MagicCard>
            </Link>
            <Link to="/demande-compte" className="lp-card-shell" data-reveal data-delay="2">
              <MagicCard radius={14} gradientSize={240} gradientColor="rgba(37, 68, 176, 0.06)" contentClassName="lp-card" style={{ width: '100%' }}>
                <div className="lp-card-icon"><Building2 size={22} strokeWidth={1.7} /></div>
                <h3>Ouvrir un compte</h3>
                <p>Accédez aux tarifs négociés, à la flotte dédiée et au suivi consolidé.</p>
                <span className="lp-card-link">Commencer <ArrowRight size={14} /></span>
              </MagicCard>
            </Link>
            <Link to="/login" className="lp-card-shell" data-reveal data-delay="3">
              <MagicCard radius={14} gradientSize={240} gradientColor="rgba(37, 68, 176, 0.06)" contentClassName="lp-card" style={{ width: '100%' }}>
                <div className="lp-card-icon"><LogIn size={22} strokeWidth={1.7} /></div>
                <h3>Espace client</h3>
                <p>Retrouvez vos expéditions, devis et factures au même endroit.</p>
                <span className="lp-card-link">Se connecter <ArrowRight size={14} /></span>
              </MagicCard>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================== HOW IT WORKS ============================== */}
      <section className="lp-section lp-how">
        <div className="lp-container">
          <div className="lp-section-head is-center" data-reveal>
            <span className="lp-kicker">Comment ça marche</span>
            <h2 className="lp-section-title">De la demande à la livraison</h2>
            <p className="lp-section-sub">
              Un parcours simple, sans jargon ni paperasse superflue.
            </p>
          </div>
          <div className="lp-steps">
            <div className="lp-step" data-reveal>
              <div className="lp-step-num">1</div>
              <h3>Demandez votre devis</h3>
              <p>
                Renseignez origine, destination et dimensions. Vous obtenez une estimation
                immédiate, sans engagement.
              </p>
            </div>
            <div className="lp-step" data-reveal data-delay="1">
              <div className="lp-step-num">2</div>
              <h3>Planifiez l'enlèvement</h3>
              <p>
                Nous récupérons votre colis à l'adresse de votre choix, au créneau qui vous
                arrange.
              </p>
            </div>
            <div className="lp-step" data-reveal data-delay="2">
              <div className="lp-step-num">3</div>
              <h3>Suivez jusqu'à livraison</h3>
              <p>
                Chaque étape est tracée en temps réel, avec preuve de livraison numérique à
                l'arrivée.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== SEGMENTS ============================== */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head is-center" data-reveal>
            <span className="lp-kicker">Pour qui</span>
            <h2 className="lp-section-title">Une solution adaptée à chaque besoin</h2>
            <p className="lp-section-sub">
              Que vous expédiez un colis unique ou pilotiez une chaîne logistique complète.
            </p>
          </div>
          <div className="lp-seg-grid">
            <div className="lp-seg" data-reveal>
              <div className="lp-seg-visual is-light">
                <div className="lp-seg-visual-dots" />
                <Package size={52} strokeWidth={1.2} className="lp-seg-visual-icon" />
              </div>
              <div className="lp-seg-body">
                <div className="lp-seg-tag">Particuliers</div>
                <h3>Expédition ponctuelle, sans compte</h3>
                <p>
                  Saisissez vos dimensions, obtenez un tarif immédiat et confiez-nous
                  l'enlèvement. Suivi inclus jusqu'à la livraison.
                </p>
                <div>
                  <Link to="/devis-express" className="lp-btn lp-btn-secondary">
                    Expédier un colis <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>

            <div className="lp-seg" data-reveal data-delay="1">
              <div className="lp-seg-visual is-dark">
                <div className="lp-seg-visual-dots" />
                <Boxes size={52} strokeWidth={1.2} className="lp-seg-visual-icon" />
              </div>
              <div className="lp-seg-body">
                <div className="lp-seg-tag">Entreprises</div>
                <h3>Logistique dédiée et gestion intégrée</h3>
                <p>
                  Volume régulier, flotte dédiée, facturation intégrée et interlocuteur unique.
                  Une plateforme qui grandit avec votre activité.
                </p>
                <div>
                  <Link to="/demande-compte" className="lp-btn lp-btn-primary">
                    Solutions entreprises <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== FEATURES ============================== */}
      <section className="lp-section lp-how">
        <div className="lp-container">
          <div className="lp-section-head is-center" data-reveal>
            <span className="lp-kicker">Pourquoi nous</span>
            <h2 className="lp-section-title">Pensé pour le transport moderne</h2>
          </div>
          <div className="lp-feat-grid">
            <div className="lp-feat" data-reveal>
              <div className="lp-feat-icon"><Globe2 size={22} strokeWidth={1.8} /></div>
              <h3>Couverture étendue</h3>
              <p>
                Du dernier kilomètre au fret international, un seul partenaire pour tous vos
                envois, du ramassage à la livraison finale.
              </p>
            </div>
            <div className="lp-feat" data-reveal data-delay="1">
              <div className="lp-feat-icon"><ShieldCheck size={22} strokeWidth={1.8} /></div>
              <h3>Fiabilité & sécurité</h3>
              <p>
                Vos expéditions et documents sont protégés par une infrastructure conforme,
                avec traçabilité complète à chaque étape.
              </p>
            </div>
            <div className="lp-feat" data-reveal data-delay="2">
              <div className="lp-feat-icon"><Headphones size={22} strokeWidth={1.8} /></div>
              <h3>Support à taille humaine</h3>
              <p>
                Une équipe locale joignable pour gérer les imprévus, optimiser vos tournées et
                vous accompagner au quotidien.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== CTA ============================== */}
      <section className="lp-cta">
        <div className="lp-container" data-reveal>
          <h2>Prêt à simplifier votre logistique ?</h2>
          <p>
            Ouvrez votre compte aujourd'hui et accédez à l'intégralité de la plateforme —
            devis, expéditions, suivi et facturation.
          </p>
          <div className="lp-cta-actions">
            <Link to="/demande-compte" className="lp-btn lp-btn-primary">
              Créer un compte client <ArrowRight size={16} />
            </Link>
            <Link to="/devis-express" className="lp-btn lp-btn-secondary">
              Demander un devis
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
