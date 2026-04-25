import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { updateHufiMemory } from "@/lib/hufi-brain";
import { ChevronRight, ChevronLeft, Check, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WizardProps {
  onComplete: () => void;
  onSkip?: () => void;
}

interface StepData {
  displayName: string;
  horseName: string;
  horseBreed: string;
  horseYear: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  dsgvoAccepted: boolean;
}

// ── Hufi step comments ────────────────────────────────────────────────────────

const STEP_COMMENTS = [
  "Schön, dass du dabei bist! 🐴 Ich bin Hufi — dein Assistent rund ums Pferd.",
  "Super! Jetzt erzähl mir von deinem Pferd. Das hilft mir, dich besser zu unterstützen.",
  "Hast du einen Hufpfleger? Verbinde dich direkt — dann siehst du Befunde & Termine hier. Du kannst diesen Schritt auch überspringen.",
  "Fast fertig! Damit du nichts Wichtiges verpasst — und wir bleiben DSGVO-konform.",
];

const TOTAL_STEPS = 4;

// ── ClientOnboardingWizard ────────────────────────────────────────────────────

export function ClientOnboardingWizard({ onComplete, onSkip }: WizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<StepData>({
    displayName: "",
    horseName: "",
    horseBreed: "",
    horseYear: "",
    pushEnabled: true,
    emailEnabled: true,
    dsgvoAccepted: false,
  });
  const photoInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof StepData>(key: K, value: StepData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleComplete() {
    if (!user?.id) return;
    setSaving(true);
    try {
      // 1. Update display name if provided
      if (data.displayName.trim()) {
        await supabase
          .from("profiles")
          .update({ full_name: data.displayName.trim() })
          .eq("id", user.id);
      }

      // 2. Create horse if name provided
      if (data.horseName.trim()) {
        await supabase.from("horses").insert({
          name: data.horseName.trim(),
          breed: data.horseBreed.trim() || null,
          birth_year: data.horseYear ? parseInt(data.horseYear) : null,
          owner_id: user.id,
          horse_status: "active",
        });
      }

      // 3. Save preferences + completion flag in hufi_memory
      await Promise.allSettled([
        updateHufiMemory(
          user.id,
          "dsgvo",
          "hufi_onboarding_wizard_completed",
          {
            completed: true,
            completed_at: new Date().toISOString(),
            push_enabled: data.pushEnabled,
            email_enabled: data.emailEnabled,
            dsgvo_accepted: data.dsgvoAccepted,
          },
          "manual",
        ),
        // Mark profiles.onboarding_completed = true
        supabase
          .from("profiles")
          .update({ onboarding_completed: true })
          .eq("id", user.id),
      ]);

      onComplete();
    } catch (err) {
      console.warn("[ClientOnboardingWizard] error:", err);
      onComplete(); // always proceed
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        maxWidth: 430,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Progress bar */}
        <div style={{ flex: 1, marginRight: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: i <= step ? "#F97316" : "#F3F4F6",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontSize: 11,
              color: "#9CA3AF",
              fontWeight: 500,
            }}
          >
            Schritt {step + 1} von {TOTAL_STEPS}
          </span>
        </div>
        {onSkip && (
          <button
            onClick={onSkip}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9CA3AF",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Hufi comment */}
      <div
        style={{
          margin: "16px 20px 0",
          background: "rgba(249,115,22,0.06)",
          border: "1px solid rgba(249,115,22,0.2)",
          borderRadius: 12,
          padding: "10px 14px",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: "#F97316",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <img src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png" alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)", padding: "10%" }} />
        </div>
        <span style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.45 }}>
          {STEP_COMMENTS[step]}
        </span>
      </div>

      {/* Step content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>
        {step === 0 && (
          <StepWelcome data={data} update={update} photoInputRef={photoInputRef} />
        )}
        {step === 1 && <StepHorse data={data} update={update} />}
        {step === 2 && <StepProvider />}
        {step === 3 && (
          <StepNotifications data={data} update={update} />
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "16px 20px 32px",
          display: "flex",
          gap: 10,
        }}
      >
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            style={{
              background: "#F3F4F6",
              border: "none",
              borderRadius: 12,
              padding: "13px 18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color: "#6B7280",
            }}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <button
          disabled={saving || (step === 3 && !data.dsgvoAccepted)}
          onClick={() => {
            if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
            else handleComplete();
          }}
          style={{
            flex: 1,
            background:
              step === 3 && !data.dsgvoAccepted ? "#E5E7EB" : "#F97316",
            border: "none",
            borderRadius: 12,
            padding: "13px 18px",
            color: step === 3 && !data.dsgvoAccepted ? "#9CA3AF" : "#FFFFFF",
            fontSize: 14,
            fontWeight: 700,
            cursor:
              step === 3 && !data.dsgvoAccepted ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontFamily: "inherit",
          }}
        >
          {saving ? (
            "Speichern…"
          ) : step < TOTAL_STEPS - 1 ? (
            <>
              Weiter <ChevronRight size={16} />
            </>
          ) : (
            <>
              <Check size={16} /> Los geht's!
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Step 1: Welcome ───────────────────────────────────────────────────────────

function StepWelcome({
  data,
  update,
  photoInputRef,
}: {
  data: StepData;
  update: <K extends keyof StepData>(k: K, v: StepData[K]) => void;
  photoInputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div>
      <h2
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: "#1A1A1A",
          marginBottom: 6,
          letterSpacing: "-0.3px",
        }}
      >
        Willkommen bei Hufi! 🐴
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "#6B7280",
          marginBottom: 24,
          lineHeight: 1.5,
        }}
      >
        Alles rund um dein Pferd — Befunde, Termine, Rechnungen — an einem Ort.
      </p>

      {/* Avatar placeholder */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => photoInputRef.current?.click()}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "rgba(249,115,22,0.1)",
            border: "2px dashed rgba(249,115,22,0.4)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            flexShrink: 0,
          }}
        >
          📷
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 4px" }}>
            Profilfoto (optional)
          </p>
          <p style={{ fontSize: 11, color: "#D1D5DB", margin: 0 }}>
            Tippe um ein Foto hinzuzufügen
          </p>
        </div>
        <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} />
      </div>

      <label style={labelStyle}>Dein Name</label>
      <input
        style={inputStyle}
        placeholder="z.B. Anna Müller"
        value={data.displayName}
        onChange={(e) => update("displayName", e.target.value)}
      />
    </div>
  );
}

