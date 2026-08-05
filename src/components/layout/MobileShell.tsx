import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { MobileShellVoiceSection, MobileShellInputBar, MobileShellMessages, HufiVoiceCreditBadge, type ChatAction, type ChatMessage } from "./MobileShellParts";
import { toast } from "sonner";
import { MobileBottomNav, HUFI_MIC_EVENT } from "./MobileBottomNav";
import { HufiMenu } from "./HufiMenu";
import { useViewMode } from "@/hooks/useViewMode";
import { useHufiTTS } from "@/hooks/useHufiTTS";
import { useVoiceCapture, type VoiceErrorCode } from "@/hooks/useVoiceCapture";
import { streamWithHufAI, ChatMessage as AIChatMessage } from "@/lib/ai-routing";
import { askHufiAgent, HufiAgentClientError, type ConversationFocus, type HufiPendingConfirmation } from "@/lib/hufi-agent-client";
import { classifyHufiAgentError } from "@/lib/hufi-agent-error-messages";
import { } from "@/lib/hufi-tool-definitions";
import {
  detectAndCreateTask, executeNextStep, confirmStep, cancelTask, createActionTask,
  type HufiTask,
} from "@/lib/hufi-task-engine";
import {
  observeInteraction, matchSkills, learnFromSession,
  getPendingSkillSuggestion, confirmSkill, processSkillFeedback,
} from "@/lib/hufi-learning-engine";
import { buildShortSpokenGreeting, type HufiPresenceLabel } from "@/lib/hufi-runtime";
import { extractBefundFromTranscript, formatBefundForChat } from "@/lib/autoflow-service";
import { detectIntent, type HufiIntent } from "@/lib/hufi-intent";
import { matchScenario } from "@/lib/hufi-scenarios";
import { runNavAction, type ActionOutcome, type ActionRole } from "@/lib/hufi-nav-actions";
import {
  intentActionToTaskType, taskTypeLabel, taskTypeIcon, type AgentTaskType,
} from "@/lib/hufi-agent-tasks";
import { HeyHufi } from "@/components/voice/HeyHufi";
import { isWakeWordEnabled } from "@/config/featureFlags";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { DsgvoConsentModal } from "@/components/DsgvoConsentModal";
import { KiHinweisModal } from "@/components/KiHinweisModal";
import { HufManagerMigrationBanner } from "@/components/migration/HufManagerMigrationBanner";
import { HufManagerWelcome } from "@/components/migration/HufManagerWelcome";
import { HufiOnboardingTour } from "@/components/migration/HufiOnboardingTour";
import { detectCommunicationIntent, buildWhatsAppDraft, buildEmailDraft, generateAppointmentReminder } from "@/lib/hufi-communication";
import type { DraftMessage } from "@/lib/hufi-communication";
import { DraftMessageCard } from "@/components/communication/DraftMessageCard";
import { DayRouteCard } from "@/components/route/DayRouteCard";
import { HufiOnboardingChat } from "@/components/onboarding/HufiOnboardingChat";
import { detectOnboardingType, markOnboardingComplete } from "@/lib/hufi-onboarding-detector";
import { updateHufiMemory, deleteLastLearnedMemory, hydrateUserSettingsFromDB } from "@/lib/hufi-brain";
import { checkFachGuard, FACH_GUARD_RESPONSES } from "@/lib/hufi-fach-guard";
import {
  HufiFirstRunConsent,
  hasCompletedFirstRun,
  type HufiConsentChoices,
} from "@/components/consent/HufiFirstRunConsent";
import { ulget, ulset, ulremove, USER_STORAGE_KEYS } from "@/lib/user-storage";
import {
  hufiSearch,
  requestLocationPermission,
  getBefundSearchSuggestions,
  buildSearchSuggestionText,
  type HufiSearchResult,
  type SearchSuggestion,
} from "@/lib/hufi-search";
import {
  fetchHufiContext,
  checkProactiveAlerts,
  learnFromInteraction,
  checkDsgvoConsent,
  logDsgvoConsent,
  checkHorseWelfare,
  logWelfareAlert,
  HufiContext,
} from "@/lib/hufi-brain";
import { ProactiveBriefing } from "@/components/voice/ProactiveBriefing";
import { HufiWeatherWidget } from "@/components/weather/HufiWeatherWidget";
import { fetchWeatherContext, type WeatherContext } from "@/lib/hufai-proactive";
import {
  getCurrentBriefingTime,
  hasBriefingShownToday,
  markBriefingShown,
  buildDailyBriefing,
  type BriefingPayload,
} from "@/lib/hufi-briefing";
import { HufiAssistantCockpit } from "@/components/assistant/HufiAssistantCockpit";
import { HufiAssistantExperience } from "@/components/assistant/HufiAssistantExperience";
import { deriveHufiExperience, type HufiUiError } from "@/components/assistant/hufi-experience";
import { HufiSwipeWorkspacePreview } from "@/components/workspace/HufiSwipeWorkspace";
import { detectMomentHint, type HufiMomentType } from "@/lib/hufi-moment";

// Presence-Untertitel im Header: auf sehr schmalen Displays (< 400px, siehe
// .hufi-subtitle-short/-long unten) reicht der Platz neben Logo, Wetter,
// Guthaben und Glocke nicht für die volle Phrase ("TIPPEN ZUM SP…" wurde
// mitten im Wort abgeschnitten) -- kurze, vollständige Fassung statt Crop.
function SubtitleText({ long, short }: { long: string; short: string }) {
  return (
    <>
      <span className="hufi-subtitle-long">{long}</span>
      <span className="hufi-subtitle-short">{short}</span>
    </>
  );
}

