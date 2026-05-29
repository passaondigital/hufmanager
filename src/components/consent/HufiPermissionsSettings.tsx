import { useState, useEffect } from "react";
import { Mic, Camera, MapPin, Bell, Brain, Ear, Volume2, ChevronRight, Check, X, RefreshCw } from "lucide-react";
import { loadSavedConsent, saveFirstRunConsent, type HufiConsentChoices } from "./HufiFirstRunConsent";
import { HufiVoiceSelector } from "@/components/voice/HufiVoiceSelector";
import { ulget, ulset, ulremove, USER_STORAGE_KEYS } from "@/lib/user-storage";

type PermStatus = "granted" | "denied" | "pending" | "unsupported";

interface SettingRow {
  key: string;
  icon: typeof Mic;
  iconColor: string;
  label: string;
  desc: string;
  storageKey?: string;
  browserPerm?: () => Promise<PermStatus>;
  isToggle?: boolean;
}

const ROWS: SettingRow[] = [
  {
    key: "microphone",
    icon: Mic,
    iconColor: "#F97316",
    label: "Mikrofon",
    desc: "Ermöglicht Spracheingabe mit Hufi.",
    browserPerm: async () => {
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
    iconColor: "#3B82F6",
    label: "Kamera",
    desc: "Für Huf-Fotos direkt aus der App.",
    browserPerm: async () => {
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
    iconColor: "#10B981",
    label: "Standort",
    desc: "Für Tierarzt-Suche und Wetter in deiner Nähe. Nur bei Bedarf.",
    browserPerm: async () => {
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
    iconColor: "#8B5CF6",
    label: "Benachrichtigungen",
    desc: "Erinnerungen an Termine und wichtige Hufi-Meldungen.",
    browserPerm: async () => {
      if (!("Notification" in window)) return "unsupported";
      if (Notification.permission === "granted") return "granted";
      const result = await Notification.requestPermission();
      return result === "granted" ? "granted" : "denied";
    },
  },
  {
    key: "hey_hufi",
    icon: Ear,
    iconColor: "#F59E0B",
    label: "Hey Hufi",
    desc: "Wake-Word-Erkennung — Hufi hört auf deinen Namen.",
    storageKey: "hufi_hey_hufi_enabled",
    isToggle: true,
  },
  {
    key: "voice_greeting",
    icon: Volume2,
    iconColor: "#6366F1",
    label: "Gesprochene Begrüßung",
    desc: "Hufi begrüßt dich einmal täglich mit Sprachausgabe.",
    storageKey: "hufi_voice_greeting_enabled",
    isToggle: true,
  },
  {
    key: "ai_functions",
    icon: Brain,
    iconColor: "#EC4899",
    label: "KI-Funktionen",
    desc: "Spracherkennung, Befund-Analyse und proaktive Hufi-Antworten.",
    storageKey: "hufi_ki_consent",
    isToggle: true,
  },
];

export function HufiPermissionsSettings({ userId = "" }: { userId?: string }) {
  const [statuses, setStatuses] = useState<Record<string, PermStatus | boolean>>({});
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const initial: Record<string, PermStatus | boolean> = {};
      const saved = loadSavedConsent(userId);

      // ── Check actual browser permission state via Permissions API ──────────
      async function checkPerm(name: PermissionName): Promise<PermStatus> {
        if (!("permissions" in navigator)) return (saved as Record<string, unknown>)?.[name] as PermStatus ?? "pending";
        try {
          const s = await navigator.permissions.query({ name });
          if (s.state === "granted") return "granted";
          if (s.state === "denied") return "denied";
          return "pending"; // "prompt"
        } catch {
          return "pending";
        }
      }

      initial.microphone    = await checkPerm("microphone" as PermissionName);
      initial.camera        = await checkPerm("camera" as PermissionName);
      initial.location      = await checkPerm("geolocation" as PermissionName);
      initial.notifications =
        "Notification" in window
          ? (Notification.permission === "granted" ? "granted"
            : Notification.permission === "denied" ? "denied"
            : "pending")
          : ("unsupported" as PermStatus);

      // Sync saved consent so future boot reflects reality
      if (saved) {
        saveFirstRunConsent({
          ...saved,
          microphone:    initial.microphone    as PermStatus,
          camera:        initial.camera        as PermStatus,
          location:      initial.location      as PermStatus,
          notifications: initial.notifications as PermStatus,
        } as HufiConsentChoices, userId);
      }

      // Toggles: user-isoliert lesen
      initial.hey_hufi       = ulget(userId, USER_STORAGE_KEYS.HEY_HUFI) === "1";
      initial.voice_greeting = ulget(userId, USER_STORAGE_KEYS.VOICE_GREETING) === "1";
      initial.ai_functions   = ulget(userId, USER_STORAGE_KEYS.KI_CONSENT) === "granted";

      setStatuses(initial);
    }
    init();
  }, []);

  async function handleAction(row: SettingRow) {
    if (row.isToggle) {
      const currentVal = statuses[row.key] as boolean;
      const next = !currentVal;
      setStatuses((s) => ({ ...s, [row.key]: next }));
      if (row.storageKey) {
        if (next) ulset(userId, row.storageKey, row.storageKey === USER_STORAGE_KEYS.KI_CONSENT ? "granted" : "1");
        else ulremove(userId, row.storageKey);
      }
      const saved = loadSavedConsent(userId);
      if (saved && row.key === "ai_functions") {
        saveFirstRunConsent({ ...saved, ai: next }, userId);
      }
      return;
    }
    if (!row.browserPerm) return;
    setRequesting(row.key);
    try {
      const result = await row.browserPerm();
      setStatuses((s) => ({ ...s, [row.key]: result }));
      const saved = loadSavedConsent(userId);
      if (saved) {
        saveFirstRunConsent({
          ...saved,
          [row.key as keyof HufiConsentChoices]: result,
        } as HufiConsentChoices, userId);
      }
    } finally {
      setRequesting(null);
    }
  }

  return (
    <div style={{ padding: "0 0 24px" }}>
      {/* ── Stimmen-Auswahl ── */}
      <HufiVoiceSelector userId={userId} />

      <div style={{ height: 1, background: "#F0F0F0", margin: "20px 0 18px" }} />

      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", letterSpacing: ".06em", textTransform: "uppercase", margin: "0 0 12px" }}>
        Berechtigungen & Einstellungen
      </h3>

      {ROWS.map((row) => {
        const status = statuses[row.key];
        const Icon = row.icon;
        const isToggle = row.isToggle;
        const boolVal = typeof status === "boolean" ? status : false;
        const permVal = typeof status === "string" ? status as PermStatus : "pending";

        return (
          <div
            key={row.key}
            style={{
              background: "#F9FAFB",
              border: "1px solid #F0F0F0",
              borderRadius: 14,
              padding: "13px 14px",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: row.iconColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon size={18} color="#FFFFFF" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{row.label}</div>
              <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.4, marginTop: 2 }}>{row.desc}</div>
              {!isToggle && permVal !== "pending" && permVal !== "unsupported" && (
                <div style={{
                  fontSize: 11, fontWeight: 600, marginTop: 4,
                  color: permVal === "granted" ? "#10B981" : "#EF4444",
                }}>
                  {permVal === "granted" ? "✓ Erteilt" : "✗ Verweigert"}
                </div>
              )}
            </div>

            {isToggle ? (
              <button
                onClick={() => handleAction(row)}
                aria-label={boolVal ? "Deaktivieren" : "Aktivieren"}
                style={{
                  width: 48, height: 28,
                  borderRadius: 14, border: "none",
                  background: boolVal ? "#F97316" : "#D1D5DB",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background .2s",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute",
                  top: 3, left: boolVal ? 22 : 3,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "#FFFFFF",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                  transition: "left .2s",
                }} />
              </button>
            ) : permVal === "unsupported" ? (
              <span style={{ fontSize: 11, color: "#9CA3AF", flexShrink: 0 }}>Nicht verfügbar</span>
            ) : permVal === "granted" ? (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Check size={16} color="#FFFFFF" />
              </div>
            ) : (
              <button
                onClick={() => handleAction(row)}
                disabled={requesting === row.key}
                style={{
                  height: 32, borderRadius: 10,
                  background: permVal === "denied" ? "#F9FAFB" : "#F97316",
                  border: permVal === "denied" ? "1px solid #E5E7EB" : "none",
                  color: permVal === "denied" ? "#9CA3AF" : "#FFFFFF",
                  fontSize: 12, fontWeight: 700,
                  padding: "0 12px", cursor: "pointer",
                  fontFamily: "inherit", flexShrink: 0,
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                {requesting === row.key
                  ? "…"
                  : permVal === "denied"
                    ? <><RefreshCw size={12} /> Wiederholen</>
                    : "Erlauben"
                }
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
