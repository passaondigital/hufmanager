import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Camera, Image, FileText, ShieldAlert, Send, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { loadSavedConsent } from "@/components/consent/HufiFirstRunConsent";
import { HMCamModal } from "@/components/hufcam";
import { HufiMenu } from "@/components/layout/HufiMenu";
import { INCLUDED_STORAGE_PLAN } from "@/lib/hufi-storage-plans";
import { HufiWave } from "@/components/assistant-lab/HufiWave";
import { HufiTranscript } from "@/components/assistant-lab/HufiTranscript";
import { HufiQuestion } from "@/components/assistant-lab/HufiQuestion";
import { HufiConfirmation } from "@/components/assistant-lab/HufiConfirmation";
import { HufiSuccessState } from "@/components/assistant-lab/HufiSuccessState";
import { HUFI_PHASE_META, timeSalutation } from "@/components/assistant-lab/HufiAssistantState";
import { HufiOrganicOrb } from "./HufiOrganicOrb";
import type { HufiExperienceUi } from "./hufi-experience";
import "@/components/assistant-lab/hufi-lab.css";

// Verstehen/Verarbeiten laufen laut den offiziellen Screen-Referenzen
// violett-blau statt orange -- Farbe direkt aus der Referenz abgetastet
// (RGB 100,93,235). /hufi-lab selbst bleibt unverändert.
const UNDERSTANDING_PROCESSING_COLOR = "#6459EB";

// Vollständige, referenzgetreue Hufi-Oberfläche (siehe "hufi neu.png" /
// "hufi neu dark.png"). Übernimmt bei aktivem Preview-Flag die komplette
// sichtbare /home-Fläche -- keine alte MobileShell-Chrome (Header/
// BottomNav/Eingabedock/Mikrofonbutton) darunter. `ui` kommt aus
// deriveHufiExperience(), ausschließlich echter Live-State, keine
// Szenarien, keine MOCK_*-Daten.
export interface HufiAssistantExperienceProps {
  ui: HufiExperienceUi;
  userName?: string | null;
  insight: string;
  onWakeTap: () => void;
  onInterrupt: () => void;
  onSubmitText: (text: string) => void;
  canSubmit: boolean;
}

