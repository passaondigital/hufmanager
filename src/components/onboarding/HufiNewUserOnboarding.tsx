import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { markOnboardingComplete } from "@/lib/hufi-onboarding-detector";

interface Props {
  userId: string;
  onComplete: () => void;
}

type Step = "profession" | "country" | "connect" | "done";

const HUFI_LOGO = "https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png";

const PROFESSIONS = [
  { slug: "hufpfleger", label: "Hufpfleger:in", icon: "🐴", desc: "Barthoofcare, Ausgleich, Bewegungsanalyse" },
  { slug: "hufbearbeiter", label: "Hufbearbeiter:in", icon: "🔨", desc: "Beschlag, Korrekturbeschlag, Eisen" },
  { slug: "barhufpfleger", label: "Barhufpfleger:in", icon: "🌿", desc: "Ausschließlich barhuf, ganzheitlich" },
  { slug: "huforthopaedin", label: "Huforthopäd:in", icon: "🩺", desc: "Therapeutische Hufbearbeitung, Rehab" },
];

const COUNTRIES = [
  { code: "DE", label: "Deutschland", flag: "🇩🇪", tax: "19% MwSt." },
  { code: "AT", label: "Österreich", flag: "🇦🇹", tax: "20% MwSt." },
  { code: "CH", label: "Schweiz", flag: "🇨🇭", tax: "8.1% MwSt." },
];

export function HufiNewUserOnboarding({ userId, onComplete }: Props) {
  const [step, setStep] = useState<Step>("profession");
  const [profession, setProfession] = useState("");
  const [country, setCountry] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveProfession(slug: string) {
    setProfession(slug);
    await supabase.from("profiles").update({ profession_type: slug, profession_slug: slug }).eq("id", userId);
    setStep("country");
  }

  async function saveCountry(code: string) {
    setCountry(code);
    await supabase.from("profiles").update({ country: code }).eq("id", userId);
    setStep("connect");
  }

  async function finish() {
    setSaving(true);
    if (zipCode) await supabase.from("profiles").update({ zip_code: zipCode }).eq("id", userId);
    await markOnboardingComplete(userId);
    setSaving(false);
    onComplete();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#FFFFFF",
      display: "flex", flexDirection: "column",
      maxWidth: 430, margin: "0 auto",
      paddingTop: "env(safe-area-inset-top, 24px)",
    }}>

      {/* Header */}
      <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={HUFI_LOGO} alt="Hufi" style={{ width: "80%", height: "80%", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A1A" }}>Hufi</div>
          <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
            {step === "profession" ? "Schritt 1 von 3" : step === "country" ? "Schritt 2 von 3" : "Schritt 3 von 3"}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ margin: "16px 24px 0", height: 4, background: "#F3F4F6", borderRadius: 2 }}>
        <div style={{
          height: "100%", borderRadius: 2, background: "#F97316",
          width: step === "profession" ? "33%" : step === "country" ? "66%" : "100%",
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px 40px" }}>

        {step === "profession" && (
          <StepProfession onSelect={saveProfession} />
        )}

        {step === "country" && (
          <StepCountry
            profession={profession}
            zipCode={zipCode}
            onZipChange={setZipCode}
            onSelect={saveCountry}
          />
        )}

        {step === "connect" && (
          <StepConnect
            country={country}
            userId={userId}
            saving={saving}
            onFinish={finish}
          />
        )}
      </div>
    </div>
  );
}

// ── Schritt 1: Beruf ──────────────────────────────────────────────────────────

