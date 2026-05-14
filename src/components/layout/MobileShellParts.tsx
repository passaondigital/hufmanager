import { useRef } from "react";
import { Loader2, X, CalendarPlus, Receipt, MessageSquare, Send, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HufiVoiceWave } from "@/components/voice/HufiVoiceWave";
import { HufiOrb } from "@/components/voice/HufiOrb";
import { HufiSearchCard } from "@/components/HufiSearchCard";
import type { HufiSearchResult } from "@/lib/hufi-search";
import type { HufiIntent } from "@/lib/hufi-intent";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface ChatAction {
  label: string;
  route?: string;
  actionKey?: string;
}

export interface ChatMessage {
  role: "user" | "ai";
  text: string;
  ts: number;
  actionPrompt?: boolean;
  actions?: ChatAction[];
  searchResults?: HufiSearchResult[];
  searchSuggestions?: import("@/lib/hufi-search").SearchSuggestion[];
  senderId?: string;
}

// ── Voice Section (always visible, replaces floating banner) ─────────────────
// Zeigt eine stille Wave im Idle-Zustand. Wird aktiv bei Aufnahme/Sprechen.

interface VoiceSectionProps {
  recording: boolean;
  transcribing: boolean;
  isVoiceSpeaking: boolean;
  responding: boolean;
  onMicPress: () => void;  // start/stop recording
  onCancel: () => void;
}

export function MobileShellVoiceSection({
  recording,
  transcribing,
  isVoiceSpeaking,
  responding,
  onMicPress,
  onCancel,
}: VoiceSectionProps) {
  // Overlay nur bei aktiver Voice-Session — nicht bei normalen Text-Antworten
  const isActive = recording || transcribing || isVoiceSpeaking;

  const statusLabel = recording
    ? "Hufi hört zu…"
    : transcribing
    ? "Hufi verarbeitet…"
    : isVoiceSpeaking
    ? "Hufi spricht…"
    : "Hey Hufi";

  const waveColor = isActive ? "#F97316" : "#D1D5DB";
  const accentColor = "#F97316";

  if (!isActive) return null;

  return (
    /* Vollbild-Overlay wenn aktiv */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
      }}
    >
      {/* Wellen-Animation */}
      {transcribing || (responding && !isVoiceSpeaking) ? (
        <Loader2 size={52} className="animate-spin" style={{ color: "#F97316" }} />
      ) : (
        <HufiVoiceWave
          barCount={12}
          height={72}
          color={waveColor}
          paused={false}
        />
      )}

      {/* Status-Label */}
      <span style={{
        fontSize: 18,
        fontWeight: 700,
        color: "#FFFFFF",
        letterSpacing: "0.04em",
        textTransform: "uppercase" as const,
      }}>
        {statusLabel}
      </span>

      {/* Hint-Text bei Aufnahme */}
      {recording && (
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>
          Aufnahme stoppt automatisch
        </span>
      )}

      {/* Abbrechen-Button */}
      <button
        onClick={onCancel}
        aria-label="Abbrechen"
        style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
          border: "1.5px solid rgba(255,255,255,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#FFFFFF",
        }}
      >
        <X size={20} />
      </button>
    </div>
  );
}

// ── Bottom Input Bar (minimal: nur Text + Send) ───────────────────────────────

interface InputBarProps {
  inputText: string;
  onInputChange: (v: string) => void;
  responding: boolean;
  kiConsent: "granted" | "denied" | null;
  onRevokeConsent: () => void;
  onSend: () => void;
  onImageUpload?: (file: File) => void;
}

