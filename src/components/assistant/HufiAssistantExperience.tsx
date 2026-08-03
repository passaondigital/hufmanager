import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { HufiWave } from "@/components/assistant-lab/HufiWave";
import { HufiTranscript } from "@/components/assistant-lab/HufiTranscript";
import { HufiQuestion } from "@/components/assistant-lab/HufiQuestion";
import { HufiConfirmation } from "@/components/assistant-lab/HufiConfirmation";
import { HufiSuccessState } from "@/components/assistant-lab/HufiSuccessState";
import { HUFI_PHASE_META, timeSalutation } from "@/components/assistant-lab/HufiAssistantState";
import type { HufiExperienceUi } from "./hufi-experience";
import "@/components/assistant-lab/hufi-lab.css";

// Echte Variante von HufiPremiumLab: dieselben Visuals (HufiWave, Phasen-
// Layout, hufi-lab.css), aber `ui` kommt aus deriveHufiExperience() in
// hufi-experience.ts -- abgeleitet aus echtem MobileShell-State, keine
// Szenarien, keine MOCK_*-Daten. Bewusst ohne Kamera-/Bild-/Dokument-
// Schnellaktionen und Speicher-Dialog der Lab-Fassung (eigener, hier nicht
// wiederverdrahteter Funktionsumfang) -- reiner Kernloop dieser Runde.
export interface HufiAssistantExperienceProps {
  ui: HufiExperienceUi;
  userName?: string | null;
  insight: string;
  onWakeTap: () => void;
  onInterrupt: () => void;
}

export function HufiAssistantExperience({ ui, userName, insight, onWakeTap, onInterrupt }: HufiAssistantExperienceProps) {
  const { phase, mode, content } = ui;
  const firstName = userName?.trim() ? userName.trim().split(" ")[0] : null;

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
        return <HufiSuccessState text={content.text} />;
      default:
        return null;
    }
  };

  return (
    <div className="hlab-root" data-mode={mode}>
      <div className="hlab-noise" />
      <div className="hlab-scrim" />

      <div className="hlab-foreground hufi-safe-top hufi-safe-bottom hufi-safe-left hufi-safe-right">
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
          <HufiWave phase={phase} mode={mode} onTap={onWakeTap} settled={false} />

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
        </main>
      </div>
    </div>
  );
}
