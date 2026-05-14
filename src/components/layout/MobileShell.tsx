import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Grid3X3, Volume2 } from "lucide-react";
import { MobileShellVoiceSection, MobileShellInputBar, MobileShellMessages, type ChatAction, type ChatMessage } from "./MobileShellParts";
import { toast } from "sonner";
import { MobileBottomNav } from "./MobileBottomNav";
import { useViewMode } from "@/hooks/useViewMode";
import { useHufiTTS } from "@/hooks/useHufiTTS";
import { useVoiceCapture, type VoiceErrorCode } from "@/hooks/useVoiceCapture";
import { streamWithHufAI, ChatMessage as AIChatMessage } from "@/lib/ai-routing";
import { askHufiAgent } from "@/lib/hufi-agent-client";
import { } from "@/lib/hufi-tool-definitions";
import {
  fetchBusinessContext, type BusinessContext,
} from "@/lib/hufi-business-context";
import { buildShortSpokenGreeting, type HufiPresenceLabel } from "@/lib/hufi-runtime";
import { extractBefundFromTranscript, formatBefundForChat } from "@/lib/autoflow-service";
import { detectIntent, type HufiIntent } from "@/lib/hufi-intent";
import { runNavAction, type ActionOutcome, type ActionRole } from "@/lib/hufi-nav-actions";
import {
  createAgentTask, approveAndExecuteTask, rejectTask,
  intentActionToTaskType, taskTypeLabel, taskTypeIcon,
  type AgentTask,
} from "@/lib/hufi-agent-tasks";
import { HeyHufi } from "@/components/voice/HeyHufi";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { DsgvoConsentModal } from "@/components/DsgvoConsentModal";
import { KiHinweisModal } from "@/components/KiHinweisModal";
import { HufManagerMigrationBanner } from "@/components/migration/HufManagerMigrationBanner";
import { HufiOnboardingTour } from "@/components/migration/HufiOnboardingTour";
import { updateHufiMemory, deleteLastLearnedMemory } from "@/lib/hufi-brain";
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
import {
  shouldShowBriefing,
  fetchWeatherContext,
  buildBriefingPayload,
  type BriefingPayload,
  type WeatherContext,
} from "@/lib/hufai-proactive";

