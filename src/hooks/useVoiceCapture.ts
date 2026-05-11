import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Phase-1 centralised voice capture for Hufi.
 *
 * Wraps: getUserMedia + MediaRecorder + the local Whisper proxy at
 * /api/local-ai/transcribe. Returns a tap-to-toggle interface.
 *
 * Designed so callers never see MediaRecorder details:
 *   const v = useVoiceCapture();
 *   v.startRecording();            // tap 1
 *   v.stopRecording();             // tap 2
 *   useEffect(() => { if (v.transcript) feedToAI(v.transcript); v.reset(); }, [v.transcript]);
 *
 * Error states are surfaced via the `error` field as a stable code so the UI
 * can render appropriate messaging. No silent failures.
 */

const WHISPER_ENDPOINT = "/api/local-ai/transcribe";

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
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  cancel: () => void;
  reset: () => void;
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return ""; // browser default
}

export function useVoiceCapture(): UseVoiceCapture {
  const isSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>("");
  const cancelledRef = useRef<boolean>(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<VoiceErrorCode | null>(null);

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

  const transcribe = useCallback(async (blob: Blob): Promise<string> => {
    const form = new FormData();
    form.append("file", blob, `recording.${(blob.type.split("/")[1] ?? "webm").split(";")[0]}`);
    let res: Response;
    try {
      res = await fetch(WHISPER_ENDPOINT, { method: "POST", body: form });
    } catch (err) {
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

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("microphone_missing");
      console.info("[voice-capture] skip: microphone not supported in this browser");
      return false;
    }
    if (isRecording || isProcessing) return false;

    setError(null);
    setTranscript(null);
    cancelledRef.current = false;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError("microphone_denied");
      } else {
        setError("microphone_missing");
      }
      console.info(`[voice-capture] getUserMedia failed: ${name ?? "unknown"}`);
      return false;
    }

    streamRef.current = stream;
    const mime = pickMimeType();
    mimeRef.current = mime;

    let recorder: MediaRecorder;
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
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
    return true;
  }, [isSupported, isRecording, isProcessing, releaseStream, transcribe]);

  const stopRecording = useCallback(() => {
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

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* fall through */
      }
    }
    releaseStream();
    setIsRecording(false);
    setIsProcessing(false);
  }, [releaseStream]);

  useEffect(() => {
    return () => {
      // Hard cleanup on unmount
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
    startRecording,
    stopRecording,
    cancel,
    reset,
  };
}