export function HufiAssistantExperience({ ui, userName, insight, onWakeTap, onInterrupt, onSubmitText, canSubmit }: HufiAssistantExperienceProps) {
  const { phase, mode, content } = ui;
  const { user } = useAuth();
  const { theme } = useTheme();
  const firstName = userName?.trim() ? userName.trim().split(" ")[0] : null;

  const [inputValue, setInputValue] = useState("");
  const submitInput = () => {
    if (!canSubmit) return;
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    onSubmitText(text);
  };

  const [consentNotice, setConsentNotice] = useState<string | null>(null);
  const [camOpen, setCamOpen] = useState(false);
  // Bild/Dokument haben ab /home aktuell keinen echten Verarbeitungspfad
  // (der einzige existierende Weg dafür ist /hufi-observation-lab, das laut
  // Vorgabe kein zulässiges Ziel mehr ist) -- daher bewusst deaktiviert
  // statt simuliert, siehe Abschlussbericht.
  const imageDocumentAvailable = false;
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const checkCameraConsent = (): boolean => {
    const consent = loadSavedConsent(user?.id ?? "");
    if (consent?.camera !== "granted") {
      setConsentNotice("Kamera-Zugriff ist nicht freigegeben. Das lässt sich unter Einstellungen → Berechtigungen ändern.");
      return false;
    }
    setConsentNotice(null);
    return true;
  };
  // HM-CAM führt die echte Aufnahme bereits selbst durch (Consent + Foto-
  // Erfassung); onComplete feuert erst, wenn wirklich Fotos aufgenommen
  // wurden -- kein weiterer simulierter Schritt nötig.
  const handleCamComplete = () => setCamOpen(false);

  const renderHeadline = () => {
    if (phase === "dormant") {
      return (
        <>
          <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.2, letterSpacing: "-0.03em", fontWeight: 800, color: "var(--hlab-fg)" }}>
            {timeSalutation()}{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.5, color: "var(--hlab-fg-60)" }}>{insight}</p>
        </>
      );
    }
    if (content?.kind === "transcript") {
      return <HufiTranscript text={content.text} active={content.active} />;
    }
    if (content?.kind === "answer") {
      return <HufiTranscript text={content.text} active={false} label="Hufi sagt" />;
    }
    const meta = HUFI_PHASE_META[phase];
    return (
      <>
        <h1 style={{ margin: 0, fontSize: 20, lineHeight: 1.25, letterSpacing: "-0.02em", fontWeight: 750, color: "var(--hlab-fg)" }}>
          {meta.label}
        </h1>
        {meta.hint && <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--hlab-fg-60)" }}>{meta.hint}</p>}
      </>
    );
  };

  const renderContent = () => {
    if (!content || content.kind === "transcript" || content.kind === "answer") return null;
    switch (content.kind) {
      case "questioning":
        return <HufiQuestion text={content.text} />;
      case "confirming":
        return (
          <>
            <HufiQuestion text={`${content.icon} ${content.label}\n${content.description}`} />
            <HufiConfirmation
              buttons={[
                { label: "Bestätigen", variant: "primary", onClick: content.onConfirm },
                { label: "Ablehnen", onClick: content.onReject },
              ]}
            />
          </>
        );
      case "success":
        return <HufiSuccessState text={content.text} />;
      case "error":
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center" }}>
            <AlertCircle size={16} style={{ color: "#EF4444", flexShrink: 0 }} aria-hidden="true" />
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 650, color: "var(--hlab-fg)" }}>{content.text}</p>
          </div>
        );
      default:
        return null;
    }
  };

  const showOrganicOrb = phase === "dormant" && theme === "light";

  return (
    <div className="hlab-root" data-mode={mode} data-theme={theme} data-hufi-experience="true">
      <div className="hlab-noise" />
      <div className="hlab-scrim" />

      <div className="hlab-foreground hufi-safe-top hufi-safe-bottom hufi-safe-left hufi-safe-right">
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px 0 20px", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--hlab-fg)" }}>
            Hufi
          </span>
          <div className="hlab-foreground-interactive" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--hlab-fg-40)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: phase === "error" ? "#8B908C" : "var(--hufi-orange)", flexShrink: 0 }} />
              {phase === "error" ? "Keine Verbindung" : new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <HufiMenu className="hlab-focusable" />
          </div>
        </header>

        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: "12px 24px",
            minHeight: 0,
          }}
        >
          {showOrganicOrb ? (
            <HufiOrganicOrb onTap={onWakeTap} />
          ) : (
            <HufiWave
              phase={phase}
              mode={mode}
              onTap={onWakeTap}
              settled={false}
              colorOverrides={{ understanding: UNDERSTANDING_PROCESSING_COLOR, executing: UNDERSTANDING_PROCESSING_COLOR }}
            />
          )}

          <div aria-live="polite" style={{ textAlign: "center", maxWidth: 340, minHeight: 40 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={phase + (content?.kind ?? "none")}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderHeadline()}
              </motion.div>
            </AnimatePresence>
          </div>

          {mode === "ambient" && (
            <div className="hlab-foreground-interactive" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, marginTop: 2 }}>
              <button type="button" onClick={onWakeTap} className="hlab-wake-action hlab-focusable">
                <Sparkles size={15} className="hlab-wake-action-icon" aria-hidden="true" />
                Hey Hufi
              </button>
            </div>
          )}

          {content && content.kind !== "transcript" && content.kind !== "answer" && (
            <div
              className="hlab-content-wrap hlab-foreground-interactive"
              style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}
            >
              {renderContent()}
            </div>
          )}

          {mode !== "ambient" && content?.kind !== "confirming" && (
            <button
              type="button"
              onClick={onInterrupt}
              aria-label="Abbrechen"
              className="hlab-foreground-interactive hlab-focusable hlab-interrupt"
            >
              <X size={13} aria-hidden="true" />
              Abbrechen
            </button>
          )}

          {/* Echte Texteingabe -- derselbe Handler (processChatMessage) wie
              Sprache, immer nutzbar (auch wenn Mikrofon blockiert ist). */}
          <div className="hlab-foreground-interactive" style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", maxWidth: 340, marginTop: 4 }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitInput(); }}
              placeholder="An Hufi schreiben…"
              aria-label="Nachricht an Hufi"
              disabled={!canSubmit}
              style={{
                flex: 1, minHeight: 40, borderRadius: 20, border: "1px solid var(--hlab-fg-30)",
                background: "transparent", color: "var(--hlab-fg)", padding: "0 14px", fontSize: 14,
                fontFamily: "inherit", outline: "none",
              }}
            />
            <button
              type="button"
              onClick={submitInput}
              disabled={!canSubmit || !inputValue.trim()}
              aria-label="Senden"
              className="hlab-focusable"
              style={{
                width: 40, height: 40, borderRadius: "50%", flexShrink: 0, border: "none",
                background: "var(--hufi-orange)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: canSubmit && inputValue.trim() ? "pointer" : "not-allowed",
                opacity: canSubmit && inputValue.trim() ? 1 : 0.5,
              }}
            >
              <Send size={16} aria-hidden="true" />
            </button>
          </div>
        </main>

        <HMCamModal open={camOpen} onOpenChange={setCamOpen} mode="provider" onComplete={handleCamComplete} />

        {mode === "ambient" && (
          <div className="hlab-foreground-interactive hlab-quick-actions-footer">
            <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} disabled />
            <input ref={documentInputRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} disabled />

            {consentNotice && (
              <div role="alert" style={{ display: "flex", alignItems: "flex-start", gap: 6, maxWidth: 300, padding: "8px 10px", borderRadius: 10, background: "rgba(148,148,142,0.08)", border: "1px solid rgba(148,148,142,0.2)" }}>
                <ShieldAlert size={13} style={{ flexShrink: 0, marginTop: 1, color: "var(--hlab-fg-40)" }} aria-hidden="true" />
                <span style={{ fontSize: 11, lineHeight: 1.4, color: "var(--hlab-fg-60)" }}>{consentNotice}</span>
              </div>
            )}

            <div className="hlab-quick-actions">
              <button type="button" className="hlab-quick-action hlab-focusable" aria-label="Ohne zu sprechen ein Foto aufnehmen (HM-CAM)" onClick={() => checkCameraConsent() && setCamOpen(true)}>
                <span className="hlab-quick-action-circle"><Camera size={15} aria-hidden="true" /></span>
                <span className="hlab-quick-action-label">Kamera</span>
              </button>
              <button type="button" disabled={!imageDocumentAvailable} aria-disabled={!imageDocumentAvailable} className="hlab-quick-action hlab-focusable" aria-label="Bild aus der Galerie hochladen (noch nicht verfügbar)" style={{ opacity: imageDocumentAvailable ? 1 : 0.4, cursor: imageDocumentAvailable ? "pointer" : "not-allowed" }}>
                <span className="hlab-quick-action-circle"><Image size={15} aria-hidden="true" /></span>
                <span className="hlab-quick-action-label">Bild</span>
              </button>
              <button type="button" disabled={!imageDocumentAvailable} aria-disabled={!imageDocumentAvailable} className="hlab-quick-action hlab-focusable" aria-label="Dokument hochladen (noch nicht verfügbar)" style={{ opacity: imageDocumentAvailable ? 1 : 0.4, cursor: imageDocumentAvailable ? "pointer" : "not-allowed" }}>
                <span className="hlab-quick-action-circle"><FileText size={15} aria-hidden="true" /></span>
                <span className="hlab-quick-action-label">Dokument</span>
              </button>
            </div>

            {/* Reales Speicher-Entitlement (INCLUDED_STORAGE_PLAN, live) --
                kein erfundener Verbrauch, kein Demo-Dialog. */}
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36,
                padding: "6px 14px", borderRadius: 999, border: "1px solid var(--hlab-fg-30)",
              }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--hlab-fg-40)" }}>
                {INCLUDED_STORAGE_PLAN.displayLabel} Speicher inklusive
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