// ── Step 2: Horse ─────────────────────────────────────────────────────────────

function StepHorse({
  data,
  update,
}: {
  data: StepData;
  update: <K extends keyof StepData>(k: K, v: StepData[K]) => void;
}) {
  return (
    <div>
      <h2 style={headingStyle}>Dein Pferd 🐎</h2>
      <p style={subStyle}>
        Trag hier dein Pferd ein. Du kannst es später jederzeit bearbeiten.
      </p>

      <label style={labelStyle}>Name des Pferdes *</label>
      <input
        style={inputStyle}
        placeholder="z.B. Aladdin"
        value={data.horseName}
        onChange={(e) => update("horseName", e.target.value)}
      />

      <label style={labelStyle}>Rasse (optional)</label>
      <input
        style={inputStyle}
        placeholder="z.B. Hannoveraner"
        value={data.horseBreed}
        onChange={(e) => update("horseBreed", e.target.value)}
      />

      <label style={labelStyle}>Geburtsjahr (optional)</label>
      <input
        style={inputStyle}
        placeholder="z.B. 2015"
        type="number"
        min={1980}
        max={new Date().getFullYear()}
        value={data.horseYear}
        onChange={(e) => update("horseYear", e.target.value)}
      />
    </div>
  );
}

// ── Step 3: Provider connect ──────────────────────────────────────────────────

