import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWakeLock } from "@/hooks/useWakeLock";
import { cn } from "@/lib/utils";
import { detectNavigationTarget } from "@/lib/hufi-intent";
import { runNavAction } from "@/lib/hufi-nav-actions";
import type { ActionRole } from "@/lib/hufi-nav-actions";

/* ── Types ── */
type Phase =
  | "off"       // feature disabled
  | "ready"     // listening for wake word
  | "triggered" // "Hufi" detected — capturing command
  | "thinking"  // request in flight
  | "speaking"; // TTS playing

interface HeyHufiProps {
  /** First name of the user for greeting */
  userName: string;
  /** How many appointments today (for morning greeting) */
  appointmentCount: number;
  /** Start in "ready" (listening) state immediately after mount. */
  defaultEnabled?: boolean;
  /** Fired whenever the user toggles Hey Hufi on/off. */
  onToggle?: (enabled: boolean) => void;
  /** User id — needed for horse resolution */
  userId?: string;
  /** User role — for role-aware routing */
  userRole?: ActionRole;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const GREET_KEY = "hufi_greeted_date";

/* ── TTS helper ── */
function speak(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "de-DE";
  utt.rate = 1.05;
  utt.volume = 1;
  // Prefer a German voice if available
  const voices = window.speechSynthesis.getVoices();
  const de = voices.find((v) => v.lang.startsWith("de"));
  if (de) utt.voice = de;
  utt.onend = () => onEnd?.();
  window.speechSynthesis.speak(utt);
}

/* ── AI helper (streaming → first full response) ── */
async function askAI(text: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Nicht angemeldet");

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
  });

  if (!resp.ok || !resp.body) throw new Error("AI nicht erreichbar");

  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let answer = "";

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).replace(/\r$/, "");
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") break outer;
      try {
        const ev = JSON.parse(json);
        answer += ev.choices?.[0]?.delta?.content ?? "";
      } catch { /* skip */ }
    }
  }
  return answer.trim();
}

/* ── SpeechRecognition factory ── */
const SR = typeof window !== "undefined"
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  : null;

