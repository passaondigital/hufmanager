import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSelectedVoiceId, getSelectedModel } from "@/lib/hufi-voice-config";

interface UseHufiTTS {
  speak: (text: string, onEnd?: () => void, fastMode?: boolean) => boolean;
  cancel: () => void;
  isSupported: boolean;
  isSpeaking: boolean;
  isCloudVoice: boolean;
}

/**
 * Bereinigt Text für Sprachausgabe:
 * - Entfernt Emojis, Markdown, Links
 * - Erhält Satzzeichen für natürliche Intonation
 */
export function sanitizeForSpeech(input: string): string {
  if (!input) return "";
  return input
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[︎️‍]/g, "")
    .replace(/[*_#>`~]/g, "")
    .replace(/-{3,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

// Piper TTS: lokaler Server auf demselben VPS (via Nginx-Proxy)
const PIPER_TTS_URL = "/api/local-tts";

export function useHufiTTS(userId = ""): UseHufiTTS {
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

  /* ── Tier 3: Browser TTS (immer verfügbar, synthetisch) ── */
  const speakWithBrowser = useCallback(
    (cleaned: string, requestId: number, onEnd?: () => void): boolean => {
      const synth = synthRef.current;
      if (!synth || !cleaned) {
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
        onEnd?.();
      };
      synth.speak(utt);
      return true;
    },
    []
  );

  /* ── Tier 2: Piper TTS (lokal auf VPS, natürlich klingende DE-Stimme) ── */
  const speakWithPiper = useCallback(
    async (text: string, requestId: number, onEnd?: () => void): Promise<boolean> => {
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
          speakWithBrowser(text, requestId, onEnd);
        };

        try {
          await audio.play();
        } catch (playErr: unknown) {
          if (requestId !== requestIdRef.current) return false;
          // iOS: NotAllowedError ohne vorherige User-Geste → Browser-Fallback
          currentAudioRef.current = null;
          URL.revokeObjectURL(url);
          currentObjectUrlRef.current = null;
          setIsSpeaking(false);
          return speakWithBrowser(text, requestId, onEnd);
        }
        return true;
      } catch (e) {
        clearTimeout(timer);
        if (requestId !== requestIdRef.current) return false;
        if ((e as Error)?.name === "AbortError") return false;
        console.warn("[hufi-tts] Piper TTS nicht erreichbar, Fallback auf Browser:", e);
        return speakWithBrowser(text, requestId, onEnd);
      } finally {
        if (currentAbortRef.current === controller) currentAbortRef.current = null;
      }
    },
    [speakWithBrowser]
  );

  /* ── Tier 1: ElevenLabs Cloud TTS (beste Qualität, kostenpflichtig) ── */
  const speakWithCloud = useCallback(
    async (text: string, voiceId: string, requestId: number, onEnd?: () => void, modelParam?: string): Promise<boolean> => {
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
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hufi-tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ text, voice_id: voiceId, model_id: model }),
            signal: controller.signal,
          }
        );
        if (currentAbortRef.current === controller) currentAbortRef.current = null;

        if (!resp.ok) throw new Error(`ElevenLabs TTS ${resp.status}`);

        const blob = await resp.blob();
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
          onEnd?.();
        };

        try {
          await audio.play();
        } catch (playErr: unknown) {
          if (requestId !== requestIdRef.current) return false;
          // iOS: NotAllowedError ohne vorherige User-Geste → Piper-Fallback
          currentAudioRef.current = null;
          URL.revokeObjectURL(url);
          currentObjectUrlRef.current = null;
          setIsSpeaking(false);
          setIsCloudVoice(false);
          return speakWithPiper(text, requestId, onEnd);
        }
        return true;
      } catch (e) {
        if (requestId !== requestIdRef.current) return false;
        if ((e as Error)?.name === "AbortError") return false;
        console.warn("[hufi-tts] ElevenLabs fehlgeschlagen, Fallback auf Piper:", e);
        setIsSpeaking(false);
        setIsCloudVoice(false);
        return speakWithPiper(text, requestId, onEnd);
      }
    },
    [speakWithPiper]
  );

  /* ── Haupt-Speak Funktion: ElevenLabs → Piper → Browser ── */
  const speak = useCallback(
    async (text: string, onEnd?: () => void, fastMode = false): Promise<boolean> => {
      const cleaned = sanitizeForSpeech(text);
      if (!cleaned) {
        onEnd?.();
        return false;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      stopPlayback(false);

      const voiceId = getSelectedVoiceId(userId);
      if (voiceId && voiceId !== "browser" && voiceId !== "piper") {
        await speakWithCloud(cleaned, voiceId, requestId, onEnd, fastMode ? "eleven_turbo_v2_5" : undefined);
        return true;
      }

      if (voiceId === "piper") {
        await speakWithPiper(cleaned, requestId, onEnd);
        return true;
      }

      // Kein Cloud-Voice gesetzt → Piper versuchen (natürlichere Stimme als Browser)
      await speakWithPiper(cleaned, requestId, onEnd);
      return true;
    },
    [speakWithCloud, speakWithPiper, stopPlayback]
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
