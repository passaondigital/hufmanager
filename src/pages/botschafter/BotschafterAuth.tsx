import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, EyeOff, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

function generateRef(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const TYPES = [
  { value: "creator", icon: "🎙️", label: "Creator / Influencer" },
  { value: "profi", icon: "🔨", label: "Pferdeprofi / Dienstleister" },
  { value: "unternehmen", icon: "🏢", label: "Unternehmen / Verband" },
] as const;

const PROFESSION_OPTIONS = ["Hufbearbeiter", "Tierarzt", "Physiotherapeut", "Trainer", "Reitlehrer", "Sattler", "Zahnarzt", "Sonstiges"];
const INDUSTRY_OPTIONS = ["Versicherung", "Verband", "Medien", "Stallbetrieb", "Sonstiges"];

type BotschafterType = "creator" | "profi" | "unternehmen";

const loginSchema = z.object({
  email: z.string().trim().email("Bitte gib eine gültige E-Mail ein."),
  password: z.string().min(1, "Passwort eingeben"),
});

const registerSchema = z.object({
  first_name: z.string().trim().min(1, "Vorname fehlt").max(80),
  last_name: z.string().trim().min(1, "Nachname fehlt").max(80),
  email: z.string().trim().email("Bitte gib eine gültige E-Mail ein.").max(255),
  password: z.string().min(8, "Mindestens 8 Zeichen"),
  password_confirm: z.string(),
  privacy: z.literal(true, { errorMap: () => ({ message: "Bitte Datenschutz bestätigen" }) }),
  affiliate_terms: z.literal(true, { errorMap: () => ({ message: "Bitte Affiliate-Bedingungen bestätigen" }) }),
}).refine(d => d.password === d.password_confirm, {
  message: "Passwörter stimmen nicht überein",
  path: ["password_confirm"],
});

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

export default function BotschafterAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginShowPw, setLoginShowPw] = useState(false);
  const [noBotschafter, setNoBotschafter] = useState(false);

  // Register state
  const [type, setType] = useState<BotschafterType | "">("");
  const [regForm, setRegForm] = useState({
    first_name: "", last_name: "", email: "", password: "", password_confirm: "",
    social_handle: "", profession: "", plz: "", company_name: "", industry: "",
  });
  const [inviteCode, setInviteCode] = useState(searchParams.get("ref") || "");
  const [privacy, setPrivacy] = useState(false);
  const [affiliateTerms, setAffiliateTerms] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regShowPw, setRegShowPw] = useState(false);

  const setReg = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setRegForm(f => ({ ...f, [k]: e.target.value }));

  // ── LOGIN ─────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setNoBotschafter(false);
    const parsed = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!parsed.success) { setLoginError(parsed.error.errors[0].message); return; }

    setLoginLoading(true);
    sessionStorage.setItem("botschafter_login_source", "true");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      setLoginLoading(false);
      sessionStorage.removeItem("botschafter_login_source");
      setLoginError(error.message === "Invalid login credentials" ? "E-Mail oder Passwort falsch." : error.message);
      return;
    }

    if (data.user) {
      const { data: bot } = await supabase
        .from("pferdeakte_botschafter")
        .select("id, status")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (bot?.status === "active") {
        navigate("/botschafter/uebersicht", { replace: true });
      } else if (bot?.status === "pending") {
        navigate("/botschafter/warten", { replace: true });
      } else {
        setNoBotschafter(true);
        setLoginLoading(false);
        sessionStorage.removeItem("botschafter_login_source");
      }
    } else {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail.trim()) { toast.error("Bitte zuerst E-Mail eingeben."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) toast.error(error.message);
    else toast.success("E-Mail zum Zurücksetzen gesendet!");
  };

  // ── REGISTER ──────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (!type) { setRegError("Bitte wähle einen Typ."); return; }

    const parsed = registerSchema.safeParse({
      ...regForm,
      privacy,
      affiliate_terms: affiliateTerms,
    });
    if (!parsed.success) { setRegError(parsed.error.errors[0].message); return; }

    setRegLoading(true);

    // 1. Create Supabase auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: regForm.email,
      password: regForm.password,
      options: {
        emailRedirectTo: `${window.location.origin}/botschafter/login`,
        data: {
          full_name: `${regForm.first_name} ${regForm.last_name}`,
          role: "client", // Base role for auth metadata
        },
      },
    });

    if (authError) {
      setRegLoading(false);
      if (authError.message?.includes("already registered")) {
        setRegError("Diese E-Mail ist bereits registriert. Bitte melde dich an.");
      } else {
        setRegError(authError.message);
      }
      return;
    }

    if (!authData.user) {
      setRegLoading(false);
      setRegError("Registrierung fehlgeschlagen.");
      return;
    }

    const refCode = generateRef();

    // 2. INSERT into pferdeakte_botschafter with user_id
    const { data: botData, error: dbErr } = await supabase.from("pferdeakte_botschafter").insert({
      user_id: authData.user.id,
      type: type as string,
      first_name: regForm.first_name.substring(0, 80),
      last_name: regForm.last_name.substring(0, 80),
      email: regForm.email.substring(0, 255),
      referral_code: refCode,
      status: "pending",
      source_role: "extern",
      social_handle: type === "creator" ? (regForm.social_handle || null) : null,
      profession: type === "profi" ? (regForm.profession || null) : null,
      plz: type === "profi" ? (regForm.plz || null) : null,
      company_name: type === "unternehmen" ? (regForm.company_name || null) : null,
      industry: type === "unternehmen" ? (regForm.industry || null) : null,
    } as any).select("id, bid, referral_code").single();

    if (dbErr) {
      setRegLoading(false);
      if ((dbErr as any).code === "23505") {
        setRegError("Du bist bereits als Botschafter registriert.");
      } else {
        setRegError("Fehler: " + dbErr.message);
      }
      return;
    }

    // 3. Check if existing profile with this email exists → link
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", regForm.email)
      .neq("id", authData.user.id)
      .maybeSingle();

    if (existingProfile && botData) {
      await supabase.from("pferdeakte_botschafter")
        .update({ source_user_id: existingProfile.id } as any)
        .eq("id", botData.id);
    }

    // 4. Send welcome email via edge function
    try {
      await supabase.functions.invoke("botschafter-welcome", {
        body: {
          email: regForm.email,
          first_name: regForm.first_name,
          bid: botData?.bid || botData?.id || "",
          referral_code: refCode,
          type,
        },
      });
    } catch (e) {
      console.warn("Welcome email failed:", e);
    }

    setRegLoading(false);
    navigate("/botschafter/warten", { replace: true });
  };

  const inputCls = "h-12 border-2 border-zinc-200 bg-white focus-visible:ring-[#f97316] focus-visible:border-[#f97316]";
  const selectCls = "flex h-12 w-full rounded-lg border-2 border-zinc-200 bg-white px-4 py-3 text-base appearance-none focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316]";

  return (
    <div className="min-h-screen bg-[#f9fafb] font-sans" style={{ color: "#0a0a0a" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-zinc-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-12 h-16">
          <Link to="/pferdeakte" className="text-sm font-medium hover:text-[#f97316] transition-colors" style={{ color: "#6b7280" }}>
            ← Zur Pferdeakte
          </Link>
          <span className="text-xl font-bold tracking-tight">HufManager</span>
          <div className="w-24" />
        </div>
      </nav>

      <div className="flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-[480px]">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-4 text-center border-b border-zinc-100">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xl font-bold tracking-tight">HufManager</span>
                <Badge className="text-xs font-bold" style={{ backgroundColor: "#fff7ed", color: "#ea580c", border: "none" }}>
                  Botschafter Portal
                </Badge>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-100">
              {(["login", "register"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setLoginError(""); setRegError(""); setNoBotschafter(false); }}
                  className="flex-1 py-3 text-sm font-semibold transition-colors"
                  style={{
                    color: tab === t ? "#f97316" : "#6b7280",
                    borderBottom: tab === t ? "2px solid #f97316" : "2px solid transparent",
                  }}
                >
                  {t === "login" ? "Anmelden" : "Registrieren"}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* ═══ LOGIN TAB ═══ */}
              {tab === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">E-Mail</label>
                    <Input
                      type="email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      className={inputCls}
                      placeholder="deine@email.de"
                      maxLength={255}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Passwort</label>
                    <div className="relative">
                      <Input
                        type={loginShowPw ? "text" : "password"}
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        className={inputCls}
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setLoginShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }}>
                        {loginShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button type="button" onClick={handleForgotPassword} className="text-xs mt-1 hover:underline" style={{ color: "#f97316" }}>
                      Passwort vergessen?
                    </button>
                  </div>

                  {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}

                  {noBotschafter && (
                    <div className="p-3 rounded-lg text-sm text-center" style={{ backgroundColor: "#fff7ed", color: "#ea580c" }}>
                      <p className="font-medium">Du hast noch keine Botschafter-Registrierung.</p>
                      <button type="button" onClick={() => setTab("register")} className="underline font-semibold mt-1">
                        Wechsle zum Tab Registrieren
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full h-12 rounded-full text-base font-bold text-white transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center"
                    style={{ backgroundColor: "#f97316" }}
                  >
                    {loginLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Anmelden
                  </button>

                  <div className="border-t border-zinc-100 pt-4 text-center">
                    <p className="text-xs" style={{ color: "#9ca3af" }}>Du hast bereits einen HufManager Account?</p>
                    <Link to="/auth" className="text-sm font-medium hover:underline" style={{ color: "#f97316" }}>
                      Im HufManager anmelden →
                    </Link>
                  </div>
                </form>
              )}

              {/* ═══ REGISTER TAB ═══ */}
              {tab === "register" && (
                <form onSubmit={handleRegister} className="space-y-5">
                  {/* Step 1: Type */}
                  <div>
                    <p className="text-sm font-semibold mb-3">Ich bin...</p>
                    <div className="grid grid-cols-3 gap-3">
                      {TYPES.map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setType(t.value)}
                          className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all text-sm font-medium ${
                            type === t.value ? "border-[#f97316] bg-orange-50" : "border-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          <span className="text-2xl">{t.icon}</span>
                          <span className="text-center leading-tight text-xs">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {type && (
                    <>
                      {/* Step 2: Account data */}
                      <div className="space-y-3 pt-2 border-t border-zinc-100">
                        <div className="grid grid-cols-2 gap-3">
                          <Input placeholder="Vorname *" value={regForm.first_name} onChange={setReg("first_name")} className={inputCls} maxLength={80} />
                          <Input placeholder="Nachname *" value={regForm.last_name} onChange={setReg("last_name")} className={inputCls} maxLength={80} />
                        </div>
                        <Input type="email" placeholder="E-Mail *" value={regForm.email} onChange={setReg("email")} className={inputCls} maxLength={255} />
                        
                        <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                          Erstelle dein Botschafter-Konto — damit kannst du dich später im Dashboard anmelden.
                        </p>
                        <div className="relative">
                          <Input
                            type={regShowPw ? "text" : "password"}
                            placeholder="Passwort (min. 8 Zeichen) *"
                            value={regForm.password}
                            onChange={setReg("password")}
                            className={inputCls}
                          />
                          <button type="button" onClick={() => setRegShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }}>
                            {regShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <PasswordStrength password={regForm.password} />
                        <Input
                          type="password"
                          placeholder="Passwort bestätigen *"
                          value={regForm.password_confirm}
                          onChange={setReg("password_confirm")}
                          className={inputCls}
                        />
                      </div>

                      {/* Step 3: Type-specific fields */}
                      {type === "creator" && (
                        <div className="pt-2 border-t border-zinc-100">
                          <Input placeholder="Instagram / TikTok / YouTube (optional)" value={regForm.social_handle} onChange={setReg("social_handle")} className={inputCls} />
                        </div>
                      )}
                      {type === "profi" && (
                        <div className="space-y-3 pt-2 border-t border-zinc-100">
                          <div className="relative">
                            <select value={regForm.profession} onChange={setReg("profession")} className={selectCls}>
                              <option value="">Berufsfeld</option>
                              {PROFESSION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#9ca3af" }} />
                          </div>
                          <Input placeholder="PLZ / Ort" value={regForm.plz} onChange={setReg("plz")} className={inputCls} />
                        </div>
                      )}
                      {type === "unternehmen" && (
                        <div className="space-y-3 pt-2 border-t border-zinc-100">
                          <Input placeholder="Firmenname" value={regForm.company_name} onChange={setReg("company_name")} className={inputCls} />
                          <div className="relative">
                            <select value={regForm.industry} onChange={setReg("industry")} className={selectCls}>
                              <option value="">Branche</option>
                              {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#9ca3af" }} />
                          </div>
                        </div>
                      )}

                      {/* Invite code + checkboxes */}
                      <div className="space-y-3 pt-2 border-t border-zinc-100">
                        <Input placeholder="Einladungscode (optional)" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className={inputCls} maxLength={20} />
                        
                        <label className="flex items-start gap-2 text-sm cursor-pointer">
                          <Checkbox checked={privacy} onCheckedChange={v => setPrivacy(v === true)} className="mt-0.5" />
                          <span style={{ color: "#6b7280" }}>
                            Ich habe die{" "}
                            <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#f97316]">Datenschutzerklärung</a>{" "}
                            gelesen und stimme zu. *
                          </span>
                        </label>
                        <label className="flex items-start gap-2 text-sm cursor-pointer">
                          <Checkbox checked={affiliateTerms} onCheckedChange={v => setAffiliateTerms(v === true)} className="mt-0.5" />
                          <span style={{ color: "#6b7280" }}>
                            Ich habe die{" "}
                            <a href="/affiliate-bedingungen" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#f97316]">Affiliate-Bedingungen</a>{" "}
                            gelesen. *
                          </span>
                        </label>
                      </div>

                      {regError && <p className="text-red-500 text-sm text-center">{regError}</p>}

                      <button
                        type="submit"
                        disabled={regLoading || !privacy || !affiliateTerms}
                        className="w-full h-14 rounded-full text-lg font-bold text-white transition-all hover:brightness-110 hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center"
                        style={{ backgroundColor: "#f97316" }}
                      >
                        {regLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Jetzt registrieren
                      </button>
                    </>
                  )}

                  <div className="border-t border-zinc-100 pt-4 text-center">
                    <p className="text-xs" style={{ color: "#9ca3af" }}>Bereits HufManager Nutzer?</p>
                    <Link to="/auth" className="text-sm font-medium hover:underline" style={{ color: "#f97316" }}>
                      Botschafter-Funktion in deiner App aktivieren →
                    </Link>
                    <p className="text-[11px] mt-1" style={{ color: "#d1d5db" }}>Management → Botschafter werden</p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
