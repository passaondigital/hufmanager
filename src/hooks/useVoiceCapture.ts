import { useCallback, useEffect, useRef, useState } from "react";

const WHISPER_ENDPOINT = "/api/local-ai/transcribe";

// VAD-Parameter — Stille-Erkennung
const VOICE_THRESHOLD   = 0.018; // RMS-Amplitude: darüber = Sprechen
const SILENCE_THRESHOLD = 0.012; // RMS-Amplitude: darunter = Stille
const SILENCE_DURATION  = 1200;  // ms Stille → Auto-Stop (schnell)
const SPEECH_REQUIRED   = 300;   // ms Sprechen bevor Stille-Timer startet
const MAX_DURATION      = 15_000; // 15 s Hard-Limit

export type VoiceErrorCode =
  | "microphone_denied"
  | "microphone_missing"
  | "recording_failed"
  | "transcription_unavailable"
  | "transcription_failed"
  | "empty_transcript";

export interface UseVoiceCapture {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string | null;
  error: VoiceErrorCode | null;
  isSupported: boolean;
  hasVAD: boolean;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  cancel: () => void;
  reset: () => void;
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

export function useVoiceCapture(): UseVoiceCapture {
  const isSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const recorderRef    = useRef<MediaRecorder | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const chunksRef      = useRef<Blob[]>([]);
  const mimeRef        = useRef<string>("");
  const cancelledRef   = useRef<boolean>(false);

  // VAD refs
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const rafRef         = useRef<number | null>(null);
  const maxTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vadActiveRef   = useRef<boolean>(false);
  const speechSeenRef  = useRef<boolean>(false);     // hat der User überhaupt gesprochen?
  const speechMsRef    = useRef<number>(0);           // akkumulierte Sprechzeit
  const lastSoundRef   = useRef<number>(0);           // Zeitstempel letztes Sprechen
  const [hasVAD, setHasVAD] = useState(false);

  const [isRecording,  setIsRecording]  = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript,   setTranscript]   = useState<string | null>(null);
  const [error,        setError]        = useState<VoiceErrorCode | null>(null);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const reset = useCallback(() => {
    setTranscript(null);
    setError(null);
  }, []);

  // VAD aufräumen
  function stopVAD() {
    vadActiveRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (maxTimerRef.current !== null) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    try { audioCtxRef.current?.close(); } catch { /* noop */ }
    audioCtxRef.current = null;
  }

  // VAD starten — überwacht RMS-Lautstärke und stoppt bei Stille
  function startVAD(stream: MediaStream, onAutoStop: () => void) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src      = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);

      vadActiveRef.current  = true;
      speechSeenRef.current = false;
      speechMsRef.current   = 0;
      lastSoundRef.current  = Date.now();

      const tick = () => {
        if (!vadActiveRef.current) return;

        analyser.getFloatTimeDomainData(buf);
        // RMS berechnen
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);

        const now = Date.now();

        if (rms > VOICE_THRESHOLD) {
          // Sprechen erkannt
          lastSoundRef.current = now;
          speechMsRef.current += 16; // ~1 RAF-Frame bei 60fps
          if (speechMsRef.current >= SPEECH_REQUIRED) {
            speechSeenRef.current = true;
          }
        } else if (rms < SILENCE_THRESHOLD && speechSeenRef.current) {
          // Stille nach Sprechen
          if (now - lastSoundRef.current > SILENCE_DURATION) {
            stopVAD();
            onAutoStop();
            return;
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);

      // Hard-Limit
      maxTimerRef.current = setTimeout(() => {
        if (vadActiveRef.current) {
          stopVAD();
          onAutoStop();
        }
      }, MAX_DURATION);

      setHasVAD(true);
    } catch {
      // AudioContext nicht verfügbar — kein VAD, manueller Stop
      setHasVAD(false);
    }
  }

  const transcribe = useCallback(async (blob: Blob): Promise<string> => {
    const form = new FormData();
    form.append("file", blob, `recording.${(blob.type.split("/")[1] ?? "webm").split(";")[0]}`);
    let res: Response;
    try {
      res = await fetch(WHISPER_ENDPOINT, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      const name = (err as Error)?.name;
      if (name === "TimeoutError" || name === "AbortError") throw new Error("transcription_unavailable");
      console.warn("[voice-capture] transcription endpoint unreachable", err);
      throw new Error("transcription_unavailable");
    }
    if (!res.ok) {
      console.warn(`[voice-capture] transcription failed: HTTP ${res.status}`);
      throw new Error("transcription_failed");
    }
    let json: { text?: string } = {};
    try {
      json = await res.json();
    } catch {
      throw new Error("transcription_failed");
    }
    return (json.text ?? "").trim();
  }, []);

  const stopRecording = useCallback(() => {
    stopVAD();
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        releaseStream();
        setIsRecording(false);
      }
    }
  }, [releaseStream]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("microphone_missing");
      return false;
    }
    if (isRecording || isProcessing) return false;

    setError(null);
    setTranscript(null);
    cancelledRef.current = false;
    setHasVAD(false);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      setError(name === "NotAllowedError" || name === "PermissionDeniedError"
        ? "microphone_denied"
        : "microphone_missing");
      return false;
    }

    streamRef.current = stream;
    const mime = pickMimeType();
    mimeRef.current = mime;

    let recorder: MediaRecorder;
    try {
      recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
    } catch (err) {
      releaseStream();
      setError("recording_failed");
      console.warn("[voice-capture] MediaRecorder init failed", err);
      return false;
    }

    const chunks: Blob[] = [];
    chunksRef.current = chunks;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      releaseStream();
      setIsRecording(false);

      if (cancelledRef.current) {
        cancelledRef.current = false;
        return;
      }
      if (!chunks.length) {
        setError("empty_transcript");
        return;
      }

      setIsProcessing(true);
      try {
        const blob = new Blob(chunks, { type: mimeRef.current || "audio/webm" });
        const text = await transcribe(blob);
        if (!text) {
          setError("empty_transcript");
          return;
        }
        setTranscript(text);
      } catch (err: unknown) {
        const code = (err as Error)?.message;
        if (code === "transcription_unavailable" || code === "transcription_failed") {
          setError(code as VoiceErrorCode);
        } else {
          setError("transcription_failed");
        }
      } finally {
        setIsProcessing(false);
      }
    };

    recorder.onerror = () => {
      stopVAD();
      setError("recording_failed");
      setIsRecording(false);
      releaseStream();
    };

    try {
      recorder.start();
    } catch (err) {
      releaseStream();
      setError("recording_failed");
      console.warn("[voice-capture] recorder.start failed", err);
      return false;
    }

    recorderRef.current = recorder;
    setIsRecording(true);

    // VAD starten — stoppt Aufnahme automatisch bei Stille
    startVAD(stream, () => {
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        try { rec.stop(); } catch { /* noop */ }
      }
    });

    return true;
  }, [isSupported, isRecording, isProcessing, releaseStream, transcribe]);

  const cancel = useCallback(() => {
    stopVAD();
    cancelledRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try { rec.stop(); } catch { /* fall through */ }
    }
    releaseStream();
    setIsRecording(false);
    setIsProcessing(false);
    setHasVAD(false);
  }, [releaseStream]);

  useEffect(() => {
    return () => {
      stopVAD();
      cancelledRef.current = true;
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        try { rec.stop(); } catch { /* noop */ }
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    isRecording,
    isProcessing,
    transcript,
    error,
    isSupported,
    hasVAD,
    startRecording,
    stopRecording,
    cancel,
    reset,
  };
}