export function MobileShell() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { mode: viewMode, setMode: setViewMode, isPrivat } = useViewMode();
  const [inputText, setInputText] = useState("");
  const [responding, setResponding] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  // Kurzzeitkontext "worüber reden wir gerade" (Etappe 3, siehe AGENT_ANALYSE.md) --
  // lebt neben messages, wird pro Turn an die Edge Function mitgeschickt und von
  // dort aktualisiert zurückgegeben, damit Folge-Äußerungen ("und leg einen neuen
  // an") ohne erneutes Nachfragen auf dasselbe Pferd/denselben Kunden bezogen werden.
  const [conversationFocus, setConversationFocus] = useState<ConversationFocus>({});
  const conversationFocusRef = useRef<ConversationFocus>({});
  useEffect(() => { conversationFocusRef.current = conversationFocus; }, [conversationFocus]);

  // ── HufiAssistantExperience (Preview) ─────────────────────────────────────
  // Reine Sichtbarmachung bereits vorhandener echter Zwischenzustände als
  // State, damit eine Präsentationskomponente darauf reagieren kann -- keine
  // neue Logik, dieselben Übergänge wie im bestehenden Chat-/Task-Flow.
  const [activeConfirmation, setActiveConfirmation] = useState<HufiPendingConfirmation | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmationOutcome, setConfirmationOutcome] = useState<{ success: boolean; message: string } | null>(null);
  const [justWoke, setJustWoke] = useState(false);
  const [lastAnswerText, setLastAnswerText] = useState<string | null>(null);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [agentError, setAgentError] = useState<HufiUiError | null>(null);
  const [momentHint, setMomentHint] = useState<HufiMomentType | null>(null);
  // Persistierter Mikro-/Transkriptionsfehler für die Experience-UI --
  // unabhängig von voice.reset() (siehe voice.error-Effekt unten), der den
  // Hook-State sofort nach dem Toast leert. Ohne diese Kopie würde der
  // Fehler in der Vollbild-Experience nur für einen Render aufblitzen.
  const [voiceUiError, setVoiceUiError] = useState<HufiUiError | null>(null);
  // Echter, zeitbasierter Warte-Hinweis während hufi-agent antwortet (P0
  // Abschnitt 5) -- keine erfundenen Fortschrittsschritte, nur ein Lebenszeichen.
  const [waitHint, setWaitHint] = useState<string | null>(null);
  // Sichtbares, echtes Transkript -- eigener State statt direkt voice.transcript,
  // weil der Verarbeitungs-Effekt unten voice.reset() aufruft, sobald der Text
  // übernommen wurde (verhindert doppelte Verarbeitung bei Re-Render). Ohne
  // diese Kopie würde das erkannte Transkript nie sichtbar, siehe P0 Abschnitt 4.
  const [displayedTranscript, setDisplayedTranscript] = useState<string | null>(null);
  function triggerWake() {
    setJustWoke(true);
    // Eine neue echte Interaktion beginnt -- veraltete Bestätigungs-/Fehler-/
    // Antwort-Anzeigen der vorherigen Runde nicht weiter zeigen (kein Hängen-
    // bleiben in einem alten Zustand, keine Doppel-Bestätigung möglich).
    setAnswerVisible(false);
    setAgentError(null);
    setMomentHint(null);
    window.setTimeout(() => setJustWoke(false), 500);
  }
  // Dieselben echten Funktionen (confirmStep/cancelTask) wie in
  // handleMsgAction's task_approve/task_reject-Zweigen, nur ohne die dortige
  // Chat-Bubble-Textmutation -- auf der Experience-Oberfläche gibt es keine
  // zugehörige Chat-Nachricht, die aktualisiert werden müsste.
  async function experienceConfirm() {
    if (!activeConfirmation || !user?.id) return;
    const { taskId, stepId } = activeConfirmation;
    setActiveConfirmation(null);
    setConfirming(true);
    let result = { success: false, message: "Fehler beim Ausführen." };
    try {
      const updated = await confirmStep(taskId, stepId, user.id);
      const step = updated?.steps.find((s) => s.id === stepId);
      const stepResult = step?.result as { success?: boolean; message?: string } | undefined;
      result = {
        success: !!stepResult?.success,
        message: stepResult?.message ?? step?.error ?? (step?.status === "done" ? "Erledigt." : "Fehler beim Ausführen."),
      };
    } catch (err) {
      result = { success: false, message: (err as Error)?.message ?? "Fehler beim Ausführen." };
    }
    setConfirming(false);
    setConfirmationOutcome(result);
    window.setTimeout(() => setConfirmationOutcome((c) => (c === result ? null : c)), 2600);
  }
  async function experienceReject() {
    if (!activeConfirmation || !user?.id) return;
    const { taskId } = activeConfirmation;
    setActiveConfirmation(null);
    await cancelTask(taskId, user.id);
  }
  function experienceInterrupt() {
    setAnswerVisible(false);
    setAgentError(null);
    if (recording) { stopRecording(); return; }
    if (activeConfirmation) { void experienceReject(); }
  }
  const userIdRef = useRef<string | undefined>(undefined);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);
  const [showDsgvoModal, setShowDsgvoModal] = useState(false);
  const [showFirstRunConsent, setShowFirstRunConsent] = useState(false);
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [showOnboardingChat, setShowOnboardingChat] = useState(false);
  const [showHufManagerWelcome, setShowHufManagerWelcome] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftMessage | null>(null);
  const [pendingRoute, setPendingRoute] = useState<Array<{name: string; address?: string; time?: string; clientName?: string}> | null>(null);
  // Runtime presence: persistent Hufi state label
  const [hufiPresenceState, setHufiPresenceState] = useState<HufiPresenceLabel>("bereit");
  const [hufiCtx, setHufiCtx] = useState<HufiContext | null>(null);
  const [proactiveBriefing, setProactiveBriefing] = useState<BriefingPayload | null>(null);
  // Letztes gebautes Briefing merken, damit das Cockpit es nach dem Schließen
  // erneut öffnen kann, ohne buildDailyBriefing/fetchWeatherContext erneut anzustoßen.
  const lastBriefingRef = useRef<BriefingPayload | null>(null);
  const [searching, setSearching] = useState(false);
  const [activeIntent, setActiveIntent] = useState<HufiIntent | null>(null);
  const [showKiModal, setShowKiModal] = useState(false);
  const [pendingChatText, setPendingChatText] = useState("");
  const [kiConsent, setKiConsent] = useState<"granted" | "denied" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionId = useRef<string>(crypto.randomUUID());
  const greetingSetRef = useRef(false);
  const shownAlertsRef = useRef<Set<string>>(new Set());
  const skillSuggestionShownRef = useRef(false);
  const migrationCheckedRef = useRef(false);
  const followUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followUpRoundRef = useRef(0); // max follow-up rounds per wake session
  const [hasGreeting, setHasGreeting] = useState(false); // triggers re-render when greeting ready
  const today = format(new Date(), "yyyy-MM-dd");

  // Hufi Voice — Phase 1: spoken greeting + Phase 2: push-to-talk voice loop.
  const { speak: hufiSpeak, isSupported: ttsSupported, isSpeaking: isTtsSpeaking } = useHufiTTS(user?.id ?? "", role);
  const [pendingSpokenGreeting, setPendingSpokenGreeting] = useState<string | null>(null);
  const lastGreetingTextRef = useRef<string>("");
  const voice = useVoiceCapture();
  // When recording is started via the mic button we collect every AI text added
  // during that turn and speak them after the response completes.
  const voiceSessionRef = useRef<{ active: boolean; texts: string[] } | null>(null);
  // State-based flag so the "Hufi spricht…" banner actually re-renders.
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  // Freihand: läuft die aktuelle Aufnahme ohne Stille-Auto-Stopp?
  const [handsFree, setHandsFree] = useState(false);

  // Voice-Loop (Jarvis-Modus): kontinuierlich zuhören bis STOP-Phrase
  const [voiceLoopActive, setVoiceLoopActive] = useState(false);
  const voiceLoopRef = useRef(false);

  // Active Hufi Task (Task-Engine)
  const [_activeHufiTask, setActiveHufiTask] = useState<HufiTask | null>(null);

  // Phase D: Hey Hufi wake-word opt-in state.
  const SR_SUPPORTED = typeof window !== "undefined" &&
    !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Derived state shorthands for UI/legacy code that referenced `recording` / `transcribing`.
  const recording = voice.isRecording;
  const transcribing = voice.isProcessing;

  const { data: nextAppt } = useQuery({
    queryKey: ["shell-next-appt", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, date, time, horses(id, name, photo_url, breed), client:profiles!client_id(full_name)")
        .eq("provider_id", user!.id)
        .gte("date", today)
        .in("status", ["scheduled", "confirmed"])
        .order("date", { ascending: true })
        .order("time", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: creditBalance } = useQuery({
    queryKey: ["shell-credits", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("hufi_credits")
        .select("balance")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.balance ?? 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // ── User-isolierte localStorage Werte laden ───────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    setKiConsent(ulget(user.id, USER_STORAGE_KEYS.KI_CONSENT) as "granted" | "denied" | null);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Standort einmalig täglich holen (nur mit KI-Consent) ─────────────────
  useEffect(() => {
    if (!user?.id || !navigator.geolocation) return;
    if (ulget(user.id, USER_STORAGE_KEYS.KI_CONSENT) !== "granted") return;
    const today = new Date().toISOString().slice(0, 10);
    if (ulget(user.id, "hufi_last_geo_date") === today) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        ulset(user.id, USER_STORAGE_KEYS.USER_LAT, String(pos.coords.latitude));
        ulset(user.id, USER_STORAGE_KEYS.USER_LON, String(pos.coords.longitude));
        ulset(user.id, "hufi_last_geo_date", today);
      },
      () => {},
      { timeout: 5000, maximumAge: 3_600_000 },
    );
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── First-run consent gate (overrides legacy DSGVO modal for new users) ────
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    hydrateUserSettingsFromDB(uid).then(() => {
      if (!hasCompletedFirstRun(uid)) {
        setShowFirstRunConsent(true);
        return;
      }
      // Returning user: check DSGVO via DB as before
      checkDsgvoConsent(uid).then((consented) => {
        if (!consented) setShowDsgvoModal(true);
        else bootGreeting(uid, true);
      });
      // HINWEIS: Der Onboarding-Einstieg wird AUSSCHLIESSLICH im Detector-Effekt unten
      // entschieden (detectOnboardingType) — kein separater onboarding_completed-Trigger
      // mehr, sonst feuern zwei Onboardings gleichzeitig.
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Migration banner check (existing users only, shown once) ─────────────
  useEffect(() => {
    if (!user?.id || migrationCheckedRef.current) return;
    migrationCheckedRef.current = true;

    detectOnboardingType(user.id).then((type) => {
      if (type === "hufmanager_migration") {
        // HufManager-User: prüfen ob Banner schon gesehen
        supabase
          .from("hufi_memory")
          .select("key")
          .eq("user_id", user.id)
          .eq("category", "migration")
          .eq("key", "welcome_seen")
          .maybeSingle()
          .then(({ data }) => {
            if (!data) setShowHufManagerWelcome(true);
            // Fallback: legacy banner_seen ebenfalls prüfen
            else {
              supabase.from("hufi_memory").select("key").eq("user_id", user.id)
                .eq("category", "migration").eq("key", "banner_seen").maybeSingle()
                .then(({ data: legacy }) => { if (!legacy) setShowMigrationBanner(true); });
            }
          });
      } else if (type === "new_user") {
        // Neukunde → genau EIN Flow: konversationelles Chat-Onboarding (deckt alle Berufe ab)
        setShowOnboardingChat(true);
      }
    });
  }, [user?.id, user?.created_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBannerStartTour = () => {
    if (user?.id) {
      updateHufiMemory(user.id, "migration", "banner_seen", { seen: true, ts: new Date().toISOString() }, "system");
    }
    setShowMigrationBanner(false);
    setShowOnboardingTour(true);
  };

  const handleBannerSkip = () => {
    if (user?.id) {
      updateHufiMemory(user.id, "migration", "banner_seen", { seen: true, skipped: true, ts: new Date().toISOString() }, "system");
    }
    setShowMigrationBanner(false);
  };

  const handleTourComplete = () => {
    if (user?.id) {
      updateHufiMemory(user.id, "migration", "tour_completed", { completed: true, ts: new Date().toISOString() }, "system");
    }
    setShowOnboardingTour(false);
  };

  function spokenGreetingStorageKey(userId: string) {
    const day = format(new Date(), "yyyy-MM-dd");
    return `hufi_spoken_greeting_${day}_${userId}`;
  }

  function logVoiceSkip(reason: "unsupported" | "disabled" | "already_spoken_today" | "no_user_gesture" | "empty_text", context?: string) {
    const suffix = context ? ` (${context})` : "";
    console.info(`[hufi-voice] skip: ${reason}${suffix}`);
  }

  function queueSpokenGreetingIfEligible(userId: string, greeting: string) {
    lastGreetingTextRef.current = greeting;
    setHasGreeting(true); // make replay button visible immediately

    if (typeof window === "undefined") return;
    if (!ttsSupported) {
      logVoiceSkip("unsupported", "queue");
      return;
    }
    if (!greeting.trim()) {
      logVoiceSkip("empty_text", "queue");
      return;
    }
    if (ulget(userId, USER_STORAGE_KEYS.VOICE_GREETING) !== "1") {
      logVoiceSkip("disabled", "queue");
      return;
    }
    if (localStorage.getItem(spokenGreetingStorageKey(userId)) === "1") {
      logVoiceSkip("already_spoken_today", "queue");
      return;
    }
    console.info("[hufi-voice] queued: waiting for first user gesture");
    setPendingSpokenGreeting(greeting);
  }

  // Manual replay — bypasses the once-per-day gate. Called from a button
  // click so the user gesture is implicit and audio is allowed.
  function replayGreeting() {
    if (!ttsSupported) {
      logVoiceSkip("unsupported", "replay");
      return;
    }
    const text = lastGreetingTextRef.current;
    if (!text.trim()) {
      logVoiceSkip("empty_text", "replay");
      return;
    }
    setPendingSpokenGreeting(null);
    hufiSpeak(text);
  }

  // Speak the queued greeting on the first user gesture (browsers block audio
  // before any interaction). Single-shot: listener removes itself after firing.
  useEffect(() => {
    if (!pendingSpokenGreeting) return;
    if (!user?.id) return;
    const userId = user.id;
    const text = pendingSpokenGreeting;
    let fired = false;

    const fire = () => {
      fired = true;
      cleanup();
      // Re-check the toggle right before speaking — user may have flipped it.
      if (ulget(userId, USER_STORAGE_KEYS.VOICE_GREETING) !== "1") {
        logVoiceSkip("disabled", "on_gesture");
        setPendingSpokenGreeting(null);
        return;
      }
      localStorage.setItem(spokenGreetingStorageKey(userId), "1");
      console.info("[hufi-voice] speaking greeting after gesture");
      // C) Nach Begrüßung automatisch in Listening wechseln
      hufiSpeak(text, () => {
        setPendingSpokenGreeting(null);
        if (SR_SUPPORTED && !voice.isRecording && !voice.isProcessing && !isTtsSpeaking) {
          setTimeout(() => {
            voiceSessionRef.current = { active: true, texts: [] };
            setDisplayedTranscript(null);
            void voice.startRecording();
            setHufiPresenceState("hört zu");
          }, 800);
        }
      });
    };

    const cleanup = () => {
      window.removeEventListener("pointerdown", fire);
      window.removeEventListener("keydown", fire);
    };

    window.addEventListener("pointerdown", fire, { once: true });
    window.addEventListener("keydown", fire, { once: true });
    return () => {
      cleanup();
      if (!fired) logVoiceSkip("no_user_gesture", "queue cleared before tap");
    };
  }, [pendingSpokenGreeting, user?.id, hufiSpeak]);

  // Audio-Unlock: erste Nutzer-Geste irgendwo in der App primed die Media-Wiedergabe,
  // damit ElevenLabs (Cloud-Audio) danach auch OHNE Klick auf "Hufi" automatisch spielt
  // (Briefing, Voice-Antworten). Ohne dieses Priming blockieren Browser-Autoplay-Regeln
  // den ersten programmatischen audio.play()-Aufruf.
  useEffect(() => {
    if (!user?.id) return;
    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      const silent = new Audio(
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
      );
      silent.play().then(() => silent.pause()).catch(() => {});
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return cleanup;
  }, [user?.id]);

  async function bootGreeting(userId: string, consented: boolean) {
    if (greetingSetRef.current) return;
    greetingSetRef.current = true;
    if (!consented) return; // DSGVO modal is shown separately

    try {
      const ctx = await fetchHufiContext(userId, role ?? null);
      if (!ctx.user.name && user?.email) {
        const raw = user.email.split("@")[0].split(/[._+]/)[0];
        ctx.user.name = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      }
      setHufiCtx(ctx);

      // Time-slot briefing (morning/midday/evening) — shown once per slot per day.
      // Einzige Briefing-Quelle (kalendertag-gebunden) seit Etappe 4, siehe
      // AGENT_ANALYSE.md -- das frühere 4h-TTL-Duplikat (hufai-proactive.ts) ist
      // entfernt.
      const briefingTime = getCurrentBriefingTime();
      if (briefingTime && userId && !hasBriefingShownToday(userId, briefingTime)) {
        markBriefingShown(userId, briefingTime);
        fetchWeatherContext().then((weather) => {
          const timeBriefing = buildDailyBriefing(ctx, briefingTime, weather);
          // Nur zeigen wenn relevanter Inhalt — wenn nichts los ist, still halten
          if (timeBriefing.totalItems > 0) {
            lastBriefingRef.current = timeBriefing;
            setProactiveBriefing(timeBriefing);
          }
        });
      }

      // TTS greeting — opt-in only, fires on first user gesture
      const spokenGreeting = buildShortSpokenGreeting({
        userId,
        userName: ctx.user.name ?? null,
        role: ctx.user.role ?? null,
        nextAppointment: ctx.todayAppointments[0]
          ? {
              date: ctx.todayAppointments[0].date ?? new Date().toISOString().slice(0, 10),
              time: ctx.todayAppointments[0].time ?? null,
              horseName: ctx.todayAppointments[0].horse_name ?? null,
              clientName: ctx.todayAppointments[0].client_name ?? null,
              isToday: true,
              minutesAway: ctx.todayAppointments[0].time
                ? Math.round((new Date(`${new Date().toISOString().slice(0, 10)}T${ctx.todayAppointments[0].time}`).getTime() - Date.now()) / 60000)
                : null,
            }
          : null,
        todayCount: ctx.todayAppointments.length,
        openLeads: ctx.openLeads,
        unpaidInvoices: ctx.unpaidInvoices,
      });
      queueSpokenGreetingIfEligible(userId, spokenGreeting);

      // Lern-Loop schließen: beobachten (observeInteraction) → vorschlagen (suggestSkill)
      // → HIER bestätigen/ablehnen (confirmSkill/processSkillFeedback).
      if (!skillSuggestionShownRef.current) {
        skillSuggestionShownRef.current = true;
        getPendingSkillSuggestion(userId).then((skill) => {
          if (!skill) return;
          addMsg({
            role: "ai",
            text: `💡 Ich habe bemerkt, dass du öfter "${skill.description ?? skill.name}" machst.\n\nSoll ich das ab jetzt automatisch für dich vorbereiten?`,
            ts: Date.now(),
            actions: [
              { label: "✓ Ja, übernehmen", actionKey: `skill_confirm:${skill.id}` },
              { label: "✗ Nein danke",     actionKey: `skill_reject:${skill.id}` },
            ],
          });
        }).catch(() => {});
      }
    } catch {
      // silently fail — no error bubble on startup
    }
  }

  async function handleDsgvoConsent(granted: boolean) {
    setShowDsgvoModal(false);
    if (user?.id) await logDsgvoConsent(user.id, "proactive_assistant", granted);
    if (user?.id) bootGreeting(user.id, granted);
  }

  async function handleFirstRunComplete(choices: HufiConsentChoices) {
    setShowFirstRunConsent(false);
    if (user?.id && choices.dsgvo) {
      await logDsgvoConsent(user.id, "proactive_assistant", true);
      bootGreeting(user.id, true);
    } else if (user?.id) {
      bootGreeting(user.id, false);
    }
  }

  // ── Proactive alert interval (every 5 min) ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(async () => {
      const alerts = await checkProactiveAlerts(user.id);
      for (const alert of alerts) {
        if (!shownAlertsRef.current.has(alert)) {
          shownAlertsRef.current.add(alert);
          toast(alert, { duration: 8000 });
        }
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime channel ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`autoflow-chat-${user.id}`)
      .on("broadcast", { event: "chat_msg" }, ({ payload }) => {
        if (payload.senderId === sessionId.current) return;
        setMessages((prev) => {
          if (prev.some((m) => m.ts === payload.ts)) return prev;
          return [...prev, payload as ChatMessage];
        });
      })
      .subscribe();
    channelRef.current = ch;
    return () => { ch.unsubscribe(); channelRef.current = null; };
  }, [user?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── Recording ───────────────────────────────────────────────────────────────
  // ── Shared transcript processing (used by inline mic + voice modal) ─────────
  // Wake-Word aus Transkript entfernen bevor es verarbeitet wird
  function stripWakeWord(text: string): string {
    return text.replace(/^(hey\s+hu[fp][iy]|hei\s+hufi|hey\s+hoofi|okay\s+hufi|ok\s+hufi|hallo\s+hufi|hey\s+wufi)[,\s]*/i, "").trim();
  }

  // Erkennt "vergiss das / lösch das / nicht speichern" etc.
  function isForgetCommand(text: string): boolean {
    const l = text.toLowerCase();
    return /\b(vergiss|lösch|löschen|nicht speichern|vergessen|cancel|rückgängig|undo)\b/.test(l)
      && /\b(das|es|alles|memory|gespeichert|letzte[ns]?)\b/.test(l);
  }

  function isRoutineCommand(text: string): boolean {
    const l = text.toLowerCase();
    return /\b(routine|routinen|automatisch|automatisierung|cron|erinnerung anlegen|erinnere mich|erinnere mich täglich|erinnere mich wöchentlich)\b/.test(l)
      || /\b(zeig.*(meine\s+)?routinen?|öffne.*routinen?|routine.*anzeigen)\b/.test(l);
  }

  async function processTranscribedText(text: string) {
    if (!text) {
      addMsg({ role: "ai", text: "Ich konnte nichts verstehen. Bitte nochmals sprechen.", ts: Date.now() });
      return;
    }
    const cleaned = stripWakeWord(text);
    if (!cleaned) return; // war nur das Wake-Word, nichts danach
    addMsg({ role: "user", text: cleaned, ts: Date.now() });

    const voiceWelfare = checkHorseWelfare(cleaned);
    if (voiceWelfare && user?.id) {
      addMsg({
        role: "ai",
        text: voiceWelfare.message,
        ts: Date.now() + 1,
        actions: [{ label: `🚨 ${voiceWelfare.callToAction}`, route: "/tierarzt-finder" }],
      });
      logWelfareAlert(user.id, voiceWelfare, cleaned);
      return;
    }

    if (!user?.id) return;

    // "Vergiss das" / "Lösch das" → letzten Memory-Eintrag löschen
    if (isForgetCommand(cleaned)) {
      const deleted = await deleteLastLearnedMemory(user.id);
      addMsg({
        role: "ai",
        text: deleted ? `✅ Gelöscht: _${deleted}_` : "Ich habe nichts Löschbares gefunden.",
        ts: Date.now() + 1,
      });
      return;
    }

    setResponding(true);
    setHufiPresenceState("denkt");
    try {
      const befund = await extractBefundFromTranscript(cleaned, user.id);
      if (befund) {
        const befundText = formatBefundForChat(befund);
        addMsg({ role: "ai", text: befundText, ts: Date.now() });
        addMsg({
          role: "ai",
          text: `✅ Befund gespeichert!${befund.naechster_termin ? `\n📅 Vorgeschlagener Termin: ${befund.naechster_termin}` : ""}\n\nTippe um direkt zu erledigen:`,
          ts: Date.now() + 1,
          actionPrompt: true,
        });
        const searchSuggestions = getBefundSearchSuggestions(befund);
        if (searchSuggestions.length > 0) {
          addMsg({
            role: "ai",
            text: buildSearchSuggestionText(befund, searchSuggestions),
            ts: Date.now() + 2,
            searchSuggestions,
            actions: [
              { label: "✅ Ja, suche", actionKey: "search_yes" },
              { label: "✖ Nein danke", actionKey: "search_no" },
            ],
          });
        }
        learnFromInteraction(user.id, cleaned, befundText, "confirmed", sessionId.current);
        if (hufiCtx) {
          setHufiCtx((prev) => prev ? {
            ...prev,
            lastBefunde: [
              { id: crypto.randomUUID(), created_at: new Date().toISOString(), pferd_name: befund.pferd_name, befund_text: befund.befund_text, massnahme: befund.massnahme, naechster_termin: befund.naechster_termin },
              ...prev.lastBefunde.slice(0, 4),
            ],
          } : prev);
        }
      } else {
        addMsg({ role: "ai", text: `Verstanden: „${cleaned}". Ich habe das notiert.`, ts: Date.now() });
        learnFromInteraction(user.id, cleaned, "Notiz", "confirmed", sessionId.current);
      }
    } catch {
      addMsg({ role: "ai", text: "Verarbeitung fehlgeschlagen. Bitte erneut versuchen.", ts: Date.now() });
    } finally {
      setResponding(false);
      setHufiPresenceState("bereit");
    }
  }

  // Called from voice modal after successful transcription ─────────────────
  async function handleVoiceTranscript(text: string) {
    await processTranscribedText(text);
    // Scroll to latest message
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);
  }

  function voiceErrorMessage(code: VoiceErrorCode): string {
    switch (code) {
      case "microphone_denied":
        return "Mikrofon-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben.";
      case "microphone_missing":
        return "Kein Mikrofon gefunden oder vom Browser nicht unterstützt.";
      case "recording_failed":
        return "Aufnahme fehlgeschlagen. Bitte erneut versuchen.";
      case "transcription_unavailable":
        return "Hufi kann Sprache gerade nicht verarbeiten.";
      case "transcription_failed":
        return "Transkription fehlgeschlagen. Bitte erneut versuchen.";
      case "empty_transcript":
        return "Ich habe dich nicht sicher verstanden. Bitte wiederhole das kurz.";
    }
  }

  // Vom Nutzer selbst gestartete Aufnahme = Freihand-Modus: kein Auto-Stopp bei
  // Stille, beendet wird per Stopp-Knopf (Notbremse nach 3 Minuten steckt im
  // Hook). Der Follow-up-Modus unten bleibt bewusst auf VAD.
  async function startRecording() {
    setHufiPresenceState("hört zu");
    setHandsFree(true);
    setDisplayedTranscript(null);
    voiceSessionRef.current = { active: true, texts: [] };
    const started = await voice.startRecording({ handsFree: true });
    if (!started) {
      voiceSessionRef.current = null;
      setHandsFree(false);
      setHufiPresenceState("bereit");
    }
  }

  // Aktiviert Hufi per Wake-Word oder Tap: einheitliche Hufi-TTS, dann Mikro
  async function activateHufi() {
    if (recording || transcribing || responding || isTtsSpeaking || isVoiceSpeaking) return;
    followUpRoundRef.current = 0; // Reset follow-up counter on explicit activation

    setHufiPresenceState("spricht");
    setIsVoiceSpeaking(true);

    const ok = await hufiSpeak("Ja, ich höre zu.", () => {
      setIsVoiceSpeaking(false);
      startRecording();
    }, true);

    if (!ok) {
      setIsVoiceSpeaking(false);
      startRecording();
    }
  }

  function stopRecording() {
    setHufiPresenceState("transkribiert");
    setHandsFree(false);
    voice.stopRecording();
  }

  function cancelRecording() {
    if (followUpTimerRef.current) { clearTimeout(followUpTimerRef.current); followUpTimerRef.current = null; }
    voiceSessionRef.current = null;
    setHandsFree(false);
    setHufiPresenceState("bereit");
    voice.cancel();
  }

  function startVoiceLoop() {
    voiceLoopRef.current = true;
    setVoiceLoopActive(true);
    followUpRoundRef.current = 0;
    voiceSessionRef.current = { active: true, texts: [] };
    setDisplayedTranscript(null);
    setHufiPresenceState("hört zu");
    setHandsFree(false); // Voice-Loop bleibt auf VAD
    void voice.startRecording();
  }

  function stopVoiceLoop() {
    voiceLoopRef.current = false;
    setVoiceLoopActive(false);
    if (followUpTimerRef.current) { clearTimeout(followUpTimerRef.current); followUpTimerRef.current = null; }
    voiceSessionRef.current = null;
    if (voice.isRecording) voice.stopRecording();
    setHufiPresenceState("bereit");
    void hufiSpeak("Okay. Ich bin bereit wenn du mich brauchst.");
    triggerSessionLearning();
  }

  // Fire-and-forget: am Session-Ende aus den beobachteten Patterns lernen und ggf. Skills vorschlagen.
  // Non-blocking und fehlertolerant — learnFromSession() fängt eigene Fehler bereits intern ab.
  // Nutzt Refs statt State-Closures, damit sie auch aus dem Unmount-Cleanup sicher aktuelle Werte sieht.
  function triggerSessionLearning() {
    const userId = userIdRef.current;
    if (!userId) return;
    const snapshot = messagesRef.current;
    if (snapshot.length === 0) return;
    const completedTaskTypes = snapshot
      .filter((m) => m.hufiTask?.status === "executed")
      .map((m) => m.hufiTask!.type);
    void learnFromSession(userId, null, snapshot, completedTaskTypes).catch(() => {});
  }

  // Session-Ende beim Verlassen der Chat-Ansicht (z.B. Tab-Wechsel innerhalb der App) — deckt auch
  // reine Text-Chats ohne aktiven Voice-Loop ab.
  useEffect(() => {
    return () => { triggerSessionLearning(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mic-Knopf aus der unteren Leiste: Antippen startet die Aufnahme sofort im
  // Freihand-Modus, nochmal Antippen sendet. Bewusst OHNE das gesprochene
  // "Ja, ich höre zu." von activateHufi — das kostet bei jedem Tippen eine
  // Sekunde Guthaben und verzögert den Start. Die Ansage bleibt dem Wake-Word.
  useEffect(() => {
    function onMicEvent() {
      if (voice.isRecording) { stopRecording(); return; }
      if (transcribing || responding || isTtsSpeaking || isVoiceSpeaking) return;
      void startRecording();
    }
    window.addEventListener(HUFI_MIC_EVENT, onMicEvent);
    return () => window.removeEventListener(HUFI_MIC_EVENT, onMicEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.isRecording, transcribing, responding, isTtsSpeaking, isVoiceSpeaking]);

  // VAD Auto-Stop: wenn recording von true → false wechselt (ohne manuellen Stop)
  const prevRecordingRef = useRef(false);
  useEffect(() => {
    if (prevRecordingRef.current && !voice.isRecording) {
      setHandsFree(false);
      if (voiceSessionRef.current?.active) {
        setHufiPresenceState("transkribiert");
      }
    }
    prevRecordingRef.current = voice.isRecording;
  }, [voice.isRecording]);

  // Surface voice errors via toast — fail loud, never silent.
  useEffect(() => {
    if (!voice.error) return;
    const msg = voiceErrorMessage(voice.error);
    const category: HufiUiError["category"] =
      voice.error === "microphone_denied" || voice.error === "microphone_missing" || voice.error === "recording_failed"
        ? "mic"
        : "transcription";
    console.info(`[voice-capture] error: ${voice.error}`);
    if (voice.error === "empty_transcript") {
      void hufiSpeak(msg, undefined, true);
    } else {
      toast.error(msg);
    }
    if (useExperiencePreview) {
      setVoiceUiError({ text: msg, category });
      window.setTimeout(() => setVoiceUiError((c) => (c?.text === msg ? null : c)), 7000);
    }
    voiceSessionRef.current = null;
    setHufiPresenceState("bereit");
    voice.reset();
  }, [voice.error]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push transcript into the pipeline. Navigation intents are resolved instantly
  // without entering the AI chat pipeline — user message is skipped for Jarvis
  // feel. Regular messages fall through to processTranscribedText + spoken reply.
  useEffect(() => {
    if (!voice.transcript) return;
    const text = voice.transcript;
    // Sichtbar halten, bevor der Hook-State geleert wird -- siehe
    // displayedTranscript-Deklaration oben (P0 Abschnitt 4).
    setDisplayedTranscript(text);
    voice.reset();
    if (!user?.id) return;

    // ── Voiceflow v2: auto-send for acceptable transcripts ───────────────────
    // Only show review for very short (<3 words) or user-configured manual mode.
    const wordCount = text.trim().split(/\s+/).length;
    const manualConfirm = ulget(user?.id ?? "", USER_STORAGE_KEYS.VOICE_MANUAL) === "1";
    if (manualConfirm && wordCount < 3) {
      // Short transcript: show as pre-filled text for correction, don't auto-send
      setInputText(text);
      setHufiPresenceState("bereit");
      voiceSessionRef.current = null;
      return;
    }

    setHufiPresenceState("denkt");
    const intent = detectIntent(text, true, hufiCtx?.memory ?? []);

    if (intent.intent === "navigation" && intent.entities.navTarget) {
      setHufiPresenceState("führt aus");
      voiceSessionRef.current = null;
      (async () => {
        const outcome = await runNavAction(intent.entities.navTarget!, {
          userId: user.id,
          role: role as import("@/lib/hufi-nav-actions").ActionRole,
        });
        handleNavigationOutcome(outcome, /* fromVoice */ true);
        setHufiPresenceState("bereit");
      })();
      return;
    }

    (async () => {
      await processChatMessage(text, true);
      const session = voiceSessionRef.current;
      voiceSessionRef.current = null;
      if (!session?.active || !ttsSupported) {
        setHufiPresenceState("bereit");
        return;
      }
      const combined = session.texts.join(" ");
      if (!combined.trim()) {
        setHufiPresenceState("bereit");
        return;
      }
      setIsVoiceSpeaking(true);
      setHufiPresenceState("spricht");
      hufiSpeak(combined, () => {
        setIsVoiceSpeaking(false);
        setHufiPresenceState("bereit");
        // Follow-up: 600ms Pause, dann automatisch zuhören (ohne Wake Word)
        if (followUpTimerRef.current) clearTimeout(followUpTimerRef.current);
        followUpTimerRef.current = setTimeout(() => {
          followUpTimerRef.current = null;
          const loopShouldContinue = voiceLoopRef.current || followUpRoundRef.current < 5;
          if (loopShouldContinue && !voice.isRecording && !voice.isProcessing && !responding) {
            if (!voiceLoopRef.current) followUpRoundRef.current++;
            voiceSessionRef.current = { active: true, texts: [] };
            setDisplayedTranscript(null);
            void voice.startRecording();
            setHufiPresenceState("hört zu");
          } else if (!voiceLoopRef.current) {
            setVoiceLoopActive(false);
          }
        }, 800);
      }, /* fastMode */ true, () => {
        if (useExperiencePreview) toast.info("Meine Sprachausgabe ist gerade nicht verfügbar.");
      });
    })();
  }, [voice.transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  function broadcast(msg: ChatMessage) {
    channelRef.current?.send({
      type: "broadcast",
      event: "chat_msg",
      payload: { ...msg, senderId: sessionId.current },
    });
  }

  function addMsg(msg: ChatMessage) {
    setMessages((prev) => [...prev, msg]);
    broadcast(msg);
    if (msg.role === "ai" && voiceSessionRef.current?.active && msg.text) {
      voiceSessionRef.current.texts.push(msg.text);
    }
  }

  async function addStreamingMsg(
    history: AIChatMessage[],
    userId: string,
    model?: string,
  ): Promise<string> {
    const bypassCredit = role === "provider" || role === "admin";
    const ts = Date.now();
    // Placeholder so the bubble appears immediately
    setMessages((prev) => [...prev, { role: "ai" as const, text: "", ts }]);
    let fullText = "";
    try {
      await streamWithHufAI(history, userId, model, (chunk) => {
        fullText += chunk;
        setMessages((prev) =>
          prev.map((m) => m.ts === ts ? { ...m, text: m.text + chunk } : m)
        );
      }, undefined, bypassCredit);
    } catch (e) {
      // Remove the empty placeholder bubble before rethrowing so no blank
      // bubble is left in the chat when the caller's catch adds an error msg.
      setMessages((prev) => prev.filter((m) => m.ts !== ts));
      throw e;
    }
    // Post-stream: broadcast & voice session tracking
    const complete: ChatMessage = { role: "ai", text: fullText, ts };
    setLastAnswerText(fullText);
    if (useExperiencePreview && fullText) {
      setAnswerVisible(true);
      window.setTimeout(() => setAnswerVisible(false), 9000);
      void hufiSpeak(fullText);
    }
    broadcast(complete);
    if (voiceSessionRef.current?.active && fullText) {
      voiceSessionRef.current.texts.push(fullText);
    }
    return fullText;
  }

  async function handleMsgAction(key: string, msg: ChatMessage) {
    // ── Agent Task: Bestätigen ────────────────────────────────────────────────
    // (Einzelaktionen laufen als Ein-Schritt-Task über hufi_task_queue — actionKey: task_approve:<taskId>:<stepId>)
    if (key.startsWith("task_approve:") && user?.id) {
      const [taskId, stepId] = key.slice("task_approve:".length).split(":");
      setActiveConfirmation(null);
      setConfirming(true);
      setMessages((prev) => prev.map((m) =>
        m.ts === msg.ts ? { ...m, actions: undefined, text: m.text + "\n\n⏳ Wird ausgeführt…" } : m
      ));
      let result = { success: false, message: "Fehler beim Ausführen." };
      try {
        const updated = await confirmStep(taskId, stepId, user.id);
        const step = updated?.steps.find((s) => s.id === stepId);
        const stepResult = step?.result as { success?: boolean; message?: string } | undefined;
        result = {
          success: !!stepResult?.success,
          message: stepResult?.message ?? step?.error ?? (step?.status === "done" ? "Erledigt." : "Fehler beim Ausführen."),
        };
      } catch (err) {
        result = { success: false, message: (err as Error)?.message ?? "Fehler beim Ausführen." };
      }
      setConfirming(false);
      setConfirmationOutcome(result);
      window.setTimeout(() => setConfirmationOutcome((c) => (c === result ? null : c)), 2600);
      setMessages((prev) => prev.map((m) =>
        m.ts === msg.ts
          ? { ...m, text: m.text.replace("\n\n⏳ Wird ausgeführt…", `\n\n${result.success ? "✅" : "❌"} ${result.message}`) }
          : m
      ));
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      return;
    }

    // ── Agent Task: Ablehnen ──────────────────────────────────────────────────
    if (key.startsWith("task_reject:") && user?.id) {
      const [taskId] = key.slice("task_reject:".length).split(":");
      setActiveConfirmation(null);
      await cancelTask(taskId, user.id);
      setMessages((prev) => prev.map((m) =>
        m.ts === msg.ts ? { ...m, actions: undefined, text: m.text + "\n\n✖ Abgebrochen." } : m
      ));
      return;
    }

    // ── Skill-Vorschlag: Bestätigen/Ablehnen (Lern-Loop schließen) ─────────────
    if (key.startsWith("skill_confirm:") && user?.id) {
      const skillId = key.slice("skill_confirm:".length);
      await confirmSkill(skillId, user.id);
      setMessages((prev) => prev.map((m) =>
        m.ts === msg.ts ? { ...m, actions: undefined, text: m.text + "\n\n✅ Erledigt — ich mache das ab jetzt automatisch." } : m
      ));
      return;
    }
    if (key.startsWith("skill_reject:") && user?.id) {
      const skillId = key.slice("skill_reject:".length);
      await processSkillFeedback(skillId, user.id, false);
      setMessages((prev) => prev.map((m) =>
        m.ts === msg.ts ? { ...m, actions: undefined, text: m.text + "\n\n✖ Alles klar, mache ich nicht automatisch." } : m
      ));
      return;
    }

    if (key === "search_no" || key === "confirm_no") {
      setMessages((prev) => prev.map((m) =>
        m.ts === msg.ts ? { ...m, actions: undefined, text: key === "confirm_no" ? m.text + "\n\n✖ Abgebrochen." : m.text } : m
      ));
      return;
    }
    if (key === "search_yes" && msg.searchSuggestions && user?.id) {
      // Dismiss action buttons on the suggestion message
      setMessages((prev) => prev.map((m) =>
        m.ts === msg.ts ? { ...m, actions: undefined, text: m.text.replace(/\nDarf ich suchen\?$|\nSoll ich suchen\?$/, "\n🔍 Suche läuft…") } : m,
      ));
      setSearching(true);
      try {
        const loc = await requestLocationPermission(user.id);
        const allResults: HufiSearchResult[] = [];
        for (const sug of msg.searchSuggestions.slice(0, 3)) {
          const res = await hufiSearch(sug.query, user.id, sug.searchType, loc ?? undefined);
          allResults.push(...res);
        }
        // Deduplicate by name
        const seen = new Set<string>();
        const deduped = allResults.filter((r) => seen.has(r.name) ? false : (seen.add(r.name), true)).slice(0, 5);
        addMsg({
          role: "ai",
          text: deduped.length > 0
            ? `Ich habe ${deduped.length} ${deduped.length === 1 ? "Ergebnis" : "Ergebnisse"} für dich gefunden:`
            : "Keine lokalen Ergebnisse gefunden. Versuche eine manuelle Suche.",
          ts: Date.now(),
          searchResults: deduped,
        });
      } catch {
        addMsg({ role: "ai", text: "Suche fehlgeschlagen. Bitte erneut versuchen.", ts: Date.now() });
      } finally {
        setSearching(false);
      }
    }
  }

  // ── Intent-aware helpers ─────────────────────────────────────────────────────
  function nowStamp() {
    const now = new Date();
    return now.toLocaleString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const KNOWLEDGE_SYSTEM_PROMPT = `Du bist Hufi, ein KI-Assistent für die Pferdewelt. Beantworte allgemeine Wissensfragen zu Pferden, Hufen, Tierpflege und Veterinärmedizin.
Antworte sachlich, klar und auf Deutsch. Verwende Fachbegriffe mit kurzer Erklärung. Kein Zugriff auf persönliche Daten.
Aktuelles Datum und Uhrzeit: ${nowStamp()}`;

  async function answerFromKnowledge(text: string) {
    const history: AIChatMessage[] = [
      { role: "system", content: KNOWLEDGE_SYSTEM_PROMPT },
      ...messages.slice(-4).map((m) => ({ role: m.role === "user" ? "user" : "assistant" as const, content: m.text })),
      { role: "user", content: text },
    ];
    await addStreamingMsg(history, user?.id ?? "anonymous", "hufiai-fast");
  }

  async function answerWithWeather(text: string, voiceMode: boolean) {
    const WMO: Record<number, string> = {
      0:"klar", 1:"überwiegend klar", 2:"teils bewölkt", 3:"bewölkt",
      45:"neblig", 48:"Reifnebel", 51:"leichter Nieselregen", 53:"Nieselregen",
      55:"starker Nieselregen", 61:"leichter Regen", 63:"Regen", 65:"starker Regen",
      71:"leichter Schnee", 73:"Schnee", 75:"starker Schnee",
      80:"Regenschauer", 81:"Schauer", 82:"starke Schauer",
      95:"Gewitter", 96:"Gewitter mit Hagel", 99:"starkes Gewitter",
    };
    const wmoLabel = (code: number) => WMO[code] ?? "wechselhaft";

    // Stadtname aus Anfrage extrahieren (mit oder ohne Präposition) + STT-Fehler korrigieren
    const STT_CITY_FIXES: Record<string, string> = {
      "kaiserlautern": "Kaiserslautern",
      "kaisers lautern": "Kaiserslautern",
      "frank furt": "Frankfurt",
      "frank furt am main": "Frankfurt am Main",
      "stutt gart": "Stuttgart",
      "mün chen": "München",
    };
    const rawCityMatch =
      text.match(/\b(?:in|für|bei|um)\s+([A-ZÄÖÜ][a-zäöüß]+(?:[\s-][A-ZÄÖÜ][a-zäöüß]*)*)/) ??
      text.match(/(?:wetter|temperatur|regen|sonne)\s+([A-ZÄÖÜ][a-zäöüß]+(?:[\s-][A-ZÄÖÜ][a-zäöüß]*)*)/i) ??
      text.match(/([A-ZÄÖÜ][a-zäöüß]{2,}(?:[\s-][A-ZÄÖÜ][a-zäöüß]+)*)(?:\s|$)/);
    const rawCity = rawCityMatch?.[1];
    const cityMatch = rawCity ? [rawCity, STT_CITY_FIXES[rawCity.toLowerCase()] ?? rawCity] : null;
    const cityName = cityMatch?.[1];
    let weather: import("@/lib/hufai-proactive").WeatherContext | null = null;
    let locationLabel = "";

    if (cityName) {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=de`,
          { signal: AbortSignal.timeout(3000) }
        );
        const geoJson = await geoRes.json() as { results?: Array<{ latitude: number; longitude: number; name: string; country: string }> };
        const loc = geoJson.results?.[0];
        if (loc) {
          const url = new URL("https://api.open-meteo.com/v1/forecast");
          url.searchParams.set("latitude", String(loc.latitude));
          url.searchParams.set("longitude", String(loc.longitude));
          url.searchParams.set("daily", "weathercode,precipitation_sum,temperature_2m_max");
          url.searchParams.set("timezone", "Europe/Berlin");
          url.searchParams.set("forecast_days", "2");
          const wRes = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
          if (wRes.ok) {
            const wJson = await wRes.json() as { daily: { weathercode: number[]; precipitation_sum: number[]; temperature_2m_max: number[] } };
            const d = wJson.daily;
            weather = { todayCode: d.weathercode[0] ?? 0, todayPrecipMm: d.precipitation_sum[0] ?? 0, tomorrowCode: d.weathercode[1] ?? 0, tomorrowPrecipMm: d.precipitation_sum[1] ?? 0, tempMax: d.temperature_2m_max[0] ?? 15 };
            locationLabel = `${loc.name}, ${loc.country}`;
          }
        }
      } catch { /* fallback */ }
    }

    if (!weather) {
      weather = await fetchWeatherContext().catch(() => null);
      const storedLat = ulget(user?.id ?? "", USER_STORAGE_KEYS.USER_LAT);
      const storedLon = ulget(user?.id ?? "", USER_STORAGE_KEYS.USER_LON);
      locationLabel = storedLat && storedLon ? "gespeicherter Standort" : "Deutschland-Mitte";
    }

    if (!weather) {
      addMsg({ role: "ai", text: "Wetterdaten sind momentan nicht abrufbar. Bitte in ein paar Minuten erneut versuchen.", ts: Date.now() });
      return;
    }

    const rain = weather.todayPrecipMm >= 2
      ? `Regenrisiko hoch (${weather.todayPrecipMm} mm).`
      : weather.todayPrecipMm >= 0.5
      ? `Leichter Regen möglich (${weather.todayPrecipMm} mm).`
      : "Trocken.";

    const hufTip = weather.todayPrecipMm >= 2
      ? "Heute eher kein Außeneinsatz für Hufpflege."
      : weather.todayCode <= 2
      ? "Gute Bedingungen für Hufpflege draußen."
      : "Hufpflege möglich, Boden prüfen.";

    const answer = `${locationLabel}: ${wmoLabel(weather.todayCode)}, max. ${weather.tempMax}°C. ${rain}\nMorgen: ${wmoLabel(weather.tomorrowCode)}, ${weather.tomorrowPrecipMm} mm.\n${hufTip}`;
    addMsg({ role: "ai", text: answer, ts: Date.now() });
  }



  async function planAndConfirmAction(text: string, entities: ReturnType<typeof detectIntent>["entities"]) {
    if (!user?.id) return;

    // keyword-basierter Fallback-Plan
    const defaultTaskType = intentActionToTaskType(entities.action ?? "generic_action");
    const horse  = entities.horseName  ? `für ${entities.horseName}` : "";
    const client = entities.clientName ? ` (${entities.clientName})` : "";
    const fallbackPayload: Record<string, unknown> = {
      horse_name:  entities.horseName,
      client_name: entities.clientName,
      ...(defaultTaskType === "create_invoice"  ? { amount: 0, notes: horse ? `Hufpflege ${horse}` : "Hufpflege" } : {}),
      ...(defaultTaskType === "create_appointment" ? { date: new Date().toISOString().slice(0, 10) } : {}),
    };
    const fallbackExplanation = defaultTaskType === "create_invoice"
      ? `Rechnung ${horse}${client} erstellen.`
      : defaultTaskType === "create_appointment"
      ? `Neuen Termin anlegen${horse ? ` ${horse}` : ""}${client}.`
      : defaultTaskType === "set_reminder"
      ? `Erinnerung setzen${horse ? ` ${horse}` : ""}.`
      : `Aufgabe: ${text.slice(0, 100)}`;

    const taskType  = defaultTaskType;
    const payload   = fallbackPayload;
    const explanation = fallbackExplanation;

    // Echte Aktion + Parameter kommen vom Modell über echtes Tool-Calling
    // (callClaudeWithTools in hufi-agent/index.ts) -- der Keyword-Plan oben
    // ist nur noch der Notfall-Fallback, falls Claude kein mutierendes Tool
    // aufruft (z.B. bei Rückfragen statt einer Aktion).
    let pendingConfirmation: Awaited<ReturnType<typeof askHufiAgent>>["pendingConfirmation"];
    try {
      const agentHistory = messages.slice(-4).map((m) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.text,
      }));
      const _lat = ulget(user?.id ?? "", USER_STORAGE_KEYS.USER_LAT);
      const _lon = ulget(user?.id ?? "", USER_STORAGE_KEYS.USER_LON);
      const resp = await askHufiAgent({
        text,
        voiceMode: false,
        history: agentHistory,
        route: window.location.pathname,
        clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        clientLocation: _lat && _lon ? { lat: parseFloat(_lat), lon: parseFloat(_lon) } : undefined,
        conversationFocus: conversationFocusRef.current,
      });
      pendingConfirmation = resp.pendingConfirmation;
      if (resp.conversationFocus) setConversationFocus(resp.conversationFocus);
    } catch (e) {
      console.warn("[Hufi] Tool-Use fehlgeschlagen, Fallback auf Keywords:", e);
    }

    // Claude hat über echtes Tool-Use bereits einen Bestätigungs-Task
    // server-seitig angelegt (hufi_task_queue, siehe callClaudeWithTools in
    // hufi-agent/index.ts) -- diesen anzeigen statt zusätzlich per
    // Keyword-Fallback einen zweiten, eigenständigen Task zu erzeugen (sonst
    // zwei parallele Tasks für dieselbe Aktion, siehe AGENT_ANALYSE.md).
    if (pendingConfirmation) {
      const { taskId, stepId, taskType: pendingType, description } = pendingConfirmation;
      const icon  = taskTypeIcon(pendingType as AgentTaskType);
      const label = taskTypeLabel(pendingType as AgentTaskType);
      setActiveConfirmation(pendingConfirmation);
      addMsg({
        role: "ai",
        text: `${icon} ${label}\n\n${description}`,
        ts: Date.now(),
        actions: [
          { label: "✓ Bestätigen", actionKey: `task_approve:${taskId}:${stepId}` },
          { label: "✗ Ablehnen",   actionKey: `task_reject:${taskId}` },
        ],
      });
      return;
    }

    const task  = await createActionTask(user.id, taskType, payload, explanation, text, sessionId.current);
    const icon  = taskTypeIcon(taskType);
    const label = taskTypeLabel(taskType);

    if (!task) {
      const routeMap: Record<string, string> = {
        create_invoice: "/rechnungen", create_appointment: "/kalender",
        set_reminder: "/kalender", add_expense: "/buchhaltung", set_price_group: "/kunden",
      };
      addMsg({ role: "ai", text: `${icon} ${label}`, ts: Date.now(), actions: [{ label: "Öffnen", route: routeMap[taskType] ?? "/management" }] });
      return;
    }

    const stepId = task.steps[0]?.id ?? "";
    // Zweiter realer Task-Erzeugungspfad (Keyword-Fallback statt Claude-
    // Tool-Use) -- dieselbe Sichtbarmachung wie oben, sonst bleibt die
    // Experience für diese Fälle stumm, obwohl die echte Bestätigung im
    // Chat bereits existiert.
    setActiveConfirmation({ taskId: task.id, stepId, taskType, description: explanation });
    addMsg({
      role: "ai",
      text: `${icon} ${label}\n\n${explanation}`,
      ts: Date.now(),
      actions: [
        { label: "✓ Bestätigen", actionKey: `task_approve:${task.id}:${stepId}` },
        { label: "✗ Ablehnen",   actionKey: `task_reject:${task.id}` },
      ],
    });
  }

  async function handleNavigationOutcome(outcome: ActionOutcome, fromVoice = false) {
    if (outcome.kind === "ok") {
      const a = outcome.action;
      // Short action chip in chat — no user bubble, no essay.
      addMsg({ role: "ai", text: a.spokenConfirmation, ts: Date.now() });
      toast.success(a.chipLabel);
      // Speak immediately — button click / mic tap = user gesture, audio is allowed.
      if (ttsSupported && (fromVoice || ulget(user?.id ?? "", USER_STORAGE_KEYS.VOICE_GREETING) === "1")) {
        setIsVoiceSpeaking(true);
        hufiSpeak(a.spokenConfirmation, () => setIsVoiceSpeaking(false), fromVoice);
      }
      navigate(a.route);
      return;
    }
    if (outcome.kind === "clarify") {
      addMsg({
        role: "ai",
        text: outcome.message,
        ts: Date.now(),
        actions: outcome.options.map((o) => ({
          label: o.name,
          route: role === "employee" ? `/employee/pferd/${o.id}` : `/pferd/${o.id}`,
        })),
      });
      if (fromVoice && ttsSupported) {
        setIsVoiceSpeaking(true);
        hufiSpeak(outcome.spoken, () => setIsVoiceSpeaking(false));
      }
      return;
    }
    // Fallback — toast is lighter than a chat bubble for errors.
    toast.error(outcome.message);
    if (fromVoice && ttsSupported) {
      setIsVoiceSpeaking(true);
      hufiSpeak(outcome.spoken, () => setIsVoiceSpeaking(false));
    }
  }

  async function processChatMessage(text: string, voiceMode = false) {
    const cleaned = stripWakeWord(text);
    if (!cleaned) return;
    triggerWake();
    if (useExperiencePreview) setMomentHint(detectMomentHint(cleaned));

    // Voice-Loop: Stop-Phrase erkennen
    const STOP_PHRASES = /\b(stop|stopp|danke|tschüss|beenden|aufhören|genug|schluss)\b/i;
    if (voiceLoopRef.current && STOP_PHRASES.test(cleaned)) {
      stopVoiceLoop();
      return;
    }

    // ── Fach-Guard: MUSS vor jeder anderen Vorprüfung laufen ───────────────────
    // (Skill-Match, TASK_TEMPLATES, detectIntent/agent_action) — sonst kann ein
    // clientseitiger Kurzschluss (z.B. TASK_TEMPLATES-Trigger /abrechnen/i für
    // "Muss ich mit Umsatzsteuer abrechnen?") eine echte Aktion auslösen, bevor
    // der Server-Guard die Nachricht je sieht. Siehe hufi-fach-guard.ts.
    // Ausnahme: ein echter Notfall (checkHorseWelfare severity "emergency", z.B.
    // "blutet stark") hat Vorrang vor dem Guard-Verweistext — dafür gibt es
    // weiter unten die dringlichere 🚨-Notfall-Antwort mit Tierarzt-Finder.
    const guardCategory = checkFachGuard(cleaned);
    const isRealEmergency = checkHorseWelfare(cleaned)?.severity === "emergency";
    if (guardCategory && !isRealEmergency) {
      addMsg({ role: "user", text: cleaned, ts: Date.now() });
      addMsg({
        role: "ai",
        text: FACH_GUARD_RESPONSES[guardCategory],
        ts: Date.now() + 1,
        disclaimerCategory: guardCategory,
      });
      return;
    }

    // Skill-Match: bekannte Muster direkt als Task starten
    if (user?.id) {
      try {
        const skill = await matchSkills(cleaned, user.id);
        if (skill && !skill.ask_first && skill.confidence > 0.7) {
          const task = await detectAndCreateTask(skill.name, user.id, hufiCtx ?? {});
          if (task) {
            addMsg({ role: "user", text: cleaned, ts: Date.now() });
            const taskTs = Date.now() + 1;
            setMessages((prev) => [...prev, { role: "ai", text: `⚙️ ${task.title} wird vorbereitet…`, ts: taskTs, hufiTask: task }]);
            setActiveHufiTask(task);
            const { task: updatedSkillTask } = await executeNextStep(task, user.id, (_step, progressMsg) => {
              setMessages((prev) => prev.map((m) => m.ts === taskTs ? { ...m, text: progressMsg } : m));
            });
            setMessages((prev) => prev.map((m) => m.ts === taskTs ? { ...m, hufiTask: updatedSkillTask ?? task } : m));
            setActiveHufiTask(updatedSkillTask);
            if (updatedSkillTask?.result_summary && voiceLoopRef.current) void hufiSpeak(updatedSkillTask.result_summary + ". Noch etwas?");
            return;
          }
        }
      } catch { /* non-blocking */ }
    }

    // Task-Detection: Trigger-Phrasen prüfen
    if (user?.id) {
      try {
        const task = await detectAndCreateTask(cleaned, user.id, hufiCtx ?? {});
        if (task) {
          addMsg({ role: "user", text: cleaned, ts: Date.now() });
          const taskTs = Date.now() + 1;
          setMessages((prev) => [...prev, { role: "ai", text: `⚙️ ${task.title}`, ts: taskTs, hufiTask: task }]);
          setActiveHufiTask(task);
          const { task: updatedTask } = await executeNextStep(task, user.id, (_step, progressMsg) => {
            setMessages((prev) => prev.map((m) => m.ts === taskTs ? { ...m, text: progressMsg } : m));
          });
          setMessages((prev) => prev.map((m) => m.ts === taskTs ? { ...m, hufiTask: updatedTask ?? task } : m));
          setActiveHufiTask(updatedTask);
          if (updatedTask?.result_summary && voiceLoopRef.current) void hufiSpeak(updatedTask.result_summary + ". Noch etwas?");
          return;
        }
      } catch { /* non-blocking */ }
    }

    // "Vergiss das" im Chat
    if (isForgetCommand(cleaned) && user?.id) {
      addMsg({ role: "user", text: cleaned, ts: Date.now() });
      const deleted = await deleteLastLearnedMemory(user.id);
      addMsg({
        role: "ai",
        text: deleted ? `✅ Gelöscht: _${deleted}_` : "Ich habe nichts Löschbares gefunden.",
        ts: Date.now() + 1,
      });
      return;
    }

    // Routine-Befehle → Management / Routinen-Tab
    if (isRoutineCommand(cleaned)) {
      addMsg({ role: "user", text: cleaned, ts: Date.now() });
      addMsg({
        role: "ai",
        text: "Ich öffne deine Routinen-Verwaltung — dort kannst du neue anlegen, bearbeiten oder deaktivieren.",
        ts: Date.now() + 1,
        actions: [{ label: "Routinen öffnen", route: "/management?tab=routines" }],
      });
      return;
    }

    // ── Datum/Uhrzeit lokal beantworten ─────────────────────────────────────────
    {
      const lc = cleaned.toLowerCase();
      const isDateQ = /\b(datum|welcher tag|welches datum|was für ein tag|heute|wochentag)\b/.test(lc) &&
        /\b(ist|haben wir|ist heute|ist es)\b/.test(lc);
      const isTimeQ = /\b(uhrzeit|wie spät|wie viel uhr|welche uhrzeit|wieviel uhr)\b/.test(lc);
      if (isDateQ || isTimeQ) {
        const now = new Date();
        const DE_DAYS = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
        const DE_MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
        const DE_MONTHS_GEN = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
        const num2spoken = (n: number): string => {
          const ones = ["","erste","zweite","dritte","vierte","fünfte","sechste","siebte","achte","neunte","zehnte","elfte","zwölfte","dreizehnte","vierzehnte","fünfzehnte","sechzehnte","siebzehnte","achtzehnte","neunzehnte","zwanzigste","einundzwanzigste","zweiundzwanzigste","dreiundzwanzigste","vierundzwanzigste","fünfundzwanzigste","sechsundzwanzigste","siebenundzwanzigste","achtundzwanzigste","neunundzwanzigste","dreißigste","einunddreißigste"];
          return ones[n] ?? `${n}.`;
        };
        const day = DE_DAYS[now.getDay()];
        const monthName = DE_MONTHS[now.getMonth()];
        const monthGen = DE_MONTHS_GEN[now.getMonth()];
        const d = now.getDate();
        const y = now.getFullYear();
        const h = now.getHours().toString().padStart(2,"0");
        const m2 = now.getMinutes().toString().padStart(2,"0");
        addMsg({ role: "user", text: cleaned, ts: Date.now() });
        const spokenYear = (yr: number): string => {
          const ONES = ["","ein","zwei","drei","vier","fünf","sechs","sieben","acht","neun","zehn","elf","zwölf","dreizehn","vierzehn","fünfzehn","sechzehn","siebzehn","achtzehn","neunzehn"];
          const TENS = ["","","zwanzig","dreißig","vierzig","fünfzig","sechzig","siebzig","achtzig","neunzig"];
          if (yr < 100) return ONES[yr] ?? `${yr}`;
          const rest = yr - 2000;
          if (rest <= 0 || rest >= 100) return `${yr}`;
          if (rest < 20) return `zweitausend${ONES[rest]}`;
          const t = Math.floor(rest / 10); const o = rest % 10;
          return `zweitausend${o > 0 ? `${ONES[o]}und` : ""}${TENS[t]}`;
        };
        if (isTimeQ) {
          addMsg({ role: "ai", text: `Es ist ${h}:${m2} Uhr.`, ts: Date.now() + 1 });
          if (voiceMode && ttsSupported) {
            const spokenH = h === "01" ? "ein" : h.replace(/^0/,"");
            const spokenM = m2 === "00" ? "Uhr" : `Uhr ${m2.replace(/^0/,"")}`;
            void hufiSpeak(`Es ist ${spokenH} ${spokenM}.`);
          }
        } else {
          addMsg({ role: "ai", text: `Heute ist ${day}, ${d}. ${monthName} ${y}.`, ts: Date.now() + 1 });
          if (voiceMode && ttsSupported) {
            void hufiSpeak(`Heute ist ${day}, der ${num2spoken(d)} ${monthGen} ${spokenYear(y)}.`);
          }
        }
        return;
      }
    }

    // ── Kontext-Zählungen lokal beantworten ─────────────────────────────────────
    {
      const lc = cleaned.toLowerCase();
      const isCountQ = /\b(wie viele?|wieviele?|anzahl)\b/.test(lc);
      if (isCountQ && hufiCtx) {
        const isPferde = /\b(pferde?|pferd)\b/.test(lc);
        const isKunden = /\b(kunden?|kunde)\b/.test(lc);
        const isTermine = /\b(termine?|termin)\b/.test(lc);
        addMsg({ role: "user", text: cleaned, ts: Date.now() });
        if (isTermine) {
          const n = hufiCtx.todayAppointments?.length ?? 0;
          addMsg({ role: "ai", text: n === 0 ? "Heute stehen keine Termine an." : `Du hast heute ${n} ${n === 1 ? "Termin" : "Termine"}.`, ts: Date.now() + 1 });
          return;
        }
        if (isPferde || isKunden) {
          addMsg({ role: "ai", text: "Öffne kurz die Kunden- oder Pferdeliste — dort siehst du die aktuelle Anzahl.", ts: Date.now() + 1, actions: isPferde ? [{ label: "Pferde öffnen", route: "/pferde" }] : [{ label: "Kunden öffnen", route: "/kunden" }] });
          return;
        }
      }
    }

    addMsg({ role: "user", text: cleaned, ts: Date.now() });
    const intent = detectIntent(cleaned, !!user, hufiCtx?.memory ?? []);

    // "correction" (z.B. "Nein, ich meinte X") wird bewusst NICHT mehr hier
    // mit einer statischen Rückfrage abgefangen (das war eine Sackgasse ohne
    // Bezug zum Gesprächsfokus, siehe AGENT_ANALYSE.md Etappe 3) -- läuft
    // stattdessen unten durch die normale Pipeline, die den erhaltenen
    // conversationFocus mitschickt und die Korrektur darauf beziehen kann.

    // ── Scenario Quick-Match (lokal, kein AI-Call) ──────────────────────────────
    if (user?.id) {
      const roleForScenario = role ?? null;
      const scenarioMatch = matchScenario(cleaned, roleForScenario, {
        appointmentCount: hufiCtx?.todayAppointments.length,
        unpaidCount: hufiCtx?.unpaidInvoices,
      });
      if (scenarioMatch) {
        addMsg({
          role: "ai",
          text: scenarioMatch.text,
          ts: Date.now() + 1,
          ...(scenarioMatch.actions ? { actions: scenarioMatch.actions } : {}),
        });
        if (voiceMode && scenarioMatch.spoken) {
          hufiSpeak(scenarioMatch.spoken);
        }
        setResponding(false);
        setHufiPresenceState("bereit");
        setActiveIntent(null);
        return;
      }
    }

    setActiveIntent(intent.intent);
    setResponding(true);
    setHufiPresenceState(intent.intent === "navigation" ? "führt aus" : "denkt");
    // Echte, zeitbasierte Lebenszeichen statt Schweigen während hufi-agent
    // antwortet (P0 Abschnitt 5) -- keine erfundenen Fortschrittsschritte.
    const waitTimer2s = window.setTimeout(() => setWaitHint("Ich schaue nach."), 2000);
    const waitTimer5s = window.setTimeout(() => setWaitHint("Ich brauche gerade einen Moment länger."), 5000);
    try {
      if (intent.intent === "emergency") {
        const welfare = checkHorseWelfare(cleaned);
        if (welfare) {
          addMsg({ role: "ai", text: welfare.message, ts: Date.now() + 1, actions: [{ label: `🚨 ${welfare.callToAction}`, route: "/tierarzt-finder" }] });
          if (user?.id) logWelfareAlert(user.id, welfare, text);
        } else {
          addMsg({
            role: "ai",
            text: "⚠️ Das klingt ernst. Ruf sofort deinen Tierarzt an!\n\nIn deinen Einstellungen findest du gespeicherte Notfallkontakte.",
            ts: Date.now() + 1,
            actions: [{ label: "📞 Notfallkontakte", route: "/management" }],
          });
        }
        return;
      }
      if (intent.requiresAuth && !user?.id) {
        addMsg({
          role: "ai",
          text: "Dafür muss ich deine Pferdeakte kennen.\nMelde dich an oder registriere dich kostenlos.",
          ts: Date.now() + 1,
          actions: [{ label: "Anmelden", route: "/auth" }, { label: "Registrieren", route: "/auth?tab=register" }],
        });
        return;
      }
      // ── Navigation intent: bypass AI entirely, route instantly ──────────────
      if (intent.intent === "navigation" && intent.entities.navTarget && user?.id) {
        const outcome = await runNavAction(intent.entities.navTarget, {
          userId: user.id,
          role: role as import("@/lib/hufi-nav-actions").ActionRole,
        });
        await handleNavigationOutcome(outcome);
        return;
      }
      // Wetterfragen immer lokal (Open-Meteo, kein AI-Key nötig)
      if (intent.intent === "knowledge" && intent.entities.topic === "weather_query") {
        try {
          await answerWithWeather(cleaned, voiceMode);
        } catch {
          addMsg({ role: "ai", text: "Wetterdaten sind gerade nicht verfügbar.", ts: Date.now() });
        }
        return;
      }
      // Nicht-angemeldete User: lokale Ollama-Pipeline für allgemeine Fragen
      if (!user?.id) {
        await answerFromKnowledge(cleaned);
        return;
      }
      // ── Kommunikations-Entwurf lokal (kein AI-Call nötig) ──────────────────────
      if (user?.id) {
        const commIntent = detectCommunicationIntent(cleaned);
        if (commIntent) {
          const nameMatch = cleaned.match(/(?:an|für|zu|schreib|schreibe|erinner|informier)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)/);
          const targetName = nameMatch?.[1];
          if (targetName) {
            const { data: contacts } = await supabase
              .from("contacts")
              .select("name, phone, email")
              .eq("user_id", user.id)
              .ilike("name", `%${targetName}%`)
              .limit(1);
            const contact = contacts?.[0];
            if (contact && (contact.phone || contact.email)) {
              const template = generateAppointmentReminder({
                clientName: contact.name,
                horseName: "deinem Pferd",
                date: "beim nächsten Termin",
                senderName: hufiCtx?.user.name ?? undefined,
              });
              const draft = (commIntent === "email" || commIntent === "both") && contact.email
                ? buildEmailDraft({ email: contact.email, name: contact.name, subject: "Terminbestätigung", body: template })
                : buildWhatsAppDraft({ phone: contact.phone ?? "", name: contact.name, text: template });
              setPendingDraft(draft);
              addMsg({ role: "ai", text: `Ich habe einen Entwurf für ${contact.name} vorbereitet.`, ts: Date.now() + 1 });
              setResponding(false);
              setHufiPresenceState("bereit");
              setActiveIntent(null);
              return;
            }
          }
        }
      }
      // ── Route lokal aus Kalender-Kontext ──────────────────────────────────────
      const isRouteQuery = /\b(route|tour|weg|fahrt|strecke|reihenfolge|optimier)\b/i.test(cleaned);
      if (isRouteQuery && hufiCtx?.todayAppointments && hufiCtx.todayAppointments.length > 0) {
        const stops = hufiCtx.todayAppointments.map((a) => ({
          name: a.horse_name ?? "Pferd",
          time: a.time ?? undefined,
          clientName: a.client_name ?? undefined,
        }));
        setPendingRoute(stops);
        addMsg({ role: "ai", text: `Hier ist deine Tagesroute mit ${stops.length} ${stops.length === 1 ? "Stop" : "Stops"}:`, ts: Date.now() + 1 });
        setResponding(false);
        setHufiPresenceState("bereit");
        setActiveIntent(null);
        return;
      }
      // Agent Action → Task-Bestätigungs-UI (eigene Pipeline mit Approve/Reject)
      if (intent.intent === "agent_action") {
        await planAndConfirmAction(cleaned, intent.entities);
        return;
      }
      // Alle anderen Fälle (knowledge, weather, agent_lookup, fallback) → zentrale Pipeline
      const agentHistory = messages
        .slice(-6)
        .map((m) => ({
          role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.text,
        }));
      const lat_ = ulget(user?.id ?? "", USER_STORAGE_KEYS.USER_LAT);
      const lon_ = ulget(user?.id ?? "", USER_STORAGE_KEYS.USER_LON);
      const resp = await askHufiAgent({
        text: cleaned,
        voiceMode,
        history: agentHistory,
        route: window.location.pathname,
        clientTimestamp: new Date().toISOString(),
        clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        clientLocation: lat_ && lon_ ? { lat: parseFloat(lat_), lon: parseFloat(lon_) } : undefined,
        conversationFocus: conversationFocusRef.current,
      });
      if (resp.conversationFocus) setConversationFocus(resp.conversationFocus);
      // Mutierendes Tool wollte ausführen -> NICHT automatisch, echte
      // Bestätigung anfordern (dieselbe UI/Queue wie agent_action, siehe
      // AGENT_ANALYSE.md Etappe 1, Sicherheits-Check).
      if (resp.pendingConfirmation) {
        const { taskId, stepId, taskType, description } = resp.pendingConfirmation;
        const icon  = taskTypeIcon(taskType as AgentTaskType);
        const label = taskTypeLabel(taskType as AgentTaskType);
        setActiveConfirmation(resp.pendingConfirmation);
        addMsg({
          role: "ai",
          text: `${icon} ${label}\n\n${description}`,
          ts: Date.now() + 1,
          actions: [
            { label: "✓ Bestätigen", actionKey: `task_approve:${taskId}:${stepId}` },
            { label: "✗ Ablehnen",   actionKey: `task_reject:${taskId}` },
          ],
        });
        return;
      }
      setLastAnswerText(resp.answer);
      if (useExperiencePreview && resp.answer) {
        setAnswerVisible(true);
        window.setTimeout(() => setAnswerVisible(false), 9000);
        // Nur für Text-Eingaben von hier aus sprechen -- bei voiceMode=true
        // übernimmt der bestehende Voice-Loop-Pfad weiter unten (nach
        // processChatMessage) das Sprechen inkl. Follow-up-Scheduling. Ohne
        // dieses !voiceMode wären das zwei echte hufi-tts-Aufrufe für
        // dieselbe Antwort (P0 Abschnitt 8: "genau ein TTS-Aufruf pro
        // Antwort").
        if (!voiceMode) {
          // Text bleibt in jedem Fall sichtbar (answerVisible bleibt gesetzt) --
          // TTS-Fehler zeigen nur einen zusätzlichen, nicht-blockierenden
          // Hinweis, keine Ersatzstimme (P0 TTS-Fix Abschnitt 2/7).
          void hufiSpeak(resp.answer, undefined, false, () => {
            toast.info("Meine Sprachausgabe ist gerade nicht verfügbar.");
          });
        }
      }
      addMsg({ role: "ai", text: resp.answer, ts: Date.now() + 1, disclaimerCategory: resp.disclaimerCategory });
      learnFromInteraction(user.id, cleaned, resp.answer, "confirmed", sessionId.current);
      void observeInteraction(cleaned, resp.answer, user.id);
    } catch (err) {
      const agentError = err instanceof HufiAgentClientError ? err : null;
      console.error(`[Hufi] processChatMessage Fehler kind=${agentError?.kind ?? "unknown"} status=${agentError?.status ?? "none"} code=${agentError?.errorCode ?? "none"}`);
      // Konkrete Fehlerkategorie statt pauschal "Keine Verbindung" (P0
      // Abschnitt 5) -- "billing"/"provider" für vom Backend klassifizierte
      // Anthropic-Fehler (Guthaben, Auth, Rate-Limit, Modell, Timeout), damit
      // ein erschöpftes KI-Guthaben nie als "Hufi-Agent nicht erreichbar"
      // erscheint. Reine Ableitung, testbar ohne echten API-Call (siehe
      // hufi-agent-error-messages.ts).
      const { category, text: userText } = classifyHufiAgentError(err, { voiceMode });
      addMsg({ role: "ai", text: userText, ts: Date.now() });
      if (useExperiencePreview) {
        setAgentError({ text: userText, category });
        window.setTimeout(() => setAgentError((c) => (c?.text === userText ? null : c)), 7000);
      }
    } finally {
      window.clearTimeout(waitTimer2s);
      window.clearTimeout(waitTimer5s);
      setWaitHint(null);
      setResponding(false);
      setActiveIntent(null);
      setHufiPresenceState("bereit");
    }
  }

  function handleKiConsent() {
    setKiConsent("granted");
    ulset(user?.id ?? "", USER_STORAGE_KEYS.KI_CONSENT, "granted");
    if (user?.id) {
      updateHufiMemory(user.id, "permission", "ki_consent", { granted: true, ts: new Date().toISOString() }, "manual");
    }
    setShowKiModal(false);
    const pending = pendingChatText;
    setPendingChatText("");
    if (pending) processChatMessage(pending);
  }

  function handleKiDecline() {
    setKiConsent("denied");
    ulset(user?.id ?? "", USER_STORAGE_KEYS.KI_CONSENT, "denied");
    if (user?.id) {
      updateHufiMemory(user.id, "permission", "ki_consent", { granted: false, ts: new Date().toISOString() }, "manual");
    }
    setShowKiModal(false);
    setPendingChatText("");
  }

  function handleImageUpload(file: File) {
    const url = URL.createObjectURL(file);
    const userMsg: ChatMessage = {
      role: "user",
      text: `📷 ${file.name}`,
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const aiMsg: ChatMessage = {
      role: "ai",
      text: `Ich sehe dein Bild "${file.name}". Bild-Analyse ist noch in Entwicklung — bald kann ich Huf-Fotos direkt auswerten! 🐴`,
      ts: Date.now() + 1,
    };
    setTimeout(() => setMessages((prev) => [...prev, aiMsg]), 600);
    URL.revokeObjectURL(url);
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || responding) return;

    const consent = ulget(user?.id ?? "", USER_STORAGE_KEYS.KI_CONSENT);
    if (!consent) {
      setPendingChatText(text);
      setInputText("");
      setShowKiModal(true);
      return;
    }
    if (consent === "denied") return;

    setInputText("");
    await processChatMessage(text);
  }

  const horse = nextAppt ? (Array.isArray(nextAppt.horses) ? nextAppt.horses[0] : nextAppt.horses) : null;
  const apptClient = nextAppt ? (Array.isArray(nextAppt.client) ? nextAppt.client[0] : nextAppt.client) : null;
  const isToday = nextAppt?.date === today;

  // Derive the orb state from the current voice/processing states
  const orbState: "idle" | "recording" | "transcribing" | "thinking" | "speaking" =
    recording ? "recording" :
    transcribing ? "transcribing" :
    (responding && activeIntent === "navigation") ? "thinking" :
    responding ? "thinking" :
    isVoiceSpeaking || isTtsSpeaking ? "speaking" :
    "idle";
  const dateLabel = nextAppt
    ? isToday ? "Heute" : format(new Date(nextAppt.date + "T00:00:00"), "EEE d. MMM", { locale: de })
    : null;
  const nextApptMinutesAway = nextAppt?.time && isToday
    ? Math.round((new Date(`${today}T${nextAppt.time}`).getTime() - Date.now()) / 60000)
    : null;

  // Produktionsstandard: HufiAssistantExperience ist die offizielle /home-
  // Oberfläche. VITE_HUFI_LEGACY_HOME bleibt als unsichtbarer, rein
  // build-seitiger Notfall-Rollback auf die alte MobileShell-Chrome erhalten
  // -- kein UI-Schalter, kein Query-Parameter, wird beim Build eingebrannt.
  const useExperiencePreview = import.meta.env.VITE_HUFI_LEGACY_HOME !== "true";

  // Dieselbe Prioritäts-Logik wie in HufiAssistantCockpit.tsx (nächster
  // Termin > offene Rechnungen > Anfragen > ruhiger Tag), hier separat
  // berechnet, da HufiAssistantExperience nur den fertigen Satz statt der
  // Einzelwerte braucht.
  const experienceInsight = (() => {
    const mins = nextApptMinutesAway;
    if (isToday && nextAppt && typeof mins === "number" && mins >= 0 && mins <= 180) {
      const when = mins < 1 ? "gleich" : mins < 60 ? `in ${mins} Min.` : `in ${Math.round(mins / 60)} Std.`;
      return `Dein nächster Termin beginnt ${when}.`;
    }
    const unpaid = hufiCtx?.unpaidInvoices ?? 0;
    if (unpaid > 0) return `${unpaid} ${unpaid === 1 ? "Rechnung braucht" : "Rechnungen brauchen"} Aufmerksamkeit.`;
    const leads = hufiCtx?.openLeads ?? 0;
    if (leads > 0) return `${leads} neue ${leads === 1 ? "Anfrage wartet" : "Anfragen warten"} auf dich.`;
    const today_ = hufiCtx?.todayAppointments.length ?? 0;
    if (today_ > 0) return `${today_} ${today_ === 1 ? "Termin" : "Termine"} heute.`;
    return "Ruhiger Tag — nichts Dringendes offen.";
  })();

  function handlePrepareDay() {
    const payload = proactiveBriefing ?? lastBriefingRef.current;
    if (payload) setProactiveBriefing(payload);
  }

  // Text-Eingabe der Experience nutzt denselben echten Handler wie die
  // bestehende Eingabezeile (processChatMessage) -- keine zweite
  // Agentenimplementierung, keine Doppel-Requests während eine Anfrage
  // bereits läuft.
  function experienceSubmitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || responding || transcribing || recording) return;
    void processChatMessage(trimmed);
  }

  // Preview-Modus übernimmt die komplette sichtbare Fläche -- keine alte
  // MobileShell-Chrome (Header/BottomNav/Eingabedock/Mikrofonbutton/430px-
  // Karte) darunter. Auth/echte Daten/Voice/Bestätigungsflow kommen weiter
  // aus dieser Komponente, nur als Props/Callbacks.
  if (useExperiencePreview) {
    return (
      <>
        <HufiAssistantExperience
          ui={deriveHufiExperience({
            orbState,
            justWoke,
            liveTranscript: displayedTranscript ?? "",
            pendingClarification: conversationFocus.pendingClarification,
            answerVisible,
            lastAnswerText,
            isTtsSpeaking: isTtsSpeaking || isVoiceSpeaking,
            activeConfirmation,
            confirming,
            confirmationOutcome,
            micError: voiceUiError,
            agentError,
            momentHint,
            waitHint,
            taskIcon: (t) => taskTypeIcon(t as AgentTaskType),
            taskLabel: (t) => taskTypeLabel(t as AgentTaskType),
            onConfirm: () => void experienceConfirm(),
            onReject: () => void experienceReject(),
          })}
          userName={hufiCtx?.user.name ?? null}
          insight={experienceInsight}
          onWakeTap={recording ? stopRecording : startRecording}
          onInterrupt={experienceInterrupt}
          onSubmitText={experienceSubmitText}
          canSubmit={!responding && !transcribing && !recording}
        />
        {/* Isolierte, standardmäßig ausgeschaltete Wisch-Fläche (VITE_HUFI_SWIPE_WORKSPACE) --
            eigenes fixed-Overlay, rendert null wenn das Flag aus ist. Keine Route/Chrome-Änderung. */}
        <HufiSwipeWorkspacePreview />
      </>
    );
  }

  return (
    <>
      {/* First-Run-Consent-Gate hat Priorität vor allem anderen */}
      {showFirstRunConsent && (
        <HufiFirstRunConsent onComplete={handleFirstRunComplete} userId={user?.id ?? ""} />
      )}
      {!showFirstRunConsent && showDsgvoModal && (
        <DsgvoConsentModal onConsent={handleDsgvoConsent} />
      )}
      {!showFirstRunConsent && showKiModal && (
        <KiHinweisModal
          open={showKiModal}
          userId={user?.id}
          onConsent={handleKiConsent}
          onDecline={handleKiDecline}
        />
      )}
      {!showFirstRunConsent && showHufManagerWelcome && (
        <HufManagerWelcome
          userId={user?.id ?? ""}
          onContinue={() => {
            if (user?.id) {
              updateHufiMemory(user.id, "migration", "welcome_seen", { seen: true, ts: new Date().toISOString() }, "system");
              markOnboardingComplete(user.id);
            }
            setShowHufManagerWelcome(false);
          }}
        />
      )}
      {!showFirstRunConsent && showMigrationBanner && !showDsgvoModal && !showHufManagerWelcome && (
        <HufManagerMigrationBanner onStartTour={handleBannerStartTour} onSkip={handleBannerSkip} />
      )}
      {!showFirstRunConsent && showOnboardingTour && (
        <HufiOnboardingTour onComplete={handleTourComplete} />
      )}
      {!showFirstRunConsent && !showDsgvoModal && showOnboardingChat && (
        <div style={{ position: "fixed", inset: 0, zIndex: "var(--z-mode)", background: "#FFFFFF", overflowY: "auto" }}>
          <HufiOnboardingChat
            userId={user?.id ?? ""}
            onComplete={() => setShowOnboardingChat(false)}
          />
        </div>
      )}

      <div style={{
        background: "#FFFFFF",
        height: "100dvh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        maxWidth: 430,
        margin: "0 auto",
        position: "relative",
      }}>

        {/* TOP BAR — kompakt, safe-area-aware, kein horizontaler Overflow */}
        <div style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #F3F4F6",
          minHeight: 52,
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          paddingRight: 12,
          gap: 6,
          flexShrink: 0,
          paddingTop: "env(safe-area-inset-top, 0px)",
          overflow: "hidden",
          maxWidth: "100vw",
          boxSizing: "border-box",
        }}>
          {/* Menü — links, die am besten erreichbare Ecke für den seltenen Weg;
              der frühere Hufi-Knopf hier ist entfallen, weil der Mic-Knopf in
              der unteren Leiste die Aufnahme startet. */}
          <HufiMenu />

          {/* Logo + Titel + Presence-State — reine Anzeige, kein Knopf mehr */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, overflow: "hidden",
              textAlign: "left",
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 9, background: "#F97316",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 5,
              boxShadow: hufiPresenceState === "bereit" && SR_SUPPORTED
                ? "0 0 0 0 rgba(249,115,22,0.4)"
                : "none",
              animation: hufiPresenceState === "bereit" && SR_SUPPORTED
                ? "hufi-idle-pulse 3s ease-in-out infinite"
                : "none",
            }}>
              <img src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png" alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
            </div>
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A1A", lineHeight: 1 }}>Hufi</div>
              {/* Runtime Presence Chip */}
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: ".04em",
                textTransform: "uppercase" as const,
                color: hufiPresenceState === "bereit" ? "#9CA3AF" : "#F97316",
                display: "flex", alignItems: "center", gap: 3, marginTop: 1,
                minWidth: 0,
              }}>
                {(hufiPresenceState === "hört zu" || hufiPresenceState === "transkribiert" || hufiPresenceState === "denkt" || hufiPresenceState === "führt aus" || hufiPresenceState === "spricht") && (
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: "currentColor",
                    animation: "pulse-rec 1s ease-out infinite",
                    flexShrink: 0,
                  }} />
                )}
                {/* Auf schmalen Displays wurde dieser Text hart abgeschnitten
                    ("TIPPEN ZUM SPRI…" ohne Auslassungspunkte) -- jetzt mit
                    echtem Ellipsis statt Pixel-Crop. */}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                  {pendingSpokenGreeting
                    ? <span style={{ color: "#F97316", animation: "pulse-rec 1.5s ease-out infinite" }}>
                        <SubtitleText long="tippen zum hören" short="zum hören" />
                      </span>
                    : hufiPresenceState === "bereit"
                    ? <span style={{ color: "#9CA3AF" }}>
                        {/* "hey hufi" nur versprechen, wenn das Wake-Word wirklich
                            scharf ist — sonst wartet der Nutzer auf etwas, das
                            nicht zuhört. */}
                        {SR_SUPPORTED && isWakeWordEnabled()
                          ? <SubtitleText long="tippen oder hey hufi" short="oder hey hufi" />
                          : <SubtitleText long="tippen zum sprechen" short="zum sprechen" />}
                      </span>
                    : hufiPresenceState}
                </span>
              </div>
            </div>
          </div>

          {/* Wetter und Guthaben bleiben, aber leiser als der Name.
              flexShrink:0, damit auf schmalen Displays der Titel/Untertitel
              schrumpft (mit Ellipsis) statt dieser kleinen Icons. */}
          <div style={{ flexShrink: 0 }}>
            <HufiWeatherWidget compact={true} />
          </div>

          {/* Hey Hufi — hinter Feature-Flag (Mikrofon-Kollision, siehe HUFI_TODO.md)
              UND an die Nutzer-Zustimmung aus den Einstellungen gebunden. Eigene
              Error-Boundary mit leerem Fallback: HeyHufi rendert ohnehin nichts
              sichtbares (return null) — ein Absturz hier darf nie den ganzen
              Screen runterreißen, sondern verschwindet einfach lautlos. */}
          {isWakeWordEnabled() && SR_SUPPORTED && user && (
            <ErrorBoundary name="HeyHufi" fallback={null}>
              <HeyHufi
                // Consent (USER_STORAGE_KEYS.HEY_HUFI) wird NICHT mehr hier geprüft —
                // das ist jetzt strukturell im useMicArbiter (canAcquire) verankert,
                // ein Ort statt zweier konkurrierender Wahrheiten. `enabled` hier
                // drückt nur noch aus, ob HeyHufi gerade lauschen SOLLTE (Busy-States).
                enabled={!recording && !transcribing && !responding && !isTtsSpeaking && !isVoiceSpeaking}
                isSpeaking={isTtsSpeaking || isVoiceSpeaking}
                onWakeWord={activateHufi}
              />
            </ErrorBoundary>
          )}

          {user && (
            <div style={{ flexShrink: 0 }}>
              <HufiVoiceCreditBadge onClick={() => navigate("/management/guthaben")} />
            </div>
          )}

          <div style={{ flexShrink: 0 }}>
            <NotificationBell className="text-gray-500 hover:text-gray-800 hover:bg-gray-100" />
          </div>

        </div>

        {/* SCROLL AREA */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            padding: "20px 16px",
            // Eingabezeile (~64px) + der zentrale Bottom-Obstruction-Wert
            // (Leiste inkl. Mic-Überstand, siehe --hufi-bottom-obstruction-h
            // in index.css) -- dieselbe Quelle wie .pb-bottom-nav auf den
            // Unterseiten, damit sich beide Werte nie wieder auseinanderlaufen.
            paddingBottom: "calc(64px + var(--hufi-bottom-obstruction-h) + env(safe-area-inset-bottom, 0px))",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            position: "relative",
            transform: "translateZ(0)",
            willChange: "transform",
            contain: "layout" as import("react").CSSProperties["contain"],
          }}
        >
          {/* Watermark */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            opacity: 0.04,
            pointerEvents: "none",
            zIndex: 0,
          }}>
            <img
              src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png"
              style={{ width: 200, height: 200, objectFit: "contain" }}
              alt=""
            />
          </div>
          {/* Cockpit ersetzt die alte "Bereit."-Karte, solange noch kein Chat läuft --
              Termin + Tageskontext liegen hier zusammengeführt in einem Block statt
              als separates Banner + vier Standardbuttons. */}
          {messages.length === 0 && !searching && !responding && !transcribing ? (
            <HufiAssistantCockpit
              state={orbState}
              userName={hufiCtx?.user.name ?? null}
              nextAppointment={nextAppt ? {
                horseName: (horse as { name?: string } | null)?.name ?? null,
                clientName: (apptClient as { full_name?: string } | null)?.full_name ?? null,
                dateLabel,
                time: nextAppt.time,
                isToday,
                minutesAway: nextApptMinutesAway,
              } : null}
              todayAppointments={hufiCtx?.todayAppointments.length ?? 0}
              unpaidInvoices={hufiCtx?.unpaidInvoices ?? 0}
              openLeads={hufiCtx?.openLeads ?? 0}
              canPrepareDay={!!(proactiveBriefing ?? lastBriefingRef.current)}
              onPrepareDay={handlePrepareDay}
              onNavigate={navigate}
            />
          ) : (
            /* Next appointment — schmale Zeile, kein großer Block (UI-Aufräumen, 17.07.2026) */
            nextAppt && horse && (
              <button
                onClick={() => navigate("/kalender")}
                className="msg-in"
                style={{
                  background: "rgba(249,115,22,0.06)",
                  border: "1px solid rgba(249,115,22,0.15)",
                  borderRadius: 12,
                  padding: "7px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 13, flexShrink: 0 }}>🐴</span>
                <span style={{ fontSize: 12, color: "#1A1A1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700 }}>{(horse as { name?: string }).name}</span>
                  {" · "}{dateLabel}{nextAppt.time ? `, ${nextAppt.time.slice(0, 5)} Uhr` : ""}
                </span>
                {isToday && (
                  <span style={{
                    background: "#F97316", color: "#FFFFFF", borderRadius: 20,
                    padding: "2px 8px", fontSize: 9, fontWeight: 700,
                    letterSpacing: ".06em", textTransform: "uppercase" as const, flexShrink: 0,
                  }}>
                    Heute
                  </span>
                )}
              </button>
            )
          )}

          <MobileShellMessages
            messages={messages}
            searching={searching}
            transcribing={transcribing}
            responding={responding}
            activeIntent={activeIntent}
            onMsgAction={handleMsgAction}
            onDismissPrompt={(ts) => setMessages((prev) => prev.map((m) => m.ts === ts ? { ...m, actionPrompt: false } : m))}
            onTaskConfirm={async (taskId, stepId) => {
              if (!user?.id) return;
              const updated = await confirmStep(taskId, stepId, user.id);
              if (updated) {
                setMessages((prev) => prev.map((m) => m.hufiTask?.id === taskId ? { ...m, hufiTask: updated } : m));
                setActiveHufiTask(updated);
                if (updated.result_summary && voiceLoopRef.current) void hufiSpeak(updated.result_summary + ". Noch etwas?");
              }
            }}
            onTaskCancel={async (taskId) => {
              if (!user?.id) return;
              await cancelTask(taskId, user.id);
              setMessages((prev) => prev.map((m) =>
                m.hufiTask?.id === taskId
                  ? { ...m, hufiTask: m.hufiTask ? { ...m.hufiTask, status: "cancelled" as const } : undefined }
                  : m
              ));
              setActiveHufiTask(null);
            }}
          />
        </div>

        <MobileShellVoiceSection
          recording={recording}
          transcribing={transcribing}
          isVoiceSpeaking={isVoiceSpeaking}
          responding={responding}
          handsFree={handsFree}
          onMicPress={recording ? stopRecording : startRecording}
          onStop={stopRecording}
          onCancel={cancelRecording}
        />

        <MobileShellInputBar
          inputText={inputText}
          onInputChange={setInputText}
          responding={responding}
          kiConsent={kiConsent}
          onRevokeConsent={() => { ulremove(user?.id ?? "", USER_STORAGE_KEYS.KI_CONSENT); setKiConsent(null); setShowKiModal(true); }}
          onSend={handleSend}
          onImageUpload={handleImageUpload}
        />

        <MobileBottomNav />
      </div>

      {/* Communication Draft */}
      {pendingDraft && (
        <div style={{ position: "fixed", bottom: 80, left: 0, right: 0, zIndex: "var(--z-fab)", padding: "0 12px" }}>
          <DraftMessageCard draft={pendingDraft} onDismiss={() => setPendingDraft(null)} />
        </div>
      )}

      {/* Day Route Card */}
      {pendingRoute && (
        <div style={{ position: "fixed", bottom: 80, left: 0, right: 0, zIndex: "var(--z-fab)", padding: "0 12px" }}>
          <DayRouteCard stops={pendingRoute} onDismiss={() => setPendingRoute(null)} />
        </div>
      )}

      {/* Phase E: Proactive Briefing overlay */}
      {proactiveBriefing && (
        <ProactiveBriefing
          payload={proactiveBriefing}
          onDismiss={() => setProactiveBriefing(null)}
        />
      )}
    </>
  );
}