function StepProfession({ onSelect }: { onSelect: (slug: string) => void }) {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
        Was machst du?
      </h1>
      <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.5 }}>
        Damit Hufi die richtigen Begriffe, Preise und Workflows für dich kennt.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {PROFESSIONS.map((p) => (
          <button
            key={p.slug}
            onClick={() => onSelect(p.slug)}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "16px 18px", borderRadius: 16,
              border: "2px solid #F3F4F6", background: "#FAFAFA",
              cursor: "pointer", textAlign: "left", width: "100%",
              transition: "border-color 0.15s, background 0.15s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#F97316";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(249,115,22,0.04)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#F3F4F6";
              (e.currentTarget as HTMLButtonElement).style.background = "#FAFAFA";
            }}
          >
            <span style={{ fontSize: 28, flexShrink: 0 }}>{p.icon}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>{p.label}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{p.desc}</div>
            </div>
            <span style={{ marginLeft: "auto", color: "#D1D5DB", fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Schritt 2: Land + PLZ ────────────────────────────────────────────────────

function StepCountry({
  profession, zipCode, onZipChange, onSelect,
}: {
  profession: string;
  zipCode: string;
  onZipChange: (v: string) => void;
  onSelect: (code: string) => void;
}) {
  const prof = PROFESSIONS.find((p) => p.slug === profession);
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
        Wo arbeitest du?
      </h1>
      <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.5 }}>
        Für Steuereinstellungen{prof ? ` und die richtigen Fachbegriffe als ${prof.label}` : ""}.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {COUNTRIES.map((c) => (
          <button
            key={c.code}
            onClick={() => onSelect(c.code)}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "16px 18px", borderRadius: 16,
              border: "2px solid #F3F4F6", background: "#FAFAFA",
              cursor: "pointer", textAlign: "left", width: "100%",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#F97316";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(249,115,22,0.04)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#F3F4F6";
              (e.currentTarget as HTMLButtonElement).style.background = "#FAFAFA";
            }}
          >
            <span style={{ fontSize: 28 }}>{c.flag}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>{c.label}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{c.tax}</div>
            </div>
            <span style={{ marginLeft: "auto", color: "#D1D5DB", fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>

      {/* PLZ optional */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: ".04em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          PLZ / Postleitzahl (optional)
        </label>
        <input
          type="text"
          value={zipCode}
          onChange={(e) => onZipChange(e.target.value)}
          placeholder="z.B. 80331"
          maxLength={10}
          style={{
            width: "100%", height: 48, borderRadius: 12,
            border: "2px solid #E5E7EB", background: "#FAFAFA",
            padding: "0 16px", fontSize: 15, color: "#1A1A1A",
            fontFamily: "inherit", boxSizing: "border-box",
            outline: "none",
          }}
          onFocus={(e) => { e.target.style.borderColor = "#F97316"; }}
          onBlur={(e) => { e.target.style.borderColor = "#E5E7EB"; }}
        />
        <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>
          Für Routenoptimierung und regionale Auswertungen.
        </p>
      </div>
    </div>
  );
}

// ── Schritt 3: Verbinden ─────────────────────────────────────────────────────

function StepConnect({
  country, userId, saving, onFinish,
}: {
  country: string;
  userId: string;
  saving: boolean;
  onFinish: () => void;
}) {
  const [calendarCopied, setCalendarCopied] = useState(false);
  const [icalUrl, setIcalUrl] = useState<string | null>(null);

  async function loadIcalUrl() {
    const { data } = await supabase
      .from("profiles")
      .select("ical_token")
      .eq("id", userId)
      .maybeSingle();
    const token = (data as { ical_token?: string } | null)?.ical_token;
    if (token) {
      setIcalUrl(`https://hufiapp.de/api/calendar/${token}.ics`);
    }
  }

  async function copyIcal() {
    await loadIcalUrl();
    if (icalUrl) {
      await navigator.clipboard.writeText(icalUrl).catch(() => {});
      setCalendarCopied(true);
      setTimeout(() => setCalendarCopied(false), 2500);
    }
  }

  const _ = country; // used for future country-specific hints

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
        Verbindungen (optional)
      </h1>
      <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 24px", lineHeight: 1.5 }}>
        Du kannst das überspringen und später in den Einstellungen einrichten.
      </p>

      {/* Kalender */}
      <ConnectCard
        icon="📅"
        title="Kalender abonnieren"
        desc="Deine Hufi-Termine direkt in Google Kalender, Apple Kalender oder Outlook sehen."
        actionLabel={calendarCopied ? "✓ Link kopiert!" : "iCal-Link kopieren"}
        actionColor={calendarCopied ? "#10B981" : "#F97316"}
        onAction={copyIcal}
        badge="Kostenlos"
      />

      {/* E-Mail */}
      <ConnectCard
        icon="📧"
        title="E-Mail-Konto verbinden"
        desc="Rechnungen direkt aus Hufi versenden — mit deiner eigenen E-Mail-Adresse."
        actionLabel="Demnächst verfügbar"
        actionColor="#9CA3AF"
        onAction={() => {}}
        disabled
        badge="Bald"
      />

      {/* Google Kalender */}
      <ConnectCard
        icon="🗓"
        title="Google Kalender sync"
        desc="Termine aus Google Kalender automatisch in Hufi übernehmen."
        actionLabel="Demnächst verfügbar"
        actionColor="#9CA3AF"
        onAction={() => {}}
        disabled
        badge="Bald"
      />

      <button
        onClick={onFinish}
        disabled={saving}
        style={{
          width: "100%", height: 52, borderRadius: 16, marginTop: 8,
          background: saving ? "#D1D5DB" : "#F97316", border: "none",
          color: "#FFFFFF", fontSize: 16, fontWeight: 700,
          cursor: saving ? "not-allowed" : "pointer",
          boxShadow: saving ? "none" : "0 4px 16px rgba(249,115,22,0.4)",
          letterSpacing: "-0.2px",
        }}
      >
        {saving ? "Wird gespeichert…" : "Hufi starten →"}
      </button>
    </div>
  );
}

function ConnectCard({
  icon, title, desc, actionLabel, actionColor, onAction, disabled, badge,
}: {
  icon: string;
  title: string;
  desc: string;
  actionLabel: string;
  actionColor: string;
  onAction: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <div style={{
      border: "1.5px solid #F3F4F6", borderRadius: 16,
      padding: "16px", marginBottom: 12,
      background: disabled ? "#FAFAFA" : "#FFFFFF",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: disabled ? "#9CA3AF" : "#1A1A1A" }}>{title}</span>
            {badge && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: ".05em",
                textTransform: "uppercase", background: disabled ? "#F3F4F6" : "rgba(249,115,22,0.1)",
                color: disabled ? "#9CA3AF" : "#F97316",
                borderRadius: 6, padding: "2px 6px",
              }}>{badge}</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
        </div>
      </div>
      <button
        onClick={onAction}
        disabled={disabled}
        style={{
          width: "100%", height: 36, borderRadius: 10,
          background: disabled ? "#F3F4F6" : `${actionColor}18`,
          border: `1.5px solid ${disabled ? "#E5E7EB" : actionColor}`,
          color: actionColor, fontSize: 12, fontWeight: 700,
          cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}
