import { useState, useEffect, useRef } from "react";
import { ArrowRight, Check, X, Shield, Zap, Brain, Mic, Camera, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/website/Navbar";
import HorseEcosystem from "@/components/website/HorseEcosystem";
import PricingV2 from "@/components/website/PricingV2";
import TestimonialsSection from "@/components/website/TestimonialsSection";
import FooterNew from "@/components/website/FooterNew";
import CookieBanner from "@/components/website/CookieBanner";
import { useGA4 } from "@/hooks/useGA4";
import pascalImage from "@/assets/lp/pascal-founder.png";

/* ── Reveal hook ── */
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}
const rc = (v: boolean) =>
  `transition-all duration-700 ease-out ${v ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`;

/* ─────────────────────────────────────────
   1. ANNOUNCEMENT BANNER
───────────────────────────────────────── */
function AnnouncementBanner() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (localStorage.getItem("hufi_rename_banner") === "closed") setOpen(false);
  }, []);
  if (!open) return null;
  const dismiss = () => {
    localStorage.setItem("hufi_rename_banner", "closed");
    setOpen(false);
  };
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-[#f97316] text-white text-sm py-2.5 px-4 flex items-center justify-center gap-3 shadow-lg">
      <span className="hidden sm:inline">🐴</span>
      <span className="font-semibold">HufManager heißt jetzt Hufi!</span>
      <span className="text-white/80 hidden md:inline">Deine Daten, dein Abo, dein Login — alles bleibt bestehen.</span>
      <a href="/auth?force=login" className="underline underline-offset-2 font-bold whitespace-nowrap">Jetzt einloggen →</a>
      <button onClick={dismiss} className="ml-2 p-0.5 hover:bg-white/20 rounded" aria-label="Schließen">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   2. HERO
───────────────────────────────────────── */
const heroBadges = [
  { icon: "🔒", text: "DSGVO-konform" },
  { icon: "🇩🇪", text: "Deutsche Server" },
  { icon: "⚡", text: "24/7 verfügbar" },
  { icon: "🤖", text: "EU AI Act" },
  { icon: "📱", text: "Kein App Store" },
];

function HufiHero() {
  const r = useReveal(0.05);
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[200px] pointer-events-none" style={{ backgroundColor: "rgba(249,115,22,0.07)" }} />
      <div className="container relative z-10 py-28 md:py-36">
        <div ref={r.ref} className={`max-w-4xl mx-auto text-center space-y-8 ${rc(r.visible)}`}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.08] tracking-tight">
            Deine Zeit<br />
            <span className="text-white">gehört dem Pferd.</span>
            <br />
            <span style={{ color: "#f97316" }}>Den Rest macht Hufi.</span>
          </h1>
          <p className="text-lg md:text-xl font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            Pferd. Mensch. Business. — alles verbunden.<br />
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Technologie ist das Werkzeug. Das Pferd ist das Ziel.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Button size="lg" className="text-lg font-bold gap-2" style={{ backgroundColor: "#f97316", color: "#fff" }} asChild>
              <a href="/auth">Kostenlos starten <ArrowRight className="h-5 w-5" /></a>
            </Button>
            <Button size="lg" variant="ghost" className="text-lg text-white/70 hover:text-white border border-white/15 hover:border-white/30 gap-2" asChild>
              <a href="#voice">Mehr erfahren <ArrowRight className="h-5 w-5" /></a>
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {heroBadges.map((b) => (
              <span key={b.text} className="text-xs font-medium px-3 py-1.5 rounded-full border flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                <span>{b.icon}</span> {b.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   3. DIE STIMME DES PFERDES
───────────────────────────────────────── */
function VoiceOfHorseSection() {
  const rTitle = useReveal();
  const rText = useReveal();
  const rCards = useReveal();
  const voiceCards = [
    { icon: "🐴", title: "Bewusstsein", desc: "Verstehen was dein Pferd wirklich braucht" },
    { icon: "💡", title: "Klarheit", desc: "Wissen was in deinem Business passiert" },
    { icon: "🤝", title: "Handeln", desc: "Informiert. Sicher. Nie allein." },
  ];
  return (
    <section id="voice" className="py-24 md:py-32 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div ref={rTitle.ref} className={`text-center mb-14 ${rc(rTitle.visible)}`}>
          <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest mb-3 block">Die Stimme des Pferdes</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
            "Pferde können nicht sprechen.<br />Aber sie haben eine Stimme."
          </h2>
        </div>
        <div ref={rText.ref} className={`max-w-3xl mx-auto text-center space-y-5 mb-16 ${rc(rText.visible)}`}>
          <p className="text-lg text-gray-600 leading-relaxed">
            Vor über 5.500 Jahren hat das Pferd die Welt des Menschen verändert — ohne je gehört zu werden. Es hat uns Kontinente erschlossen, Kriege entschieden, Felder bestellt. Die folgenreichste Partnerschaft der Menschheitsgeschichte.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed font-medium">
            Hufi gibt dem Pferd diese Stimme. Dir gibt Hufi Klarheit. Deinem Business gibt Hufi Struktur. Niemand soll alleine sein — nicht mit seinen Daten, nicht mit seinen Fragen, nicht mit seinem Pferd.
          </p>
        </div>
        <div ref={rCards.ref} className={`grid md:grid-cols-3 gap-6 ${rc(rCards.visible)}`}>
          {voiceCards.map((c) => (
            <div key={c.title} className="text-center p-8 rounded-2xl border border-gray-100 bg-gray-50 hover:border-[#f97316]/30 transition-colors">
              <div className="text-4xl mb-4">{c.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{c.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   4. PAIN SECTION
───────────────────────────────────────── */
const pains = [
  {
    icon: "🗺️",
    title: "Jeder Tag neu planen.",
    text: "Welche Reihenfolge? Welche Route? Wer ist wo? Das kostet Kopf — bevor du überhaupt im Stall bist.",
  },
  {
    icon: "📋",
    title: "Befunde irgendwo. Fotos im Handy.",
    text: "In drei Monaten weißt du was du heute gemacht hast — aber nicht mehr wo. Das darf nicht so sein.",
  },
  {
    icon: "💸",
    title: "Rechnungen die du vergisst.",
    text: "Nicht aus Großzügigkeit. Aus Zeitmangel. Geld das du verdient hast — und nie siehst.",
  },
];

function PainSection() {
  const rHead = useReveal();
  const rCards = useReveal();
  const rCta = useReveal();
  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="max-w-5xl mx-auto px-6">
        <div ref={rHead.ref} className={`text-center mb-16 ${rc(rHead.visible)}`}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
            Nach dem letzten Pferd<br />
            fängt die Arbeit an.<br />
            <span style={{ color: "#f97316" }}>Mit Hufi nicht mehr.</span>
          </h2>
        </div>
        <div ref={rCards.ref} className={`grid md:grid-cols-3 gap-6 mb-12 ${rc(rCards.visible)}`}>
          {pains.map((p) => (
            <div key={p.title} className="p-8 rounded-2xl border" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
              <div className="text-3xl mb-4">{p.icon}</div>
              <h3 className="text-lg font-bold text-white mb-3">{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{p.text}</p>
            </div>
          ))}
        </div>
        <div ref={rCta.ref} className={`text-center space-y-4 ${rc(rCta.visible)}`}>
          <p className="text-white/50 text-sm">Das sind keine Ausnahmen. Das ist Pferdealltag.</p>
          <Button size="lg" className="font-bold gap-2 text-white" style={{ backgroundColor: "#f97316" }} asChild>
            <a href="/auth">Hufi macht das anders <ArrowRight className="h-5 w-5" /></a>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   5. THREE PILLARS
───────────────────────────────────────── */
const pillars = [
  {
    icon: "🐴",
    label: "DAS PFERD",
    color: "#f97316",
    points: ["Sicherheit & Geborgenheit", "Gesundheit & Wohlergehen", "Verstanden werden", "Eine Stimme haben"],
    summary: "Hufi gibt dem Pferd eine Stimme.",
  },
  {
    icon: "👤",
    label: "DER MENSCH",
    color: "#3b82f6",
    points: ["Zeit für das Pferd", "Klarheit statt Chaos", "Vertrauen in die Daten", "Nie allein sein"],
    summary: "Hufi gibt dir Ruhe und Klarheit.",
  },
  {
    icon: "🏢",
    label: "DAS BUSINESS",
    color: "#10b981",
    points: ["Struktur & Übersicht", "Stabilität & Planbarkeit", "Wachstum ohne Aufwand", "Rechtssicherheit"],
    summary: "Hufi gibt deinem Business Fundament.",
  },
];

function ThreePillarsSection() {
  const rHead = useReveal();
  const rCards = useReveal();
  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div ref={rHead.ref} className={`text-center mb-16 ${rc(rHead.visible)}`}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-3">
            Das Pferd. Der Mensch. Das Business.
          </h2>
          <p className="text-gray-500 text-lg">Drei Welten. Ein Kern. Ein Werkzeug.</p>
        </div>
        <div ref={rCards.ref} className={`grid md:grid-cols-3 gap-6 ${rc(rCards.visible)}`}>
          {pillars.map((p) => (
            <div key={p.label} className="rounded-2xl border-2 p-8 flex flex-col gap-4" style={{ borderColor: `${p.color}30`, backgroundColor: `${p.color}05` }}>
              <div className="text-3xl">{p.icon}</div>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: p.color }}>{p.label}</span>
              <ul className="space-y-2 flex-1">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-gray-700 text-sm">
                    <Check className="h-4 w-4 flex-shrink-0" style={{ color: p.color }} />
                    {pt}
                  </li>
                ))}
              </ul>
              <p className="text-sm font-semibold text-gray-900 pt-2 border-t border-gray-100">{p.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   6. DER WEG DER VERÄNDERUNG
───────────────────────────────────────── */
const changeSteps = [
  { n: 1, title: "Bewusstsein", sub: "Ich sehe es" },
  { n: 2, title: "Verstehen", sub: "Ich begreife es" },
  { n: 3, title: "Entscheiden", sub: "Ich will es ändern" },
  { n: 4, title: "Handeln", sub: "Ich tue es" },
  { n: 5, title: "Wachsen", sub: "Es wird Teil von mir" },
];

function ChangePathSection() {
  const rHead = useReveal();
  const rSteps = useReveal();
  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="max-w-5xl mx-auto px-6">
        <div ref={rHead.ref} className={`text-center mb-16 ${rc(rHead.visible)}`}>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Der Weg der Veränderung</h2>
          <p className="text-white/40 text-sm">Gilt für Pferd, Mensch und Business gleichzeitig.</p>
        </div>
        <div ref={rSteps.ref} className={`flex flex-col md:flex-row items-center gap-4 md:gap-0 ${rc(rSteps.visible)}`}>
          {changeSteps.map((s, i) => (
            <div key={s.n} className="flex md:flex-col items-center gap-4 md:gap-2 flex-1">
              <div className="flex md:flex-col items-center gap-4 flex-1 w-full">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full font-extrabold text-lg" style={{ backgroundColor: "#f97316", color: "#fff" }}>
                  {s.n}
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-sm">{s.title}</p>
                  <p className="text-white/40 text-xs">{s.sub}</p>
                </div>
              </div>
              {i < changeSteps.length - 1 && (
                <ArrowRight className="h-5 w-5 flex-shrink-0 md:rotate-0 rotate-90" style={{ color: "rgba(249,115,22,0.4)" }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   7. IKIGAI
───────────────────────────────────────── */
function IkigaiSection() {
  const r = useReveal();
  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div ref={r.ref} className={`space-y-8 ${rc(r.visible)}`}>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">Der Schnittpunkt — Ikigai</h2>
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            {["Was das Pferd braucht.", "Was der Mensch liebt.", "Was die Welt braucht.", "Was trägt."].map((t) => (
              <div key={t} className="p-4 rounded-xl bg-[#f97316]/8 border border-[#f97316]/20 text-sm font-medium text-gray-700">{t}</div>
            ))}
          </div>
          <div className="p-6 rounded-2xl" style={{ backgroundColor: "#f97316" }}>
            <p className="text-white font-extrabold text-xl mb-2">🐴 HUFI</p>
            <p className="text-white/90 text-sm leading-relaxed">
              Hufi entsteht genau dort, wo diese vier Dinge sich treffen.<br />
              Nicht als Technologie-Produkt. Als Antwort auf eine echte Frage.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   8. ECOSYSTEM HEADER
───────────────────────────────────────── */
function EcosystemHeader() {
  const r = useReveal();
  const roles = [
    { icon: "🔧", title: "Hufpfleger & Hufschmiede", desc: "Termine, Touren, Befunde, Rechnungen. KI dokumentiert mit." },
    { icon: "🐎", title: "Pferdebesitzer", desc: "Digitale Pferdeakte, Befunde, Dienstleister — kostenlos." },
    { icon: "👥", title: "Tierärzte & Therapeuten", desc: "Befunde einsehen, Diagnosen ergänzen — mit Freigabe." },
    { icon: "🏢", title: "Stallbetreiber & Teams", desc: "Alle Pferde, alle Dienstleister, ein Dashboard." },
  ];
  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="max-w-5xl mx-auto px-6">
        <div ref={r.ref} className={`text-center mb-14 ${rc(r.visible)}`}>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            Ein Pferd. Viele Menschen. Ein System.
          </h2>
          <p className="text-white/50">Das Pferd im Mittelpunkt. Alle verbunden.</p>
        </div>
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center justify-center h-20 w-20 rounded-full text-3xl font-extrabold text-white shadow-lg shadow-orange-500/30" style={{ backgroundColor: "#f97316" }}>
            🐴
          </div>
          <div className="text-white/30 text-xs uppercase tracking-widest font-bold">verbunden durch</div>
          <div className="text-[#f97316] text-xl font-extrabold tracking-wide">HUFI VERBINDET</div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 w-full mt-6">
            {roles.map((role) => (
              <div key={role.title} className="p-6 rounded-2xl border text-center group hover:border-[#f97316]/40 transition-colors" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                <div className="text-2xl mb-3">{role.icon}</div>
                <h3 className="text-white font-bold text-sm mb-2">{role.title}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{role.desc}</p>
                <a href="/auth" className="text-[#f97316] text-xs font-medium mt-3 inline-flex items-center gap-1 hover:gap-2 transition-all">Mehr erfahren <ArrowRight className="h-3 w-3" /></a>
              </div>
            ))}
          </div>
          <p className="text-white/30 text-xs text-center mt-2">Jede Rolle verbunden mit jeder — für lückenlose Kommunikation rund ums Pferd.</p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   9. DATA SOVEREIGNTY
───────────────────────────────────────── */
const dataPoints = [
  "Kein Hufpfleger sieht dein Pferd ohne deine Erlaubnis",
  "Kein Tierarzt, kein Therapeut — niemand ohne dein Ja",
  "Du siehst jederzeit wer Zugriff hat",
  "Du kannst jeden Zugriff sofort entziehen",
  "Du bestimmst welche Daten geteilt werden",
  "Deine Daten bleiben auf deutschen Servern",
];

function DataSovereigntySection() {
  const r = useReveal();
  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div ref={r.ref} className={`space-y-8 ${rc(r.visible)}`}>
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full mb-6" style={{ backgroundColor: "#f97316" }}>
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">Du entscheidest. Immer.</h2>
            <p className="text-gray-500">Der Pferdebesitzer hat vollständige Datenhoheit über sein Pferd.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {dataPoints.map((pt) => (
              <div key={pt} className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-100">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 leading-relaxed">{pt}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 font-medium">Das ist kein Versprechen — das ist technisch so gebaut.</p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   10. FEATURES COMPARISON
───────────────────────────────────────── */
const provenFeatures = [
  "Terminkalender & Tourenplanung",
  "Kunden & Pferdeverwaltung",
  "Rechnungen & Buchhaltung",
  "Pferdeakte & Befunde",
  "Mitarbeiter & Rollen",
  "DSGVO-konform, EU-Server",
  "PWA (App ohne App Store)",
  "Offline-Modus",
];

const newFeatures = [
  { text: "Hufi KI-Assistent (proaktiv)", icon: Brain },
  { text: "'Hey Hufi' Sprachsteuerung", icon: Mic },
  { text: "AutoFlow — Sprache wird Befund", icon: Zap },
  { text: "HufCam Pro — KI-Hufanalyse", icon: Camera },
  { text: "Hufi Brain — lernt deinen Betrieb", icon: Brain },
  { text: "Intent Detection (erkennt was du willst)", icon: Search },
  { text: "Dienstleister-Suche per KI", icon: Search },
  { text: "DSGVO + EU AI Act konform", icon: Shield },
];

const clientFeatures = [
  "Digitale Pferdeakte",
  "Befunde vom Hufpfleger sehen",
  "Dienstleister finden & kontaktieren",
  "Termine einsehen",
  "Dokumente & Impfpass",
];

function FeaturesComparisonSection() {
  const rHead = useReveal();
  const rCols = useReveal();
  const rClient = useReveal();
  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="max-w-5xl mx-auto px-6">
        <div ref={rHead.ref} className={`text-center mb-14 ${rc(rHead.visible)}`}>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Bewährt. Intelligent. Vollständig.</h2>
          <p className="text-white/50">Alles was du liebst — jetzt mit KI-Superkräften.</p>
        </div>
        <div ref={rCols.ref} className={`grid md:grid-cols-2 gap-6 mb-6 ${rc(rCols.visible)}`}>
          {/* Proven */}
          <div className="rounded-2xl border p-8" style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)" }}>
            <h3 className="text-white font-bold text-base mb-6 flex items-center gap-2">
              <span className="text-green-400">✅</span> Das bewährte Fundament
            </h3>
            <ul className="space-y-3">
              {provenFeatures.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <Check className="h-4 w-4 text-green-400 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>
          {/* New */}
          <div className="rounded-2xl border-2 p-8" style={{ borderColor: "rgba(249,115,22,0.4)", backgroundColor: "rgba(249,115,22,0.05)" }}>
            <h3 className="text-white font-bold text-base mb-6 flex items-center gap-2">
              <span>🆕</span> Neu bei Hufi
            </h3>
            <ul className="space-y-3">
              {newFeatures.map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <Check className="h-4 w-4 flex-shrink-0" style={{ color: "#f97316" }} /> {f.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* Pferdebesitzer free */}
        <div ref={rClient.ref} className={`rounded-2xl border p-8 ${rc(rClient.visible)}`} style={{ borderColor: "rgba(59,130,246,0.3)", backgroundColor: "rgba(59,130,246,0.05)" }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="text-3xl">🐴</div>
            <div>
              <h3 className="text-white font-bold text-base">Für Pferdebesitzer</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(59,130,246,0.2)", color: "#60a5fa" }}>NEU · Kostenlos</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {clientFeatures.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                <Check className="h-4 w-4 text-blue-400 flex-shrink-0" /> {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   11. FOUNDER
───────────────────────────────────────── */
const founderParagraphs = [
  "Ich bin seit fast 20 Jahren in der Pferdebranche — persönlich, privat und beruflich.",
  "Nicht als Theoretiker von außen. Sondern mittendrin.",
  "Von der Geburt eines Fohlens bis zur Regenbogenbrücke jedes Pferdes.",
  "Ich habe nicht den Tunnelblick eines Spezialisten — ich habe das breite Wissen von jemandem der die ganze Branche kennt.",
  "Und ich bin nicht müde. Nicht ausgebrannt. Vielleicht körperlich manchmal — aber nicht im Herzen und nicht im Bewusstsein.",
  "Ich fange erst jetzt richtig an zu brennen.",
  "Was ich tue, tue ich seit über 10 Jahren aus tiefer Dankbarkeit gegenüber dieser Branche und den Menschen und Pferden darin.",
  "Hufi ist kein Startup-Produkt das von außen in eine Welt reingrätscht.",
  "Es ist das was diese Branche verdient hat — gebaut von jemandem der sie liebt.",
];

function FounderSection() {
  const rHead = useReveal();
  const rBody = useReveal();
  const rQuote = useReveal();
  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div ref={rHead.ref} className={`text-center mb-14 ${rc(rHead.visible)}`}>
          <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest mb-3 block">Gebaut von jemandem der die Branche liebt</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">Der Mensch hinter Hufi.</h2>
        </div>
        <div ref={rBody.ref} className={`grid md:grid-cols-5 gap-12 items-start mb-12 ${rc(rBody.visible)}`}>
          <div className="md:col-span-2 flex flex-col items-center gap-4">
            <img src={pascalImage} alt="Pascal Schmid – Gründer Hufi" className="w-48 h-48 rounded-2xl object-cover shadow-lg" />
            <div className="text-center">
              <p className="font-bold text-gray-900">Pascal Schmid</p>
              <p className="text-sm text-gray-500">Gründer Hufi · Hufbearbeiter & Barhufexperte</p>
            </div>
          </div>
          <div className="md:col-span-3 space-y-4">
            {founderParagraphs.map((p) => (
              <p key={p} className="text-gray-600 leading-relaxed text-sm">{p}</p>
            ))}
          </div>
        </div>
        <div ref={rQuote.ref} className={`p-8 rounded-2xl text-center ${rc(rQuote.visible)}`} style={{ backgroundColor: "#f97316" }}>
          <p className="text-white text-lg font-medium italic leading-relaxed mb-3">
            "Pferde können nicht sprechen. Aber wir können ihnen eine Stimme geben — die sie sich nach über 5.500 Jahren an unserer Seite verdient haben."
          </p>
          <p className="text-white/80 text-sm font-bold">— Pascal Schmid</p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   12. FINAL CTA (Hufi-spezifisch)
───────────────────────────────────────── */
function HufiCTA() {
  const r = useReveal();
  const ctaBadges = ["🔒 SSL", "🇩🇪 EU-Server", "✅ DSGVO", "📱 PWA-App", "§ 19 UStG"];
  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{ backgroundColor: "#f97316" }}>
      <div className="container relative z-10">
        <div ref={r.ref} className={`max-w-3xl mx-auto text-center space-y-8 ${rc(r.visible)}`}>
          <h2 className="font-extrabold text-4xl md:text-5xl text-white leading-tight">Bereit für Hufi?</h2>
          <p className="text-white/80 text-lg">14 Tage kostenlos. Kein Risiko. Kein App Store. Kein Vertrag.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg font-bold bg-white hover:bg-white/90 gap-2" style={{ color: "#f97316" }} asChild>
              <a href="/auth">Kostenlos starten <ArrowRight className="h-5 w-5" /></a>
            </Button>
            <Button size="lg" variant="ghost" className="text-lg text-white hover:bg-white/10 border border-white/30 gap-2" asChild>
              <a href="/auth?force=login">Einloggen</a>
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {ctaBadges.map((b) => (
              <span key={b} className="text-white/70 text-xs font-medium">{b}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
const WebsiteHome = () => {
  useGA4();

  useEffect(() => {
    document.title = "Hufi — Deine Zeit gehört dem Pferd";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Hufi ist die All-in-One-App für alle die am Pferd arbeiten. Termine, Touren, KI-Befunde, Rechnungen, Pferdeakte — alles in einer App. Jetzt 14 Tage kostenlos.");
    const existingLd = document.querySelector('script[data-huf-schema]');
    if (!existingLd) {
      const ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.setAttribute("data-huf-schema", "true");
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Hufi",
        description: "Die All-in-One-App für alle die am Pferd arbeiten",
        url: "https://hufiapp.de",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        offers: { "@type": "AggregateOffer", lowPrice: "9.90", highPrice: "79.00", priceCurrency: "EUR" },
        author: { "@type": "Person", name: "Pascal Schmid" },
      });
      document.head.appendChild(ld);
    }
    return () => { document.querySelector('script[data-huf-schema]')?.remove(); };
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <AnnouncementBanner />
      <div className="pt-10"> {/* push content below fixed banner */}
        <Navbar />
      </div>
      <HufiHero />
      <VoiceOfHorseSection />
      <PainSection />
      <ThreePillarsSection />
      <ChangePathSection />
      <IkigaiSection />
      <EcosystemHeader />
      <DataSovereigntySection />
      <FeaturesComparisonSection />
      <PricingV2 />
      <FounderSection />
      <TestimonialsSection />
      <HufiCTA />
      <FooterNew />
      <CookieBanner />
    </div>
  );
};

export default WebsiteHome;
