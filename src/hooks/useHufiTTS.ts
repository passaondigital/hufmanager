import { useCallback, useEffect, useRef, useState } from "react";

interface UseHufiTTS {
  speak: (text: string, onEnd?: () => void) => boolean;
  cancel: () => void;
  isSupported: boolean;
  isSpeaking: boolean;
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
    // Markdown links → keep only the visible label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Pictographs / emojis
    .replace(/\p{Extended_Pictographic}/gu, "")
    // Variation selectors and zero-width joiners left behind after emoji strip
    .replace(/[︎️‍]/g, "")
    // Markdown control characters
    .replace(/[*_#>`~]/g, "")
    // Horizontal rules / dashes used as separators
    .replace(/-{3,}/g, ".")
    // Collapse whitespace, including newlines
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Thin wrapper around the browser SpeechSynthesis API. Phase-1 TTS for Hufi:
 * - Prefers a German voice when one is available.
 * - Returns false from speak() when the browser doesn't support TTS, so callers
 *   can decide whether to fall back to a silent UI path.
 * - Aborts any in-flight utterance on unmount so the voice doesn't leak between
 *   route changes.
 *
 * Voice list resolves asynchronously in some browsers (Chrome fires
 * `voiceschanged` after `getVoices()` first returns []), so we re-pick the
 * voice once they arrive.
 */
export function useHufiTTS(): UseHufiTTS {
  const synthRef = useRef<SpeechSynthesis | null>(
    typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null
  );
  const isSupported = synthRef.current !== null;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

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
    if (!isSupported) return;
    pickGermanVoice();
    const synth = synthRef.current!;
    const onChange = () => pickGermanVoice();
    synth.addEventListener?.("voiceschanged", onChange);
    return () => {
      synth.removeEventListener?.("voiceschanged", onChange);
    };
  }, [isSupported, pickGermanVoice]);

  const cancel = useCallback(() => {
    const synth = synthRef.current;
    if (!synth) return;
    synth.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, onEnd?: () => void): boolean => {
      const synth = synthRef.current;
      if (!synth) {
        console.info("[hufi-voice] skip: unsupported");
        onEnd?.();
        return false;
      }
      const cleaned = sanitizeForSpeech(text);
      if (!cleaned) {
        console.info("[hufi-voice] skip: empty_text");
        onEnd?.();
        return false;
      }
      synth.cancel();

      const utt = new SpeechSynthesisUtterance(cleaned);
      utt.lang = "de-DE";
      utt.rate = 1.0;
      utt.volume = 1;
      if (voiceRef.current) utt.voice = voiceRef.current;

      utt.onstart = () => setIsSpeaking(true);
      utt.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utt.onerror = () => {
        setIsSpeaking(false);
        onEnd?.();
      };

      synth.speak(utt);
      return true;
    },
    []
  );

  useEffect(() => {
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  return { speak, cancel, isSupported, isSpeaking };
}
