import { useState } from "react";
import { Shield, Mic, Camera, MapPin, Bell, Brain, ChevronRight, Check, X } from "lucide-react";

export interface HufiConsentChoices {
  dsgvo: boolean;
  ai: boolean;
  microphone: "granted" | "denied" | "pending";
  camera: "granted" | "denied" | "pending";
  location: "granted" | "denied" | "pending";
  notifications: "granted" | "denied" | "pending";
}

interface Props {
  onComplete: (choices: HufiConsentChoices) => void;
}

const STORAGE_KEY = "hufi_firstrun_consent_v1";

export function hasCompletedFirstRun(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

export function saveFirstRunConsent(choices: HufiConsentChoices) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...choices, ts: Date.now() }));
  // Sync AI-Einwilligung für bestehenden hufi_ki_consent-Key
  if (choices.ai) localStorage.setItem("hufi_ki_consent", "granted");
}

export function loadSavedConsent(): HufiConsentChoices | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HufiConsentChoices;
  } catch {
    return null;
  }
}

type Step = "intro" | "dsgvo_ai" | "permissions" | "done";

const PERM_ITEMS: Array<{
  key: keyof Pick<HufiConsentChoices, "microphone" | "camera" | "location" | "notifications">;
  icon: typeof Mic;
  label: string;
  why: string;
  required: boolean;
  browserApi?: () => Promise<"granted" | "denied" | "pending">;
}> = [
  {
    key: "microphone",
    icon: Mic,
    label: "Mikrofon",
    why: "Damit du mit Hufi sprechen kannst, anstatt zu tippen.",
    required: false,
    browserApi: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        return "granted";
      } catch {
        return "denied";
      }
    },
  },
  {
    key: "camera",
    icon: Camera,
    label: "Kamera",
    why: "Für Huf-Fotos direkt aus der App. Nur bei explizitem Antippen.",
    required: false,
    browserApi: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        return "granted";
      } catch {
        return "denied";
      }
    },
  },
  {
    key: "location",
    icon: MapPin,
    label: "Standort",
    why: "Für die Tierarzt-Suche und Wetter in deiner Region. Nie im Hintergrund.",
    required: false,
    browserApi: async () => {
      try {
        await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        return "granted";
      } catch {
        return "denied";
      }
    },
  },
  {
    key: "notifications",
    icon: Bell,
    label: "Benachrichtigungen",
    why: "Damit Hufi dich an Termine erinnern kann, auch wenn die App geschlossen ist.",
    required: false,
    browserApi: async () => {
      if (!("Notification" in window)) return "denied";
      if (Notification.permission === "granted") return "granted";
      const result = await Notification.requestPermission();
      return result === "granted" ? "granted" : "denied";
    },
  },
];

