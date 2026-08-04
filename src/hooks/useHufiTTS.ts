import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSelectedVoiceId, getSelectedModel, HUFI_VOICES } from "@/lib/hufi-voice-config";
import { toast } from "sonner";

interface UseHufiTTS {
  // onError feuert genau dann, wenn der EINE gewählte Provider fehlschlägt --
  // es gibt danach keinen stillen Wechsel zu einem anderen Provider mehr
  // (P0: "ElevenLabs Premium oder keine Sprachausgabe"). Der Aufrufer zeigt
  // damit "Meine Sprachausgabe ist gerade nicht verfügbar." an, der Text
  // bleibt unabhängig davon sichtbar.
  speak: (text: string, onEnd?: () => void, fastMode?: boolean, onError?: () => void) => boolean;
  cancel: () => void;
  isSupported: boolean;
  isSpeaking: boolean;
  isCloudVoice: boolean;
}

// Nur zum Loggen -- volle Voice-ID gilt als sensibel genug, um sie nicht im
// Klartext in der Konsole stehen zu lassen (P0 Abschnitt 3).
function shortVoiceId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

// Deutsche Abkürzungen für TTS-Aussprache
const TTS_ABBREV: Array<[RegExp, string]> = [
  [/z\.B\./gi, "zum Beispiel"],
  [/d\.h\./gi, "das heißt"],
  [/usw\./gi, "und so weiter"],
  [/bzw\./gi, "beziehungsweise"],
  [/ca\./gi, "circa"],
  [/Nr\./gi, "Nummer"],
  [/Std\./gi, "Stunden"],
  [/Min\./gi, "Minuten"],
  [/Wo\./gi, "Wochen"],
  [/€/g, "Euro"],
  [/\bkm\b/g, "Kilometer"],
  [/\bMo\b/g, "Montag"],
  [/\bDi\b/g, "Dienstag"],
  [/\bMi\b/g, "Mittwoch"],
  [/\bDo\b/g, "Donnerstag"],
  [/\bFr\b/g, "Freitag"],
  [/\bSa\b/g, "Samstag"],
  [/\bSo\b/g, "Sonntag"],
  // Prozente
  [/(\d+)\s*%/g, "$1 Prozent"],
];

