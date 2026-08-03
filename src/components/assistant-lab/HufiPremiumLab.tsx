import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Camera, Image, FileText, ShieldAlert, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { loadSavedConsent } from "../consent/HufiFirstRunConsent";
import { HMCamModal } from "@/components/hufcam";
import { HufiMenu } from "@/components/layout/HufiMenu";
import { HufiStorageUsage, DEMO_USED_BYTES } from "@/components/storage/HufiStorageUsage";
import { INCLUDED_STORAGE_PLAN, percentUsed } from "@/lib/hufi-storage-plans";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HufiWave } from "./HufiWave";
import { HufiAmbientSurface } from "./HufiAmbientSurface";
import { HufiTranscript } from "./HufiTranscript";
import { HufiIntentSummary } from "./HufiIntentSummary";
import { HufiQuestion } from "./HufiQuestion";
import { HufiChoiceCards } from "./HufiChoiceCards";
import { HufiConfirmation } from "./HufiConfirmation";
import { HufiObservationPreview } from "./HufiObservationPreview";
import { HufiAppointmentCard } from "./HufiAppointmentCard";
import { HufiInvoicePreview } from "./HufiInvoicePreview";
import { HufiSuccessState } from "./HufiSuccessState";
import { HufiHorseRecordPreview } from "./HufiHorseRecordPreview";
import {
  HUFI_PHASE_META,
  MOCK_AMBIENT_HINT,
  MOCK_APPOINTMENT,
  MOCK_HORSE_OPTIONS,
  MOCK_INTENTS,
  MOCK_INVOICE,
  MOCK_OBSERVATION,
  MOCK_USER_FIRST_NAME,
  timeSalutation,
  type ScenarioId,
} from "./HufiAssistantState";
import { defaultOutcome, horseOutcome } from "./HufiScenarios";
import { useHufiScenarioPlayer } from "./useHufiScenarioPlayer";
import "./hufi-lab.css";

// Content-Kinds, die bereits einen eigenen "Abbrechen"-Button mitbringen
// (HufiConfirmation bei observation-confirm/invoice-confirm, eigener
// Button bei horse-choice — siehe renderContent unten) — dort darf der
// allgemeine Interrupt-Button nicht zusätzlich erscheinen, sonst gibt es
// zwei Abbrechen-Aktionen im selben Zustand. "appointment-confirm" hat
// bewusst KEINEN eigenen Abbrechen-Button — dort bleibt der allgemeine
// Interrupt-Button die einzige Abbruchmöglichkeit.
const CONTENT_KINDS_WITH_OWN_CANCEL = new Set(["observation-confirm", "invoice-confirm", "horse-choice"]);

