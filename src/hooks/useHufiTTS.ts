import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSelectedVoiceId, getSelectedModel } from "@/lib/hufi-voice-config";

interface UseHufiTTS {
  speak: (text: string, onEnd?: () => void) => boolean;
  cancel: () => void;
  isSupported: boolean;
  isSpeaking: boolean;
  isCloudVoice: boolean;
}

/**
 * Strip characters that the browser speech engine pronounces awkwardly:
 * - Emojis and other pictographs (would be read as "smiling face", "waving hand")
 * - Markdown control chars (`*` `_` `#` `>` `` ` `` `~`) and link syntax
 * - Collapses whitespace so paragraph breaks become natural pauses
 * Punctuation (.,;:!?-) is intentionally kept — it shapes intonation.
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

export function useHufiTTS(): UseHufiTTS {
  const synthRef = useRef<SpeechSynthesis | null>(
    typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null
  );
  const browserSupported = synthRef.current !== null;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCloudVoice, setIsCloudVoice] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);

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

  const cancel = useCallback(() => {
    // Stop cloud audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }
    // Stop browser TTS
    synthRef.current?.cancel();
    setIsSpeaking(false);
    setIsCloudVoice(false);
  }, []);

  const speakWithBrowser = useCallback((cleaned: string, onEnd?: () => void): boolean => {
    const synth = synthRef.current;
    if (!synth || !cleaned) { onEnd?.(); return false; }

    synth.cancel();
    const utt = new SpeechSynthesisUtterance(cleaned);
    utt.lang = "de-DE";
    utt.rate = 1.0;
    utt.volume = 1;
    if (voiceRef.current) utt.voice = voiceRef.current;

    utt.onstart = () => { setIsSpeaking(true); setIsCloudVoice(false); };
    utt.onend = () => { setIsSpeaking(false); onEnd?.(); };
    utt.onerror = () => { setIsSpeaking(false); onEnd?.(); };

    synth.speak(utt);
    return true;
  }, []);

  const speakWithCloud = useCallback(async (
    text: string,
    voiceId: string,
    onEnd?: () => void
  ): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Nicht angemeldet");

      setIsSpeaking(true);
      setIsCloudVoice(true);

      const model = getSelectedModel();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hufi-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ text, voice_id: voiceId, model_id: model }),
        }
      );

      if (!resp.ok) throw new Error(`TTS ${resp.status}`);

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      currentObjectUrlRef.current = url;

      const audio = new Audio(url);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        setIsCloudVoice(false);
        currentAudioRef.current = null;
        URL.revokeObjectURL(url);
        currentObjectUrlRef.current = null;
        onEnd?.();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setIsCloudVoice(false);
        currentAudioRef.current = null;
        URL.revokeObjectURL(url);
        currentObjectUrlRef.current = null;
        onEnd?.();
      };

      await audio.play();
      return true;
    } catch (e) {
      console.warn("[hufi-tts] Cloud TTS fehlgeschlagen, Fallback auf Browser:", e);
      setIsSpeaking(false);
      setIsCloudVoice(false);
      // Transparenter Fallback auf Browser-Stimme
      return speakWithBrowser(text, onEnd);
    }
  }, [speakWithBrowser]);

  const speak = useCallback(
    (text: string, onEnd?: () => void): boolean => {
      const cleaned = sanitizeForSpeech(text);
      if (!cleaned) { onEnd?.(); return false; }

      const voiceId = getSelectedVoiceId();
      if (voiceId) {
        // Cloud TTS asynchron — return true optimistisch, Audio startet kurz danach
        speakWithCloud(cleaned, voiceId, onEnd);
        return true;
      }

      if (!browserSupported) { onEnd?.(); return false; }
      return speakWithBrowser(cleaned, onEnd);
    },
    [browserSupported, speakWithBrowser, speakWithCloud]
  );

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    speak,
    cancel,
    isSupported: browserSupported || !!getSelectedVoiceId(),
    isSpeaking,
    isCloudVoice,
  };
}
