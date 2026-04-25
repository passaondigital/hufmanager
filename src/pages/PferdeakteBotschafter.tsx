import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

function generateRef(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const TYPES = [
  { value: "creator", icon: "🎙️", label: "Privatperson / Creator" },
  { value: "profi", icon: "🔨", label: "Pferdeprofi / Dienstleister" },
  { value: "unternehmen", icon: "🏢", label: "Unternehmen / Verband" },
] as const;

const HEARD_OPTIONS = ["Instagram", "Facebook", "TikTok", "Google", "Empfehlung", "Veranstaltung", "Sonstiges"];
const PROFESSION_OPTIONS = ["Hufbearbeiter", "Tierarzt", "Physiotherapeut", "Trainer", "Reitlehrer", "Sattler", "Zahnarzt", "Sonstiges"];
const CUSTOMER_COUNT_OPTIONS = ["<10", "10–50", "50–100", "100+"];
const INDUSTRY_OPTIONS = ["Versicherung", "Verband", "Medien", "Stallbetrieb", "Sonstiges"];
const COOPERATION_OPTIONS = [
  "Namentliche Nennung auf Launchpage",
  "Newsletter-Erwähnung",
  "Gemeinsame PR zum Launch",
  "Affiliate-Programm",
  "Langfristige Partnerschaft",
];

const baseSchema = z.object({
  first_name: z.string().trim().min(1, "Vorname fehlt").max(80),
  last_name: z.string().trim().min(1, "Nachname fehlt").max(80),
  email: z.string().trim().email("Bitte gib eine gültige E-Mail ein").max(255),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
  password_confirm: z.string(),
  privacy: z.literal(true, { errorMap: () => ({ message: "Bitte Datenschutz bestätigen" }) }),
}).refine(d => d.password === d.password_confirm, {
  message: "Passwörter stimmen nicht überein",
  path: ["password_confirm"],
});

type BotschafterType = "creator" | "profi" | "unternehmen";

function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ].filter(Boolean).length;
  const labels = ["", "Schwach", "Mittel", "Gut", "Stark"];
  const colors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e"];
  if (!password) return null;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i <= score ? colors[score] : "#e5e7eb" }} />
        ))}
      </div>
      <span className="text-xs" style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  );
}

