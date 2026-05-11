import { useState, useEffect, useRef } from "react";
import { ArrowRight, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/website/Navbar";
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
   1. PHONE MOCKUP
───────────────────────────────────────── */
const mockupScreens = [
  {
    id: "briefing",
    tag: "🌅  Proaktives Briefing",
    content: (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-semibold" style={{ color: "#f97316" }}>HUFI</p>
          <p className="text-white font-bold text-sm leading-tight">Guten Morgen 👋</p>
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Dienstag · 07:45 Uhr</p>
        </div>
        <div className="px-4 pt-3 space-y-2.5 flex-1">
          {[
            { icon: "📅", text: "3 Termine heute", accent: "#f97316" },
            { icon: "⚠️", text: "Luna — Huf überfällig", accent: "#eab308" },
            { icon: "🌧", text: "Morgen Regen — früher starten", accent: "#60a5fa" },
          ].map((i) => (
            <div key={i.text} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
              <span className="text-sm flex-shrink-0">{i.icon}</span>
              <p className="text-xs leading-snug" style={{ color: "rgba(255,255,255,0.75)" }}>{i.text}</p>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4 pt-2 flex gap-2">
          <span className="text-[10px] font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(249,115,22,0.15)", color: "#f97316" }}>Termine</span>
          <span className="text-[10px] font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>Pferde</span>
        </div>
      </div>
    ),
  },
  {
    id: "voice",
    tag: "🎙️  Hey Hufi",
    content: (
      <div className="flex flex-col h-full items-center justify-center px-4 gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: "#f97316", boxShadow: "0 0 32px rgba(249,115,22,0.5)" }}>
          <span className="text-2xl">🎙️</span>
        </div>
        <p className="text-white font-bold text-sm text-center">Hey Hufi, wer ist als nächstes dran?</p>
        <div className="flex items-end gap-1 h-8">
          {[3,5,8,6,4,7,5,3,6,4].map((h, i) => (
            <div key={i} className="w-1 rounded-full" style={{ height: `${h * 3}px`, backgroundColor: "#f97316", opacity: 0.7 + (i % 3) * 0.1, animation: `pulse ${0.8 + i * 0.1}s ease-in-out infinite alternate` }} />
          ))}
        </div>
        <div className="w-full p-3 rounded-2xl" style={{ backgroundColor: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)" }}>
          <p className="text-[10px] font-semibold mb-1" style={{ color: "#f97316" }}>HUFI ANTWORTET</p>
          <p className="text-white text-xs leading-snug">14:30 Uhr · Bella · Hauptstraße 12</p>
        </div>
      </div>
    ),
  },
  {
    id: "horse",
    tag: "🐴  Pferdeakte",
    content: (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-3 pb-3 flex items-center gap-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: "rgba(249,115,22,0.2)" }}>🐴</div>
          <div>
            <p className="text-white font-bold text-sm">Luna</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Haflinger · 12 Jahre</p>
          </div>
        </div>
        <div className="px-4 pt-3 space-y-3 flex-1">
          {[
            { label: "Letzter Huftermin", value: "vor 8 Wochen", warn: true },
            { label: "Befunde", value: "3 Einträge" },
            { label: "Nächster Termin", value: "Freitag, 16.05." },
            { label: "Verantwortlich", value: "Stallbetreiberin" },
          ].map((r) => (
            <div key={r.label} className="flex justify-between items-center">
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{r.label}</p>
              <p className="text-[10px] font-semibold" style={{ color: r.warn ? "#eab308" : "rgba(255,255,255,0.8)" }}>{r.value}</p>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4 pt-2">
          <div className="w-full py-2 rounded-xl text-center text-[10px] font-bold" style={{ backgroundColor: "rgba(249,115,22,0.15)", color: "#f97316" }}>
            Befund dokumentieren
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "tour",
    tag: "📍  Tagesroute",
    content: (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-white font-bold text-sm">Tagesroute</p>
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>4 Stops · ca. 85 km</p>
        </div>
        <div className="px-4 pt-3 space-y-2 flex-1">
          {[
            { time: "09:00", horses: "2 Pferde", done: true },
            { time: "11:30", horses: "1 Pferd", done: true },
            { time: "14:30", horses: "Bella", active: true },
            { time: "16:00", horses: "3 Pferde" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ backgroundColor: s.active ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.04)", border: s.active ? "1px solid rgba(249,115,22,0.3)" : "1px solid transparent" }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.done ? "#10b981" : s.active ? "#f97316" : "rgba(255,255,255,0.2)" }} />
              <p className="text-[10px] font-bold w-10" style={{ color: s.active ? "#f97316" : "rgba(255,255,255,0.5)" }}>{s.time}</p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.75)" }}>{s.horses}</p>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4 pt-2">
          <div className="w-full py-2 rounded-xl text-center text-[10px] font-bold flex items-center justify-center gap-1" style={{ backgroundColor: "#f97316", color: "#fff" }}>
            Navigation starten →
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "invoice",
    tag: "✅  Rechnung erstellt",
    content: (
      <div className="flex flex-col h-full items-center justify-center px-4 gap-3">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.4)" }}>
          <span className="text-2xl">✅</span>
        </div>
        <p className="text-white font-bold text-sm text-center">Rechnung erstellt</p>
        <div className="w-full p-4 rounded-2xl space-y-2" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {[
            { label: "Datum", value: "11.05.2026" },
            { label: "Leistung", value: "Hufbearbeitung" },
            { label: "Betrag", value: "85,00 €", bold: true },
            { label: "Status", value: "PDF bereit" },
          ].map((r) => (
            <div key={r.label} className="flex justify-between">
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{r.label}</p>
              <p className="text-[10px] font-semibold" style={{ color: r.bold ? "#f97316" : "rgba(255,255,255,0.8)" }}>{r.value}</p>
            </div>
          ))}
        </div>
        <div className="w-full py-2 rounded-xl text-center text-[10px] font-bold" style={{ backgroundColor: "rgba(249,115,22,0.15)", color: "#f97316" }}>
          Per E-Mail senden
        </div>
      </div>
    ),
  },
];

function PhoneMockup() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActive((prev) => (prev + 1) % mockupScreens.length);
        setVisible(true);
      }, 350);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const screen = mockupScreens[active];

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Glow */}
      <div className="absolute inset-0 rounded-[44px] blur-[60px] scale-90 -z-10" style={{ backgroundColor: "rgba(249,115,22,0.18)" }} />

      {/* Phone frame */}
      <div
        className="relative w-[240px] sm:w-[260px] rounded-[42px] overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(160deg, #1a1a1a 0%, #111 100%)",
          border: "1.5px solid rgba(255,255,255,0.12)",
          height: "490px",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 40px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Dynamic island */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-24 h-6 rounded-full flex items-center justify-center gap-1" style={{ backgroundColor: "#000" }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#111" }} />
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#111", border: "1px solid rgba(255,255,255,0.05)" }} />
          </div>
        </div>

        {/* Status bar */}
        <div className="flex justify-between items-center px-5 pb-1">
          <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>9:41</span>
          <div className="flex items-center gap-1">
            {[3, 4, 5, 5].map((h, i) => (
              <div key={i} className="w-0.5 rounded-sm" style={{ height: `${h}px`, backgroundColor: i < 3 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)" }} />
            ))}
            <div className="ml-1 w-5 h-2.5 rounded-sm border flex items-center px-0.5" style={{ borderColor: "rgba(255,255,255,0.4)" }}>
              <div className="h-1.5 rounded-sm w-3/4" style={{ backgroundColor: "rgba(255,255,255,0.6)" }} />
            </div>
          </div>
        </div>

        {/* Screen with fade */}
        <div
          className="mx-3 rounded-2xl overflow-hidden flex-1"
          style={{
            height: "390px",
            backgroundColor: "#0d0d0d",
            border: "1px solid rgba(255,255,255,0.06)",
            transition: "opacity 0.35s ease",
            opacity: visible ? 1 : 0,
          }}
        >
          <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(249,115,22,0.05)" }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]" style={{ backgroundColor: "#f97316" }}>H</div>
            <span className="text-[9px] font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>{screen.tag}</span>
          </div>
          <div style={{ height: "352px", overflowY: "hidden" }}>
            {screen.content}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 py-2">
          {mockupScreens.map((_, i) => (
            <button
              key={i}
              onClick={() => { setVisible(false); setTimeout(() => { setActive(i); setVisible(true); }, 350); }}
              className="rounded-full transition-all"
              style={{ width: i === active ? "16px" : "5px", height: "5px", backgroundColor: i === active ? "#f97316" : "rgba(255,255,255,0.2)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   2. HERO
───────────────────────────────────────── */
const heroBadges = [
  { icon: "🔒", text: "DSGVO" },
  { icon: "🇩🇪", text: "EU-Server" },
  { icon: "📱", text: "Kein App Store" },
  { icon: "🤖", text: "EU AI Act" },
];

function HufiHero() {
  const r = useReveal(0.05);
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[200px] pointer-events-none" style={{ backgroundColor: "rgba(249,115,22,0.06)" }} />
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 relative z-10 py-16 md:py-24">
        <div ref={r.ref} className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${rc(r.visible)}`}>

          {/* Left: Text */}
          <div className="text-center lg:text-left space-y-6 order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold" style={{ borderColor: "rgba(249,115,22,0.3)", color: "#f97316", backgroundColor: "rgba(249,115,22,0.08)" }}>
              Proaktives Briefing · Hey Hufi · Jetzt live
            </div>
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold text-white leading-[1.08] tracking-tight">
              Deine Zeit<br />
              <span className="text-white">gehört dem Pferd.</span>
              <br />
              <span style={{ color: "#f97316" }}>Den Rest macht Hufi.</span>
            </h1>
            <p className="text-base sm:text-lg font-medium max-w-md mx-auto lg:mx-0" style={{ color: "rgba(255,255,255,0.5)" }}>
              Dein intelligenter Pferde-Assistent —
              proaktiv, sprachgesteuert, stalltauglich.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button size="lg" className="text-base font-bold gap-2 w-full sm:w-auto" style={{ backgroundColor: "#f97316", color: "#fff" }} asChild>
                <a href="/auth">Kostenlos starten <ArrowRight className="h-5 w-5" /></a>
              </Button>
              <Button size="lg" variant="ghost" className="text-base text-white/70 hover:text-white border border-white/15 hover:border-white/30 gap-2 w-full sm:w-auto" asChild>
                <a href="#warum">Mehr erfahren</a>
              </Button>
            </div>
            <p className="text-white/25 text-xs">Kein App Store · Keine Kreditkarte · Kündigung jederzeit</p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-2">
              {heroBadges.map((b) => (
                <span key={b.text} className="text-xs font-medium px-3 py-1.5 rounded-full border flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.35)", borderColor: "rgba(255,255,255,0.09)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                  <span>{b.icon}</span> {b.text}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Phone mockup */}
          <div className="flex justify-center order-2">
            <PhoneMockup />
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   2. PAIN SECTION
───────────────────────────────────────── */
const pains = [
  {
    icon: "🗺️",
    title: "Jeder Tag neu planen.",
    text: "Route, Reihenfolge, wer ist wo — das kostet Kopf, bevor du überhaupt im Stall bist.",
  },
  {
    icon: "📋",
    title: "Befunde irgendwo. Fotos im Handy.",
    text: "In drei Monaten weißt du was du heute gemacht hast — aber nicht mehr wo.",
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
    <section id="warum" className="py-20 md:py-28" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div ref={rHead.ref} className={`text-center mb-12 ${rc(rHead.visible)}`}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
            Nach dem letzten Pferd<br />
            fängt die Arbeit an.<br />
            <span style={{ color: "#f97316" }}>Mit Hufi nicht mehr.</span>
          </h2>
        </div>
        <div ref={rCards.ref} className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 ${rc(rCards.visible)}`}>
          {pains.map((p) => (
            <div key={p.title} className="p-6 rounded-2xl border" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
              <div className="text-3xl mb-4">{p.icon}</div>
              <h3 className="text-base font-bold text-white mb-2">{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{p.text}</p>
            </div>
          ))}
        </div>
        <div ref={rCta.ref} className={`text-center space-y-4 ${rc(rCta.visible)}`}>
          <p className="text-white/40 text-sm">Das sind keine Ausnahmen. Das ist Pferdealltag.</p>
          <Button size="lg" className="font-bold gap-2 text-white w-full sm:w-auto" style={{ backgroundColor: "#f97316" }} asChild>
            <a href="/auth">Hufi macht das anders <ArrowRight className="h-5 w-5" /></a>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   3. DIE STIMME DES PFERDES
───────────────────────────────────────── */
const voiceCards = [
  { icon: "🐴", title: "Das Pferd", desc: "Verstanden werden. Eine Stimme haben. Sicher und gesund." },
  { icon: "👤", title: "Der Mensch", desc: "Zeit für das Pferd. Klarheit statt Chaos. Nie allein." },
  { icon: "🏢", title: "Das Business", desc: "Struktur, Stabilität, Wachstum ohne Mehraufwand." },
];

function VoiceOfHorseSection() {
  const rTitle = useReveal();
  const rCards = useReveal();
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div ref={rTitle.ref} className={`text-center mb-12 ${rc(rTitle.visible)}`}>
          <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest mb-3 block">Die Stimme des Pferdes</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
            "Pferde können nicht sprechen.<br className="hidden sm:block" />Aber sie haben eine Stimme."
          </h2>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Hufi gibt dem Pferd diese Stimme. Dir gibt Hufi Klarheit. Deinem Business gibt Hufi Struktur.
            Niemand soll alleine sein — nicht mit seinen Daten, nicht mit seinem Pferd.
          </p>
        </div>
        <div ref={rCards.ref} className={`grid grid-cols-1 md:grid-cols-3 gap-5 ${rc(rCards.visible)}`}>
          {voiceCards.map((c) => (
            <div key={c.title} className="text-center p-7 rounded-2xl border border-gray-100 bg-gray-50 hover:border-[#f97316]/30 transition-colors">
              <div className="text-4xl mb-3">{c.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{c.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   4. ECOSYSTEM — WER NUTZT HUFI
───────────────────────────────────────── */
function EcosystemHeader() {
  const rHead = useReveal();
  const rCards = useReveal();
  const roles = [
    { icon: "🔧", title: "Hufpfleger & Hufschmiede", desc: "Termine, Touren, Befunde, Rechnungen. KI dokumentiert mit." },
    { icon: "🐎", title: "Pferdebesitzer", desc: "Digitale Pferdeakte, Befunde, Dienstleister — kostenlos." },
    { icon: "👥", title: "Tierärzte & Therapeuten", desc: "Befunde einsehen, Diagnosen ergänzen — mit Freigabe." },
    { icon: "🏢", title: "Stallbetreiber & Teams", desc: "Alle Pferde, alle Dienstleister, ein Dashboard." },
  ];
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div ref={rHead.ref} className={`text-center mb-12 ${rc(rHead.visible)}`}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Ein Pferd. Viele Menschen. Ein System.
          </h2>
          <p className="text-white/50 text-sm sm:text-base">Das Pferd im Mittelpunkt. Alle verbunden.</p>
        </div>
        <div ref={rCards.ref} className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 ${rc(rCards.visible)}`}>
          {roles.map((role) => (
            <div key={role.title} className="p-6 rounded-2xl border text-center group hover:border-[#f97316]/40 transition-colors" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)" }}>
              <div className="text-2xl mb-3">{role.icon}</div>
              <h3 className="text-white font-bold text-sm mb-2">{role.title}</h3>
              <p className="text-white/40 text-xs leading-relaxed mb-3">{role.desc}</p>
              <a href="/auth" className="text-[#f97316] text-xs font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all">Mehr erfahren <ArrowRight className="h-3 w-3" /></a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   5. FEATURES
───────────────────────────────────────── */
const provenFeatures = [
  "Terminkalender & Tourenplanung",
  "Kunden & Pferdeverwaltung",
  "Rechnungen & Buchhaltung",
  "Pferdeakte & Befunde",
  "Mitarbeiter & Rollen",
  "DSGVO-konform, EU-Server",
  "PWA — kein App Store nötig",
  "Offline-Modus",
];

const newFeatures = [
  "Proaktives Tages-Briefing (HufAI)",
  "'Hey Hufi' Sprachsteuerung",
  "AutoFlow — Sprache wird Befund",
  "HufCam Pro — Hufanalyse mit KI",
  "Pferde-Gedächtnis (Kontext, Verlauf)",
  "Intent Detection — Hufi erkennt was du willst",
  "DSGVO + EU AI Act konform",
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
    <section className="py-20 md:py-28" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div ref={rHead.ref} className={`text-center mb-12 ${rc(rHead.visible)}`}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Bewährt. Intelligent. Vollständig.</h2>
          <p className="text-white/50 text-sm sm:text-base">Alles was du liebst — jetzt mit echter KI-Intelligenz.</p>
        </div>
        <div ref={rCols.ref} className={`grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 ${rc(rCols.visible)}`}>
          <div className="rounded-2xl border p-6 sm:p-8" style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)" }}>
            <h3 className="text-white font-bold text-sm mb-5 flex items-center gap-2">
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
          <div className="rounded-2xl border-2 p-6 sm:p-8" style={{ borderColor: "rgba(249,115,22,0.4)", backgroundColor: "rgba(249,115,22,0.05)" }}>
            <h3 className="text-white font-bold text-sm mb-5 flex items-center gap-2">
              <span>✨</span> HufAI — Neu & Live
            </h3>
            <ul className="space-y-3">
              {newFeatures.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <Check className="h-4 w-4 flex-shrink-0" style={{ color: "#f97316" }} /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div ref={rClient.ref} className={`rounded-2xl border p-6 sm:p-8 ${rc(rClient.visible)}`} style={{ borderColor: "rgba(59,130,246,0.3)", backgroundColor: "rgba(59,130,246,0.05)" }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
            <div className="text-2xl">🐴</div>
            <div>
              <h3 className="text-white font-bold text-sm">Für Pferdebesitzer</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(59,130,246,0.2)", color: "#60a5fa" }}>Kostenlos</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
   6. HUFAI — PROAKTIVER ASSISTENT
───────────────────────────────────────── */
const hufaiFeatures = [
  {
    icon: "🌅",
    title: "Proaktives Tages-Briefing",
    desc: "Hufi begrüßt dich jeden Morgen: Termine, überfällige Pferde, Wetter — bevor du fragst.",
  },
  {
    icon: "🎙️",
    title: "'Hey Hufi' Sprachsteuerung",
    desc: "Hände frei im Stall. Sprach-Steuerung direkt aus der Arbeit heraus.",
  },
  {
    icon: "🐴",
    title: "Pferde-Gedächtnis",
    desc: "Hufi kennt jeden Huf, jede Akte, jeden Befund. Es vergisst nichts.",
  },
  {
    icon: "⚡",
    title: "Sofort-Navigation",
    desc: "Nächster Termin, Touren-Start, offene Rechnungen — ein Wort genügt.",
  },
];

function HufAISection() {
  const rHead = useReveal();
  const rCards = useReveal();
  const rVision = useReveal();
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div ref={rHead.ref} className={`text-center mb-12 ${rc(rHead.visible)}`}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest">HufAI — Die Intelligenz dahinter</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(249,115,22,0.12)", color: "#f97316" }}>Jetzt live</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Dein Assistent denkt mit.<br className="hidden sm:block" />Bevor du fragst.
          </h2>
          <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto">
            Kein Chat-Bot. Kein Gimmick. Echter Kontext aus deinem Betrieb —
            proaktiv, sprachgesteuert, stalltauglich.
          </p>
        </div>
        <div ref={rCards.ref} className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 ${rc(rCards.visible)}`}>
          {hufaiFeatures.map((f) => (
            <div key={f.title} className="p-6 rounded-2xl border border-gray-100 bg-gray-50 hover:border-[#f97316]/30 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-gray-900 text-base mb-1.5">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        <div ref={rVision.ref} className={`rounded-2xl p-7 sm:p-10 text-center ${rc(rVision.visible)}`} style={{ backgroundColor: "#0a0a0a" }}>
          <p className="text-4xl mb-4">🐴</p>
          <p className="text-white font-extrabold text-xl sm:text-2xl mb-3">
            "Jedes Pferd bekommt eine Stimme."
          </p>
          <p className="text-white/50 text-sm max-w-md mx-auto">
            HufAI assistiert — es ersetzt keine Tierärzte oder Fachleute.
            Es gibt deinem Pferd Kontext, Verlauf und Sichtbarkeit im System.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   7. DATA SOVEREIGNTY
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
    <section className="py-20 md:py-28" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div ref={r.ref} className={`space-y-8 ${rc(r.visible)}`}>
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full mb-5" style={{ backgroundColor: "#f97316" }}>
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Du entscheidest. Immer.</h2>
            <p className="text-white/50 text-sm sm:text-base">Der Pferdebesitzer hat vollständige Datenhoheit über sein Pferd.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dataPoints.map((pt) => (
              <div key={pt} className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <Check className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white/80 leading-relaxed">{pt}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>Das ist kein Versprechen — das ist technisch so gebaut.</p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   8. FOUNDER
───────────────────────────────────────── */
const founderParagraphs = [
  "Ich bin seit fast 20 Jahren in der Pferdebranche — persönlich, privat und beruflich. Nicht als Theoretiker von außen. Mittendrin. Von der Geburt eines Fohlens bis zur Regenbogenbrücke jedes Pferdes.",
  "Ich habe nicht den Tunnelblick eines Spezialisten — ich habe das breite Wissen von jemandem der die ganze Branche kennt. Hufbearbeiter, Stallbetreiber, Besitzer, Tierärzte, Therapeuten. Alle Seiten.",
  "Hufi ist kein Startup-Produkt das von außen in eine Welt reingrätscht. Es ist das, was diese Branche verdient hat — gebaut von jemandem der sie liebt.",
  "Ich fange erst jetzt richtig an zu brennen.",
];

function FounderSection() {
  const rHead = useReveal();
  const rBody = useReveal();
  const rQuote = useReveal();
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div ref={rHead.ref} className={`text-center mb-12 ${rc(rHead.visible)}`}>
          <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest mb-3 block">Gebaut von jemandem der die Branche liebt</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Der Mensch hinter Hufi.</h2>
        </div>
        <div ref={rBody.ref} className={`grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12 items-start mb-10 ${rc(rBody.visible)}`}>
          <div className="md:col-span-2 flex flex-col items-center gap-4">
            <img
              src={pascalImage}
              alt="Pascal Schmid – Gründer Hufi"
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl object-cover shadow-lg"
            />
            <div className="text-center">
              <p className="font-bold text-gray-900">Pascal Schmid</p>
              <p className="text-sm text-gray-500">Gründer Hufi · Hufbearbeiter & Barhufexperte</p>
            </div>
          </div>
          <div className="md:col-span-3 space-y-4">
            {founderParagraphs.map((p) => (
              <p key={p.slice(0, 30)} className="text-gray-600 leading-relaxed text-sm sm:text-base">{p}</p>
            ))}
          </div>
        </div>
        <div ref={rQuote.ref} className={`p-7 sm:p-10 rounded-2xl text-center ${rc(rQuote.visible)}`} style={{ backgroundColor: "#f97316" }}>
          <p className="text-white text-base sm:text-lg font-medium italic leading-relaxed mb-3">
            "Pferde können nicht sprechen. Aber wir können ihnen eine Stimme geben —
            die sie sich nach über 5.500 Jahren an unserer Seite verdient haben."
          </p>
          <p className="text-white/80 text-sm font-bold">— Pascal Schmid</p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   9. FINAL CTA
───────────────────────────────────────── */
function HufiCTA() {
  const r = useReveal();
  const ctaBadges = ["🔒 SSL", "🇩🇪 EU-Server", "✅ DSGVO", "📱 PWA", "§ 19 UStG"];
  return (
    <section className="relative py-20 md:py-28 overflow-hidden" style={{ backgroundColor: "#f97316" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
        <div ref={r.ref} className={`text-center space-y-7 ${rc(r.visible)}`}>
          <h2 className="font-extrabold text-3xl sm:text-4xl md:text-5xl text-white leading-tight">
            Bereit für Hufi?
          </h2>
          <p className="text-white/80 text-base sm:text-lg">14 Tage kostenlos. Kein Risiko. Kein App Store. Kein Vertrag.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="text-base sm:text-lg font-bold bg-white hover:bg-white/90 gap-2 w-full sm:w-auto" style={{ color: "#f97316" }} asChild>
              <a href="/auth">Kostenlos starten <ArrowRight className="h-5 w-5" /></a>
            </Button>
            <Button size="lg" variant="ghost" className="text-base sm:text-lg text-white hover:bg-white/10 border border-white/30 gap-2 w-full sm:w-auto" asChild>
              <a href="/auth?force=login">Einloggen</a>
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
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
    document.title = "Hufi — Dein intelligenter Pferde-Assistent";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Hufi ist dein proaktiver Pferde-Assistent: Termine, Pferdeakte, Hey-Hufi-Sprachsteuerung, Rechnungen — alles in einer App. Jetzt 14 Tage kostenlos testen.");
    const existingLd = document.querySelector('script[data-huf-schema]');
    if (!existingLd) {
      const ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.setAttribute("data-huf-schema", "true");
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Hufi",
        description: "Dein intelligenter Pferde-Assistent — proaktives Briefing, Sprachsteuerung, Pferdeakte, Termine und Rechnungen in einer App.",
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
      <Navbar />
      <HufiHero />
      <PainSection />
      <VoiceOfHorseSection />
      <EcosystemHeader />
      <FeaturesComparisonSection />
      <HufAISection />
      <DataSovereigntySection />
      <FounderSection />
      <PricingV2 />
      <TestimonialsSection />
      <HufiCTA />
      <FooterNew />
      <CookieBanner />
    </div>
  );
};

export default WebsiteHome;