export function HeyHufi({
  userName,
  appointmentCount,
  defaultEnabled = false,
  onToggle,
  userId,
  userRole,
}: HeyHufiProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("off");
  const [lastText, setLastText] = useState("");
  const recRef = useRef<SpeechRecognition | null>(null);
  const runningRef = useRef(false);
  const commandBuf = useRef("");
  const commandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wake-Lock: keep screen on while listening
  useWakeLock(phase !== "off");

  /* ── Morning greeting (once per day) ── */
  useEffect(() => {
    if (phase !== "ready") return;
    const today = new Date().toDateString();
    if (localStorage.getItem(GREET_KEY) === today) return;
    localStorage.setItem(GREET_KEY, today);

    const first = userName.split(" ")[0] || userName;
    const msg =
      appointmentCount > 0
        ? `Hey ${first}! Guten Morgen. Du hast heute ${appointmentCount} ${appointmentCount === 1 ? "Termin" : "Termine"}. Sag einfach Hufi wenn du etwas brauchst.`
        : `Hey ${first}! Guten Morgen. Heute sind noch keine Termine geplant. Sag Hufi wenn du etwas brauchst.`;

    setPhase("speaking");
    speak(msg, () => setPhase("ready"));
  }, [phase, userName, appointmentCount]);

  /* ── Recognition control ── */
  const stopRecognition = useCallback(() => {
    runningRef.current = false;
    recRef.current?.stop();
    recRef.current = null;
    if (commandTimerRef.current) clearTimeout(commandTimerRef.current);
  }, []);

  const processCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim()) return;
    setLastText(cmd.trim());
    setPhase("thinking");

    // Navigation intent? Resolve immediately — no AI roundtrip needed.
    const navTarget = detectNavigationTarget(cmd);
    if (navTarget && userId) {
      try {
        const outcome = await runNavAction(navTarget, { userId, role: userRole ?? null });
        if (outcome.kind === "ok") {
          setPhase("speaking");
          speak(outcome.action.spokenConfirmation, () => setPhase("ready"));
          navigate(outcome.action.route);
          return;
        }
        if (outcome.kind === "clarify") {
          setPhase("speaking");
          speak(outcome.spoken, () => setPhase("ready"));
          return;
        }
        setPhase("speaking");
        speak(outcome.spoken, () => setPhase("ready"));
        return;
      } catch {
        // fall through to AI
      }
    }

    speak("Einen Moment..."); // immediate audio ACK
    try {
      const answer = await askAI(cmd.trim());
      setLastText(answer);
      setPhase("speaking");
      speak(answer, () => setPhase("ready"));
    } catch {
      setPhase("speaking");
      speak("Entschuldige, da ist etwas schiefgelaufen. Bitte versuch es nochmal.", () =>
        setPhase("ready")
      );
    }
  }, [userId, userRole, navigate]);

  const startRecognition = useCallback(() => {
    if (!SR) return;
    const rec: SpeechRecognition = new SR();
    rec.lang = "de-DE";
    rec.continuous = true;
    rec.interimResults = true;
    recRef.current = rec;

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      const transcript = Array.from(ev.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .toLowerCase()
        .trim();

      // Accepted wake phrases: "hufi", "hey hufi", "okay hufi", "ok hufi"
      const WAKE_RE = /\b(hey\s+hufi|okay\s+hufi|ok\s+hufi|hufi)\b/;
      const wakeMatch = transcript.match(WAKE_RE);
      if (!wakeMatch) return;

      // Extract command: everything after the wake phrase
      const wakePhrase = wakeMatch[0];
      const afterWake = transcript.slice(transcript.indexOf(wakePhrase) + wakePhrase.length).trim();

      if (phase === "ready" || phase === "speaking") {
        setPhase("triggered");
        speak("Ja?");
        commandBuf.current = afterWake;

        if (commandTimerRef.current) clearTimeout(commandTimerRef.current);
        commandTimerRef.current = setTimeout(() => {
          const cmd = commandBuf.current;
          commandBuf.current = "";
          if (cmd.trim()) {
            processCommand(cmd);
          } else {
            speak("Was kann ich für dich tun?");
            setPhase("ready");
          }
        }, 4000);
      } else if (phase === "triggered") {
        commandBuf.current = afterWake;
      }
    };

    rec.onend = () => {
      if (runningRef.current) {
        setTimeout(() => {
          try { rec.start(); } catch { /* tab not focused */ }
        }, 300);
      }
    };

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      if (ev.error === "not-allowed") {
        setPhase("off");
        return;
      }
      if (runningRef.current) {
        setTimeout(() => {
          try { rec.start(); } catch { }
        }, 1000);
      }
    };

    runningRef.current = true;
    try { rec.start(); } catch { }
  }, [phase, processCommand]);

  const enable = useCallback(() => {
    if (!SR) return;
    setPhase("ready");
    startRecognition();
    onToggle?.(true);
  }, [startRecognition, onToggle]);

  const disable = useCallback(() => {
    stopRecognition();
    window.speechSynthesis?.cancel();
    setPhase("off");
    setLastText("");
    onToggle?.(false);
  }, [stopRecognition, onToggle]);

  // Auto-enable on mount when defaultEnabled is set (user has opted in).
  useEffect(() => {
    if (defaultEnabled && SR) {
      setPhase("ready");
      runningRef.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restart recognition when phase transitions back to ready
  useEffect(() => {
    if (phase === "ready" && !recRef.current && runningRef.current) {
      startRecognition();
    }
  }, [phase, startRecognition]);

  // PWA-Resume: wenn die App aus dem Hintergrund kommt (Homescreen-Kachel), Recognition neu starten
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && runningRef.current) {
        // Kurze Pause damit der Browser das Mikrofon freigeben kann
        setTimeout(() => {
          if (recRef.current) return; // läuft schon
          setPhase("ready");
          startRecognition();
        }, 600);
      } else if (document.visibilityState === "hidden") {
        // Recognition pausieren wenn App in Hintergrund geht (spart Akku)
        recRef.current?.stop();
        recRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [startRecognition]);

  useEffect(() => {
    return () => { stopRecognition(); window.speechSynthesis?.cancel(); };
  }, [stopRecognition]);

  /* ── UI ── */
  const isOff = phase === "off";

  return (
    <div className="flex items-center gap-2">
      {/* Status chip — only when active */}
      {!isOff && (
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
            phase === "ready" && "bg-emerald-500/15 text-emerald-400",
            phase === "triggered" && "bg-amber-500/20 text-amber-300 animate-pulse",
            phase === "thinking" && "bg-blue-500/20 text-blue-300",
            phase === "speaking" && "bg-purple-500/20 text-purple-300"
          )}
        >
          {phase === "ready" && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Hufi hört
            </>
          )}
          {phase === "triggered" && (
            <>
              <Volume2 className="h-3 w-3" />
              Ich höre...
            </>
          )}
          {phase === "thinking" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Denke...
            </>
          )}
          {phase === "speaking" && (
            <>
              <Volume2 className="h-3 w-3 animate-bounce" />
              {lastText.length > 40 ? lastText.slice(0, 40) + "…" : lastText}
            </>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={isOff ? enable : disable}
        title={isOff ? "Hey Hufi aktivieren" : "Hey Hufi deaktivieren"}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center transition-all",
          isOff
            ? "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80"
            : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
        )}
      >
        {isOff ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
