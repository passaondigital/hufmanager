import { useState } from "react";
import { Shield, ChevronRight, Check, Volume2 } from "lucide-react";
import { setSelectedVoice } from "@/lib/hufi-voice-config";

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
  userId?: string;
}

import { ulget, ulset, USER_STORAGE_KEYS } from "@/lib/user-storage";

const STORAGE_KEY = USER_STORAGE_KEYS.FIRST_RUN;

// Hufi eigene Stimmen für die Erstauswahl
const VOICE_MALE   = { id: "LASNcPBkwqNMJ0w8CTBT", name: "Hufi Männlich Basis",  gender: "männlich" as const, style: "Hufi", description: "Männlich", previewText: "Hallo, ich bin Hufi.", isCustom: true };
const VOICE_FEMALE = { id: "3JVEodkPUEe8JPLcll4M", name: "Hufi Weiblich Basis",  gender: "weiblich" as const, style: "Hufi", description: "Weiblich", previewText: "Hallo, ich bin Hufi.", isCustom: true };

export function hasCompletedFirstRun(userId = ""): boolean {
  return !!ulget(userId, STORAGE_KEY);
}

export function saveFirstRunConsent(choices: HufiConsentChoices, userId = "") {
  ulset(userId, STORAGE_KEY, JSON.stringify({ ...choices, ts: Date.now() }));
  if (choices.ai) ulset(userId, USER_STORAGE_KEYS.KI_CONSENT, "granted");
}

export function loadSavedConsent(userId = ""): HufiConsentChoices | null {
  try {
    const raw = ulget(userId, STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HufiConsentChoices;
  } catch {
    return null;
  }
}

export function HufiFirstRunConsent({ onComplete, userId = "" }: Props) {
  const [step, setStep] = useState<"consent" | "voice">("consent");
  const [dsgvo, setDsgvo] = useState(false);
  const [voiceChoice, setVoiceChoice] = useState<"männlich" | "weiblich" | null>(null);

  function goToVoice() {
    setStep("voice");
  }

  function finish() {
    if (voiceChoice === "männlich") setSelectedVoice(VOICE_MALE, userId);
    else if (voiceChoice === "weiblich") setSelectedVoice(VOICE_FEMALE, userId);

    const choices: HufiConsentChoices = {
      dsgvo,
      ai: true,
      microphone: "pending",
      camera: "pending",
      location: "pending",
      notifications: "pending",
    };
    saveFirstRunConsent(choices, userId);
    onComplete(choices);
  }

  const sheetContent = step === "consent" ? (
    <>
      {/* DSGVO Consent Row */}
      <button
        onClick={() => setDsgvo((v) => !v)}
        style={{
          width: "100%", textAlign: "left",
          background: dsgvo ? "#FFF7ED" : "#F9FAFB",
          border: `1px solid ${dsgvo ? "rgba(249,115,22,0.4)" : "#E5E7EB"}`,
          borderRadius: 14, padding: "14px 14px", marginBottom: 14,
          display: "flex", alignItems: "flex-start", gap: 12,
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <div style={{ paddingTop: 2, flexShrink: 0 }}>
          <Shield size={18} color="#F97316" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", marginBottom: 3 }}>Datenschutz-Einwilligung</div>
          <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.55 }}>
            Ich willige ein, dass meine Daten zur Bereitstellung der App verarbeitet werden (Art. 6 Abs. 1 lit. a DSGVO). KI-Anfragen werden via Anthropic-API (USA, SCC-Vertrag) verarbeitet. Jederzeit widerrufbar.
          </div>
        </div>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: dsgvo ? "#F97316" : "#FFFFFF",
          border: `2px solid ${dsgvo ? "#F97316" : "#D1D5DB"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "all .15s",
        }}>
          {dsgvo && <Check size={14} color="#FFFFFF" />}
        </div>
      </button>

      <button
        onClick={goToVoice}
        disabled={!dsgvo}
        style={{
          width: "100%", height: 52,
          background: dsgvo ? "#F97316" : "#E5E7EB",
          border: "none", borderRadius: 16,
          color: dsgvo ? "#FFFFFF" : "#9CA3AF",
          fontSize: 16, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          cursor: dsgvo ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          boxShadow: dsgvo ? "0 4px 16px rgba(249,115,22,0.35)" : "none",
          transition: "all .15s",
        }}
      >
        Weiter <ChevronRight size={16} />
      </button>

      <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
        Mikrofon, Kamera & Standort werden nur bei Bedarf angefragt.
      </p>
    </>
  ) : (
    <>
      {/* Schritt 2: Stimme wählen */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Volume2 size={18} color="#F97316" />
        <p style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A", margin: 0 }}>Wie soll Hufi mit dir sprechen?</p>
      </div>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 18, lineHeight: 1.5 }}>
        Wähle eine Stimme. Du kannst sie jederzeit in den Einstellungen ändern.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        {(["männlich", "weiblich"] as const).map((gender) => {
          const isSelected = voiceChoice === gender;
          return (
            <button
              key={gender}
              onClick={() => setVoiceChoice(gender)}
              style={{
                border: `2px solid ${isSelected ? "#F97316" : "#E5E7EB"}`,
                borderRadius: 16,
                background: isSelected ? "#FFF7ED" : "#F9FAFB",
                padding: "18px 12px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all .15s",
                position: "relative",
              }}
            >
              {isSelected && (
                <div style={{
                  position: "absolute", top: 8, right: 8,
                  width: 20, height: 20, borderRadius: "50%",
                  background: "#F97316",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Check size={12} color="#FFFFFF" />
                </div>
              )}
              <div style={{ fontSize: 32 }}>
                {gender === "männlich" ? "👨" : "👩"}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", textTransform: "capitalize" }}>
                {gender}
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                {gender === "männlich" ? "Hufi Männlich" : "Hufi Weiblich"}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={finish}
        style={{
          width: "100%", height: 52,
          background: "#F97316",
          border: "none", borderRadius: 16,
          color: "#FFFFFF",
          fontSize: 16, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          cursor: "pointer",
          fontFamily: "inherit",
          boxShadow: "0 4px 16px rgba(249,115,22,0.35)",
        }}
      >
        {voiceChoice ? "Hufi starten" : "Ohne Auswahl starten"} <ChevronRight size={16} />
      </button>
    </>
  );

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
        {/* Header */}
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
            <p style={{ fontWeight: 700, fontSize: 16, color: "#1A1A1A", margin: 0 }}>Willkommen bei Hufi</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Dein KI-Assistent für die Pferdewelt</p>
          </div>
        </div>

        {/* Schrittanzeige */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: (step === "consent" ? i === 0 : i <= 1) ? "#F97316" : "#E5E7EB",
              transition: "background .3s",
            }} />
          ))}
        </div>

        {sheetContent}
      </div>
    </div>
  );
}