export default function HufiPremiumLab() {
  const player = useHufiScenarioPlayer();
  const { phase, mode, content } = player;
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const demoStoragePercent = Math.round(percentUsed(DEMO_USED_BYTES, INCLUDED_STORAGE_PLAN.includedBytes));

  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>("observation");
  const [editNote, setEditNote] = useState<"observation" | "invoice" | null>(null);

  // Stumme Schnelloptionen: gleicher Weg wie Sprache ohne Wake-Word, deshalb
  // münden alle drei aktuell im Beobachtungs-Szenario (einziges vorhandenes
  // Szenario mit Foto-Kontext). Eigene Szenarien pro Upload-Art folgen erst,
  // wenn Hufi Bilder/Dokumente wirklich auswertet statt sie zu simulieren.
  // Kamera nutzt das echte HM-CAM (geführte Huf-Ansichten) statt eines
  // rohen Datei-Dialogs — Bild/Dokument bleiben einfache Datei-Dialoge.
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [consentNotice, setConsentNotice] = useState<string | null>(null);
  const [camOpen, setCamOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const demoHorse = MOCK_HORSE_OPTIONS[0];

  const runScenario = (id: ScenarioId) => {
    setSelectedScenario(id);
    player.start(id);
  };

  const handleWakeSimulate = () => runScenario(selectedScenario);
  const handleInterrupt = () => player.cancel();

  const handleQuickCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    e.target.value = "";
    setConsentNotice(null);
    runScenario("observation");
  };

  // Prüft nur, ob beim Onboarding tatsächlich zugestimmt wurde
  // (HufiFirstRunConsent) — bei Ablehnung/Ausstehend Hinweis statt
  // Blindflug, der Aufrufer entscheidet, was bei Zustimmung passiert.
  // "camera" gilt nur für den echten Kamerazugriff (HM-CAM); Galerie/
  // Dokument gehen über einen normalen Datei-Dialog, brauchen aber "ai",
  // weil der Inhalt zur Auswertung an Hufi geht (gleiche Pipeline wie
  // analyze-hoof-image / scan-receipt).
  const checkQuickActionConsent = (kind: "camera" | "image" | "document"): boolean => {
    const consent = loadSavedConsent(user?.id ?? "");
    if (kind === "camera" && consent?.camera !== "granted") {
      setConsentNotice("Kamera-Zugriff ist nicht freigegeben. Das lässt sich unter Einstellungen → Berechtigungen ändern.");
      return false;
    }
    if (kind !== "camera" && !consent?.ai) {
      setConsentNotice("KI-Auswertung ist nicht aktiviert. Das lässt sich unter Einstellungen → Berechtigungen ändern.");
      return false;
    }
    setConsentNotice(null);
    return true;
  };

  const handleCamComplete = () => {
    setCamOpen(false);
    runScenario("observation");
  };

  const handleObservationEdit = () => {
    setEditNote("observation");
    window.setTimeout(() => setEditNote((c) => (c === "observation" ? null : c)), 1800);
  };
  const handleInvoiceEdit = () => {
    setEditNote("invoice");
    window.setTimeout(() => setEditNote((c) => (c === "invoice" ? null : c)), 1800);
  };

  const renderHeadline = () => {
    if (phase === "dormant") {
      return (
        <>
          <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.2, letterSpacing: "-0.03em", fontWeight: 800, color: "var(--hlab-fg)" }}>
            {timeSalutation()}, {MOCK_USER_FIRST_NAME}.
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.5, color: "var(--hlab-fg-60)" }}>{MOCK_AMBIENT_HINT}</p>
        </>
      );
    }
    if (content?.kind === "transcript") {
      return <HufiTranscript text={content.text} active={content.active} />;
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
    if (!content || content.kind === "transcript") return null;
    switch (content.kind) {
      case "intent":
        return <HufiIntentSummary intent={MOCK_INTENTS[content.scenario]} />;
      case "observation-confirm":
        return (
          <>
            <HufiObservationPreview data={MOCK_OBSERVATION} />
            <HufiQuestion text="Als Beobachtung in der Pferdeakte speichern?" />
            {editNote === "observation" && (
              <p style={{ margin: 0, fontSize: 12, color: "rgba(245,239,230,0.5)", textAlign: "center" }}>Bearbeiten folgt später.</p>
            )}
            <HufiConfirmation
              buttons={[
                { label: "Speichern", variant: "primary", onClick: () => player.resolveAndPlay(defaultOutcome("observation", MOCK_HORSE_OPTIONS)) },
                { label: "Bearbeiten", onClick: handleObservationEdit },
                { label: "Abbrechen", onClick: handleInterrupt },
              ]}
            />
          </>
        );
      case "appointment-confirm":
        return (
          <>
            <HufiAppointmentCard data={MOCK_APPOINTMENT} />
            <HufiConfirmation
              buttons={[
                { label: "Terminvorbereitung öffnen", variant: "primary", onClick: () => player.resolveAndPlay(defaultOutcome("appointment", MOCK_HORSE_OPTIONS)) },
              ]}
            />
          </>
        );
      case "horse-choice":
        return (
          <>
            <HufiQuestion text="Welches Pferd meinst du?" />
            <HufiChoiceCards options={MOCK_HORSE_OPTIONS} onSelect={(option) => player.resolveAndPlay(horseOutcome(option))} />
            <button type="button" onClick={handleInterrupt} className="hlab-text-link hlab-focusable">
              Abbrechen
            </button>
          </>
        );
      case "invoice-confirm":
        return (
          <>
            <HufiInvoicePreview data={MOCK_INVOICE} />
            <HufiQuestion text="Soll ich die Rechnung als Entwurf vorbereiten?" />
            {editNote === "invoice" && (
              <p style={{ margin: 0, fontSize: 12, color: "rgba(245,239,230,0.5)", textAlign: "center" }}>Bearbeiten folgt später.</p>
            )}
            <HufiConfirmation
              buttons={[
                { label: "Entwurf vorbereiten", variant: "primary", onClick: () => player.resolveAndPlay(defaultOutcome("invoice", MOCK_HORSE_OPTIONS)) },
                { label: "Bearbeiten", onClick: handleInvoiceEdit },
                { label: "Abbrechen", onClick: handleInterrupt },
              ]}
            />
          </>
        );
      case "success":
        return (
          <>
            {content.horseRecord && <HufiHorseRecordPreview horse={content.horseRecord} />}
            <HufiSuccessState text={content.text} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="hlab-root" data-mode={mode} data-theme={theme}>
      <div className="hlab-noise" />

      <HufiAmbientSurface />
      <div className="hlab-scrim" />

      <div className="hlab-foreground hufi-safe-top hufi-safe-bottom hufi-safe-left hufi-safe-right">
        {/* ── Kopfzeile: Marke, dezenter Status, allgemeines App-Menü ── */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px 0 20px", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--hlab-fg)" }}>
            Hufi
          </span>
          <div className="hlab-foreground-interactive" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--hlab-fg-40)" }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: phase === "error" ? "#8B908C" : "var(--hufi-orange)",
                  flexShrink: 0,
                }}
              />
              {phase === "error" ? "Keine Verbindung" : new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <HufiMenu className="hlab-focusable" />
          </div>
        </header>

        {/* ── Zentraler Bereich: in allen drei Modi vertikal zentriert —
               Wave (größtes Element), Begrüßung/Status (mittel), Hey-Hufi-
               Aktion (kleiner) bilden von oben nach unten eine nach Gewicht
               gestaffelte, harmonische Einheit statt an den oberen Rand
               verankert zu sein. ─────────────────────────────────────────── */}
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
          <HufiWave
            phase={phase}
            mode={mode}
            onTap={handleWakeSimulate}
            settled={phase === "listening" && content?.kind === "transcript" && content.active === false}
          />

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
              <button type="button" onClick={handleWakeSimulate} className="hlab-wake-action hlab-focusable">
                <Sparkles size={15} className="hlab-wake-action-icon" aria-hidden="true" />
                Hey Hufi
              </button>
              <span style={{ fontSize: 10.5, color: "var(--hlab-fg-30)" }}>(Simulation)</span>
            </div>
          )}

          {content && content.kind !== "transcript" && (
            <div
              className="hlab-content-wrap hlab-foreground-interactive"
              style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}
            >
              {renderContent()}
            </div>
          )}

          {mode !== "ambient" && !CONTENT_KINDS_WITH_OWN_CANCEL.has(content?.kind ?? "") && (
            <button
              type="button"
              onClick={handleInterrupt}
              aria-label="Abbrechen und zu Ambient Mode zurückkehren"
              className="hlab-foreground-interactive hlab-focusable hlab-interrupt"
            >
              <X size={13} aria-hidden="true" />
              Abbrechen
            </button>
          )}
        </main>

        <HMCamModal
          open={camOpen}
          onOpenChange={setCamOpen}
          horseId={demoHorse.id}
          horseName={demoHorse.name}
          mode="provider"
          onComplete={handleCamComplete}
        />

        {/* ── Fußzeile: stumme Schnelloptionen — ersetzt den früheren
               Dev-Trigger an dieser Stelle, direkt erreichbar ohne
               Umweg über ein Menü. Nur im Ruhezustand relevant. ────── */}
        {mode === "ambient" && (
          <div className="hlab-foreground-interactive hlab-quick-actions-footer">
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleQuickCapture} style={{ display: "none" }} />
            <input ref={documentInputRef} type="file" accept="image/*,.pdf" onChange={handleQuickCapture} style={{ display: "none" }} />

            {consentNotice && (
              <div
                role="alert"
                style={{ display: "flex", alignItems: "flex-start", gap: 6, maxWidth: 300, padding: "8px 10px", borderRadius: 10, background: "rgba(148,148,142,0.08)", border: "1px solid rgba(148,148,142,0.2)" }}
              >
                <ShieldAlert size={13} style={{ flexShrink: 0, marginTop: 1, color: "var(--hlab-fg-40)" }} aria-hidden="true" />
                <span style={{ fontSize: 11, lineHeight: 1.4, color: "var(--hlab-fg-60)" }}>{consentNotice}</span>
              </div>
            )}

            <div className="hlab-quick-actions">
              <button type="button" className="hlab-quick-action hlab-focusable" aria-label="Ohne zu sprechen ein Foto aufnehmen (HM-CAM)" onClick={() => checkQuickActionConsent("camera") && setCamOpen(true)}>
                <span className="hlab-quick-action-circle"><Camera size={15} aria-hidden="true" /></span>
                <span className="hlab-quick-action-label">Kamera</span>
              </button>
              <button type="button" className="hlab-quick-action hlab-focusable" aria-label="Bild aus der Galerie hochladen" onClick={() => checkQuickActionConsent("image") && imageInputRef.current?.click()}>
                <span className="hlab-quick-action-circle"><Image size={15} aria-hidden="true" /></span>
                <span className="hlab-quick-action-label">Bild</span>
              </button>
              <button type="button" className="hlab-quick-action hlab-focusable" aria-label="Dokument hochladen" onClick={() => checkQuickActionConsent("document") && documentInputRef.current?.click()}>
                <span className="hlab-quick-action-circle"><FileText size={15} aria-hidden="true" /></span>
                <span className="hlab-quick-action-label">Dokument</span>
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Dezenter, kompakter Statusbalken statt Textpille — keine
                  echte Verbrauchsmessung, öffnet die Vorschau-Karte
                  HufiStorageUsage im Dialog. */}
              <button
                type="button"
                onClick={() => setStorageOpen(true)}
                className="hlab-focusable"
                title={`${demoStoragePercent}% von 5 GB Speicher belegt — Details ansehen`}
                aria-label={`Speicher: ${demoStoragePercent} Prozent von 5 GB belegt, Details öffnen`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44,
                  padding: "6px 10px", borderRadius: 999, border: "1px solid var(--hlab-fg-30)",
                  background: "transparent", cursor: "pointer",
                }}
              >
                <span style={{ width: 28, height: 4, borderRadius: 999, background: "var(--hlab-fg-40)", position: "relative", overflow: "hidden" }}>
                  <span style={{ position: "absolute", inset: 0, width: `${demoStoragePercent}%`, background: "var(--hufi-orange)", borderRadius: 999 }} />
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--hlab-fg-40)" }}>{demoStoragePercent}%</span>
              </button>

              {/* Echter, funktionierender Theme-Umschalter — nutzt denselben
                  ThemeProvider wie die reale App (App.tsx), kein Mock. */}
              <button
                type="button"
                onClick={toggleTheme}
                className="hlab-focusable"
                aria-label={theme === "dark" ? "Zu hellem Modus wechseln" : "Zu dunklem Modus wechseln"}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 44, minHeight: 44, borderRadius: 999,
                  border: "1px solid var(--hlab-fg-30)", background: "transparent",
                  color: "var(--hlab-fg-40)", cursor: "pointer",
                }}
              >
                {theme === "dark" ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={storageOpen} onOpenChange={setStorageOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Speicher-Vorschau</DialogTitle>
          </DialogHeader>
          <HufiStorageUsage />
        </DialogContent>
      </Dialog>
    </div>
  );
}
