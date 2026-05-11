import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Mic, Send, Loader2, Coins, Grid3X3, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { MobileBottomNav } from "./MobileBottomNav";
import { useViewMode } from "@/hooks/useViewMode";
import { useHufiTTS } from "@/hooks/useHufiTTS";
import { useVoiceCapture, type VoiceErrorCode } from "@/hooks/useVoiceCapture";
import { chatWithHufAI, BEFUND_SYSTEM_PROMPT, ChatMessage as AIChatMessage } from "@/lib/ai-routing";
import { extractBefundFromTranscript, formatBefundForChat } from "@/lib/autoflow-service";
import { detectIntent, type HufiIntent } from "@/lib/hufi-intent";
import { runNavAction, type ActionOutcome, type ActionRole } from "@/lib/hufi-nav-actions";
import { HeyHufi } from "@/components/voice/HeyHufi";
import { fetchRelevantContext } from "@/lib/hufi-context-resolver";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { DsgvoConsentModal } from "@/components/DsgvoConsentModal";
import { KiHinweisModal } from "@/components/KiHinweisModal";
import { HufManagerMigrationBanner } from "@/components/migration/HufManagerMigrationBanner";
import { HufiOnboardingTour } from "@/components/migration/HufiOnboardingTour";
import { updateHufiMemory } from "@/lib/hufi-brain";
import { HufiSearchCard } from "@/components/HufiSearchCard";
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
  generateHufiGreeting,
  buildContextActions,
  getRoleIntelligence,
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
} from "@/lib/hufai-proactive";

interface ChatAction {
  label: string;
  route?: string;
  actionKey?: string;
}

interface ChatMessage {
  role: "user" | "ai";
  text: string;
  ts: number;
  actionPrompt?: boolean;
  actions?: ChatAction[];
  searchResults?: HufiSearchResult[];
  searchSuggestions?: SearchSuggestion[];
  senderId?: string;
}

