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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

// ── Helpers ──────────────────────────────────────────────
function generateRef(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function getGreetingTime(): "Morgen" | "Tag" | "Abend" {
  const h = new Date().getHours();
  if (h < 12) return "Morgen";
  if (h < 18) return "Tag";
  return "Abend";
}

const waitlistSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "Bitte gib deinen Vornamen ein.")
    .max(80),
  email: z
    .string()
    .trim()
    .email("Bitte gib eine gültige E-Mail-Adresse ein.")
    .max(255),
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

// ═══════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════
export default function PferdeakteLanding() {
  const [searchParams] = useSearchParams();

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">
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
// SECTION 1 — HERO
// ═══════════════════════════════════════════════════════════
function HeroSection() {
  const cd = useCountdown();
  return (
    <section
      className="relative min-h-[90vh] flex flex-col"
      style={{ backgroundColor: "#0f2e1a" }}
    >
      {/* subtle texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Ccircle cx='20' cy='20' r='1' fill='%23fff'/%3E%3C/svg%3E\")",
        }}
      />

      {/* nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <span className="text-white text-xl font-bold tracking-tight">
          HufManager
        </span>
        <div className="flex items-center gap-6 text-sm">
          <a
            href="#profis"
            className="text-white/70 hover:text-white transition-colors"
          >
            Für Profis
          </a>
          <a
            href="/pferdeakte/partner"
            className="text-white/70 hover:text-white transition-colors"
          >
            Partner
          </a>
        </div>
      </nav>

      {/* content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center gap-6 pb-16">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight">
          Die digitale Pferdeakte.
        </h1>
        <p className="text-lg md:text-xl text-white/60 max-w-2xl">
          Alle Gesundheitsdaten deines Pferdes. Sicher. Geteilt. Immer dabei.
        </p>

        {/* countdown */}
        <div className="flex gap-3 mt-4">
          {[
            { val: cd.days, label: "Tage" },
            { val: cd.hours, label: "Std" },
            { val: cd.minutes, label: "Min" },
            { val: cd.seconds, label: "Sek" },
          ].map((u) => (
            <div
              key={u.label}
              className="flex flex-col items-center rounded-lg px-4 py-3 min-w-[64px]"
              style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            >
              <span className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                {String(u.val).padStart(2, "0")}
              </span>
              <span className="text-[11px] text-white/50 uppercase tracking-wider mt-1">
                {u.label}
              </span>
            </div>
          ))}
        </div>

        <a href="#waitlist">
          <Button
            size="lg"
            className="mt-4 text-lg font-bold px-10 rounded-full"
            style={{ backgroundColor: "#22c55e", color: "#fff" }}
          >
            Jetzt vormerken lassen
          </Button>
        </a>
        <p className="text-white/40 text-xs">
          Kostenlos · Kein Spam · Jederzeit kündbar
        </p>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — PROBLEM
// ═══════════════════════════════════════════════════════════
const problems = [
  {
    icon: ClipboardList,
    text: "Impfhefte, Röntgenbilder, Hufberichte — alles verteilt auf Ordner, WhatsApp und E-Mails",
  },
  {
    icon: Lock,
    text: "Kein Tierarzt, kein Hufbearbeiter hat im Notfall schnell Zugriff auf die richtigen Daten",
  },
  {
    icon: Heart,
    text: "Bei einem Pferdeverkauf gehen alle Unterlagen verloren — der neue Besitzer fängt bei null an",
  },
];

function ProblemSection() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center mb-14">
          Schluss mit dem Papierchaos.
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((p, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl border border-zinc-100 bg-zinc-50/50"
            >
              <p.icon className="w-12 h-12 text-zinc-400" strokeWidth={1.5} />
              <p className="text-zinc-600 leading-relaxed">{p.text}</p>
            </div>
          ))}
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
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: "#f0fdf4" }}>
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center mb-14">
          Eine Akte. Ein Pferd. Alles drin.
        </h2>
        <div className="space-y-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 p-5 rounded-xl bg-white border border-green-100"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.12)" }}>
                <f.icon className="w-5 h-5" style={{ color: "#16a34a" }} />
              </div>
              <div>
                <p className="font-semibold text-zinc-900">{f.title}</p>
                <p className="text-zinc-500 text-sm mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
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
    navigator.clipboard.writeText(
      `https://hufmanager.de/pferdeakte?ref=${success.refCode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="waitlist"
      className="py-20 md:py-28"
      style={{ backgroundColor: "#0f2e1a" }}
    >
      <div className="max-w-lg mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-3">
          Sei dabei, wenn es losgeht.
        </h2>
        <p className="text-white/50 text-center mb-10">
          Meld dich jetzt an und sicher dir deinen Frühzugang.
        </p>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Vorname"
              value={form.first_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, first_name: e.target.value }))
              }
              className="bg-white/10 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-green-500"
              maxLength={80}
            />
            <Input
              type="email"
              placeholder="E-Mail"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className="bg-white/10 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-green-500"
              maxLength={255}
            />
            <div className="relative">
              <select
                value={form.user_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, user_type: e.target.value }))
                }
                className="flex h-12 w-full rounded-lg border-2 border-white/10 bg-white/10 px-4 py-3 text-base text-white appearance-none focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="" disabled className="text-zinc-900">
                  Ich bin...
                </option>
                {USER_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="text-zinc-900">
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>
            <Input
              placeholder="Einladungscode (optional)"
              value={form.referral_code}
              onChange={(e) =>
                setForm((f) => ({ ...f, referral_code: e.target.value }))
              }
              className="bg-white/10 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-green-500"
              maxLength={20}
            />

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full text-lg font-bold rounded-full h-14"
              style={{ backgroundColor: "#22c55e", color: "#fff" }}
            >
              {submitting ? "Wird gespeichert..." : "Jetzt vormerken lassen"}
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-6 bg-white/5 rounded-2xl p-8 border border-white/10">
            <p className="text-3xl">🎉</p>
            <p className="text-white font-semibold text-lg">Du bist dabei!</p>
            <p className="text-white/60 text-sm">
              Dein persönlicher Referral-Link:
            </p>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3">
              <code className="flex-1 text-sm text-white/80 break-all">
                https://hufmanager.de/pferdeakte?ref={success.refCode}
              </code>
              <button
                onClick={copyLink}
                className="shrink-0 p-2 rounded-md hover:bg-white/10 transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/60" />
                )}
              </button>
            </div>

            <div className="space-y-2 text-sm text-white/60">
              <p className="text-white/80 font-medium">
                Teile deinen Link und erhalte:
              </p>
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center justify-center gap-2">
                  <Gift className="w-4 h-4 text-green-400" /> 3 Freunde = 1
                  Monat gratis
                </span>
                <span className="flex items-center justify-center gap-2">
                  <Gift className="w-4 h-4 text-green-400" /> 10 Freunde = 3
                  Monate gratis
                </span>
                <span className="flex items-center justify-center gap-2">
                  <Gift className="w-4 h-4 text-green-400" /> 25 Freunde = 1
                  Jahr gratis
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
  {
    emoji: "🐴",
    title: "Pferdebesitzer",
    desc: "Behalte den Überblick. Teile gezielt. Behalte die Kontrolle.",
  },
  {
    emoji: "🔨",
    title: "Hufbearbeiter & Schmiede",
    desc: "Dokumentiere professionell. Spare Zeit. Beeindrucke deine Kunden.",
  },
  {
    emoji: "🩺",
    title: "Tierärzte & Therapeuten",
    desc: "Greif mit Erlaubnis auf vollständige Vorgeschichten zu. Überall.",
  },
  {
    emoji: "🏢",
    title: "Versicherungen & Verbände",
    desc: "Standardisierte digitale Nachweise. Weniger Aufwand für alle.",
    cta: true,
  },
];

function ForWhomSection() {
  return (
    <section id="profis" className="py-20 md:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center mb-14">
          Für alle rund ums Pferd.
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {audiences.map((a) => (
            <div
              key={a.title}
              className="p-6 rounded-2xl border border-zinc-100 bg-zinc-50/50 flex flex-col gap-3"
            >
              <span className="text-3xl">{a.emoji}</span>
              <h3 className="text-lg font-bold">{a.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed flex-1">
                {a.desc}
              </p>
              {a.cta && (
                <a
                  href="/pferdeakte/partner"
                  className="inline-flex items-center gap-1 text-sm font-semibold mt-2"
                  style={{ color: "#16a34a" }}
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
  {
    text: "Endlich eine Lösung die versteht wie unsere Branche funktioniert.",
    name: "Heiko M.",
    role: "Hufbearbeiter",
  },
  {
    text: "Ich warte schon lange auf sowas. Das wird die Arbeit mit Tierärzten so viel einfacher machen.",
    name: "Sandra K.",
    role: "Pferdebesitzerin",
  },
];

function SocialProofSection() {
  const rawCount = useWaitlistCount();
  const displayCount = useAnimatedCounter(rawCount, 800, rawCount > 0);

  return (
    <section className="py-20 md:py-28 bg-zinc-50">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <p className="text-4xl md:text-5xl font-extrabold mb-2 tabular-nums">
          {displayCount}
        </p>
        <p className="text-zinc-500 mb-14">
          Pferdebesitzer und Profis sind bereits dabei.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {quotes.map((q) => (
            <div
              key={q.name}
              className="p-6 rounded-2xl bg-white border border-zinc-100 text-left relative"
            >
              <Quote className="w-8 h-8 text-zinc-200 mb-3" />
              <p className="text-zinc-600 leading-relaxed mb-4">„{q.text}"</p>
              <p className="font-semibold text-sm">{q.name}</p>
              <p className="text-zinc-400 text-xs">{q.role}</p>
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
    <footer
      className="py-8 px-6 text-sm"
      style={{ backgroundColor: "#0f2e1a", color: "rgba(255,255,255,0.4)" }}
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span>© 2026 HufManager · Barhufservice Schmid</span>
        <div className="flex items-center gap-4">
          <a href="/impressum" className="hover:text-white/70 transition-colors">
            Impressum
          </a>
          <a
            href="/datenschutz"
            className="hover:text-white/70 transition-colors"
          >
            Datenschutz
          </a>
          <a href="/agb" className="hover:text-white/70 transition-colors">
            AGB
          </a>
        </div>
        <a
          href="mailto:support@hufmanager.de"
          className="hover:text-white/70 transition-colors flex items-center gap-1"
        >
          <Mail className="w-3.5 h-3.5" /> support@hufmanager.de
        </a>
      </div>
    </footer>
  );
}