function StepProvider() {
  return (
    <div>
      <h2 style={headingStyle}>Hufpfleger verbinden 🔗</h2>
      <p style={subStyle}>
        Verbinde dich mit deinem Hufpfleger — dann siehst du Befunde und Termine direkt hier.
      </p>

      <div
        style={{
          background: "rgba(249,115,22,0.04)",
          border: "1px solid rgba(249,115,22,0.15)",
          borderRadius: 14,
          padding: "16px",
          marginBottom: 12,
          textAlign: "center" as const,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📱</div>
        <p style={{ fontSize: 13, color: "#1A1A1A", fontWeight: 600, margin: "0 0 4px" }}>
          Einladungslink vom Hufpfleger?
        </p>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>
          Öffne den Link den dir dein Hufpfleger geschickt hat — du wirst automatisch verbunden.
        </p>
      </div>

      <div
        style={{
          background: "#F9FAFB",
          border: "1px solid #F0F0F0",
          borderRadius: 14,
          padding: "14px",
          textAlign: "center" as const,
          marginBottom: 12,
        }}
      >
        <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 4px" }}>
          Noch keinen Hufpfleger?
        </p>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>
          Kein Problem — überspringen und später unter Netzwerk suchen.
        </p>
      </div>

      {/* Escape hatch for professionals */}
      <div
        style={{
          background: "rgba(59,130,246,0.05)",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 14,
          padding: "14px 16px",
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", margin: "0 0 4px" }}>
          🔧 Du bist selbst Hufpfleger/in?
        </p>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 10px", lineHeight: 1.5 }}>
          Dann hast du dich wahrscheinlich in der falschen Rolle registriert. Als Profi brauchst du ein eigenes Provider-Konto mit Kalender, Kunden und Rechnungen.
        </p>
        <a
          href="/auth"
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 700,
            color: "#3B82F6",
            textDecoration: "none",
            background: "rgba(59,130,246,0.1)",
            padding: "6px 14px",
            borderRadius: 8,
          }}
        >
          Als Profi neu registrieren →
        </a>
      </div>
    </div>
  );
}

// ── Step 4: Notifications + DSGVO ────────────────────────────────────────────

function StepNotifications({
  data,
  update,
}: {
  data: StepData;
  update: <K extends keyof StepData>(k: K, v: StepData[K]) => void;
}) {
  return (
    <div>
      <h2 style={headingStyle}>Benachrichtigungen & Datenschutz 🔔</h2>
      <p style={subStyle}>
        Bleib auf dem Laufenden — wähle wie Hufi dich informieren darf.
      </p>

      {/* Toggle: Push */}
      <ToggleRow
        checked={data.pushEnabled}
        onChange={(v) => update("pushEnabled", v)}
        icon="📲"
        label="Push-Benachrichtigungen"
        desc="Neue Befunde, Termine und Erinnerungen direkt aufs Handy"
      />

      {/* Toggle: Email */}
      <ToggleRow
        checked={data.emailEnabled}
        onChange={(v) => update("emailEnabled", v)}
        icon="📧"
        label="E-Mail-Benachrichtigungen"
        desc="Terminbestätigungen und Befunde per E-Mail"
      />

      {/* DSGVO consent */}
      <div
        style={{
          marginTop: 20,
          padding: "14px",
          background: "#F9FAFB",
          border: data.dsgvoAccepted
            ? "1px solid rgba(16,185,129,0.4)"
            : "1px solid #E5E7EB",
          borderRadius: 12,
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            cursor: "pointer",
          }}
        >
          <div
            onClick={() => update("dsgvoAccepted", !data.dsgvoAccepted)}
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              background: data.dsgvoAccepted ? "#10B981" : "#FFFFFF",
              border: `2px solid ${data.dsgvoAccepted ? "#10B981" : "#D1D5DB"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              cursor: "pointer",
              marginTop: 1,
            }}
          >
            {data.dsgvoAccepted && (
              <Check size={12} style={{ color: "#FFFFFF" }} />
            )}
          </div>
          <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
            Ich stimme der Verarbeitung meiner Daten gemäß der{" "}
            <span style={{ color: "#F97316", textDecoration: "underline" }}>
              Datenschutzerklärung
            </span>{" "}
            zu. Die Daten werden ausschließlich zur Bereitstellung der
            Hufpflege-Dienste genutzt. <strong>(Pflichtfeld)</strong>
          </span>
        </label>
      </div>
    </div>
  );
}

// ── ToggleRow ─────────────────────────────────────────────────────────────────

function ToggleRow({
  checked,
  onChange,
  icon,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: string;
  label: string;
  desc: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 0",
        borderBottom: "1px solid #F3F4F6",
        cursor: "pointer",
      }}
      onClick={() => onChange(!checked)}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", margin: "0 0 2px" }}>
          {label}
        </p>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>{desc}</p>
      </div>
      {/* Toggle switch */}
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: checked ? "#F97316" : "#E5E7EB",
          position: "relative",
          flexShrink: 0,
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.2s",
          }}
        />
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const headingStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: "#1A1A1A",
  marginBottom: 6,
  letterSpacing: "-0.3px",
};

const subStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#6B7280",
  marginBottom: 24,
  lineHeight: 1.5,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
  marginTop: 16,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 12,
  border: "1.5px solid #E5E7EB",
  fontSize: 14,
  color: "#1A1A1A",
  outline: "none",
  background: "#FAFAFA",
  fontFamily: "inherit",
  boxSizing: "border-box" as const,
};