export function MobileShell() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { mode: viewMode, setMode: setViewMode, isPrivat } = useViewMode();
  const [inputText, setInputText] = useState("");
  const [responding, setResponding] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showDsgvoModal, setShowDsgvoModal] = useState(false);
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [hufiCtx, setHufiCtx] = useState<HufiContext | null>(null);
  const [proactiveBriefing, setProactiveBriefing] = useState<BriefingPayload | null>(null);
  const [searching, setSearching] = useState(false);
  const [activeIntent, setActiveIntent] = useState<HufiIntent | null>(null);
  const [showKiModal, setShowKiModal] = useState(false);
  const [pendingChatText, setPendingChatText] = useState("");
  const [kiConsent, setKiConsent] = useState<"granted" | "denied" | null>(
    () => localStorage.getItem("hufi_ki_consent") as "granted" | "denied" | null,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionId = useRef<string>(crypto.randomUUID());
  const greetingSetRef = useRef(false);
  const shownAlertsRef = useRef<Set<string>>(new Set());
  const migrationCheckedRef = useRef(false);
  const today = format(new Date(), "yyyy-MM-dd");

  // Hufi Voice — Phase 1: spoken greeting + Phase 2: push-to-talk voice loop.
  const { speak: hufiSpeak, isSupported: ttsSupported, isSpeaking: isTtsSpeaking } = useHufiTTS();
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
  const [heyHufiEnabled, setHeyHufiEnabled] = useState(
    () => SR_SUPPORTED && localStorage.getItem("hufi_hey_hufi_enabled") === "1"
  );

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

  // ── DSGVO check on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
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
    // Always remember the latest greeting so the replay button can re-speak it.
    lastGreetingTextRef.current = greeting;

    if (typeof window === "undefined") return;
    if (!ttsSupported) {
      logVoiceSkip("unsupported", "queue");
      return;
    }
    if (!greeting.trim()) {
      logVoiceSkip("empty_text", "queue");
      return;
    }
    if (localStorage.getItem("hufi_voice_greeting_enabled") !== "1") {
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
      if (localStorage.getItem("hufi_voice_greeting_enabled") !== "1") {
        logVoiceSkip("disabled", "on_gesture");
        setPendingSpokenGreeting(null);
        return;
      }
      localStorage.setItem(spokenGreetingStorageKey(userId), "1");
      console.info("[hufi-voice] speaking greeting after gesture");
      hufiSpeak(text, () => setPendingSpokenGreeting(null));
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

    if (!consented) {
      const h = new Date().getHours();
      const g = h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
      setMessages([{
        role: "ai",
        text: `${g}! 👋 Für den vollen Hufi-Erlebnis bitte Datenschutz-Einwilligung erteilen.`,
        ts: Date.now(),
        actions: [{ label: "🔒 Datenschutz", route: "/einstellungen" }],
      }]);
      return;
    }

    try {
      const ctx = await fetchHufiContext(userId, role ?? null);
      // Fallback: use first part of email if no profile name is set
      if (!ctx.user.name && user?.email) {
        const raw = user.email.split("@")[0].split(/[._+]/)[0];
        ctx.user.name = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      }
      setHufiCtx(ctx);

      // Phase E: Proactive briefing — fires at most once every 4 h, only
      // after DSGVO consent. Weather fetch is fire-and-forget; a null result
      // just means the weather line is omitted.
      if (shouldShowBriefing()) {
        fetchWeatherContext().then((weather) => {
          setProactiveBriefing(buildBriefingPayload(ctx, weather));
        });
      }

      const greeting = await generateHufiGreeting(ctx);
      const actions = buildContextActions(ctx);
      const roleIntel = getRoleIntelligence(ctx);

      // Hufi Voice Phase 1 — queue greeting for spoken playback after the
      // first user gesture. Gated by user opt-in + once-per-day per user.
      queueSpokenGreetingIfEligible(userId, greeting);

      // Build initial message list: greeting + any high-urgency role messages
      const initialMessages: ChatMessage[] = [
        { role: "ai", text: greeting, ts: Date.now(), actions },
      ];
      for (const msg of roleIntel.proactiveMessages.filter((m) => m.urgency === "high").slice(0, 2)) {
        initialMessages.push({
          role: "ai",
          text: `${msg.text}\n\n_Warum: ${msg.reason}_`,
          ts: Date.now() + initialMessages.length,
          actions: msg.action ? [msg.action] : undefined,
        });
      }
      setMessages(initialMessages);
    } catch {
      const h = new Date().getHours();
      const g = h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
      setMessages([{ role: "ai", text: `${g}! 👋 Was kann ich heute für dich tun?`, ts: Date.now() }]);
    }
  }

  async function handleDsgvoConsent(granted: boolean) {
    setShowDsgvoModal(false);
    if (user?.id) await logDsgvoConsent(user.id, "proactive_assistant", granted);
    if (user?.id) bootGreeting(user.id, granted);
  }

  // ── Proactive alert interval (every 5 min) ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(async () => {
      const alerts = await checkProactiveAlerts(user.id);
      for (const alert of alerts) {
        if (!shownAlertsRef.current.has(alert)) {
          shownAlertsRef.current.add(alert);
          addMsg({ role: "ai", text: alert, ts: Date.now() });
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
  async function processTranscribedText(text: string) {
    if (!text) {
      addMsg({ role: "ai", text: "Ich konnte nichts verstehen. Bitte nochmals sprechen.", ts: Date.now() });
      return;
    }
    addMsg({ role: "user", text, ts: Date.now() });

    const voiceWelfare = checkHorseWelfare(text);
    if (voiceWelfare && user?.id) {
      addMsg({
        role: "ai",
        text: voiceWelfare.message,
        ts: Date.now() + 1,
        actions: [{ label: `🚨 ${voiceWelfare.callToAction}`, route: "/tierarzt-finder" }],
      });
      logWelfareAlert(user.id, voiceWelfare, text);
      return;
    }

    if (!user?.id) return;
    setResponding(true);
    try {
      const befund = await extractBefundFromTranscript(text, user.id);
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
        learnFromInteraction(user.id, text, befundText, "confirmed", sessionId.current);
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
        addMsg({ role: "ai", text: `Verstanden: „${text}". Ich habe das notiert.`, ts: Date.now() });
        learnFromInteraction(user.id, text, "Notiz", "confirmed", sessionId.current);
      }
    } catch {
      addMsg({ role: "ai", text: "Verarbeitung fehlgeschlagen. Bitte erneut versuchen.", ts: Date.now() });
    } finally {
      setResponding(false);
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
        return "Ich konnte nichts verstehen. Bitte nochmals sprechen.";
    }
  }

  async function startRecording() {
    voiceSessionRef.current = { active: true, texts: [] };
    const started = await voice.startRecording();
    if (!started) {
      voiceSessionRef.current = null;
    }
  }

  function stopRecording() {
    voice.stopRecording();
  }

  function cancelRecording() {
    voiceSessionRef.current = null;
    voice.cancel();
  }

  // Surface voice errors via toast — fail loud, never silent.
  useEffect(() => {
    if (!voice.error) return;
    const msg = voiceErrorMessage(voice.error);
    console.info(`[voice-capture] error: ${voice.error}`);
    toast.error(msg);
    voiceSessionRef.current = null;
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

    const intent = detectIntent(text, true, hufiCtx?.memory ?? []);

    if (intent.intent === "navigation" && intent.entities.navTarget) {
      voiceSessionRef.current = null;
      (async () => {
        const outcome = await runNavAction(intent.entities.navTarget!, {
          userId: user.id,
          role: role as import("@/lib/hufi-nav-actions").ActionRole,
        });
        handleNavigationOutcome(outcome, /* fromVoice */ true);
      })();
      return;
    }

    (async () => {
      await processTranscribedText(text);
      const session = voiceSessionRef.current;
      voiceSessionRef.current = null;
      if (!session?.active || !ttsSupported) return;
      const combined = session.texts.join(" ");
      if (!combined.trim()) return;
      setIsVoiceSpeaking(true);
      hufiSpeak(combined, () => setIsVoiceSpeaking(false));
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

  async function handleMsgAction(key: string, msg: ChatMessage) {
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
  const KNOWLEDGE_SYSTEM_PROMPT = `Du bist Hufi, ein KI-Assistent für die Pferdewelt. Beantworte allgemeine Wissensfragen zu Pferden, Hufen, Tierpflege und Veterinärmedizin.
Antworte sachlich, klar und auf Deutsch. Verwende Fachbegriffe mit kurzer Erklärung. Kein Zugriff auf persönliche Daten.`;

  async function answerFromKnowledge(text: string) {
    const history: AIChatMessage[] = [
      { role: "system", content: KNOWLEDGE_SYSTEM_PROMPT },
      ...messages.slice(-4).map((m) => ({ role: m.role === "user" ? "user" : "assistant" as const, content: m.text })),
      { role: "user", content: text },
    ];
    const reply = await chatWithHufAI(history, user?.id ?? "anonymous", "hufiai-fast");
    addMsg({ role: "ai", text: reply, ts: Date.now() });
  }

  async function answerWithContext(text: string, entities: ReturnType<typeof detectIntent>["entities"]) {
    const ctx = await fetchRelevantContext(entities, user!.id);
    const contextBlock = ctx.summary
      ? `AKTUELLE DATEN AUS DER PFERDEAKTE:\n${ctx.summary}\n\nBeantworte die Anfrage auf Basis dieser Daten.`
      : "Keine spezifischen Daten gefunden.";
    const history: AIChatMessage[] = [
      { role: "system", content: `${BEFUND_SYSTEM_PROMPT}\n\n${contextBlock}` },
      ...messages.slice(-4).map((m) => ({ role: m.role === "user" ? "user" : "assistant" as const, content: m.text })),
      { role: "user", content: text },
    ];
    const reply = await chatWithHufAI(history, user!.id);
    addMsg({ role: "ai", text: reply, ts: Date.now() });
    learnFromInteraction(user!.id, text, reply, "confirmed", sessionId.current);
  }

  async function planAndConfirmAction(text: string, entities: ReturnType<typeof detectIntent>["entities"]) {
    const horse = entities.horseName ? `für ${entities.horseName}` : "";
    const client = entities.clientName ? ` (${entities.clientName})` : "";
    if (entities.action === "create_invoice") {
      addMsg({
        role: "ai",
        text: `Ich erstelle folgendes:\n📄 Rechnung ${horse}${client}\n💰 Bitte Details im Rechnungsformular ergänzen.\n\nFortfahren?`,
        ts: Date.now(),
        actions: [
          { label: "Erstellen ✓", route: "/rechnungen" },
          { label: "Anpassen ✏️", route: "/rechnungen" },
          { label: "Abbrechen ✗", actionKey: "confirm_no" },
        ],
      });
    } else if (entities.action === "create_appointment") {
      addMsg({
        role: "ai",
        text: `Ich lege einen neuen Termin an${horse ? ` ${horse}` : ""}.\nZum Kalender um Details einzugeben?`,
        ts: Date.now(),
        actions: [
          { label: "Zum Kalender ✓", route: "/kalender" },
          { label: "Abbrechen ✗", actionKey: "confirm_no" },
        ],
      });
    } else if (entities.action === "set_reminder") {
      addMsg({
        role: "ai",
        text: `Erinnerung notiert${horse ? ` ${horse}` : ""}.\nDetaillierte Erinnerungen findest du im Kalender.`,
        ts: Date.now(),
        actions: [{ label: "Zum Kalender", route: "/kalender" }],
      });
    } else {
      // Generic: use AI
      const history: AIChatMessage[] = [
        { role: "system", content: BEFUND_SYSTEM_PROMPT },
        ...messages.slice(-4).map((m) => ({ role: m.role === "user" ? "user" : "assistant" as const, content: m.text })),
        { role: "user", content: text },
      ];
      const reply = await chatWithHufAI(history, user!.id);
      addMsg({ role: "ai", text: reply, ts: Date.now() });
      learnFromInteraction(user!.id, text, reply, "confirmed", sessionId.current);
    }
  }

  async function handleNavigationOutcome(outcome: ActionOutcome, fromVoice = false) {
    if (outcome.kind === "ok") {
      const a = outcome.action;
      // Short action chip in chat — no user bubble, no essay.
      addMsg({ role: "ai", text: a.spokenConfirmation, ts: Date.now() });
      toast.success(a.chipLabel);
      // Speak immediately — button click / mic tap = user gesture, audio is allowed.
      if (ttsSupported && (fromVoice || localStorage.getItem("hufi_voice_greeting_enabled") === "1")) {
        setIsVoiceSpeaking(true);
        hufiSpeak(a.spokenConfirmation, () => setIsVoiceSpeaking(false));
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

  async function processChatMessage(text: string) {
    addMsg({ role: "user", text, ts: Date.now() });
    const intent = detectIntent(text, !!user, hufiCtx?.memory ?? []);
    setActiveIntent(intent.intent);
    setResponding(true);
    try {
      if (intent.intent === "emergency") {
        const welfare = checkHorseWelfare(text);
        if (welfare) {
          addMsg({ role: "ai", text: welfare.message, ts: Date.now() + 1, actions: [{ label: `🚨 ${welfare.callToAction}`, route: "/tierarzt-finder" }] });
          if (user?.id) logWelfareAlert(user.id, welfare, text);
        } else {
          addMsg({
            role: "ai",
            text: "⚠️ Das klingt ernst. Ruf sofort deinen Tierarzt an!\n\nIn deinen Einstellungen findest du gespeicherte Notfallkontakte.",
            ts: Date.now() + 1,
            actions: [{ label: "📞 Notfallkontakte", route: "/einstellungen" }],
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
      if (intent.intent === "knowledge") { await answerFromKnowledge(text); return; }
      if (!user?.id) return;
      if (intent.intent === "agent_lookup") await answerWithContext(text, intent.entities);
      else if (intent.intent === "agent_action") await planAndConfirmAction(text, intent.entities);
      else await answerWithContext(text, intent.entities);
    } catch {
      addMsg({ role: "ai", text: "Verbindung fehlgeschlagen. Bitte erneut versuchen.", ts: Date.now() });
    } finally {
      setResponding(false);
      setActiveIntent(null);
    }
  }

  function handleKiConsent() {
    setKiConsent("granted");
    setShowKiModal(false);
    const pending = pendingChatText;
    setPendingChatText("");
    if (pending) processChatMessage(pending);
  }

  function handleKiDecline() {
    setKiConsent("denied");
    setShowKiModal(false);
    setPendingChatText("");
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || responding) return;

    const consent = localStorage.getItem("hufi_ki_consent");
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
  const dateLabel = nextAppt
    ? isToday ? "Heute" : format(new Date(nextAppt.date + "T00:00:00"), "EEE d. MMM", { locale: de })
    : null;

  return (
    <>
      <style>{`
        @keyframes wavebar { 0% { transform: scaleY(0.2); } 100% { transform: scaleY(1); } }
        .wave-bar { animation: wavebar 0.6s ease-in-out infinite alternate; }
        @keyframes pulse-rec { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,.5); } 100% { box-shadow: 0 0 0 12px rgba(239,68,68,0); } }
        .rec-pulse { animation: pulse-rec 1s ease-out infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .msg-in { animation: fadeUp 0.22s ease-out; }
      `}</style>

      {showDsgvoModal && <DsgvoConsentModal onConsent={handleDsgvoConsent} />}
      {showKiModal && (
        <KiHinweisModal
          open={showKiModal}
          userId={user?.id}
          onConsent={handleKiConsent}
          onDecline={handleKiDecline}
        />
      )}
      {showMigrationBanner && !showDsgvoModal && (
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

        {/* TOP BAR */}
        <div style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #F3F4F6",
          height: 56,
          display: "flex",
          alignItems: "center",
          paddingLeft: 16,
          paddingRight: 16,
          gap: 10,
          flexShrink: 0,
          paddingTop: "max(env(safe-area-inset-top), 0px)",
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 6 }}>
            <img src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png" alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1A1A1A", lineHeight: 1 }}>Hufi</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>Proaktiver KI-Assistent</div>
          </div>
          <HufiWeatherWidget compact={true} />
          {/* Replay spoken greeting — visible only when TTS is supported and a greeting exists */}
          {ttsSupported && lastGreetingTextRef.current && (
            <button
              type="button"
              onClick={replayGreeting}
              title="Begrüßung erneut sprechen"
              aria-label="Begrüßung erneut sprechen"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "rgba(249,115,22,0.1)",
                border: "1px solid rgba(249,115,22,0.25)",
                color: "#F97316",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Volume2 size={14} />
            </button>
          )}
          {/* Hey Hufi — Phase D: global wake-word, opt-in only, SR-gated */}
          {SR_SUPPORTED && heyHufiEnabled && user && (
            <HeyHufi
              userName={hufiCtx?.user?.name ?? user.email?.split("@")[0] ?? ""}
              appointmentCount={nextAppt ? 1 : 0}
              defaultEnabled={true}
              userId={user.id}
              userRole={role as ActionRole}
              onToggle={(enabled) => {
                if (!enabled) {
                  setHeyHufiEnabled(false);
                  localStorage.removeItem("hufi_hey_hufi_enabled");
                }
              }}
            />
          )}
          {/* Profi ↔ Privat mode toggle (providers only) */}
          {role === "provider" && (
            <button
              onClick={() => {
                const next = isPrivat ? "pro" : "privat";
                setViewMode(next);
                navigate(next === "privat" ? "/client-home" : "/home");
              }}
              title={isPrivat ? "Zurück zum Profi-Modus" : "Privat-Modus (eigene Pferde)"}
              style={{
                height: 26,
                borderRadius: 20,
                background: isPrivat ? "rgba(139,92,246,0.12)" : "rgba(249,115,22,0.1)",
                border: `1px solid ${isPrivat ? "rgba(139,92,246,0.35)" : "rgba(249,115,22,0.25)"}`,
                color: isPrivat ? "#8B5CF6" : "#F97316",
                padding: "0 9px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: ".05em",
                textTransform: "uppercase" as const,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {isPrivat ? "🐴 Privat" : "🔧 Profi"}
            </button>
          )}
          <NotificationBell />
          {creditBalance !== undefined && (
            <button
              onClick={() => navigate("/credits")}
              title="KI-Guthaben"
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: creditBalance === 0 ? "#FEF2F2" : creditBalance < 50 ? "#FFF7ED" : "#F0FDF4",
                border: `1px solid ${creditBalance === 0 ? "#FECACA" : creditBalance < 50 ? "#FED7AA" : "#BBF7D0"}`,
                borderRadius: 20, padding: "3px 8px", cursor: "pointer",
                fontSize: 11, fontWeight: 700,
                color: creditBalance === 0 ? "#EF4444" : creditBalance < 50 ? "#F97316" : "#10B981",
              }}
            >
              <Coins size={11} />
              {creditBalance === 0 ? "Aufladen" : creditBalance.toLocaleString("de-DE")}
            </button>
          )}
          <button
            onClick={() => navigate("/meine-zentrale")}
            title="Meine Zentrale"
            style={{
              background: "rgba(249,115,22,0.1)",
              color: "#F97316",
              border: "1px solid rgba(249,115,22,0.25)",
              borderRadius: 20,
              padding: "3px 8px",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: ".06em",
              textTransform: "uppercase" as const,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >PRO</button>
          <button
            onClick={() => navigate("/archiv")}
            title="Menü"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "#F3F4F6", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <Grid3X3 size={16} style={{ color: "#374151" }} />
          </button>
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
            padding: "16px",
            paddingBottom: 130,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            position: "relative",
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
                border: "1px solid rgba(249,115,22,0.18)",
                borderRadius: 16,
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

          {/* Chat messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className="msg-in"
              style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              {msg.role === "ai" && (
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 }}>
                  <img src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png" alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)", padding: "3px" }} />
                </div>
              )}
              <div style={{
                maxWidth: "78%",
                background: msg.role === "user" ? "#F97316" : "#F9FAFB",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "10px 14px",
                border: msg.role === "user" ? "none" : "1px solid #F0F0F0",
              }}>
                <div style={{ fontSize: 14, color: msg.role === "user" ? "#FFFFFF" : "#1A1A1A", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                  {msg.text}
                </div>

                {/* Action buttons (context, search, etc.) */}
                {msg.actions && msg.actions.length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {msg.actions.map((a, ai) => (
                      <button
                        key={a.route ?? a.actionKey ?? ai}
                        onClick={() => {
                          if (a.route) navigate(a.route);
                          else if (a.actionKey) handleMsgAction(a.actionKey, msg);
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

                {/* Search result cards */}
                {msg.searchResults && msg.searchResults.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {msg.searchResults.map((r, ri) => (
                      <HufiSearchCard key={ri} result={r} />
                    ))}
                  </div>
                )}

                {/* Befund follow-up actions */}
                {msg.actionPrompt && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { label: "📅 Termin in 6 Wochen anlegen", route: "/kalender" },
                      { label: "🧾 Rechnung erstellen",          route: "/rechnungen" },
                      { label: "💬 Besitzer benachrichtigen",    route: "/chat" },
                    ].map((a) => (
                      <button
                        key={a.route}
                        onClick={() => navigate(a.route)}
                        style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 10, padding: "8px 12px", color: "#F97316", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left" }}
                      >
                        {a.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setMessages((prev) => prev.map((m) => m.ts === msg.ts ? { ...m, actionPrompt: false } : m))}
                      style={{ background: "transparent", border: "1px solid #E5E7EB", borderRadius: 10, padding: "8px 12px", color: "#9CA3AF", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left" }}
                    >
                      ✖ Nichts weiteres
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Search indicator */}
          {searching && (
            <div className="msg-in" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png" alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)", padding: "3px" }} />
              </div>
              <div style={{ background: "#F9FAFB", border: "1px solid #F0F0F0", borderRadius: "18px 18px 18px 4px", padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <Loader2 size={13} style={{ color: "#9CA3AF", flexShrink: 0, animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 13, color: "#9CA3AF" }}>Hufi sucht…</span>
              </div>
            </div>
          )}

          {/* Thinking / intent indicator */}
          {(transcribing || responding) && (() => {
            const INTENT_META: Record<HufiIntent, { icon: string; label: string; color: string }> = {
              knowledge:       { icon: "📚", label: "Wissensdatenbank…", color: "#F59E0B" },
              agent_lookup:    { icon: "🐴", label: "Deine Pferdeakte…", color: "#3B82F6" },
              agent_action:    { icon: "⚡", label: "Führe aus…",         color: "#F97316" },
              agent_proactive: { icon: "🧠", label: "Analysiere…",        color: "#8B5CF6" },
              emergency:       { icon: "🚨", label: "Notfall erkannt!",   color: "#EF4444" },
            };
            const meta = activeIntent ? INTENT_META[activeIntent] : null;
            return (
              <div className="msg-in" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <img src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png" alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)", padding: "3px" }} />
                </div>
                <div style={{ background: "#F9FAFB", border: "1px solid #F0F0F0", borderRadius: "18px 18px 18px 4px", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 size={13} style={{ color: "#9CA3AF", flexShrink: 0, animation: "spin 1s linear infinite" }} />
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
                      {transcribing ? "Hufi transkribiert…" : "Hufi analysiert…"}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* VOICE STATUS BANNER — visible only when mic flow is active */}
        {(recording || transcribing || isVoiceSpeaking) && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "fixed",
              bottom: 138,
              left: "50%",
              transform: "translateX(-50%)",
              width: "calc(100% - 28px)",
              maxWidth: 402,
              background: recording ? "rgba(239,68,68,0.95)" : "rgba(17,24,39,0.92)",
              color: "#FFFFFF",
              padding: "10px 14px",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              zIndex: 41,
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            {recording ? (
              <>
                <div className="rec-pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFFFFF", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>Hufi hört zu… Tippe zum Beenden.</span>
                <button
                  onClick={cancelRecording}
                  aria-label="Abbrechen"
                  title="Abbrechen"
                  style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#FFFFFF", flexShrink: 0 }}
                >
                  <X size={14} />
                </button>
              </>
            ) : transcribing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Hufi transkribiert…</span>
              </>
            ) : (
              <>
                <Volume2 size={14} />
                <span>Hufi spricht…</span>
              </>
            )}
          </div>
        )}

        {/* BOTTOM INPUT */}
        <div style={{
          position: "fixed",
          bottom: 68,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          background: "#FFFFFF",
          borderTop: "1px solid #F3F4F6",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          zIndex: 40,
        }}>
          {kiConsent === "denied" ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, lineHeight: 1.5 }}>
                KI-Nutzung abgelehnt. Du kannst die App weiterhin ohne KI-Chat nutzen.
              </p>
              <button
                onClick={() => { localStorage.removeItem("hufi_ki_consent"); setKiConsent(null); setShowKiModal(true); }}
                style={{ height: 36, borderRadius: 10, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)", color: "#F97316", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Einwilligung erteilen
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Nachricht an Hufi…"
                style={{
                  flex: 1, height: 42, background: "#F9FAFB",
                  border: "1px solid #E5E7EB", borderRadius: 21,
                  paddingLeft: 16, paddingRight: 16, fontSize: 14,
                  color: "#1A1A1A", outline: "none", fontFamily: "inherit",
                }}
              />
              {inputText.trim() ? (
                <button
                  onClick={handleSend}
                  style={{ width: 56, height: 56, borderRadius: "50%", background: "#F97316", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, boxShadow: "0 2px 8px rgba(249,115,22,0.35)" }}
                  aria-label="Senden"
                >
                  <Send size={20} style={{ color: "#FFFFFF" }} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (recording) stopRecording();
                    else startRecording();
                  }}
                  disabled={transcribing || isTtsSpeaking}
                  className={recording ? "rec-pulse" : ""}
                  aria-label={recording ? "Aufnahme stoppen" : "Hufi fragen"}
                  title={recording ? "Aufnahme stoppen" : "Hufi fragen"}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: transcribing
                      ? "#6B7280"
                      : recording
                        ? "#EF4444"
                        : "#F97316",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: transcribing || isTtsSpeaking ? "wait" : "pointer",
                    flexShrink: 0,
                    boxShadow: recording
                      ? "0 0 0 6px rgba(239,68,68,0.18), 0 2px 12px rgba(239,68,68,0.45)"
                      : "0 2px 10px rgba(249,115,22,0.4)",
                    transition: "background .15s, box-shadow .15s",
                  }}
                >
                  {transcribing ? (
                    <Loader2 size={22} style={{ color: "#FFFFFF" }} className="animate-spin" />
                  ) : recording ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 22 }}>
                      {[0.1, 0.25, 0, 0.15, 0.3].map((d, i) => (
                        <div key={i} className="wave-bar" style={{ width: 3, height: "100%", borderRadius: 2, background: "#FFFFFF", transformOrigin: "bottom", animationDelay: `${d}s` }} />
                      ))}
                    </div>
                  ) : (
                    <Mic size={22} style={{ color: "#FFFFFF" }} />
                  )}
                </button>
              )}
            </>
          )}
        </div>

        <MobileBottomNav onTranscript={handleVoiceTranscript} />
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