export function sanitizeForSpeech(input: string): string {
  if (!input) return "";
  let text = input
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")   // Links → Linktext
    .replace(/\p{Extended_Pictographic}/gu, "")  // Emojis raus
    .replace(/[︎️‍]/g, "")
    .replace(/[*_#>`~]/g, "")                    // Markdown
    .replace(/-{3,}/g, ".")                       // --- → Pause
    .replace(/\n{2,}/g, ". ")                     // Doppelzeilenumbrüche → Satzpause
    .replace(/\n/g, " ");                          // Einzelne Zeilenumbrüche → Leerzeichen

  // Uhrzeiten natürlicher aussprechen: "08:30" → "acht Uhr dreißig"
  text = text.replace(/\b(\d{1,2}):(\d{2})\b/g, (_full, h, m) => {
    const hNum = parseInt(h, 10);
    const mNum = parseInt(m, 10);
    if (mNum === 0) return `${hNum} Uhr`;
    if (mNum === 30) return `halb ${hNum + 1}`;
    if (mNum === 15) return `Viertel nach ${hNum}`;
    if (mNum === 45) return `Viertel vor ${hNum + 1}`;
    return `${hNum} Uhr ${mNum}`;
  });

  // Abkürzungen expandieren
  for (const [pattern, replacement] of TTS_ABBREV) {
    text = text.replace(pattern, replacement as string);
  }

  return text.replace(/\s+/g, " ").trim();
}

// Piper TTS: lokaler Server auf demselben VPS (via Nginx-Proxy)
const PIPER_TTS_URL = "/api/local-tts";

// EINMAL pro Sitzung (Entscheidung 30.07.2026, Text angepasst P0: kein
// stiller Wechsel zu Piper mehr bei aufgebrauchtem Guthaben -- "ElevenLabs
// Premium oder keine Sprachausgabe" statt einer unangekündigten Ersatzstimme).
let creditsExhaustedNotified = false;
function notifyCreditsExhausted() {
  if (creditsExhaustedNotified) return;
  creditsExhaustedNotified = true;
  toast.info("Premium-Stimme aufgebraucht. Sprachausgabe pausiert, bis aufgeladen wird.", {
    action: { label: "Aufladen", onClick: () => { window.location.href = "/management/guthaben"; } },
  });
}

export function useHufiTTS(userId = "", role?: string | null): UseHufiTTS {
  const synthRef = useRef<SpeechSynthesis | null>(
    typeof window !== "undefined" && "speechSynthesis" in window
      ? window.speechSynthesis
      : null
  );
  const browserSupported = synthRef.current !== null;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCloudVoice, setIsCloudVoice] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);
  const currentAbortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const pickGermanVoice = useCallback(() => {
    const synth = synthRef.current;
    if (!synth) return;
    const voices = synth.getVoices();
    if (!voices.length) return;
    voiceRef.current =
      voices.find((v) => v.lang === "de-DE") ??
      voices.find((v) => v.lang.startsWith("de")) ??
      null;
  }, []);

  useEffect(() => {
    if (!browserSupported) return;
    pickGermanVoice();
    const synth = synthRef.current!;
    const onChange = () => pickGermanVoice();
    synth.addEventListener?.("voiceschanged", onChange);
    return () => synth.removeEventListener?.("voiceschanged", onChange);
  }, [browserSupported, pickGermanVoice]);

  const stopPlayback = useCallback((invalidate = true) => {
    if (invalidate) requestIdRef.current += 1;
    currentAbortRef.current?.abort();
    currentAbortRef.current = null;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
    }
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }
    synthRef.current?.cancel();
    setIsSpeaking(false);
    setIsCloudVoice(false);
  }, []);

  const cancel = useCallback(() => {
    stopPlayback(true);
  }, [stopPlayback]);

  /* ── Browser-TTS: NUR wenn der Nutzer "Browser-Stimme" ausdrücklich in den
     Einstellungen gewählt hat (P0 Abschnitt 2) -- niemals als stiller
     Ersatz für einen anderen Provider. ── */
  const speakWithBrowser = useCallback(
    (cleaned: string, requestId: number, onEnd?: () => void, onError?: () => void): boolean => {
      const synth = synthRef.current;
      if (!synth || !cleaned) {
        onError?.();
        onEnd?.();
        return false;
      }
      synth.cancel();
      const utt = new SpeechSynthesisUtterance(cleaned);
      utt.lang = "de-DE";
      utt.rate = 1.0;
      utt.volume = 1;
      if (voiceRef.current) utt.voice = voiceRef.current;
      utt.onstart = () => {
        if (requestId !== requestIdRef.current) return;
        setIsSpeaking(true);
        setIsCloudVoice(false);
      };
      utt.onend = () => {
        if (requestId !== requestIdRef.current) return;
        setIsSpeaking(false);
        onEnd?.();
      };
      utt.onerror = () => {
        if (requestId !== requestIdRef.current) return;
        setIsSpeaking(false);
        onError?.();
        onEnd?.();
      };
      synth.speak(utt);
      return true;
    },
    []
  );

  /* ── Piper-TTS: NUR wenn der Nutzer "Hufi Stimme lokal" ausdrücklich
     gewählt hat, oder für B2C-Konten (bestehende, unveränderte Produkt-
     entscheidung). Bei Fehler kein Wechsel zu einem anderen Provider mehr
     (P0 Abschnitt 2) -- onError statt stillem speakWithBrowser-Aufruf. ── */
  const speakWithPiper = useCallback(
    async (text: string, requestId: number, onEnd?: () => void, onError?: () => void): Promise<boolean> => {
      // Safari < 16.4 kennt kein AbortSignal.timeout() → manueller Controller
      const controller = new AbortController();
      currentAbortRef.current = controller;
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const resp = await fetch(PIPER_TTS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!resp.ok) throw new Error(`Piper ${resp.status}`);

        const blob = await resp.blob();
        if (requestId !== requestIdRef.current) return false;
        const url = URL.createObjectURL(blob);
        currentObjectUrlRef.current = url;

        const audio = new Audio(url);
        currentAudioRef.current = audio;

        audio.onplay = () => {
          if (requestId !== requestIdRef.current) return;
          setIsSpeaking(true);
          setIsCloudVoice(false);
        };
        audio.onended = () => {
          if (requestId !== requestIdRef.current) return;
          setIsSpeaking(false);
          currentAudioRef.current = null;
          URL.revokeObjectURL(url);
          currentObjectUrlRef.current = null;
          onEnd?.();
        };
        audio.onerror = () => {
          if (requestId !== requestIdRef.current) return;
          setIsSpeaking(false);
          currentAudioRef.current = null;
          URL.revokeObjectURL(url);
          currentObjectUrlRef.current = null;
          onError?.();
          onEnd?.();
        };

        try {
          await audio.play();
        } catch (playErr: unknown) {
          if (requestId !== requestIdRef.current) return false;
          // Autoplay vom Browser blockiert (z.B. iOS ohne vorherige
          // User-Geste) -- sichtbar behandeln, kein stiller Providerwechsel.
          console.warn("[hufi-tts] Piper play() blockiert:", (playErr as Error)?.name);
          currentAudioRef.current = null;
          URL.revokeObjectURL(url);
          currentObjectUrlRef.current = null;
          setIsSpeaking(false);
          onError?.();
          return false;
        }
        return true;
      } catch (e) {
        clearTimeout(timer);
        if (requestId !== requestIdRef.current) return false;
        if ((e as Error)?.name === "AbortError") return false;
        console.warn("[hufi-tts] Piper TTS nicht erreichbar:", e);
        onError?.();
        return false;
      } finally {
        if (currentAbortRef.current === controller) currentAbortRef.current = null;
      }
    },
    []
  );

  /* ── ElevenLabs Cloud TTS -- der Standard für Hufi. Bei Fehler (Timeout,
     Guthaben, ungültige Voice, Netzwerk, Autoplay) KEIN Wechsel zu Piper
     oder Browser mehr, nur noch onError (P0 Abschnitt 2/3): "ElevenLabs
     Premium oder keine Sprachausgabe". ── */
  const speakWithCloud = useCallback(
    async (text: string, voiceId: string, requestId: number, onEnd?: () => void, onError?: () => void, modelParam?: string): Promise<boolean> => {
      let timedOut = false;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (requestId !== requestIdRef.current) return false;
        if (!session?.access_token) throw new Error("Nicht angemeldet");

        setIsSpeaking(true);
        setIsCloudVoice(true);

        const model = modelParam ?? getSelectedModel(userId);
        const controller = new AbortController();
        currentAbortRef.current = controller;
        // Kontrollierter Timeout (P0 Abschnitt 5).
        const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15_000);
        const ttsCorrelationId = crypto.randomUUID();
        console.info(`[hufi-tts][${ttsCorrelationId}] Anfrage gestartet: provider=elevenlabs voice=${shortVoiceId(voiceId)} model=${model}`);
        const ttsT0 = performance.now();
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hufi-tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              "X-Correlation-Id": ttsCorrelationId,
            },
            body: JSON.stringify({ text, voice_id: voiceId, model_id: model }),
            signal: controller.signal,
          }
        );
        clearTimeout(timer);
        if (currentAbortRef.current === controller) currentAbortRef.current = null;

        if (resp.status === 402) {
          notifyCreditsExhausted();
          throw new Error("credits_exhausted");
        }
        if (!resp.ok) throw new Error(`ElevenLabs TTS ${resp.status}`);

        const blob = await resp.blob();
        console.info(`[hufi-tts][${ttsCorrelationId}] Antwort erfolgreich: ${Math.round(performance.now() - ttsT0)}ms, contentType=${resp.headers.get("content-type")}, bytes=${blob.size}`);
        if (requestId !== requestIdRef.current) return false;
        const url = URL.createObjectURL(blob);
        currentObjectUrlRef.current = url;

        const audio = new Audio(url);
        currentAudioRef.current = audio;

        audio.onended = () => {
          if (requestId !== requestIdRef.current) return;
          setIsSpeaking(false);
          setIsCloudVoice(false);
          currentAudioRef.current = null;
          URL.revokeObjectURL(url);
          currentObjectUrlRef.current = null;
          onEnd?.();
        };
        audio.onerror = () => {
          if (requestId !== requestIdRef.current) return;
          setIsSpeaking(false);
          setIsCloudVoice(false);
          currentAudioRef.current = null;
          URL.revokeObjectURL(url);
          currentObjectUrlRef.current = null;
          onError?.();
          onEnd?.();
        };

        try {
          await audio.play();
        } catch (playErr: unknown) {
          if (requestId !== requestIdRef.current) return false;
          // Autoplay vom Browser blockiert -- sichtbar behandeln, kein
          // stiller Providerwechsel.
          console.warn("[hufi-tts] ElevenLabs play() blockiert:", (playErr as Error)?.name);
          currentAudioRef.current = null;
          URL.revokeObjectURL(url);
          currentObjectUrlRef.current = null;
          setIsSpeaking(false);
          setIsCloudVoice(false);
          onError?.();
          return false;
        }
        return true;
      } catch (e) {
        if (requestId !== requestIdRef.current) return false;
        if ((e as Error)?.name === "AbortError" && !timedOut) return false;
        console.warn("[hufi-tts] ElevenLabs fehlgeschlagen:", timedOut ? "Zeitüberschreitung" : e);
        setIsSpeaking(false);
        setIsCloudVoice(false);
        onError?.();
        return false;
      }
    },
    []
  );

  /* ── Haupt-Speak-Funktion: GENAU EIN Provider pro Aufruf, kein Kaskadieren
     mehr (P0 Abschnitt 1/2/3). Priorität:
       1. gespeicherte, gültige Premium-Voice-ID des Nutzers (ElevenLabs)
       2. explizit gewähltes "piper" oder "browser"
       3. ohne jede Auswahl: zentrale Hufi-Premium-Standardstimme
          (B2C-Konten weiterhin auf Piper begrenzt, bestehende Regel)
     Schlägt der gewählte Provider fehl: onError, keine Ersatzstimme. ── */
  const speak = useCallback(
    (text: string, onEnd?: () => void, fastMode = false, onError?: () => void): boolean => {
      const cleaned = sanitizeForSpeech(text);
      if (!cleaned) {
        onEnd?.();
        return false;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      stopPlayback(false);

      const storedVoiceId = getSelectedVoiceId(userId);
      const ttsT0 = performance.now();
      const wrappedOnEnd = () => {
        console.info(`[hufi-tts] TTS beendet: ${Math.round(performance.now() - ttsT0)}ms`);
        onEnd?.();
      };

      if (storedVoiceId === "browser") {
        console.info(`[hufi-tts] TTS gestartet: tier=browser (ausdrücklich gewählt) chars=${cleaned.length}`);
        speakWithBrowser(cleaned, requestId, wrappedOnEnd, onError);
        return true;
      }

      if (storedVoiceId === "piper" || role === "client") {
        console.info(`[hufi-tts] TTS gestartet: tier=piper chars=${cleaned.length}`);
        void speakWithPiper(cleaned, requestId, wrappedOnEnd, onError);
        return true;
      }

      // ElevenLabs: gespeicherte Premium-Voice-ID, sonst die zentrale
      // Hufi-Standardstimme (nie automatisch Piper/Browser).
      const voiceId = (storedVoiceId && HUFI_VOICES.some((v) => v.id === storedVoiceId))
        ? storedVoiceId
        : (HUFI_VOICES.find((v) => v.recommended) ?? HUFI_VOICES[0])?.id;

      if (!voiceId) {
        // Keine Premium-Stimme im Projekt konfiguriert -- ehrlich keine
        // Sprachausgabe statt eines stillen Ersatzes.
        onError?.();
        onEnd?.();
        return false;
      }

      console.info(`[hufi-tts] TTS gestartet: tier=cloud chars=${cleaned.length}`);
      void speakWithCloud(cleaned, voiceId, requestId, wrappedOnEnd, onError, fastMode ? "eleven_turbo_v2_5" : undefined);
      return true;
    },
    [speakWithCloud, speakWithPiper, speakWithBrowser, stopPlayback, role]
  );

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    speak,
    cancel,
    isSupported: browserSupported || !!getSelectedVoiceId(userId),
    isSpeaking,
    isCloudVoice,
  };
}
