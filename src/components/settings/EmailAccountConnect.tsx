import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, ChevronRight, ChevronLeft, Loader2, Trash2 } from "lucide-react";

// ── Typen ─────────────────────────────────────────────────────────────────────

interface EmailAccount {
  id: string;
  provider: string;
  display_name: string;
  email_address: string;
  is_verified: boolean;
  is_active: boolean;
  last_used_at: string | null;
}

interface SmtpPreset {
  host: string;
  port: number;
  secure: boolean;
}

// ── Provider-Konfigurationen ──────────────────────────────────────────────────

const PROVIDERS: Array<{
  id: string;
  name: string;
  icon: string;
  color: string;
  smtp: SmtpPreset;
  needsAppPassword: boolean;
  guide: Guide;
}> = [
  {
    id: "gmail",
    name: "Gmail",
    icon: "G",
    color: "#EA4335",
    smtp: { host: "smtp.gmail.com", port: 587, secure: false },
    needsAppPassword: true,
    guide: {
      title: "Gmail App-Passwort einrichten",
      intro: "Google erlaubt keine normalen Passwörter für externe Apps. Du brauchst ein sogenanntes 'App-Passwort' — das ist ein separates 16-stelliges Passwort nur für Hufi.",
      steps: [
        {
          step: 1,
          title: "2-Schritt-Verifizierung aktivieren",
          desc: "Gehe zu myaccount.google.com → Sicherheit → 2-Schritt-Verifizierung. Falls noch nicht aktiv, jetzt einrichten. Das ist eine Voraussetzung.",
          tip: "Dauert nur 2 Minuten — du brauchst dein Smartphone.",
        },
        {
          step: 2,
          title: "App-Passwörter aufrufen",
          desc: 'Bleib auf myaccount.google.com → Sicherheit → scrolle ganz nach unten → klicke auf "App-Passwörter".',
          tip: 'Du siehst diesen Punkt nur wenn 2-Schritt-Verifizierung aktiv ist.',
        },
        {
          step: 3,
          title: "Neues App-Passwort erstellen",
          desc: 'Klicke auf "App-Passwort erstellen" → trage als Name "Hufi" ein → klicke auf "Erstellen".',
          tip: null,
        },
        {
          step: 4,
          title: "Passwort kopieren",
          desc: "Google zeigt dir jetzt ein 16-stelliges Passwort (z.B. abcd efgh ijkl mnop). Kopiere es — du siehst es nur einmal!",
          tip: "Das Passwort enthält Leerzeichen — das ist normal, gib es genau so ein.",
        },
        {
          step: 5,
          title: "In Hufi eintragen",
          desc: "Trage unten deine Gmail-Adresse und das kopierte App-Passwort ein. Fertig.",
          tip: null,
        },
      ],
    },
  },
  {
    id: "icloud",
    name: "iCloud / Apple Mail",
    icon: "",
    color: "#555",
    smtp: { host: "smtp.mail.me.com", port: 587, secure: false },
    needsAppPassword: true,
    guide: {
      title: "iCloud App-spezifisches Passwort",
      intro: "Apple nennt es 'App-spezifisches Passwort'. Es funktioniert genauso wie bei Gmail — du brauchst ein separates Passwort nur für Hufi.",
      steps: [
        {
          step: 1,
          title: "Apple ID Seite öffnen",
          desc: "Gehe auf deinem iPhone zu Einstellungen → [dein Name] → oben auf deinen Namen → Anmelden & Sicherheit. Oder am Mac / Browser: appleid.apple.com.",
          tip: "Am iPhone geht das direkt in den Einstellungen — kein Browser nötig.",
        },
        {
          step: 2,
          title: "App-spezifische Passwörter",
          desc: 'Tippe auf "App-spezifische Passwörter" → dann auf das "+" (Plus) Symbol.',
          tip: "Am Browser: Sicherheit → App-spezifische Passwörter → + Erstellen.",
        },
        {
          step: 3,
          title: "Namen eingeben",
          desc: 'Trage als Beschriftung "Hufi" ein und tippe auf "Erstellen".',
          tip: null,
        },
        {
          step: 4,
          title: "Apple ID Passwort bestätigen",
          desc: "Apple fragt nach deinem normalen Apple ID Passwort zur Bestätigung.",
          tip: null,
        },
        {
          step: 5,
          title: "Passwort kopieren",
          desc: "Apple zeigt dir ein Passwort im Format xxxx-xxxx-xxxx-xxxx. Tippe darauf um es zu kopieren.",
          tip: "Merke dir: Das ist dein iCloud SMTP-Passwort, nicht dein Apple ID Passwort.",
        },
        {
          step: 6,
          title: "In Hufi eintragen",
          desc: "Deine Apple-E-Mail-Adresse ist entweder deine @icloud.com oder @me.com Adresse. Das App-Passwort kommt in das Passwort-Feld.",
          tip: "Deine iCloud-Adresse findest du in Einstellungen → [dein Name] → Kontakt-Info.",
        },
      ],
    },
  },
  {
    id: "outlook",
    name: "Outlook / Hotmail",
    icon: "O",
    color: "#0078D4",
    smtp: { host: "smtp-mail.outlook.com", port: 587, secure: false },
    needsAppPassword: true,
    guide: {
      title: "Outlook App-Kennwort erstellen",
      intro: "Für Outlook und Hotmail (@outlook.de, @hotmail.de, @live.de) brauchst du ebenfalls ein separates App-Kennwort — sofern du die Zwei-Schritt-Verifizierung aktiviert hast.",
      steps: [
        {
          step: 1,
          title: "Microsoft-Konto öffnen",
          desc: "Gehe zu account.microsoft.com und melde dich an.",
          tip: null,
        },
        {
          step: 2,
          title: "Sicherheit → Erweitert",
          desc: 'Klicke auf "Sicherheit" im oberen Menü → dann auf "Erweiterte Sicherheitsoptionen".',
          tip: null,
        },
        {
          step: 3,
          title: "App-Kennwörter",
          desc: 'Scrolle zum Abschnitt "App-Kennwörter" → klicke auf "Neues App-Kennwort erstellen".',
          tip: "Falls du diesen Abschnitt nicht siehst, aktiviere zuerst die Zwei-Schritt-Verifizierung oben auf der Seite.",
        },
        {
          step: 4,
          title: "Kennwort kopieren",
          desc: "Microsoft zeigt dir ein automatisch generiertes Kennwort. Kopiere es sofort — du siehst es nur einmal.",
          tip: null,
        },
        {
          step: 5,
          title: "In Hufi eintragen",
          desc: "Deine vollständige Outlook-Adresse und das kopierte App-Kennwort eintragen. Fertig.",
          tip: null,
        },
      ],
    },
  },
  {
    id: "gmx",
    name: "GMX",
    icon: "M",
    color: "#1D449C",
    smtp: { host: "mail.gmx.net", port: 587, secure: false },
    needsAppPassword: false,
    guide: {
      title: "GMX SMTP freischalten",
      intro: "Bei GMX musst du den externen E-Mail-Abruf (SMTP) einmalig in den Einstellungen aktivieren. Danach funktioniert dein normales GMX-Passwort.",
      steps: [
        {
          step: 1,
          title: "GMX.net öffnen",
          desc: 'Gehe zu gmx.net → melde dich an → klicke oben rechts auf deinen Namen → "E-Mail-Einstellungen".',
          tip: null,
        },
        {
          step: 2,
          title: "POP3 & IMAP öffnen",
          desc: 'Im linken Menü: "E-Mails" → "POP3 & IMAP Abruf". Oder direkt: E-Mail-Konto → IMAP.',
          tip: null,
        },
        {
          step: 3,
          title: "IMAP aktivieren",
          desc: 'Setze einen Haken bei "IMAP und SMTP aktivieren" und speichere.',
          tip: "Der Haken bei SMTP ist wichtig — ohne ihn kann Hufi keine Mails senden.",
        },
        {
          step: 4,
          title: "In Hufi eintragen",
          desc: "Deine GMX-Adresse und dein normales GMX-Passwort eintragen. Kein App-Passwort nötig.",
          tip: null,
        },
      ],
    },
  },
  {
    id: "webde",
    name: "Web.de",
    icon: "W",
    color: "#FF6600",
    smtp: { host: "smtp.web.de", port: 587, secure: false },
    needsAppPassword: false,
    guide: {
      title: "Web.de SMTP freischalten",
      intro: "Genau wie bei GMX muss der externe E-Mail-Versand bei Web.de einmalig aktiviert werden.",
      steps: [
        {
          step: 1,
          title: "Web.de öffnen",
          desc: "Gehe zu web.de → melde dich an → Einstellungen → E-Mail → POP3/IMAP.",
          tip: null,
        },
        {
          step: 2,
          title: "IMAP und SMTP aktivieren",
          desc: 'Setze den Haken bei "E-Mails über externe Programme abrufen (IMAP/POP3)" und "E-Mails über externe Programme senden (SMTP)".',
          tip: null,
        },
        {
          step: 3,
          title: "Speichern und in Hufi eintragen",
          desc: "Deine Web.de-Adresse und dein normales Web.de-Passwort. Fertig.",
          tip: null,
        },
      ],
    },
  },
  {
    id: "custom",
    name: "Andere / Eigene Domain",
    icon: "✉",
    color: "#6B7280",
    smtp: { host: "", port: 587, secure: false },
    needsAppPassword: false,
    guide: {
      title: "Eigene E-Mail / Hosting",
      intro: "Du hast eine eigene Domain (z.B. info@dein-betrieb.de) oder nutzt einen anderen Anbieter? Dein Hosting-Anbieter stellt dir alle Zugangsdaten bereit.",
      steps: [
        {
          step: 1,
          title: "SMTP-Daten beim Hoster nachschlagen",
          desc: "Logge dich beim Webspace-Anbieter ein (z.B. Strato, IONOS, All-Inkl, Hetzner). Suche im Kundenbereich nach 'E-Mail' → 'SMTP-Zugangsdaten'.",
          tip: "Die Zugangsdaten findest du oft auch im Willkommens-E-Mail deines Anbieters.",
        },
        {
          step: 2,
          title: "Was du brauchst",
          desc: "SMTP-Server (z.B. smtp.strato.de), Port (meist 587 oder 465), deine E-Mail-Adresse und das dazugehörige E-Mail-Passwort.",
          tip: "Verwende Port 587 + kein SSL falls möglich — das ist die zuverlässigere Wahl.",
        },
        {
          step: 3,
          title: "Unten eintragen und testen",
          desc: "Trage alle Daten unten ein und klicke auf 'Verbindung testen'. Hufi sendet dir eine Bestätigungsmail.",
          tip: null,
        },
      ],
    },
  },
];