export default function PferdeakteBotschafter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [type, setType] = useState<BotschafterType | "">("");
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", heard_from: "",
    social_handle: "", motivation: "", password: "", password_confirm: "",
    profession: "", plz: "", website: "", customer_count: "",
    company_name: "", company_role: "", industry: "",
  });
  const [cooperationTypes, setCooperationTypes] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleCoop = (c: string) =>
    setCooperationTypes((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!type) { setError("Bitte wähle einen Typ."); return; }
    const res = baseSchema.safeParse({ ...form, privacy });
    if (!res.success) { setError(res.error.errors[0].message); return; }

    setSubmitting(true);

    // 1. Create Supabase auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/botschafter/login`,
        data: {
          full_name: `${form.first_name} ${form.last_name}`,
          role: "client",
        },
      },
    });

    if (authError) {
      setSubmitting(false);
      if (authError.message?.includes("already registered")) {
        setError("Diese E-Mail ist bereits registriert. Bitte melde dich an unter /botschafter/login");
      } else {
        setError(authError.message);
      }
      return;
    }

    if (!authData.user) {
      setSubmitting(false);
      setError("Registrierung fehlgeschlagen.");
      return;
    }

    // 2. Registrierung über Edge Function (service_role), damit kein RLS-Fehler bei fehlender Session entsteht
    const { data: registerData, error: registerErr } = await supabase.functions.invoke("register-botschafter", {
      body: {
        user_id: authData.user.id,
        type,
        first_name: form.first_name.substring(0, 80),
        last_name: form.last_name.substring(0, 80),
        email: form.email.substring(0, 255),
        phone: form.phone || null,
        heard_from: form.heard_from || null,
        social_handle: type === "creator" ? (form.social_handle || null) : null,
        motivation: type === "creator" ? (form.motivation || null) : null,
        profession: type === "profi" ? (form.profession || null) : null,
        plz: type === "profi" ? (form.plz || null) : null,
        website: type === "profi" ? (form.website || null) : null,
        customer_count: type === "profi" ? (form.customer_count || null) : null,
        company_name: type === "unternehmen" ? (form.company_name || null) : null,
        company_role: type === "unternehmen" ? (form.company_role || null) : null,
        industry: type === "unternehmen" ? (form.industry || null) : null,
        cooperation_types: type === "unternehmen" ? cooperationTypes : null,
        source_role: "extern",
      },
    });

    if (registerErr) {
      setSubmitting(false);

      let message = "Registrierung konnte nicht gespeichert werden.";
      try {
        const payload = await (registerErr as any)?.context?.json?.();
        if (payload?.error === "already_registered") {
          message = "Diese E-Mail ist bereits als Botschafter registriert.";
        } else if (payload?.error) {
          message = `Fehler: ${payload.error}`;
        }
      } catch {
        if ((registerErr as any)?.message?.includes("409")) {
          message = "Diese E-Mail ist bereits als Botschafter registriert.";
        }
      }

      setError(message);
      return;
    }

    const botData = (registerData as any)?.data || registerData;
    const refCode = (registerData as any)?.referral_code || (botData as any)?.referral_code || "";

    // 3. Send welcome email
    try {
      await supabase.functions.invoke("botschafter-welcome", {
        body: {
          email: form.email,
          first_name: form.first_name,
          bid: (botData as any)?.bid || (botData as any)?.id || "",
          referral_code: refCode,
          type,
        },
      });
    } catch (err) {
      console.warn("Welcome email failed:", err);
    }

    setSubmitting(false);
    navigate("/botschafter/dashboard", { replace: true });
  };

  const inputCls = "border-2 border-zinc-200 bg-white focus-visible:ring-[#f97316] focus-visible:border-[#f97316]";
  const selectCls = "flex h-12 w-full rounded-lg border-2 border-zinc-200 bg-white px-4 py-3 text-base appearance-none focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316]";

  return (
    <div className="min-h-screen bg-white font-sans" style={{ color: "#0a0a0a" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-zinc-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-12 h-16">
          <Link to="/pferdeakte" className="text-sm font-medium hover:text-[#f97316] transition-colors" style={{ color: "#6b7280" }}>
            ← Zur Pferdeakte
          </Link>
          <span className="text-xl font-bold tracking-tight">HufManager</span>
          <div className="flex items-center gap-3">
            <Link to="/botschafter/login" className="text-sm font-medium hover:text-[#f97316] transition-colors" style={{ color: "#6b7280" }}>
              Bereits Botschafter? Anmelden
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-16 pb-10 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <span className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-6" style={{ backgroundColor: "#fff7ed", color: "#ea580c" }}>
            Botschafter-Programm
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-5" style={{ color: "#0a0a0a" }}>
            Sei mehr als ein Nutzer.<br />Sei der Grund warum es sich verbreitet.
          </h1>
          <p className="text-lg max-w-lg mx-auto" style={{ color: "#6b7280" }}>
            Registriere dich als Botschafter und verdiene — während du etwas Sinnvolles teilst.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-12" style={{ backgroundColor: "#f9fafb" }}>
        <div className="max-w-[560px] mx-auto px-6">
          {!success ? (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type selector */}
                <div>
                  <p className="text-sm font-semibold mb-3" style={{ color: "#0a0a0a" }}>Ich bin...</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setType(t.value)}
                        className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-200 text-sm font-medium ${
                          type === t.value ? "border-[#f97316] bg-orange-50" : "border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        <span className="text-2xl">{t.icon}</span>
                        <span className="text-center leading-tight">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Common fields */}
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Vorname *" value={form.first_name} onChange={set("first_name")} className={inputCls} maxLength={80} />
                  <Input placeholder="Nachname *" value={form.last_name} onChange={set("last_name")} className={inputCls} maxLength={80} />
                </div>
                <Input type="email" placeholder="E-Mail *" value={form.email} onChange={set("email")} className={inputCls} maxLength={255} />
                
                {/* Password fields */}
                <div className="space-y-3">
                  <p className="text-xs" style={{ color: "#9ca3af" }}>
                    Erstelle dein Botschafter-Konto — damit kannst du dich später im Dashboard anmelden.
                  </p>
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      placeholder="Passwort (min. 8 Zeichen) *"
                      value={form.password}
                      onChange={set("password")}
                      className={inputCls}
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={form.password} />
                  <Input
                    type="password"
                    placeholder="Passwort bestätigen *"
                    value={form.password_confirm}
                    onChange={set("password_confirm")}
                    className={inputCls}
                  />
                </div>

                <Input placeholder="Telefon (optional)" value={form.phone} onChange={set("phone")} className={inputCls} />
                <div className="relative">
                  <select value={form.heard_from} onChange={set("heard_from")} className={selectCls}>
                    <option value="">Wie hast du von HufManager gehört?</option>
                    {HEARD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#9ca3af" }} />
                </div>

                {/* Creator fields */}
                {type === "creator" && (
                  <div className="space-y-3 pt-2 border-t border-zinc-100">
                    <Input placeholder="Instagram / TikTok / YouTube (@deinprofil)" value={form.social_handle} onChange={set("social_handle")} className={inputCls} />
                    <Textarea placeholder="Warum möchtest du Botschafter werden?" value={form.motivation} onChange={set("motivation") as any} className="border-2 border-zinc-200 focus-visible:ring-[#f97316] focus-visible:border-[#f97316]" rows={3} />
                  </div>
                )}

                {/* Profi fields */}
                {type === "profi" && (
                  <div className="space-y-3 pt-2 border-t border-zinc-100">
                    <div className="relative">
                      <select value={form.profession} onChange={set("profession")} className={selectCls}>
                        <option value="">Berufsfeld</option>
                        {PROFESSION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#9ca3af" }} />
                    </div>
                    <Input placeholder="PLZ / Ort" value={form.plz} onChange={set("plz")} className={inputCls} />
                    <Input placeholder="Website (optional)" value={form.website} onChange={set("website")} className={inputCls} />
                    <div className="relative">
                      <select value={form.customer_count} onChange={set("customer_count")} className={selectCls}>
                        <option value="">Anzahl Kunden (ca.)</option>
                        {CUSTOMER_COUNT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#9ca3af" }} />
                    </div>
                  </div>
                )}

                {/* Unternehmen fields */}
                {type === "unternehmen" && (
                  <div className="space-y-3 pt-2 border-t border-zinc-100">
                    <Input placeholder="Unternehmensname" value={form.company_name} onChange={set("company_name")} className={inputCls} />
                    <Input placeholder="Position / Rolle" value={form.company_role} onChange={set("company_role")} className={inputCls} />
                    <div className="relative">
                      <select value={form.industry} onChange={set("industry")} className={selectCls}>
                        <option value="">Branche</option>
                        {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#9ca3af" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Gewünschte Kooperation</p>
                      <div className="space-y-2">
                        {COOPERATION_OPTIONS.map((c) => (
                          <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={cooperationTypes.includes(c)} onCheckedChange={() => toggleCoop(c)} />
                            <span style={{ color: "#6b7280" }}>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy */}
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <Checkbox checked={privacy} onCheckedChange={(v) => setPrivacy(v === true)} className="mt-0.5" />
                  <span style={{ color: "#6b7280" }}>
                    Ich habe die{" "}
                    <Link to="/datenschutz" target="_blank" className="underline hover:text-[#f97316]">Datenschutzerklärung</Link>{" "}
                    gelesen und stimme zu. *
                  </span>
                </label>

                {error && (
                  <div className="text-sm text-center">
                    <p className="text-red-500">{error}</p>
                    {error.includes("/botschafter/login") && (
                      <Link to="/botschafter/login" className="text-sm font-semibold underline mt-1 inline-block" style={{ color: "#f97316" }}>
                        Zum Botschafter-Login →
                      </Link>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-14 rounded-full text-lg font-bold text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 flex items-center justify-center"
                  style={{ backgroundColor: "#f97316" }}
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Jetzt als Botschafter registrieren
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border-2 p-8 text-center" style={{ borderColor: "#22c55e" }}>
              <p className="text-5xl mb-4">🎉</p>
              <h2 className="text-2xl font-extrabold mb-3" style={{ color: "#0a0a0a" }}>Willkommen in der Bewegung.</h2>
              <p className="mb-4" style={{ color: "#6b7280" }}>
                Deine Registrierung ist eingegangen. Pascal meldet sich persönlich bei dir — in der Regel innerhalb von 24 Stunden.
              </p>
              <p className="font-bold" style={{ color: "#f97316" }}>
                Dein Affiliate-Link wird dir per E-Mail zugeschickt.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6 grid sm:grid-cols-3 gap-6">
          {[
            { icon: "🏆", title: "Top 10 Empfehler", text: "Die 10 aktivsten Botschafter erhalten HufManager Pro 1 Jahr kostenlos — automatisch, kein Antrag nötig." },
            { icon: "💰", title: "Bis 50% Provision", text: "Für jeden zahlenden Nutzer den du empfiehlst bekommst du bis zu 50% der ersten Zahlung — dauerhaft nachvollziehbar." },
            { icon: "📣", title: "Namentlich gelistet", text: "Botschafter und Unterstützer werden namentlich auf der Launchpage und in der App erwähnt." },
          ].map((b) => (
            <div key={b.title} className="rounded-2xl p-6 text-center" style={{ backgroundColor: "#f9fafb" }}>
              <span className="text-3xl block mb-3">{b.icon}</span>
              <h3 className="font-bold mb-2" style={{ color: "#0a0a0a" }}>{b.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-sm" style={{ backgroundColor: "#111111", color: "rgba(255,255,255,0.4)" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span>© 2026 HufManager · Barhufservice Schmid</span>
          <div className="flex items-center gap-4">
            {[
              { href: "/impressum", label: "Impressum" },
              { href: "/datenschutz", label: "Datenschutz" },
              { href: "/agb", label: "AGB" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-[#f97316]">{l.label}</a>
            ))}
          </div>
          <a href="mailto:kontakt@hufiapp.de" className="flex items-center gap-1 transition-colors hover:text-[#f97316]">
            <Mail className="w-3.5 h-3.5" /> kontakt@hufiapp.de
          </a>
        </div>
      </footer>
    </div>
  );
}