export function MobileShellInputBar({
  inputText,
  onInputChange,
  responding,
  kiConsent,
  onRevokeConsent,
  onSend,
  onImageUpload,
}: InputBarProps) {
  const hasText = inputText.trim().length > 0;
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && onImageUpload) onImageUpload(file);
    e.target.value = "";
  }

  return (
    <div style={{
      position: "fixed",
      bottom: "calc(68px + env(safe-area-inset-bottom, 0px))",
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 430,
      background: "#FFFFFF",
      borderTop: "1px solid #F3F4F6",
      padding: "8px 16px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      zIndex: 40,
    }}>
      {kiConsent === "denied" ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, lineHeight: 1.5 }}>
            KI-Nutzung abgelehnt. Einwilligung erteilen um Hufi zu nutzen.
          </p>
          <button
            onClick={onRevokeConsent}
            style={{ height: 34, borderRadius: 10, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)", color: "#F97316", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            Einwilligung erteilen
          </button>
        </div>
      ) : (
        <>
          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          {/* Camera / attach button */}
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Foto aufnehmen"
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#F4F4F6", border: "1px solid rgba(0,0,0,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <Camera size={16} style={{ color: "#9CA3AF" }} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !responding && onSend()}
            placeholder="Frag Hufi oder sag Hey Hufi…"
            style={{
              flex: 1, height: 40, background: "#F4F4F6",
              border: "1px solid rgba(0,0,0,0.06)", borderRadius: 20,
              paddingLeft: 16, paddingRight: 16, fontSize: 14,
              fontWeight: 400, color: "#1A1A1A", outline: "none", fontFamily: "inherit",
            }}
          />
          {hasText && (
            <button
              onClick={onSend}
              disabled={responding}
              style={{
                width: 40, height: 40, borderRadius: "50%",
                background: responding ? "#E5E7EB" : "#F97316",
                border: "none", cursor: responding ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.2s",
              }}
            >
              <Send size={16} style={{ color: responding ? "#9CA3AF" : "#FFFFFF" }} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Chat Messages Renderer ────────────────────────────────────────────────────

const HUFI_LOGO = "https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png";

const INTENT_META: Record<HufiIntent, { icon: string; label: string; color: string }> = {
  knowledge:       { icon: "📚", label: "Hufi prüft Kontext…", color: "#F97316" },
  agent_lookup:    { icon: "🐴", label: "Deine Pferdeakte…",   color: "#3B82F6" },
  agent_action:    { icon: "⚡", label: "Führe aus…",           color: "#F97316" },
  agent_proactive: { icon: "🧠", label: "Analysiere…",          color: "#F97316" },
  emergency:       { icon: "🚨", label: "Notfall erkannt!",     color: "#EF4444" },
  navigation:      { icon: "🧭", label: "Navigiere…",           color: "#10B981" },
};

const BEFUND_ACTIONS: { icon: React.ReactNode; label: string; route: string }[] = [
  { icon: <CalendarPlus size={12} />, label: "Termin in 6 Wochen anlegen", route: "/kalender" },
  { icon: <Receipt size={12} />,      label: "Rechnung erstellen",          route: "/rechnungen" },
  { icon: <MessageSquare size={12} />, label: "Besitzer benachrichtigen",  route: "/chat" },
];

interface MessagesProps {
  messages: ChatMessage[];
  searching: boolean;
  transcribing: boolean;
  responding: boolean;
  activeIntent: HufiIntent | null;
  onMsgAction: (actionKey: string, msg: ChatMessage) => void;
  onDismissPrompt: (ts: number) => void;
  showIdleCard?: boolean;
  pendingGreeting?: boolean;
}

export function MobileShellMessages({
  messages,
  searching,
  transcribing,
  responding,
  activeIntent,
  onMsgAction,
  onDismissPrompt,
  showIdleCard,
  pendingGreeting,
}: MessagesProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* Idle-Card — kein ChatMessage, nur wenn Chat leer und ruhig */}
      {showIdleCard && messages.length === 0 && !searching && !responding && !transcribing && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "40px 16px 8px", gap: 10, textAlign: "center",
        }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#1A1A1A", letterSpacing: "-0.02em", lineHeight: 1 }}>
            Bereit.
          </div>
          <div style={{ fontSize: 14, color: "#9CA3AF", lineHeight: 1.6, maxWidth: 240 }}>
            {pendingGreeting ? (
              <>Tippe auf <span style={{ color: "#F97316", fontWeight: 600 }}>„Hören"</span> — Hufi begrüßt dich.</>
            ) : (
              <>Sag <span style={{ color: "#F97316", fontWeight: 600 }}>"Hey Hufi"</span> oder tippe deine Frage.</>
            )}
          </div>
        </div>
      )}
      {messages.map((msg) => (
        <div
          key={msg.ts.toString()}
          className="msg-in"
          style={{
            display: "flex",
            flexDirection: msg.role === "user" ? "row-reverse" : "row",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          {msg.role === "ai" && (
            <div style={{ width: 30, height: 30, borderRadius: 10, background: "linear-gradient(145deg, #F97316, #ea6c0a)", boxShadow: "0 3px 10px rgba(249,115,22,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 }}>
              <img src={HUFI_LOGO} alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)", padding: "3px" }} />
            </div>
          )}
          <div style={{
            maxWidth: "82%",
            background: msg.role === "user"
              ? "linear-gradient(135deg, #F97316 0%, #ea6c0a 100%)"
              : "#FFFFFF",
            borderRadius: msg.role === "user" ? "20px 20px 5px 20px" : "20px 20px 20px 5px",
            padding: "12px 16px",
            border: msg.role === "user" ? "none" : "1px solid rgba(0,0,0,0.055)",
            boxShadow: msg.role === "user"
              ? "0 4px 16px rgba(249,115,22,0.22)"
              : "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <div style={{ fontSize: 14, color: msg.role === "user" ? "#FFFFFF" : "#1A1A1A", lineHeight: 1.5, whiteSpace: "pre-line" }}>
              {msg.text}
            </div>

            {msg.actions && msg.actions.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {msg.actions.map((a, ai) => (
                  <button
                    key={a.route ?? a.actionKey ?? ai}
                    onClick={() => {
                      if (a.route) navigate(a.route);
                      else if (a.actionKey) onMsgAction(a.actionKey, msg);
                    }}
                    style={{
                      background: a.actionKey === "search_yes" ? "#F97316"
                        : a.actionKey === "confirm_no" ? "#F3F4F6"
                        : "rgba(249,115,22,0.08)",
                      border: a.actionKey === "search_yes" ? "none"
                        : a.actionKey === "confirm_no" ? "1px solid #E5E7EB"
                        : "1px solid rgba(249,115,22,0.2)",
                      borderRadius: 10, padding: "8px 12px",
                      color: a.actionKey === "search_yes" ? "#FFFFFF"
                        : a.actionKey === "confirm_no" ? "#9CA3AF"
                        : "#F97316",
                      fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            {msg.searchResults && msg.searchResults.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {msg.searchResults.map((r, ri) => (
                  <HufiSearchCard key={ri} result={r} />
                ))}
              </div>
            )}

            {msg.actionPrompt && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {BEFUND_ACTIONS.map((a) => (
                  <button
                    key={a.route}
                    onClick={() => navigate(a.route)}
                    style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 10, padding: "8px 12px", color: "#F97316", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
                  >
                    {a.icon}{a.label}
                  </button>
                ))}
                <button
                  onClick={() => onDismissPrompt(msg.ts)}
                  style={{ background: "transparent", border: "1px solid #E5E7EB", borderRadius: 10, padding: "8px 12px", color: "#9CA3AF", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
                >
                  <X size={12} />Nichts weiteres
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {searching && (
        <div className="msg-in" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <img src={HUFI_LOGO} alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)", padding: "3px" }} />
          </div>
          <div style={{ background: "#F9FAFB", border: "1px solid #F0F0F0", borderRadius: "18px 18px 18px 4px", padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <Loader2 size={13} style={{ color: "#9CA3AF", flexShrink: 0, animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>Hufi sucht…</span>
          </div>
        </div>
      )}

      {(transcribing || responding) && (() => {
        const meta = activeIntent ? INTENT_META[activeIntent] : null;
        return (
          <div className="msg-in" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: "linear-gradient(145deg, #F97316, #ea6c0a)", boxShadow: "0 3px 10px rgba(249,115,22,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src={HUFI_LOGO} alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)", padding: "3px" }} />
            </div>
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.055)", borderRadius: "20px 20px 20px 5px", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <Loader2 size={13} style={{ color: "#C4C4C4", flexShrink: 0, animation: "spin 1s linear infinite" }} />
              {meta ? (
                <span style={{
                  fontSize: 12, fontWeight: 600, color: meta.color,
                  background: `${meta.color}18`, borderRadius: 8,
                  padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                  {meta.icon} {meta.label}
                </span>
              ) : (
                <span style={{ fontSize: 13, color: "#9CA3AF" }}>
                  Hufi denkt…
                </span>
              )}
            </div>
          </div>
        );
      })()}
    </>
  );
}