// ── Typen für Guide ───────────────────────────────────────────────────────────

interface GuideStep {
  step: number;
  title: string;
  desc: string;
  tip: string | null;
}

interface Guide {
  title: string;
  intro: string;
  steps: GuideStep[];
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────

interface Props {
  userId: string;
}

type View = "list" | "select_provider" | "guide" | "form" | "testing";

export function EmailAccountConnect({ userId }: Props) {
  const [view, setView] = useState<View>("list");
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [guideStep, setGuideStep] = useState(0);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedProvider = PROVIDERS.find((p) => p.id === selectedProviderId);

  useEffect(() => { loadAccounts(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAccounts() {
    setLoading(true);
    const { data } = await supabase
      .from("email_accounts")
      .select("id, provider, display_name, email_address, is_verified, is_active, last_used_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setAccounts((data ?? []) as EmailAccount[]);
    setLoading(false);
  }

  function selectProvider(id: string) {
    const p = PROVIDERS.find((pr) => pr.id === id)!;
    setSelectedProviderId(id);
    setSmtpHost(p.smtp.host);
    setSmtpPort(p.smtp.port);
    setSmtpSecure(p.smtp.secure);
    setGuideStep(0);
    setTestResult(null);
    setView("guide");
  }

  function goToForm() {
    setView("form");
    setTestResult(null);
  }

  async function testConnection() {
    if (!emailAddress || !smtpPassword) {
      toast.error("E-Mail und Passwort sind Pflichtfelder.");
      return;
    }
    setView("testing");
    setTestResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("test-smtp-connection", {
        body: {
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          user: emailAddress,
          password: smtpPassword,
          from_name: displayName || "Hufi",
          test_to: emailAddress,
        },
        headers: { authorization: `Bearer ${session?.access_token}` },
      });
      const result = res.data as { success: boolean; message: string };
      setTestResult(result);
      setView("form");
    } catch {
      setTestResult({ success: false, message: "Verbindung fehlgeschlagen. Bitte Eingaben prüfen." });
      setView("form");
    }
  }

  async function saveAccount() {
    if (!testResult?.success) {
      toast.error("Bitte zuerst die Verbindung testen.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("email_accounts").insert({
      user_id: userId,
      provider: selectedProviderId ?? "custom",
      display_name: displayName || emailAddress,
      email_address: emailAddress,
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      smtp_secure: smtpSecure,
      smtp_user: emailAddress,
      smtp_password: smtpPassword,
      is_verified: true,
      is_active: true,
    });
    setSaving(false);
    if (error) { toast.error("Speichern fehlgeschlagen."); return; }
    toast.success("E-Mail-Konto verbunden!");
    await loadAccounts();
    setView("list");
    setEmailAddress(""); setSmtpPassword(""); setDisplayName(""); setTestResult(null);
  }

  async function deleteAccount(id: string) {
    await supabase.from("email_accounts").delete().eq("id", id).eq("user_id", userId);
    await loadAccounts();
    toast.success("E-Mail-Konto entfernt.");
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return <div style={{ padding: 24, color: "#9CA3AF", fontSize: 14 }}>Lädt…</div>;
  }

  if (view === "list") {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>E-Mail-Konten</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Rechnungen direkt aus Hufi mit deiner eigenen Adresse senden.</div>
          </div>
          <button
            onClick={() => setView("select_provider")}
            style={{ height: 34, paddingInline: 14, borderRadius: 10, background: "#F97316", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            + Konto hinzufügen
          </button>
        </div>

        {accounts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "#9CA3AF", fontSize: 14, border: "1.5px dashed #E5E7EB", borderRadius: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📧</div>
            <div>Noch kein E-Mail-Konto verbunden.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Verbinde Gmail, iCloud, Outlook oder deine eigene Adresse.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {accounts.map((acc) => (
              <div key={acc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1.5px solid #E5E7EB", borderRadius: 14, background: "#FAFAFA" }}>
                <ProviderBadge providerId={acc.provider} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{acc.email_address}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                    {acc.is_verified ? <span style={{ color: "#10B981" }}>✓ Verbunden</span> : "Nicht verifiziert"}
                    {acc.last_used_at && <span style={{ marginLeft: 8 }}>· Zuletzt genutzt: {new Date(acc.last_used_at).toLocaleDateString("de-DE")}</span>}
                  </div>
                </div>
                <button
                  onClick={() => deleteAccount(acc.id)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#D1D5DB", padding: 4 }}
                  title="Konto entfernen"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* OAuth-Hinweis */}
        <div style={{ marginTop: 20, padding: "14px 16px", background: "#F8FAFF", border: "1.5px solid #DBEAFE", borderRadius: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF", marginBottom: 4 }}>🔒 Google-Anmeldung (OAuth) — demnächst</div>
          <div style={{ fontSize: 12, color: "#3B82F6", lineHeight: 1.5 }}>
            Du willst dein Google-Konto direkt verknüpfen ohne App-Passwort? Das Google OAuth-Login kommt in einem der nächsten Updates.
          </div>
        </div>
      </div>
    );
  }

  if (view === "select_provider") {
    return (
      <div>
        <BackButton onClick={() => setView("list")} />
        <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1A1A1A", margin: "16px 0 6px" }}>Welchen Anbieter nutzt du?</h3>
        <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px", lineHeight: 1.5 }}>
          Wähle deinen E-Mail-Anbieter — Hufi zeigt dir dann eine Schritt-für-Schritt-Anleitung.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProvider(p.id)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 14,
                border: "1.5px solid #E5E7EB", background: "#FAFAFA",
                cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit",
              }}
            >
              <ProviderBadge providerId={p.id} size={38} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                  {p.needsAppPassword ? "App-Passwort erforderlich · Anleitung inklusive" : "Normales Passwort · Schnell eingerichtet"}
                </div>
              </div>
              <ChevronRight size={16} style={{ color: "#D1D5DB", flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === "guide" && selectedProvider) {
    const guide = selectedProvider.guide;
    const currentStep = guide.steps[guideStep];
    const isLast = guideStep === guide.steps.length - 1;

    return (
      <div>
        <BackButton onClick={() => setView("select_provider")} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 6px" }}>
          <ProviderBadge providerId={selectedProvider.id} size={32} />
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1A1A1A", margin: 0 }}>{guide.title}</h3>
        </div>

        {guideStep === 0 && (
          <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, margin: "0 0 20px", padding: "12px 14px", background: "#FFF7ED", border: "1.5px solid #FED7AA", borderRadius: 12 }}>
            {guide.intro}
          </p>
        )}

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {guide.steps.map((_, i) => (
            <div key={i} style={{ height: 5, flex: 1, borderRadius: 3, background: i <= guideStep ? "#F97316" : "#E5E7EB", transition: "background 0.3s" }} />
          ))}
        </div>

        {/* Aktueller Schritt */}
        <div style={{ padding: "20px", border: "1.5px solid #E5E7EB", borderRadius: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#F97316", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>
            Schritt {currentStep.step} von {guide.steps.length}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1A1A", marginBottom: 10 }}>{currentStep.title}</div>
          <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{currentStep.desc}</div>
          {currentStep.tip && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, fontSize: 12, color: "#166534", lineHeight: 1.5 }}>
              💡 {currentStep.tip}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {guideStep > 0 && (
            <button
              onClick={() => setGuideStep((s) => s - 1)}
              style={{ flex: 1, height: 46, borderRadius: 12, border: "1.5px solid #E5E7EB", background: "#FAFAFA", color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              Zurück
            </button>
          )}
          <button
            onClick={() => isLast ? goToForm() : setGuideStep((s) => s + 1)}
            style={{ flex: 2, height: 46, borderRadius: 12, background: "#F97316", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            {isLast ? "Passwort jetzt eingeben →" : "Weiter"}
          </button>
        </div>
      </div>
    );
  }

  if (view === "form" || view === "testing") {
    const isTesting = view === "testing";
    return (
      <div>
        <BackButton onClick={() => setView("guide")} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 20px" }}>
          {selectedProvider && <ProviderBadge providerId={selectedProvider.id} size={32} />}
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1A1A1A", margin: 0 }}>Zugangsdaten eingeben</h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field
            label="Dein Name (wie er beim Empfänger erscheint)"
            placeholder="z.B. Max Mustermann Hufpflege"
            value={displayName}
            onChange={setDisplayName}
          />
          <Field
            label="E-Mail-Adresse"
            placeholder="deine@email.de"
            value={emailAddress}
            onChange={setEmailAddress}
            type="email"
          />
          <Field
            label={selectedProvider?.needsAppPassword ? "App-Passwort (16 Zeichen)" : "E-Mail-Passwort"}
            placeholder={selectedProvider?.needsAppPassword ? "xxxx xxxx xxxx xxxx" : "Dein Passwort"}
            value={smtpPassword}
            onChange={setSmtpPassword}
            type="password"
          />

          {selectedProviderId === "custom" && (
            <>
              <Field label="SMTP-Server" placeholder="smtp.dein-anbieter.de" value={smtpHost} onChange={setSmtpHost} />
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <FieldLabel>Port</FieldLabel>
                  <select
                    value={smtpPort}
                    onChange={(e) => { setSmtpPort(Number(e.target.value)); setSmtpSecure(Number(e.target.value) === 465); }}
                    style={{ width: "100%", height: 44, borderRadius: 10, border: "1.5px solid #E5E7EB", padding: "0 12px", fontSize: 14, fontFamily: "inherit", background: "#FAFAFA", color: "#1A1A1A" }}
                  >
                    <option value={587}>587 (Standard)</option>
                    <option value={465}>465 (SSL)</option>
                    <option value={25}>25 (Legacy)</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {testResult && (
          <div style={{
            marginTop: 14, padding: "12px 14px", borderRadius: 12,
            background: testResult.success ? "#F0FDF4" : "#FEF2F2",
            border: `1.5px solid ${testResult.success ? "#BBF7D0" : "#FECACA"}`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            {testResult.success
              ? <CheckCircle size={18} style={{ color: "#10B981", flexShrink: 0 }} />
              : <span style={{ fontSize: 18, flexShrink: 0 }}>❌</span>}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: testResult.success ? "#166534" : "#991B1B" }}>
                {testResult.success ? "Verbindung erfolgreich!" : "Verbindung fehlgeschlagen"}
              </div>
              <div style={{ fontSize: 12, color: testResult.success ? "#4B7C5A" : "#B91C1C", marginTop: 2 }}>{testResult.message}</div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <button
            onClick={testConnection}
            disabled={isTesting || !emailAddress || !smtpPassword}
            style={{
              height: 48, borderRadius: 13, border: "1.5px solid #F97316",
              background: "transparent", color: "#F97316", fontSize: 14, fontWeight: 700,
              cursor: isTesting ? "not-allowed" : "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: (!emailAddress || !smtpPassword) ? 0.5 : 1,
            }}
          >
            {isTesting ? <><Loader2 size={16} className="animate-spin" />Testmail wird gesendet…</> : "Verbindung testen (Testmail senden)"}
          </button>

          {testResult?.success && (
            <button
              onClick={saveAccount}
              disabled={saving}
              style={{
                height: 48, borderRadius: 13, background: "#F97316", border: "none",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {saving ? "Wird gespeichert…" : "Konto speichern →"}
            </button>
          )}
        </div>

        <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 14, lineHeight: 1.5 }}>
          🔒 Dein Passwort wird verschlüsselt in deiner Hufi-Datenbank gespeichert und nie an Dritte weitergegeben.
        </p>
      </div>
    );
  }

  return null;
}

// ── Hilfselemente ─────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#6B7280", fontSize: 13, padding: 0, fontFamily: "inherit" }}
    >
      <ChevronLeft size={16} />Zurück
    </button>
  );
}

function ProviderBadge({ providerId, size }: { providerId: string; size: number }) {
  const p = PROVIDERS.find((pr) => pr.id === providerId);
  if (!p) return null;
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.45, color: "#fff", fontWeight: 900, lineHeight: 1 }}>{p.icon}</span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, letterSpacing: ".02em" }}>{children}</div>;
}

function Field({
  label, placeholder, value, onChange, type = "text",
}: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: "100%", height: 44, borderRadius: 10,
          border: "1.5px solid #E5E7EB", background: "#FAFAFA",
          padding: "0 14px", fontSize: 14, color: "#1A1A1A",
          fontFamily: "inherit", boxSizing: "border-box", outline: "none",
        }}
        onFocus={(e) => { e.target.style.borderColor = "#F97316"; }}
        onBlur={(e) => { e.target.style.borderColor = "#E5E7EB"; }}
      />
    </div>
  );
}
