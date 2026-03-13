import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import {
  ClipboardList,
  Lock,
  Heart,
  Syringe,
  Scissors,
  Stethoscope,
  Shield,
  ArrowRightLeft,
  Check,
  Copy,
  Gift,
  Quote,
  ChevronDown,
  Mail,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

// ── Helpers ──────────────────────────────────────────────
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

// ── Countdown hook ───────────────────────────────────────
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

// ── Waitlist counter hook ────────────────────────────────
function useWaitlistCount() {
  const [count, setCount] = useState(0);
  const fetch = useCallback(async () => {
    const { count: c } = await supabase
      .from("pferdeakte_waitlist")
      .select("*", { count: "exact", head: true });
    if (typeof c === "number") setCount(c);
  }, []);
  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, [fetch]);
  return count;
}

// ── Scroll reveal hook ──────────────────────────────────
function useReveal() {
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
  return { ref, visible };
}

const revealClass = (visible: boolean) =>
  `transition-all duration-[600ms] ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`;

// ── CSS for floating animation (injected once) ──────────
const floatStyles = `
@keyframes pa-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
@keyframes pa-countdown-tick {
  0% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
.pa-float-1 { animation: pa-float 3s ease-in-out infinite; }
.pa-float-2 { animation: pa-float 3s ease-in-out 0.5s infinite; }
.pa-float-3 { animation: pa-float 3s ease-in-out 1s infinite; }
.pa-float-4 { animation: pa-float 3s ease-in-out 1.5s infinite; }
.pa-tick { animation: pa-countdown-tick 0.3s ease-out; }
`;

// ═══════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════
export default function PferdeakteLanding() {
  const [searchParams] = useSearchParams();

  return (
    <div className="min-h-screen bg-white font-sans" style={{ color: "#0a0a0a" }}>
      <style>{floatStyles}</style>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <WaitlistSection defaultRef={searchParams.get("ref") ?? ""} />
      <ForWhomSection />
      <SocialProofSection />
      <FooterSection />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HERO ILLUSTRATION — Floating cards around a phone mockup
// ═══════════════════════════════════════════════════════════
function HeroIllustration() {
  return (
    <div className="relative w-full max-w-md mx-auto" style={{ minHeight: 420 }}>
      {/* Phone mockup */}
      <div className="relative mx-auto w-56 rounded-[2rem] border-4 border-zinc-200 bg-white shadow-2xl overflow-hidden" style={{ height: 380 }}>
        {/* Phone notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-zinc-200 rounded-b-xl" />
        {/* Screen content */}
        <div className="pt-8 px-4 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#fff7ed" }}>
              <span className="text-sm">🐴</span>
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: "#0a0a0a" }}>Charly</p>
              <p className="text-[10px]" style={{ color: "#6b7280" }}>Haflinger · 8 Jahre</p>
            </div>
          </div>
          {/* Fake entries */}
          <div className="rounded-lg p-2.5 border" style={{ borderColor: "#e5e7eb", backgroundColor: "#fafafa" }}>
            <p className="text-[10px] font-semibold" style={{ color: "#0a0a0a" }}>Impfpass</p>
            <p className="text-[9px]" style={{ color: "#6b7280" }}>Influenza · 12.02.2026</p>
            <div className="mt-1 h-1 rounded-full w-3/4" style={{ backgroundColor: "#f97316" }} />
          </div>
          <div className="rounded-lg p-2.5 border" style={{ borderColor: "#e5e7eb", backgroundColor: "#fafafa" }}>
            <p className="text-[10px] font-semibold" style={{ color: "#0a0a0a" }}>Hufbearbeitung</p>
            <p className="text-[9px]" style={{ color: "#6b7280" }}>Barhuf · 28.01.2026</p>
            <div className="mt-1 h-1 rounded-full w-1/2" style={{ backgroundColor: "#f97316" }} />
          </div>
          <div className="rounded-lg p-2.5 border" style={{ borderColor: "#e5e7eb", backgroundColor: "#fafafa" }}>
            <p className="text-[10px] font-semibold" style={{ color: "#0a0a0a" }}>Tierarzt</p>
            <p className="text-[9px]" style={{ color: "#6b7280" }}>Zahnkontrolle · 10.01.2026</p>
            <div className="mt-1 h-1 rounded-full w-2/3" style={{ backgroundColor: "#f97316" }} />
          </div>
        </div>
      </div>

      {/* Floating cards */}
      <div className="pa-float-1 absolute -top-2 -right-4 md:right-0 bg-white rounded-xl shadow-lg border border-zinc-100 px-3 py-2 text-xs flex items-center gap-2" style={{ color: "#0a0a0a" }}>
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>✓</span>
        <span className="font-medium">Impfpass aktuell</span>
      </div>

      <div className="pa-float-2 absolute top-24 -left-8 md:-left-12 bg-white rounded-xl shadow-lg border border-zinc-100 px-3 py-2 text-xs flex items-center gap-2" style={{ color: "#0a0a0a" }}>
        <span>📋</span>
        <span className="font-medium">Letzte Behandlung: vor 3 Wochen</span>
      </div>

      <div className="pa-float-3 absolute bottom-20 -right-6 md:-right-8 bg-white rounded-xl shadow-lg border border-zinc-100 px-3 py-2 text-xs flex items-center gap-2" style={{ color: "#0a0a0a" }}>
        <span>🔒</span>
        <span className="font-medium">Zugriff erteilt: Dr. Müller</span>
      </div>

      <div className="pa-float-4 absolute bottom-4 -left-4 md:-left-8 bg-white rounded-xl shadow-lg border border-zinc-100 px-3 py-2 text-xs flex items-center gap-2" style={{ color: "#0a0a0a" }}>
        <span>🐴</span>
        <span className="font-medium">Charly — 8 Jahre</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 1 — HERO
