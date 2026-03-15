import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import {
  Check,
  Copy,
  Gift,
  Quote,
  ChevronDown,
  Mail,
  MessageCircle,
  Instagram,
  LinkIcon,
} from "lucide-react";
import pferdeakteIcon from "@/assets/pferdeakte-icon.png";
import { Input } from "@/components/ui/input";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

/* ── helpers ─────────────────────────────────────────────── */
function generateRef(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const waitlistSchema = z.object({
  first_name: z.string().trim().min(1, "Bitte gib deinen Vornamen ein.").max(80),
  email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse ein.").max(255),
  user_type: z.string().min(1, "Bitte wähle eine Rolle."),
  referral_code: z.string().max(20).optional(),
});

const USER_TYPE_OPTIONS = [
  { value: "pferdebesitzer", label: "Pferdebesitzer" },
  { value: "hufbearbeiter", label: "Hufbearbeiter" },
  { value: "tierarzt", label: "Tierarzt" },
  { value: "physiotherapeut", label: "Physiotherapeut" },
  { value: "trainer", label: "Trainer" },
  { value: "sonstiges", label: "Sonstiges" },
];

const LAUNCH = new Date("2026-04-01T20:00:00+02:00").getTime();

function useCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, LAUNCH - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function useWaitlistCount() {
  const [count, setCount] = useState(0);
  const fetchCount = useCallback(async () => {
    const { count: c } = await supabase
      .from("pferdeakte_waitlist")
      .select("*", { count: "exact", head: true });
    if (typeof c === "number") setCount(c);
  }, []);
  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [fetchCount]);
  return count;
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

const rc = (v: boolean, extra = "") =>
  `transition-all duration-[600ms] ease-out ${v ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${extra}`;

const rcX = (v: boolean, dir: "left" | "right") =>
  `transition-all duration-[700ms] ease-out ${v ? "opacity-100 translate-x-0" : `opacity-0 ${dir === "left" ? "-translate-x-10" : "translate-x-10"}`}`;

/* ── injected CSS ────────────────────────────────────────── */
const injectedCSS = `
@keyframes pa-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes pa-tick{0%{transform:scale(1.15)}100%{transform:scale(1)}}
@keyframes pa-glow{0%,100%{box-shadow:0 0 4px rgba(249,115,22,.3)}50%{box-shadow:0 0 12px rgba(249,115,22,.6)}}
@keyframes pa-line-draw{0%{stroke-dashoffset:60}100%{stroke-dashoffset:0}}
@keyframes pa-dot-pulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.6);opacity:1}}
@keyframes pa-label-in{0%{opacity:0;transform:translateY(8px) scale(.92)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes pa-book-float{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-8px) rotate(1deg)}}
.pa-f1{animation:pa-float 3s ease-in-out infinite}
.pa-f2{animation:pa-float 3s ease-in-out .7s infinite}
.pa-f3{animation:pa-float 3s ease-in-out 1.4s infinite}
.pa-f4{animation:pa-float 3s ease-in-out 2.1s infinite}
.pa-tick{animation:pa-tick .3s ease-out}
.pa-book{animation:pa-book-float 5s ease-in-out infinite}
.pa-dot{animation:pa-dot-pulse 2s ease-in-out infinite}
.pa-label{animation:pa-label-in .5s ease-out both}
.pa-line{stroke-dasharray:60;animation:pa-line-draw .6s ease-out both}
`;

/* ── smooth scroll helper ────────────────────────────────── */
const scrollTo = (id: string) => () =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

/* ═════════════════════════════════════════════════════════════
   PAGE
   ═════════════════════════════════════════════════════════════ */
export default function PferdeakteLanding() {
  const [searchParams] = useSearchParams();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans" style={{ color: "#0a0a0a" }}>
      <style>{injectedCSS}</style>
      <StickyNav scrolled={scrolled} />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <TargetGroupsSection />
      <MissionSection />
      <SupportersSection />
      <WaitlistSection defaultRef={searchParams.get("ref") ?? ""} />
      <SocialProofSection />
      <BotschafterSection />
      <ShareSection />
      <FooterSection />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   NAVIGATION
   ═════════════════════════════════════════════════════════════ */
function StickyNav({ scrolled }: { scrolled: boolean }) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white"
      style={{ boxShadow: scrolled ? "0 1px 12px rgba(0,0,0,.08)" : "none" }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-12 h-16">
        <span className="text-xl font-bold tracking-tight" style={{ color: "#0a0a0a" }}>
          HufManager
        </span>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: "#6b7280" }}>
          <button onClick={scrollTo("besitzer")} className="hover:text-[#0a0a0a] transition-colors">Für Pferdebesitzer</button>
          <button onClick={scrollTo("profis")} className="hover:text-[#0a0a0a] transition-colors">Für Profis</button>
          <button onClick={scrollTo("partner")} className="hover:text-[#0a0a0a] transition-colors">Für Partner</button>
        </div>
        <div className="flex items-center gap-3">
          <a href="/botschafter/login" className="text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:bg-zinc-100" style={{ color: "#6b7280" }}>
            Anmelden
          </a>
          <a
            href="/pferdeakte/botschafter"
            className="text-sm font-bold px-5 py-2.5 rounded-full text-white transition-all hover:brightness-110 hover:scale-[1.03] hover:shadow-md inline-block"
            style={{ backgroundColor: "#f97316" }}
          >
            Botschafter werden
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ═════════════════════════════════════════════════════════════
   HERO ILLUSTRATION
   ═════════════════════════════════════════════════════════════ */
function HeroIllustration() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const left = [
    { emoji: "🛡️", text: "Impfpass", delay: 0 },
    { emoji: "🩺", text: "Tierarzt-Berichte", delay: 200 },
    { emoji: "🔬", text: "Röntgenbilder", delay: 400 },
  ];
  const right = [
    { emoji: "📋", text: "Hufbefunde", delay: 100 },
    { emoji: "📊", text: "Behandlungshistorie", delay: 300 },
  ];

  const Label = ({ emoji, text, delay, side }: { emoji: string; text: string; delay: number; side: "left" | "right" }) => (
    <div
      className="pa-label flex items-center gap-1.5"
      style={{
        flexDirection: side === "left" ? "row" : "row-reverse",
        animationDelay: visible ? `${delay}ms` : "0ms",
        opacity: visible ? undefined : 0,
      }}
    >
      <span
        className="text-[11px] font-bold whitespace-nowrap px-2.5 py-1.5 rounded-full"
        style={{
          color: "#f97316",
          backgroundColor: "rgba(255,247,237,.95)",
          border: "1px solid rgba(249,115,22,.15)",
          boxShadow: "0 1px 6px rgba(249,115,22,.08)",
        }}
      >
        {emoji} {text}
      </span>
      <div className="flex items-center" style={{ flexDirection: side === "left" ? "row" : "row-reverse" }}>
        <div style={{ width: 20, height: 1, backgroundColor: "rgba(249,115,22,.3)" }} />
        <div
          className="w-2 h-2 rounded-full pa-dot flex-shrink-0"
          style={{ backgroundColor: "#f97316", animationDelay: `${delay + 400}ms` }}
        />
      </div>
    </div>
  );

  return (
    <div ref={ref} className="relative w-full py-2">
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #f97316, transparent 70%)" }}
      />

      {/* 3-column layout: labels | book | labels */}
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {/* Left labels */}
        <div className="flex flex-col gap-5 items-end shrink-0">
          {left.map((l) => (
            <Label key={l.text} {...l} side="left" />
          ))}
        </div>

        {/* Book */}
        <img
          src={pferdeakteIcon}
          alt="Digitale Pferdeakte"
          className={`w-[140px] sm:w-[180px] md:w-[240px] lg:w-[300px] h-auto flex-shrink-0 pa-book transition-all duration-700 ${visible ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
          style={{ filter: "drop-shadow(0 16px 32px rgba(249,115,22,.2))" }}
          loading="eager"
        />

        {/* Right labels */}
        <div className="flex flex-col gap-5 items-start shrink-0">
          {right.map((l) => (
            <Label key={l.text} {...l} side="right" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SECTION 1 — HERO
   ═════════════════════════════════════════════════════════════ */
function HeroSection() {
  const cd = useCountdown();
  const [prevSec, setPrevSec] = useState(cd.seconds);
  const [tick, setTick] = useState(false);

  useEffect(() => {
    if (cd.seconds !== prevSec) {
      setTick(true);
      setPrevSec(cd.seconds);
      const t = setTimeout(() => setTick(false), 300);
      return () => clearTimeout(t);
    }
  }, [cd.seconds, prevSec]);

  return (
    <section className="bg-white pt-24 md:pt-28">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 grid md:grid-cols-2 gap-14 items-center">
        {/* Text */}
        <div className="flex flex-col gap-5 order-2 md:order-1">
          <span className="inline-flex items-center self-start rounded-full px-4 py-1.5 text-sm font-semibold" style={{ backgroundColor: "#fff7ed", color: "#ea580c" }}>
            🐴 Launch: 1. April 2026
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.08]" style={{ color: "#0a0a0a" }}>
            Dein Pferd.<br />Deine Daten.<br />Endlich sicher.
          </h1>
          <p className="text-lg max-w-lg leading-relaxed" style={{ color: "#6b7280" }}>
            Die digitale Pferdeakte gibt deinem Pferd eine Stimme — und dir die Sicherheit, die du verdienst.
          </p>

          {/* Countdown */}
          <div className="flex gap-3 mt-2">
            {([
              { val: cd.days, label: "Tage" },
              { val: cd.hours, label: "Std" },
              { val: cd.minutes, label: "Min" },
              { val: cd.seconds, label: "Sek" },
            ] as const).map((u, i) => (
              <div key={u.label} className="flex flex-col items-center rounded-xl px-4 py-3 min-w-[60px] border-2" style={{ borderColor: "#f97316" }}>
                <span className={`text-2xl md:text-3xl font-bold tabular-nums ${i === 3 && tick ? "pa-tick" : ""}`} style={{ color: "#0a0a0a" }}>
                  {String(u.val).padStart(2, "0")}
                </span>
                <span className="text-[11px] uppercase tracking-wider mt-1" style={{ color: "#6b7280" }}>{u.label}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mt-2">
            <button
              onClick={scrollTo("waitlist")}
              className="h-14 px-10 rounded-full text-lg font-bold text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.03] hover:shadow-lg"
              style={{ backgroundColor: "#f97316" }}
            >
              Jetzt vormerken
            </button>
            <button
              onClick={scrollTo("warum")}
              className="h-14 px-8 rounded-full text-lg font-semibold border-2 transition-all duration-200 hover:bg-zinc-50"
              style={{ color: "#0a0a0a", borderColor: "#e5e7eb" }}
            >
              Mehr erfahren →
            </button>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm" style={{ color: "#6b7280" }}>
            <span>✓ Kostenlose Anmeldung</span>
            <span>✓ Kein Spam</span>
            <span>✓ Datensouveränität garantiert</span>
          </div>
        </div>

        {/* Illustration */}
        <div className="order-1 md:order-2">
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   SECTION 2 — PROBLEM
   ═════════════════════════════════════════════════════════════ */
const problemCards = [
  { icon: "⚠️", title: "Das Pferd wird zweimal geimpft.", text: "Weil der neue Tierarzt die Vorgeschichte nicht kennt. Weil das Impfheft zu Hause liegt. Weil niemand gefragt hat." },
  { icon: "⚖️", title: "Der Hufbearbeiter steht im Regen.", text: "Lahmheit festgestellt — aber wer war zuletzt dran? Ohne lückenlosen Nachweis gibt es keine Fakten. Nur Meinungen." },
  { icon: "💔", title: "Das Pferd wird verkauft. Die Akte bleibt.", text: "Jahrelange Dokumentation — weg. Der neue Besitzer fängt bei null an. Das Pferd auch." },
];

function ProblemSection() {
  const r = useReveal();
  const r0 = useReveal();
  const r1 = useReveal();
  const r2 = useReveal();

  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: "#0a0a0a" }}>
      <div ref={r.ref} className={`max-w-5xl mx-auto px-6 ${rc(r.visible)}`}>
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "#f97316" }}>
          Die Realität im Pferdesport
        </p>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center text-white mb-16 leading-tight">
          Was passiert, wenn niemand<br className="hidden sm:block" /> den Überblick hat.
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {problemCards.map((c, i) => {
            const revealRef = [r0, r1, r2][i];
            return (
              <div
                key={i}
                ref={revealRef.ref}
                className={`rounded-2xl p-6 border-l-4 ${rcX(revealRef.visible, i % 2 === 0 ? "left" : "right")}`}
                style={{ backgroundColor: "#1a1a1a", borderLeftColor: "#f97316" }}
              >
                <span className="text-2xl block mb-3">{c.icon}</span>
                <h3 className="text-lg font-bold text-white mb-2">{c.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,.55)" }}>{c.text}</p>
              </div>
            );
          })}
        </div>
        <p className="text-center mt-14 text-lg max-w-xl mx-auto" style={{ color: "rgba(255,255,255,.6)" }}>
          Das ist kein Einzelfall. Das ist der Standard.<br />
          <span className="text-white font-semibold">Bis jetzt.</span>
        </p>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   SECTION 3 — LÖSUNG
   ═════════════════════════════════════════════════════════════ */
const solutionFeatures = [
  { icon: "🏥", title: "Digitaler Impfpass", desc: "Alle Impfungen mit Datum, Charge und Dokument. Nie wieder suchen." },
  { icon: "🔨", title: "Hufbearbeitung & Beschlagsgeschichte", desc: "Lückenloser Verlauf. Jede Behandlung. Jeder Hufbearbeiter." },
  { icon: "🩺", title: "Tierärztliche Befunde & Röntgenbilder", desc: "Befunde, Diagnosen, Bildmaterial — sicher gespeichert, sofort abrufbar." },
  { icon: "🔒", title: "Du entscheidest wer Zugriff hat", desc: "Kein Dienstleister sieht etwas ohne deine Freigabe. Niemals." },
  { icon: "🐴", title: "Pferd verkauft? Akte geht mit.", desc: "Beim Besitzerwechsel überträgst du die Akte. Die Daten bleiben dir." },
];

function SolutionSection() {
  const r = useReveal();
  return (
    <section id="warum" className="py-20 md:py-28 bg-white">
      <div ref={r.ref} className={`max-w-5xl mx-auto px-6 ${rc(r.visible)}`}>
        <span className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mx-auto block text-center mb-4" style={{ backgroundColor: "#fff7ed", color: "#ea580c" }}>
          Die Lösung
        </span>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center mb-4" style={{ color: "#0a0a0a" }}>
          Eine Akte. Ein Pferd. Ein Leben lang.
        </h2>
        <p className="text-center text-lg max-w-2xl mx-auto mb-14" style={{ color: "#6b7280" }}>
          Die digitale Pferdeakte ist das komplette Gesundheits- und Behandlungsgedächtnis deines Pferdes — immer dabei, sicher geteilt, dir gehörend.
        </p>
        <div className="space-y-5">
          {solutionFeatures.map((f) => (
            <div key={f.title} className="flex items-start gap-5 p-5 rounded-xl border border-zinc-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: "#fff7ed" }}>
                {f.icon}
              </div>
              <div>
                <p className="font-bold text-lg" style={{ color: "#0a0a0a" }}>{f.title}</p>
                <p className="mt-1" style={{ color: "#6b7280" }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   SECTION 4 — ZIELGRUPPEN
   ═════════════════════════════════════════════════════════════ */
function TargetGroupsSection() {
  const r = useReveal();
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: "#f9fafb" }}>
      <div ref={r.ref} className={`max-w-4xl mx-auto px-6 space-y-10 ${rc(r.visible)}`}>
        {/* Pferdebesitzer */}
        <TargetCard
          id="besitzer"
          accentColor="#f97316"
          icon="🐴"
          label="Für Pferdebesitzer"
          labelColor="#f97316"
          headline={"Du liebst dein Pferd.\nJetzt schützt du es auch digital."}
          text="Du weißt: Im Notfall zählt jede Sekunde. Kein Suchen nach Ordnern. Kein Anrufen beim alten Tierarzt. Kein Erinnern — was wurde wann gemacht? Mit der digitalen Pferdeakte hast du alles auf einen Blick. Und du allein entscheidest, wer Zugriff bekommt."
          benefits={[
            "Vollständige Kontrolle über alle Daten",
            "Sofortiger Zugriff im Notfall — auch ohne Empfang",
            "Schutz bei Verkauf, Streit oder Schadenersatz",
          ]}
          ctaLabel="Jetzt Platz sichern"
          ctaAction={scrollTo("waitlist")}
          ctaBg="#f97316"
          ctaText="white"
        />

        {/* Profis */}
        <TargetCard
          id="profis"
          accentColor="#0a0a0a"
          icon="🔨"
          label="Für Hufbearbeiter, Tierärzte & Therapeuten"
          labelColor="#0a0a0a"
          headline={"Endlich wirst du gesehen.\nFür das was du wirklich leistest."}
          text="Du dokumentierst sorgfältig. Du arbeitest professionell. Aber wenn niemand den Verlauf kennt, steht dein Name trotzdem in Frage. Mit HufManager dokumentierst du lückenlos — digital, rechtssicher, von Besitzer freigegeben. Deine Arbeit spricht für sich."
          benefits={[
            "Lückenlose Dokumentation als Rechtsschutz",
            "Schneller Zugriff auf freigegebene Vorgeschichten",
            "Professionelles Auftreten gegenüber Kunden",
          ]}
          ctaLabel="Als Profi vorregistrieren"
          ctaAction={scrollTo("waitlist")}
          ctaBg="#0a0a0a"
          ctaText="white"
        />

        {/* Partner */}
        <TargetCard
          id="partner"
          accentColor="#f97316"
          icon="🏢"
          label="Für Versicherungen, Verbände & Unternehmen"
          labelColor="#f97316"
          headline={"Der Standard existiert.\nSie müssen ihn nur annehmen."}
          text="Unstandardisierte Papierdokumentation kostet Zeit, Geld und Vertrauen. Streitfälle ohne Nachweise. Schadensregulierung ohne Fakten. Die digitale Pferdeakte schafft erstmals einen gemeinsamen Dokumentationsstandard für die gesamte Branche — nachvollziehbar, manipulationssicher, DSGVO-konform."
          benefits={[
            "Standardisierte Schadensdokumentation",
            "Nachvollziehbare Behandlungsverläufe",
            "Weniger Streitfälle — mehr Vertrauen",
          ]}
          ctaLabel="Partnerschaft anfragen"
          ctaHref="/pferdeakte/partner"
          ctaBg="#f97316"
          ctaText="white"
        />
      </div>
    </section>
  );
}

function TargetCard({
  id, accentColor, icon, label, labelColor, headline, text, benefits, ctaLabel, ctaAction, ctaHref, ctaBg, ctaText,
}: {
  id: string; accentColor: string; icon: string; label: string; labelColor: string;
  headline: string; text: string; benefits: string[];
  ctaLabel: string; ctaAction?: () => void; ctaHref?: string; ctaBg: string; ctaText: string;
}) {
  const r = useReveal();
  return (
    <div
      id={id}
      ref={r.ref}
      className={`bg-white rounded-2xl p-8 md:p-10 shadow-sm border-t-4 scroll-mt-24 transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${rc(r.visible)}`}
      style={{ borderTopColor: accentColor }}
    >
      <span className="text-4xl mb-4 block">{icon}</span>
      <p className="text-xs font-bold uppercase tracking-[0.15em] mb-2" style={{ color: labelColor }}>{label}</p>
      <h3 className="text-2xl md:text-3xl font-extrabold leading-tight mb-4 whitespace-pre-line" style={{ color: "#0a0a0a" }}>{headline}</h3>
      <p className="leading-relaxed mb-6" style={{ color: "#6b7280" }}>{text}</p>
      <ul className="space-y-2 mb-8">
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm">
            <span style={{ color: "#f97316" }} className="mt-0.5 font-bold">✓</span>
            <span style={{ color: "#0a0a0a" }}>{b}</span>
          </li>
        ))}
      </ul>
      {ctaHref ? (
        <a
          href={ctaHref}
          className="inline-flex items-center justify-center h-12 px-8 rounded-full font-bold transition-all hover:brightness-110 hover:scale-[1.03] hover:shadow-md"
          style={{ backgroundColor: ctaBg, color: ctaText }}
        >
          {ctaLabel}
        </a>
      ) : (
        <button
          onClick={ctaAction}
          className="h-12 px-8 rounded-full font-bold transition-all hover:brightness-110 hover:scale-[1.03] hover:shadow-md"
          style={{ backgroundColor: ctaBg, color: ctaText }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SECTION 5 — LEITBILD
   ═════════════════════════════════════════════════════════════ */
function MissionSection() {
  const r = useReveal();
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: "#0a0a0a" }}>
      <div ref={r.ref} className={`max-w-2xl mx-auto px-6 text-center ${rc(r.visible)}`}>
        <span className="text-5xl block mb-6" style={{ color: "#f97316" }}>"</span>
        <p className="text-2xl md:text-3xl font-bold italic leading-snug text-white mb-8">
          Pferdeschutz und Datenschutz sind keine Gegensätze.<br />Sie sind dasselbe.
        </p>
        <p className="leading-relaxed mb-6" style={{ color: "rgba(255,255,255,.5)" }}>
          HufManager wurde gegründet von einem Pferdeprofi mit über 15 Jahren Erfahrung in der Pferdebranche. Nicht aus einem Büro heraus. Aus dem Stall. Von der Praxis – für die Praxis. Für die Menschen, die täglich mit Pferden leben und arbeiten.
        </p>
        <p className="text-white font-bold">Pascal Schmid</p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,.4)" }}>Gründer HufManager · Barhufpfleger & Equine Tech Founder</p>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   SECTION 6 — UNTERSTÜTZER
   ═════════════════════════════════════════════════════════════ */
function SupportersSection() {
  const r = useReveal();
  return (
    <section id="unterstuetzer" className="py-20 md:py-28 bg-white">
      <div ref={r.ref} className={`max-w-4xl mx-auto px-6 ${rc(r.visible)}`}>
        <span className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mx-auto block text-center mb-4" style={{ backgroundColor: "#fff7ed", color: "#ea580c" }}>
          Gemeinsam für den Pferdesport
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-3" style={{ color: "#0a0a0a" }}>
          Wer hinter der digitalen Pferdeakte steht.
        </h2>
        <p className="text-center max-w-xl mx-auto mb-12" style={{ color: "#6b7280" }}>
          Wir sind nicht allein. Immer mehr Organisationen, Unternehmen und Persönlichkeiten im Pferdesport setzen sich für Transparenz und Pferdeschutz ein.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 mb-10">
          {[
            { name: "Fischer Versichert", role: "Offizieller Versicherungspartner" },
            { name: "Uelzener Versicherungen", role: "Offizieller Versicherungspartner" },
          ].map((p) => (
            <div key={p.name} className="rounded-2xl p-6 bg-white border-2 border-dashed flex flex-col items-center text-center gap-3" style={{ borderColor: "#f97316" }}>
              <div className="w-full h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#f9fafb" }}>
                <span className="font-bold" style={{ color: "#6b7280" }}>{p.name}</span>
              </div>
              <p className="text-sm" style={{ color: "#6b7280" }}>{p.role}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#fff7ed", color: "#ea580c" }}>
                🤝 Gespräch läuft
              </span>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <div className="rounded-2xl p-6 md:p-8 border-2 text-center" style={{ backgroundColor: "#f9fafb", borderColor: "#f97316" }}>
          <h3 className="text-xl font-bold mb-2" style={{ color: "#0a0a0a" }}>
            Du möchtest als Botschafter oder Unterstützer dabei sein?
          </h3>
          <p className="mb-5" style={{ color: "#6b7280" }}>
            Als Verband, Unternehmen oder bekannte Persönlichkeit im Pferdesport kannst du Teil dieser Bewegung werden — und auf dieser Seite namentlich genannt werden.
          </p>
          <a
            href="mailto:support@hufmanager.de"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full font-bold text-white transition-all hover:brightness-110 hover:scale-[1.03] hover:shadow-md"
            style={{ backgroundColor: "#f97316" }}
          >
            Jetzt Kontakt aufnehmen
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   SECTION 7 — WAITLIST
   ═════════════════════════════════════════════════════════════ */
function WaitlistSection({ defaultRef }: { defaultRef: string }) {
  const [form, setForm] = useState({ first_name: "", email: "", user_type: "", referral_code: defaultRef });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ refCode: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const r = useReveal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = waitlistSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.errors[0].message); return; }
    setSubmitting(true);
    const refCode = generateRef();
    const { error: dbErr } = await supabase.from("pferdeakte_waitlist").insert({
      name: parsed.data.first_name.substring(0, 80),
      email: parsed.data.email.substring(0, 255),
      role: parsed.data.user_type,
      referred_by: parsed.data.referral_code || null,
      referral_code: refCode,
    });
    setSubmitting(false);
    if (dbErr) {
      setError(dbErr.code === "23505" ? "Diese E-Mail ist bereits eingetragen." : "Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
      return;
    }
    setSuccess({ refCode });
  };

  const copyLink = () => {
    if (!success) return;
    navigator.clipboard.writeText(`https://hufmanager.de/pferdeakte?ref=${success.refCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const referralSteps = [
    { count: 3, reward: "1 Monat gratis" },
    { count: 10, reward: "3 Monate gratis" },
    { count: 25, reward: "1 Jahr gratis" },
  ];

  return (
    <section id="waitlist" className="py-20 md:py-28" style={{ backgroundColor: "#0a0a0a" }}>
      <div ref={r.ref} className={`max-w-lg mx-auto px-6 ${rc(r.visible)}`}>
        <span className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mx-auto block text-center mb-4" style={{ backgroundColor: "rgba(249,115,22,.15)", color: "#f97316" }}>
          Kostenlos · Jetzt vormerken
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-3 leading-tight">
          Sei dabei, wenn sich<br />etwas verändert.
        </h2>
        <p className="text-center mb-10" style={{ color: "rgba(255,255,255,.5)" }}>
          Trag dich ein. Teile den Link. Werde Teil der ersten digitalen Pferdeakten-Community.
        </p>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Vorname"
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              className="border-2 text-white placeholder:text-white/40 focus-visible:ring-[#f97316] focus-visible:border-[#f97316]"
              style={{ backgroundColor: "#1f1f1f", borderColor: "#333" }}
              maxLength={80}
            />
            <Input
              type="email"
              placeholder="E-Mail"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="border-2 text-white placeholder:text-white/40 focus-visible:ring-[#f97316] focus-visible:border-[#f97316]"
              style={{ backgroundColor: "#1f1f1f", borderColor: "#333" }}
              maxLength={255}
            />
            <div className="relative">
              <select
                value={form.user_type}
                onChange={(e) => setForm((f) => ({ ...f, user_type: e.target.value }))}
                className="flex h-12 w-full rounded-lg border-2 px-4 py-3 text-base text-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316]"
                style={{ backgroundColor: "#1f1f1f", borderColor: "#333" }}
              >
                <option value="" disabled style={{ color: "#999" }}>Ich bin...</option>
                {USER_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} style={{ color: "#0a0a0a" }}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(255,255,255,0.4)" }} />
            </div>
            <Input
              placeholder="Einladungscode (optional)"
              value={form.referral_code}
              onChange={(e) => setForm((f) => ({ ...f, referral_code: e.target.value }))}
              className="border-2 text-white placeholder:text-white/40 focus-visible:ring-[#f97316] focus-visible:border-[#f97316]"
              style={{ backgroundColor: "#1f1f1f", borderColor: "#333" }}
              maxLength={20}
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-14 rounded-full text-lg font-bold text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50"
              style={{ backgroundColor: "#f97316" }}
            >
              {submitting ? "Wird gespeichert..." : "Jetzt vormerken lassen"}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6 rounded-2xl p-8 border" style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
            <p className="text-3xl">🎉</p>
            <p className="text-white font-semibold text-lg">Du bist dabei!</p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Dein persönlicher Referral-Link:</p>
            <div className="flex items-center gap-2 rounded-lg p-3" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
              <code className="flex-1 text-sm break-all" style={{ color: "rgba(255,255,255,0.8)" }}>
                https://hufmanager.de/pferdeakte?ref={success.refCode}
              </code>
              <button onClick={copyLink} className="shrink-0 p-2 rounded-md transition-colors" style={{ backgroundColor: copied ? "rgba(249,115,22,0.2)" : "transparent" }}>
                {copied ? <Check className="w-4 h-4" style={{ color: "#f97316" }} /> : <Copy className="w-4 h-4" style={{ color: "#f97316" }} />}
              </button>
            </div>

            {/* Referral progress */}
            <div className="pt-4">
              <p className="font-medium text-sm mb-4" style={{ color: "rgba(255,255,255,0.8)" }}>Teile deinen Link und erhalte:</p>
              <div className="flex items-center justify-between gap-1">
                {referralSteps.map((s, i) => (
                  <div key={s.count} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center border-2" style={{ borderColor: "#f97316", backgroundColor: "rgba(249,115,22,.1)" }}>
                      <Gift className="w-4 h-4" style={{ color: "#f97316" }} />
                    </div>
                    <span className="text-xs font-bold text-white">{s.count} Freunde</span>
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,.5)" }}>{s.reward}</span>
                    {i < referralSteps.length - 1 && (
                      <div className="hidden" />
                    )}
                  </div>
                ))}
              </div>
              {/* connecting line */}
              <div className="relative h-0.5 mx-auto mt-[-42px] mb-10" style={{ width: "66%", backgroundColor: "rgba(249,115,22,.3)" }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   SECTION 8 — SOCIAL PROOF
   ═════════════════════════════════════════════════════════════ */
const quotes = [
  { text: "Endlich eine Lösung die versteht wie unsere Branche funktioniert.", name: "Heiko M.", role: "Hufbearbeiter" },
  { text: "Ich warte schon lange auf sowas. Das wird die Arbeit mit Tierärzten so viel einfacher machen.", name: "Sandra K.", role: "Pferdebesitzerin" },
];

function SocialProofSection() {
  const rawCount = useWaitlistCount();
  const displayCount = useAnimatedCounter(rawCount, 800, rawCount > 0);
  const r = useReveal();

  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: "#f9fafb" }}>
      <div ref={r.ref} className={`max-w-4xl mx-auto px-6 text-center ${rc(r.visible)}`}>
        <p className="text-5xl md:text-6xl font-extrabold mb-2 tabular-nums" style={{ color: "#f97316" }}>
          {displayCount}
        </p>
        <p className="mb-14" style={{ color: "#0a0a0a" }}>
          bereits vorgemerkt.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {quotes.map((q) => (
            <div key={q.name} className="p-6 rounded-2xl text-left border-l-4 bg-white" style={{ borderLeftColor: "#f97316" }}>
              <Quote className="w-8 h-8 mb-3" style={{ color: "#e5e7eb" }} />
              <p className="leading-relaxed mb-4" style={{ color: "#6b7280" }}>„{q.text}"</p>
              <p className="font-semibold text-sm" style={{ color: "#0a0a0a" }}>{q.name}</p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>{q.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   SECTION — BOTSCHAFTER-PROGRAMM
   ═════════════════════════════════════════════════════════════ */
const botschafterTypes = [
  {
    icon: "🎙️",
    title: "Pferdemenschen & Creator",
    points: [
      "Bis 50% Provision auf alle Pakete pro Empfehlung",
      "Top 10 Empfehler: HufManager Pro — 1 Jahr kostenlos",
      "Namentliche Erwähnung als Botschafter",
      "Exklusiver Frühzugang vor dem Launch",
    ],
    note: "Die Kunden-App für Pferdebesitzer ist immer kostenlos — du empfiehlst etwas das null kostet und bekommst trotzdem Provision wenn deine Community Profi-Features nutzt.",
  },
  {
    icon: "🔨",
    title: "Hufbearbeiter, Tierärzte & Therapeuten",
    points: [
      "Bis 50% Affiliate-Provision auf alle Pakete",
      "Eigenes Botschafter-Dashboard mit Tracking",
      "Namentlich auf der Launchpage gelistet",
      "HufManager Pro 1 Jahr kostenlos (Top 10 Empfehler)",
      "Vorzugspreis auf eigenes HufManager-Abo",
    ],
  },
  {
    icon: "🏢",
    title: "Unternehmen & Organisationen",
    points: [
      "Namentliche Nennung auf der Launchpage als Unterstützer",
      "Logo-Placement (nach Absprache)",
      "Gemeinsame PR-Möglichkeit zum Launch (1. April)",
      "Kooperationsvereinbarung nach Maß",
      'Standard-Botschaft: "Wir empfehlen die digitale Pferdeakte"',
    ],
  },
];

function BotschafterSection() {
  const r = useReveal();
  return (
    <section id="botschafter" className="py-20 md:py-28" style={{ backgroundColor: "#0a0a0a" }}>
      <div ref={r.ref} className={`max-w-5xl mx-auto px-6 ${rc(r.visible)}`}>
        <span className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mx-auto block text-center mb-4" style={{ backgroundColor: "rgba(249,115,22,.15)", color: "#f97316" }}>
          Botschafter-Programm
        </span>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center text-white mb-4 leading-tight">
          Werde Teil der Bewegung.<br />Nicht nur Nutzer — Mitgestalter.
        </h2>
        <p className="text-center max-w-[650px] mx-auto mb-14" style={{ color: "rgba(255,255,255,.5)" }}>
          HufManager sucht Menschen und Organisationen, die den neuen Standard im Pferdesport aktiv mitprägen wollen. Als Botschafter wirst du nicht nur sichtbar — du verdienst an jedem, den du überzeugst.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {botschafterTypes.map((bt) => (
            <div
              key={bt.title}
              className="rounded-2xl p-6 border-t-4 transition-all duration-200 hover:brightness-110"
              style={{ backgroundColor: "#1a1a1a", borderTopColor: "#f97316" }}
            >
              <span className="text-2xl block mb-3">{bt.icon}</span>
              <h3 className="text-lg font-bold text-white mb-4">{bt.title}</h3>
              <ul className="space-y-2 mb-4">
                {bt.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm" style={{ color: "rgba(255,255,255,.55)" }}>
                    <span className="mt-0.5 font-bold" style={{ color: "#f97316" }}>•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              {bt.note && (
                <p className="text-xs leading-relaxed mt-3" style={{ color: "#f97316" }}>{bt.note}</p>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <a
            href="/pferdeakte/botschafter"
            className="inline-flex items-center justify-center h-14 px-10 rounded-full text-lg font-bold text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.03] hover:shadow-lg"
            style={{ backgroundColor: "#f97316" }}
          >
            Jetzt als Botschafter registrieren →
          </a>
          <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,.4)" }}>
            Kostenlos registrieren · Keine Verpflichtung · Jederzeit kündbar
          </p>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   SECTION 9 — SHARE
   ═════════════════════════════════════════════════════════════ */
function ShareSection() {
  const r = useReveal();
  const [linkCopied, setLinkCopied] = useState(false);
  const shareUrl = "https://hufmanager.de/pferdeakte";
  const waText = encodeURIComponent("Hast du schon von der digitalen Pferdeakte gehört? Läuft am 1. April live: https://hufmanager.de/pferdeakte");

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <section className="py-20 md:py-28 bg-white">
      <div ref={r.ref} className={`max-w-2xl mx-auto px-6 text-center ${rc(r.visible)}`}>
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: "#0a0a0a" }}>
          Kennst du jemanden, dem das wichtig ist?
        </h2>
        <p className="mb-10" style={{ color: "#6b7280" }}>
          Influencer, Blogger, Stallbetreiber, Tierärzte, Hufbearbeiter — jeder der diese Mission teilt, macht den Unterschied.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full font-bold text-white transition-all hover:brightness-110 hover:scale-[1.03]"
            style={{ backgroundColor: "#25D366" }}
          >
            <MessageCircle className="w-5 h-5" />
            WhatsApp teilen
          </a>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full font-bold text-white transition-all hover:brightness-110 hover:scale-[1.03]"
            style={{ background: "linear-gradient(135deg, #833AB4, #E1306C, #F77737)" }}
          >
            <Instagram className="w-5 h-5" />
            Instagram Story
          </a>
          <button
            onClick={copyShareLink}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full font-bold transition-all hover:brightness-95 hover:scale-[1.03]"
            style={{ backgroundColor: "#e5e7eb", color: "#0a0a0a" }}
          >
            {linkCopied ? <Check className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
            {linkCopied ? "Kopiert!" : "Link kopieren"}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   FOOTER
   ═════════════════════════════════════════════════════════════ */
function FooterSection() {
  return (
    <footer className="py-8 px-6 text-sm" style={{ backgroundColor: "#111111", color: "rgba(255,255,255,0.4)" }}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span>© 2026 HufManager · Barhufservice Schmid</span>
        <div className="flex items-center gap-4">
          {[
            { href: "/impressum", label: "Impressum" },
            { href: "/datenschutz", label: "Datenschutz" },
            { href: "/agb", label: "AGB" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-[#f97316]"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {l.label}
            </a>
          ))}
        </div>
        <a
          href="mailto:support@hufmanager.de"
          className="flex items-center gap-1 transition-colors hover:text-[#f97316]"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <Mail className="w-3.5 h-3.5" /> support@hufmanager.de
        </a>
      </div>
    </footer>
  );
}