export function MobileShell() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { mode: viewMode, setMode: setViewMode, isPrivat } = useViewMode();
  const [inputText, setInputText] = useState("");
  const [responding, setResponding] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showDsgvoModal, setShowDsgvoModal] = useState(false);
  const [showFirstRunConsent, setShowFirstRunConsent] = useState(false);
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  // Runtime presence: persistent Hufi state label
  const [hufiPresenceState, setHufiPresenceState] = useState<HufiPresenceLabel>("bereit");
  const [hufiCtx, setHufiCtx] = useState<HufiContext | null>(null);
  const [proactiveBriefing, setProactiveBriefing] = useState<BriefingPayload | null>(null);
  const [searching, setSearching] = useState(false);
  const [activeIntent, setActiveIntent] = useState<HufiIntent | null>(null);
  const [showKiModal, setShowKiModal] = useState(false);
  const [pendingChatText, setPendingChatText] = useState("");
  const [kiConsent, setKiConsent] = useState<"granted" | "denied" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionId = useRef<string>(crypto.randomUUID());
  const greetingSetRef = useRef(false);
  const bizCtxRef = useRef<BusinessContext | null>(null);
  const shownAlertsRef = useRef<Set<string>>(new Set());
  const migrationCheckedRef = useRef(false);
  const followUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followUpRoundRef = useRef(0); // max follow-up rounds per wake session
  const [hasGreeting, setHasGreeting] = useState(false); // triggers re-render when greeting ready
  const today = format(new Date(), "yyyy-MM-dd");

  // Hufi Voice — Phase 1: spoken greeting + Phase 2: push-to-talk voice loop.
  const { speak: hufiSpeak, isSupported: ttsSupported, isSpeaking: isTtsSpeaking } = useHufiTTS(user?.id ?? "");
  const [pendingSpokenGreeting, setPendingSpokenGreeting] = useState<string | null>(null);
  const lastGreetingTextRef = useRef<string>("");
  const voice = useVoiceCapture();
  // When recording is started via the mic button we collect every AI text added
  // during that turn and speak them after the response completes.
  const voiceSessionRef = useRef<{ active: boolean; texts: string[] } | null>(null);
  // State-based flag so the "Hufi spricht…" banner actually re-renders.
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);

  // Phase D: Hey Hufi wake-word opt-in state.
  const SR_SUPPORTED = typeof window !== "undefined" &&
    !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
  const [heyHufiEnabled, setHeyHufiEnabled] = useState(false);

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
    setHeyHufiEnabled(SR_SUPPORTED && ulget(user.id, USER_STORAGE_KEYS.HEY_HUFI) === "1");
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── First-run consent gate (overrides legacy DSGVO modal for new users) ────
  useEffect(() => {
    if (!user?.id) return;
    if (!hasCompletedFirstRun(user.id)) {
      setShowFirstRunConsent(true);
      return;
    }
    // Returning user: check DSGVO via DB as before
    checkDsgvoConsent(user.id).then((consented) => {
      if (!consented) setShowDsgvoModal(true);
      else bootGreeting(user.id, true);
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Migration banner check (existing users only, shown once) ─────────────
  useEffect(() => {
    if (!user?.id || migrationCheckedRef.current) return;
    migrationCheckedRef.current = true;

    // Only show for accounts older than 1 day
    const createdAt = new Date(user.created_at);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (createdAt >= oneDayAgo) return;

    supabase
      .from("hufi_memory")
      .select("key")
      .eq("user_id", user.id)
      .eq("category", "migration")
      .eq("key", "banner_seen")
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setShowMigrationBanner(true);
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
        if (SR_SUPPORTED && !voice.isRecording && !voice.isProcessing) {
          setTimeout(() => {
            voiceSessionRef.current = { active: true, texts: [] };
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

  async function bootGreeting(userId: string, consented: boolean) {
    if (greetingSetRef.current) return;
    greetingSetRef.current = true;
    if (!consented) return; // DSGVO modal is shown separately

    try {
      const [ctx] = await Promise.all([
        fetchHufiContext(userId, role ?? null),
        fetchBusinessContext(userId)
          .then((biz) => { bizCtxRef.current = biz; })
          .catch(() => {}),
      ]);
      if (!ctx.user.name && user?.email) {
        const raw = user.email.split("@")[0].split(/[._+]/)[0];
        ctx.user.name = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      }
      setHufiCtx(ctx);

      if (shouldShowBriefing()) {
        fetchWeatherContext().then((weather) => {
          setProactiveBriefing(buildBriefingPayload(ctx, weather, bizCtxRef.current));
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

  async function startRecording() {
    setHufiPresenceState("hört zu");
    voiceSessionRef.current = { active: true, texts: [] };
    const started = await voice.startRecording();
    if (!started) {
      voiceSessionRef.current = null;
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
    voice.stopRecording();
  }

  function cancelRecording() {
    if (followUpTimerRef.current) { clearTimeout(followUpTimerRef.current); followUpTimerRef.current = null; }
    voiceSessionRef.current = null;
    setHufiPresenceState("bereit");
    voice.cancel();
  }

  // VAD Auto-Stop: wenn recording von true → false wechselt (ohne manuellen Stop)
  const prevRecordingRef = useRef(false);
  useEffect(() => {
    if (prevRecordingRef.current && !voice.isRecording) {
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
    console.info(`[voice-capture] error: ${voice.error}`);
    if (voice.error === "empty_transcript") {
      void hufiSpeak(msg, undefined, true);
    } else {
      toast.error(msg);
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
          if (followUpRoundRef.current < 5 && !voice.isRecording && !voice.isProcessing && !responding) {
            followUpRoundRef.current++;
            voiceSessionRef.current = { active: true, texts: [] };
            voice.startRecording();
            setHufiPresenceState("hört zu");
          }
        }, 800);
      }, /* fastMode */ true);
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
    broadcast(complete);
    if (voiceSessionRef.current?.active && fullText) {
      voiceSessionRef.current.texts.push(fullText);
    }
    return fullText;
  }

  async function handleMsgAction(key: string, msg: ChatMessage) {
    // ── Agent Task: Bestätigen ────────────────────────────────────────────────
    if (key.startsWith("task_approve:") && user?.id) {
      const taskId = key.slice("task_approve:".length);
      setMessages((prev) => prev.map((m) =>
        m.ts === msg.ts ? { ...m, actions: undefined, text: m.text + "\n\n⏳ Wird ausgeführt…" } : m
      ));
      const fakeTask: AgentTask = {
        id: taskId,
        user_id: user.id,
        session_id: sessionId.current,
        type: "generic_action",
        status: "approved",
        payload: {},
        explanation: null,
        user_message: null,
        result: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        executed_at: null,
      };
      // Fetch real task to get type + payload
      const { data } = await supabase.from("agent_tasks").select("*").eq("id", taskId).maybeSingle();
      const realTask = (data as AgentTask | null) ?? fakeTask;
      let result: { success: boolean; message: string };
      try {
        result = await approveAndExecuteTask(realTask, user.id);
      } catch (err) {
        result = { success: false, message: (err as Error)?.message ?? "Fehler beim Ausführen." };
      }
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
    if (key.startsWith("task_reject:")) {
      const taskId = key.slice("task_reject:".length);
      await rejectTask(taskId);
      setMessages((prev) => prev.map((m) =>
        m.ts === msg.ts ? { ...m, actions: undefined, text: m.text + "\n\n✖ Abgebrochen." } : m
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

    let taskType  = defaultTaskType;
    let payload   = fallbackPayload;
    let explanation = fallbackExplanation;

    // KI-Plan über zentralen Agenten holen
    try {
      const agentHistory = messages.slice(-4).map((m) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.text,
      }));
      const resp = await askHufiAgent({
        text,
        voiceMode: false,
        history: agentHistory,
        route: window.location.pathname,
        mode: "action",
      });
      if (resp.actionPlan?.taskType) {
        taskType    = resp.actionPlan.taskType;
        payload     = resp.actionPlan.payload;
        explanation = resp.actionPlan.explanation;
      }
    } catch (e) {
      console.warn("[Hufi] Action-Plan Fallback auf Keywords:", e);
    }

    const task  = await createAgentTask(user.id, taskType, payload, explanation, text, sessionId.current);
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

    addMsg({
      role: "ai",
      text: `${icon} ${label}\n\n${explanation}`,
      ts: Date.now(),
      actions: [
        { label: "✓ Bestätigen", actionKey: `task_approve:${task.id}` },
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
    setActiveIntent(intent.intent);
    setResponding(true);
    setHufiPresenceState(intent.intent === "navigation" ? "führt aus" : "denkt");
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
      const resp = await askHufiAgent({
        text: cleaned,
        voiceMode,
        history: agentHistory,
        route: window.location.pathname,
        clientTimestamp: new Date().toISOString(),
      });
      addMsg({ role: "ai", text: resp.answer, ts: Date.now() + 1 });
      learnFromInteraction(user.id, cleaned, resp.answer, "confirmed", sessionId.current);
    } catch (err) {
      const e = err as Error;
      console.error("[Hufi] processChatMessage Fehler:", e?.message ?? e);
      let userText: string;
      if (e?.message?.includes("Kein KI-Guthaben")) {
        userText = voiceMode
          ? "Dein KI-Guthaben ist erschöpft."
          : "Dein KI-Guthaben ist aufgebraucht. Bitte lade es in den Einstellungen auf.";
      } else if (e?.message?.includes("Nicht angemeldet") || e?.message?.includes("401")) {
        userText = "Dafür musst du angemeldet sein.";
      } else if (e?.message?.includes("Ollama") || e?.message?.includes("fetch") || e?.message?.includes("nicht erreichbar")) {
        userText = voiceMode
          ? "Verbindung kurz unterbrochen. Bitte gleich nochmal."
          : "Verbindung fehlgeschlagen. Bitte erneut versuchen.";
      } else {
        userText = voiceMode
          ? "Ich konnte deine Anfrage nicht verarbeiten. Bitte erneut versuchen."
          : `Anfrage fehlgeschlagen. Bitte erneut versuchen.${import.meta.env.DEV ? ` (${e?.message})` : ""}`;
      }
      addMsg({ role: "ai", text: userText, ts: Date.now() });
    } finally {
      setResponding(false);
      setActiveIntent(null);
      setHufiPresenceState("bereit");
    }
  }

  function handleKiConsent() {
    setKiConsent("granted");
    ulset(user?.id ?? "", USER_STORAGE_KEYS.KI_CONSENT, "granted");
    setShowKiModal(false);
    const pending = pendingChatText;
    setPendingChatText("");
    if (pending) processChatMessage(pending);
  }

  function handleKiDecline() {
    setKiConsent("denied");
    ulset(user?.id ?? "", USER_STORAGE_KEYS.KI_CONSENT, "denied");
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
      {!showFirstRunConsent && showMigrationBanner && !showDsgvoModal && (
        <HufManagerMigrationBanner onStartTour={handleBannerStartTour} onSkip={handleBannerSkip} />
      )}
      {showOnboardingTour && (
        <HufiOnboardingTour onComplete={handleTourComplete} />
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
          {/* Grid-Menü → /management — ERSTES Element ganz links */}
          <button
            onClick={() => navigate("/management")}
            title="Menü"
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: "#F3F4F6", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <Grid3X3 size={15} style={{ color: "#374151" }} />
          </button>

          {/* Logo + Titel + Presence-State — tippbar zum Aktivieren */}
          <button
            onClick={activateHufi}
            title="Hufi aktivieren"
            style={{
              display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, overflow: "hidden",
              background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit",
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
                whiteSpace: "nowrap",
              }}>
                {(hufiPresenceState === "hört zu" || hufiPresenceState === "transkribiert" || hufiPresenceState === "denkt" || hufiPresenceState === "führt aus" || hufiPresenceState === "spricht") && (
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: "currentColor",
                    animation: "pulse-rec 1s ease-out infinite",
                  }} />
                )}
                {pendingSpokenGreeting
                  ? <span style={{ color: "#F97316", animation: "pulse-rec 1.5s ease-out infinite" }}>tippen zum hören</span>
                  : hufiPresenceState === "bereit" && SR_SUPPORTED
                  ? <span style={{ color: "#9CA3AF" }}>tippen oder hey hufi</span>
                  : hufiPresenceState}
              </div>
            </div>
          </button>

          {/* Kompakte Aktions-Chips rechts — nur das Wichtigste */}
          <HufiWeatherWidget compact={true} />

          {/* TTS-Replay — sichtbar wenn Greeting vorhanden (hasGreeting = state, nicht ref) */}
          {ttsSupported && hasGreeting && (
            <button
              type="button"
              onClick={replayGreeting}
              title="Begrüßung erneut sprechen"
              aria-label="Begrüßung erneut sprechen"
              style={{
                height: 28, borderRadius: 8,
                background: pendingSpokenGreeting ? "#F97316" : "rgba(249,115,22,0.1)",
                border: `1px solid ${pendingSpokenGreeting ? "#F97316" : "rgba(249,115,22,0.2)"}`,
                color: pendingSpokenGreeting ? "#FFFFFF" : "#F97316",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                flexShrink: 0,
                padding: pendingSpokenGreeting ? "0 8px" : "0 6px",
                fontSize: 10, fontWeight: 700,
              }}
            >
              <Volume2 size={12} />
              {pendingSpokenGreeting && <span>Hören</span>}
            </button>
          )}

          {/* Hey Hufi — immer aktiv wenn SR unterstützt */}
          {SR_SUPPORTED && user && (
            <HeyHufi
              enabled={!recording && !transcribing && !responding && !isTtsSpeaking && !isVoiceSpeaking}
              isSpeaking={isTtsSpeaking || isVoiceSpeaking}
              onWakeWord={activateHufi}
            />
          )}

          {/* Profi ↔ Privat — nur für Provider */}
          {role === "provider" && (
            <button
              onClick={() => {
                const next = isPrivat ? "pro" : "privat";
                setViewMode(next);
                navigate(next === "privat" ? "/client-home" : "/home");
              }}
              title={isPrivat ? "Zurück zum Profi-Modus" : "Privat-Modus (eigene Pferde)"}
              style={{
                height: 24, borderRadius: 20, flexShrink: 0,
                background: isPrivat ? "rgba(139,92,246,0.12)" : "rgba(249,115,22,0.1)",
                border: `1px solid ${isPrivat ? "rgba(139,92,246,0.35)" : "rgba(249,115,22,0.25)"}`,
                color: isPrivat ? "#8B5CF6" : "#F97316",
                padding: "0 7px", fontSize: 8, fontWeight: 700,
                letterSpacing: ".05em", textTransform: "uppercase" as const,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 3,
              }}
            >
              {isPrivat ? "Privat" : "Profi"}
            </button>
          )}

          <NotificationBell className="text-gray-500 hover:text-gray-800 hover:bg-gray-100" />

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
            paddingBottom: "calc(200px + env(safe-area-inset-bottom, 0px))",
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
          {/* Next appointment card */}
          {nextAppt && horse && (
            <button
              onClick={() => navigate("/kalender")}
              className="msg-in"
              style={{
                background: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)",
                border: "1px solid rgba(249,115,22,0.15)",
                borderRadius: 18,
                boxShadow: "0 2px 12px rgba(249,115,22,0.08)",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F3F4F6", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, overflow: "hidden", flexShrink: 0 }}>
                {(horse as { photo_url?: string }).photo_url
                  ? <img src={(horse as { photo_url: string }).photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : "🐴"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "#F97316", marginBottom: 3 }}>
                  Nächster Termin
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {(horse as { name?: string }).name}
                  {(nextAppt.client as { full_name?: string } | null)?.full_name
                    ? ` · ${(nextAppt.client as { full_name: string }).full_name}` : ""}
                </div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>
                  {dateLabel}{nextAppt.time ? ` · ${nextAppt.time.slice(0, 5)} Uhr` : ""}
                </div>
              </div>
              <div style={{
                background: isToday ? "#F97316" : "#F3F4F6",
                color: isToday ? "#FFFFFF" : "#6B7280",
                borderRadius: 20,
                padding: "3px 9px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: ".06em",
                textTransform: "uppercase" as const,
                flexShrink: 0,
              }}>
                {isToday ? "Heute" : "Nächster"}
              </div>
            </button>
          )}

          <MobileShellMessages
            messages={messages}
            searching={searching}
            transcribing={transcribing}
            responding={responding}
            activeIntent={activeIntent}
            onMsgAction={handleMsgAction}
            onDismissPrompt={(ts) => setMessages((prev) => prev.map((m) => m.ts === ts ? { ...m, actionPrompt: false } : m))}
            showIdleCard={messages.length === 0}
            pendingGreeting={!!pendingSpokenGreeting}
          />
        </div>

        <MobileShellVoiceSection
          recording={recording}
          transcribing={transcribing}
          isVoiceSpeaking={isVoiceSpeaking}
          responding={responding}
          onMicPress={recording ? stopRecording : startRecording}
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