// ═══════════════════════════════════════════════════════════
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
    <section className="relative bg-white">
      {/* nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto">
        <span className="text-xl font-bold tracking-tight" style={{ color: "#0a0a0a" }}>
          HufManager
        </span>
        <div className="flex items-center gap-5 text-sm">
          <button
            onClick={() => document.getElementById("profis")?.scrollIntoView({ behavior: "smooth" })}
            className="transition-colors font-medium" style={{ color: "#6b7280" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0a0a0a")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
          >
            Für Profis
          </button>
          <a href="/pferdeakte/partner" className="transition-colors font-medium" style={{ color: "#6b7280" }}>
            Partner
          </a>
          <a href="/auth">
            <Button variant="ghost" size="sm" className="text-sm" style={{ color: "#6b7280" }}>
              Anmelden
            </Button>
          </a>
        </div>
      </nav>

      {/* hero grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 grid md:grid-cols-2 gap-12 items-center">
        {/* left text */}
        <div className="flex flex-col gap-5 order-2 md:order-1">
          {/* badge */}
          <span
            className="inline-flex items-center self-start rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{ backgroundColor: "#fff7ed", color: "#ea580c" }}
          >
            🚀 Launch: 1. April 2026
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1]" style={{ color: "#0a0a0a" }}>
            Die digitale Pferdeakte.
          </h1>
          <p className="text-lg max-w-lg" style={{ color: "#6b7280" }}>
            Alle Gesundheitsdaten deines Pferdes. Sicher. Geteilt. Immer dabei.
          </p>

          {/* countdown */}
          <div className="flex gap-3 mt-2">
            {[
              { val: cd.days, label: "Tage" },
              { val: cd.hours, label: "Std" },
              { val: cd.minutes, label: "Min" },
              { val: cd.seconds, label: "Sek" },
            ].map((u, i) => (
              <div
                key={u.label}
                className="flex flex-col items-center rounded-xl px-4 py-3 min-w-[64px] border-2"
                style={{ borderColor: "#f97316", backgroundColor: "#ffffff" }}
              >
                <span
                  className={`text-2xl md:text-3xl font-bold tabular-nums ${i === 3 && tick ? "pa-tick" : ""}`}
                  style={{ color: "#f97316" }}
                >
                  {String(u.val).padStart(2, "0")}
                </span>
                <span className="text-[11px] uppercase tracking-wider mt-1" style={{ color: "#6b7280" }}>
                  {u.label}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-2 inline-flex items-center justify-center h-14 px-10 rounded-full text-lg font-bold text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.02] hover:shadow-lg self-start"
            style={{ backgroundColor: "#f97316" }}
          >
            Jetzt vormerken lassen
          </button>
          <p className="text-xs" style={{ color: "#9ca3af" }}>
            Kostenlos · Kein Spam · Jederzeit kündbar
          </p>
        </div>

        {/* right illustration */}
        <div className="order-1 md:order-2">
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — PROBLEM
// ═══════════════════════════════════════════════════════════
const problems = [
  { icon: ClipboardList, text: "Impfhefte, Röntgenbilder, Hufberichte — alles verteilt auf Ordner, WhatsApp und E-Mails" },
  { icon: Lock, text: "Kein Tierarzt, kein Hufbearbeiter hat im Notfall schnell Zugriff auf die richtigen Daten" },
  { icon: Heart, text: "Bei einem Pferdeverkauf gehen alle Unterlagen verloren — der neue Besitzer fängt bei null an" },
];

function ProblemSection() {
  const r = useReveal();
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: "#f9fafb" }}>
      <div ref={r.ref} className={`max-w-5xl mx-auto px-6 ${revealClass(r.visible)}`}>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center mb-14" style={{ color: "#0a0a0a" }}>
          Schluss mit dem Papierchaos.
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl bg-white shadow-sm">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#fff7ed" }}>
                  <Icon className="w-7 h-7" style={{ color: "#f97316" }} strokeWidth={1.8} />
                </div>
                <p className="leading-relaxed" style={{ color: "#6b7280" }}>{p.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — LÖSUNG
// ═══════════════════════════════════════════════════════════
const features = [
  { icon: Syringe, title: "Digitaler Impfpass", desc: "Alle Impfungen mit Datum und Dokument" },
  { icon: Scissors, title: "Hufbearbeitung & Beschlagsgeschichte", desc: "Lückenloser Verlauf" },
  { icon: Stethoscope, title: "Tierärztliche Befunde & Röntgenbilder", desc: "Sicher gespeichert" },
  { icon: Shield, title: "Zugriff steuern", desc: "Du entscheidest wer was sieht" },
  { icon: ArrowRightLeft, title: "Pferd verkaufen", desc: "Akte geht mit, Daten bleiben beim Besitzer" },
];

function SolutionSection() {
  const r = useReveal();
  return (
    <section className="py-20 md:py-28 bg-white">
      <div ref={r.ref} className={`max-w-5xl mx-auto px-6 ${revealClass(r.visible)}`}>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center mb-14" style={{ color: "#0a0a0a" }}>
          Eine Akte. Ein Pferd. Alles drin.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex items-start gap-4 p-5 rounded-xl bg-white border border-zinc-100 shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#fff7ed" }}>
                  <Icon className="w-5 h-5" style={{ color: "#f97316" }} />
                </div>
                <div>
                  <p className="font-semibold" style={{ color: "#0a0a0a" }}>{f.title}</p>
                  <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — WAITLIST
// ═══════════════════════════════════════════════════════════
function WaitlistSection({ defaultRef }: { defaultRef: string }) {
  const [form, setForm] = useState({
    first_name: "",
    email: "",
    user_type: "",
    referral_code: defaultRef,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ refCode: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const r = useReveal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = waitlistSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

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
      if (dbErr.code === "23505") {
        setError("Diese E-Mail ist bereits eingetragen.");
      } else {
        setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
      }
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

  return (
    <section id="waitlist" className="py-20 md:py-28" style={{ backgroundColor: "#111111" }}>
      <div ref={r.ref} className={`max-w-lg mx-auto px-6 ${revealClass(r.visible)}`}>
        <h2 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-3">
          Sei dabei, wenn es losgeht.
        </h2>
        <p className="text-center mb-10" style={{ color: "rgba(255,255,255,0.5)" }}>
          Meld dich jetzt an und sicher dir deinen Frühzugang.
        </p>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Vorname"
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              className="border-2 text-white placeholder:text-white/40"
              style={{ backgroundColor: "#1f1f1f", borderColor: "#333" }}
              maxLength={80}
            />
            <Input
              type="email"
              placeholder="E-Mail"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="border-2 text-white placeholder:text-white/40"
              style={{ backgroundColor: "#1f1f1f", borderColor: "#333" }}
              maxLength={255}
            />
            <div className="relative">
              <select
                value={form.user_type}
                onChange={(e) => setForm((f) => ({ ...f, user_type: e.target.value }))}
                className="flex h-12 w-full rounded-lg border-2 px-4 py-3 text-base text-white appearance-none focus:outline-none focus:ring-2"
                style={{ backgroundColor: "#1f1f1f", borderColor: "#333", outlineColor: "#f97316" }}
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
              className="border-2 text-white placeholder:text-white/40"
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
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              Dein persönlicher Referral-Link:
            </p>
            <div className="flex items-center gap-2 rounded-lg p-3" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
              <code className="flex-1 text-sm break-all" style={{ color: "rgba(255,255,255,0.8)" }}>
                https://hufmanager.de/pferdeakte?ref={success.refCode}
              </code>
              <button
                onClick={copyLink}
                className="shrink-0 p-2 rounded-md transition-colors"
                style={{ backgroundColor: copied ? "rgba(249,115,22,0.2)" : "transparent" }}
              >
                {copied ? (
                  <Check className="w-4 h-4" style={{ color: "#f97316" }} />
                ) : (
                  <Copy className="w-4 h-4" style={{ color: "#f97316" }} />
                )}
              </button>
            </div>

            <div className="space-y-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              <p className="font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                Teile deinen Link und erhalte:
              </p>
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center justify-center gap-2">
                  <Gift className="w-4 h-4" style={{ color: "#f97316" }} /> 3 Freunde = 1 Monat gratis
                </span>
                <span className="flex items-center justify-center gap-2">
                  <Gift className="w-4 h-4" style={{ color: "#f97316" }} /> 10 Freunde = 3 Monate gratis
                </span>
                <span className="flex items-center justify-center gap-2">
                  <Gift className="w-4 h-4" style={{ color: "#f97316" }} /> 25 Freunde = 1 Jahr gratis
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — FÜR WEN
// ═══════════════════════════════════════════════════════════
const audiences = [
  { emoji: "🐴", title: "Pferdebesitzer", desc: "Behalte den Überblick. Teile gezielt. Behalte die Kontrolle." },
  { emoji: "🔨", title: "Hufbearbeiter & Schmiede", desc: "Dokumentiere professionell. Spare Zeit. Beeindrucke deine Kunden." },
  { emoji: "🩺", title: "Tierärzte & Therapeuten", desc: "Greif mit Erlaubnis auf vollständige Vorgeschichten zu. Überall." },
  { emoji: "🏢", title: "Versicherungen & Verbände", desc: "Standardisierte digitale Nachweise. Weniger Aufwand für alle.", cta: true },
];

function ForWhomSection() {
  const r = useReveal();
  return (
    <section id="profis" className="py-20 md:py-28" style={{ backgroundColor: "#f9fafb" }}>
      <div ref={r.ref} className={`max-w-5xl mx-auto px-6 ${revealClass(r.visible)}`}>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center mb-14" style={{ color: "#0a0a0a" }}>
          Für alle rund ums Pferd.
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {audiences.map((a) => (
            <div
              key={a.title}
              className="p-6 rounded-2xl bg-white flex flex-col gap-3 border-t-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              style={{ borderTopColor: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderTopColor = "#f97316")}
              onMouseLeave={(e) => (e.currentTarget.style.borderTopColor = "transparent")}
            >
              <span className="text-3xl">{a.emoji}</span>
              <h3 className="text-lg font-bold" style={{ color: "#0a0a0a" }}>{a.title}</h3>
              <p className="text-sm leading-relaxed flex-1" style={{ color: "#6b7280" }}>{a.desc}</p>
              {a.cta && (
                <a
                  href="/pferdeakte/partner"
                  className="inline-flex items-center gap-1 text-sm font-semibold mt-2"
                  style={{ color: "#f97316" }}
                >
                  Partnerschaft anfragen →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — SOCIAL PROOF
// ═══════════════════════════════════════════════════════════
const quotes = [
  { text: "Endlich eine Lösung die versteht wie unsere Branche funktioniert.", name: "Heiko M.", role: "Hufbearbeiter" },
  { text: "Ich warte schon lange auf sowas. Das wird die Arbeit mit Tierärzten so viel einfacher machen.", name: "Sandra K.", role: "Pferdebesitzerin" },
];

function SocialProofSection() {
  const rawCount = useWaitlistCount();
  const displayCount = useAnimatedCounter(rawCount, 800, rawCount > 0);
  const r = useReveal();

  return (
    <section className="py-20 md:py-28 bg-white">
      <div ref={r.ref} className={`max-w-4xl mx-auto px-6 text-center ${revealClass(r.visible)}`}>
        <p className="text-5xl md:text-6xl font-extrabold mb-2 tabular-nums" style={{ color: "#f97316" }}>
          {displayCount}
        </p>
        <p className="mb-14" style={{ color: "#0a0a0a" }}>
          Pferdebesitzer und Profis sind bereits dabei.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {quotes.map((q) => (
            <div
              key={q.name}
              className="p-6 rounded-2xl text-left relative border-l-4"
              style={{ backgroundColor: "#f9fafb", borderLeftColor: "#f97316" }}
            >
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

// ═══════════════════════════════════════════════════════════
// SECTION 7 — FOOTER
// ═══════════════════════════════════════════════════════════
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
              className="transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f97316")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
            >
              {l.label}
            </a>
          ))}
        </div>
        <a
          href="mailto:support@hufmanager.de"
          className="flex items-center gap-1 transition-colors"
          style={{ color: "rgba(255,255,255,0.4)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f97316")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
        >
          <Mail className="w-3.5 h-3.5" /> support@hufmanager.de
        </a>
      </div>
    </footer>
  );
}