export function HufiFirstRunConsent({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("intro");
  const [dsgvo, setDsgvo] = useState(false);
  const [ai, setAi] = useState(false);
  const [permState, setPermState] = useState<
    Record<string, "granted" | "denied" | "pending">
  >({
    microphone: "pending",
    camera: "pending",
    location: "pending",
    notifications: "pending",
  });
  const [requesting, setRequesting] = useState<string | null>(null);

  async function requestPerm(item: typeof PERM_ITEMS[number]) {
    if (!item.browserApi) return;
    setRequesting(item.key);
    try {
      const result = await item.browserApi();
      setPermState((p) => ({ ...p, [item.key]: result }));
    } finally {
      setRequesting(null);
    }
  }

  function finish() {
    const choices: HufiConsentChoices = {
      dsgvo,
      ai,
      microphone: (permState.microphone as "granted" | "denied" | "pending"),
      camera: (permState.camera as "granted" | "denied" | "pending"),
      location: (permState.location as "granted" | "denied" | "pending"),
      notifications: (permState.notifications as "granted" | "denied" | "pending"),
    };
    saveFirstRunConsent(choices);
    onComplete(choices);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 500,
        display: "flex",
        alignItems: "flex-end",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        style={{
          width: "100%",
          background: "#FFFFFF",
          borderRadius: "24px 24px 0 0",
          padding: "28px 20px 48px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        {/* ── INTRO ── */}
        {step === "intro" && (
          <>
            <HufiHeader />
            <h2 style={{ fontSize: 19, fontWeight: 800, color: "#1A1A1A", margin: "0 0 10px" }}>
              Willkommen bei Hufi
            </h2>
            <p style={{ fontSize: 14, color: "#4B5563", lineHeight: 1.65, margin: "0 0 22px" }}>
              Hufi ist dein proaktiver KI-Assistent für den Alltag als Hufpfleger. Bevor es losgeht,
              richten wir kurz deine Datenschutz- und Berechtigungseinstellungen ein.
            </p>
            <InfoBox>
              ✓ Deine Daten bleiben bei dir &nbsp;·&nbsp; ✓ Kein Verkauf an Dritte<br />
              ✓ Jede Berechtigung ist freiwillig &nbsp;·&nbsp; ✓ Jederzeit änderbar
            </InfoBox>
            <PrimaryBtn onClick={() => setStep("dsgvo_ai")}>
              Weiter <ChevronRight size={16} />
            </PrimaryBtn>
          </>
        )}

        {/* ── DSGVO + KI ── */}
        {step === "dsgvo_ai" && (
          <>
            <HufiHeader />
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1A1A1A", margin: "0 0 16px" }}>
              Datenschutz & KI-Nutzung
            </h2>

            <ConsentRow
              checked={dsgvo}
              onChange={setDsgvo}
              icon={<Shield size={18} color="#F97316" />}
              title="DSGVO-Einwilligung"
              desc="Ich willige ein, dass meine Termin- und Pferdeakten-Daten zur Bereitstellung der App verarbeitet werden (Art. 6 Abs. 1 lit. a DSGVO)."
            />
            <ConsentRow
              checked={ai}
              onChange={setAi}
              icon={<Brain size={18} color="#8B5CF6" />}
              title="KI-Funktionen (Hufi / HufAI)"
              desc="Sprachinhalte und Anfragen werden zur KI-Analyse verarbeitet. Du kannst KI-Funktionen jederzeit deaktivieren."
            />

            <PrimaryBtn
              onClick={() => setStep("permissions")}
              disabled={!dsgvo}
            >
              Weiter <ChevronRight size={16} />
            </PrimaryBtn>
            {!dsgvo && (
              <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", marginTop: 8 }}>
                Die DSGVO-Einwilligung ist erforderlich, um die App zu nutzen.
              </p>
            )}
          </>
        )}

        {/* ── PERMISSIONS ── */}
        {step === "permissions" && (
          <>
            <HufiHeader />
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1A1A1A", margin: "0 0 6px" }}>
              Berechtigungen
            </h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 18px" }}>
              Alle freiwillig — die App funktioniert auch ohne. Du kannst sie später unter
              Einstellungen → Berechtigungen ändern.
            </p>

            {PERM_ITEMS.map((item) => {
              const state = permState[item.key];
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  style={{
                    background: state === "granted" ? "#F0FDF4" : state === "denied" ? "#FEF2F2" : "#F9FAFB",
                    border: `1px solid ${state === "granted" ? "#BBF7D0" : state === "denied" ? "#FECACA" : "#E5E7EB"}`,
                    borderRadius: 14,
                    padding: "12px 14px",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={18} color="#FFFFFF" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", marginBottom: 3 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
                      {item.why}
                    </div>
                  </div>
                  {state === "pending" ? (
                    <button
                      onClick={() => requestPerm(item)}
                      disabled={requesting === item.key}
                      style={{
                        height: 32, borderRadius: 10,
                        background: "#F97316", border: "none",
                        color: "#FFFFFF", fontSize: 12, fontWeight: 700,
                        padding: "0 12px", cursor: "pointer",
                        flexShrink: 0, fontFamily: "inherit",
                        opacity: requesting === item.key ? 0.6 : 1,
                      }}
                    >
                      {requesting === item.key ? "…" : "Erlauben"}
                    </button>
                  ) : (
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: state === "granted" ? "#10B981" : "#EF4444",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {state === "granted"
                        ? <Check size={16} color="#FFFFFF" />
                        : <X size={16} color="#FFFFFF" />
                      }
                    </div>
                  )}
                </div>
              );
            })}

            <PrimaryBtn onClick={finish} style={{ marginTop: 10 }}>
              Alles bereit — Hufi starten
            </PrimaryBtn>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function HufiHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12,
        background: "#F97316",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 14px rgba(249,115,22,0.3)",
      }}>
        <img
          src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png"
          alt="Hufi"
          style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)", padding: "10%" }}
        />
      </div>
      <div>
        <p style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A", margin: 0 }}>Hufi</p>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Dein KI-Assistent</p>
      </div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#F0FDF4", borderRadius: 12,
      padding: "12px 14px", marginBottom: 22,
      border: "1px solid #BBF7D0",
      fontSize: 12, color: "#166534", lineHeight: 1.7,
    }}>
      {children}
    </div>
  );
}

function ConsentRow({
  checked, onChange, icon, title, desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: "100%", textAlign: "left",
        background: checked ? "#FFF7ED" : "#F9FAFB",
        border: `1px solid ${checked ? "rgba(249,115,22,0.4)" : "#E5E7EB"}`,
        borderRadius: 14, padding: "12px 14px", marginBottom: 10,
        display: "flex", alignItems: "flex-start", gap: 12,
        cursor: "pointer", fontFamily: "inherit",
      }}
    >
      <div style={{ paddingTop: 2, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.55 }}>{desc}</div>
      </div>
      <div style={{
        width: 24, height: 24, borderRadius: 6,
        background: checked ? "#F97316" : "#FFFFFF",
        border: `2px solid ${checked ? "#F97316" : "#D1D5DB"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "all .15s",
      }}>
        {checked && <Check size={14} color="#FFFFFF" />}
      </div>
    </button>
  );
}

function PrimaryBtn({
  children, onClick, disabled, style,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", height: 52,
        background: disabled ? "#E5E7EB" : "#F97316",
        border: "none", borderRadius: 16,
        color: disabled ? "#9CA3AF" : "#FFFFFF",
        fontSize: 16, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        boxShadow: disabled ? "none" : "0 4px 16px rgba(249,115,22,0.35)",
        transition: "all .15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
