import { useState, useRef, useEffect } from "react";
import { X, RefreshCw, Send } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onTranscript?: (text: string) => void;
}

type ModalState = "idle" | "recording" | "transcribing" | "review" | "error";

const STATE_LABEL: Record<ModalState, string> = {
  idle:         "Drücken und sprechen",
  recording:    "Ich höre…",
  transcribing: "Ich transkribiere…",
  review:       "Alles korrekt?",
  error:        "Nicht verstanden",
};

const STATE_COLOR: Record<ModalState, string> = {
  idle:         "#D1D5DB",
  recording:    "#F97316",
  transcribing: "#6366F1",
  review:       "#10B981",
  error:        "#EF4444",
};

export function HufiVoiceModal({ open, onClose, onTranscript }: Props) {
  const [state, setState] = useState<ModalState>("idle");
  const [transcript, setTranscript] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) {
      setState("idle");
      setTranscript("");
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recorderRef.current = null;
    }
  }, [open]);

  if (!open) return null;

  async function startRecording() {
    if (state !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];
      chunksRef.current = chunks;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("transcribing");
        try {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const form = new FormData();
          form.append("file", blob, "recording.webm");
          const res = await fetch("/api/local-ai/transcribe", { method: "POST", body: form });
          const json = await res.json();
          const text: string = json.text?.trim() ?? "";
          if (text) {
            setTranscript(text);
            setState("review");
          } else {
            setState("error");
          }
        } catch {
          setState("error");
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setState("recording");
    } catch {
      setState("idle");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  function reset() {
    setState("idle");
    setTranscript("");
  }

  function handleSend() {
    if (transcript && onTranscript) onTranscript(transcript);
    onClose();
  }

  const isRecording = state === "recording";
  const isActive    = state === "recording" || state === "transcribing";
  const waveColor   = STATE_COLOR[state];

  return (
    <>
      <style>{`
        @keyframes hufi-wave {
          0%   { transform: scaleY(0.15); }
          100% { transform: scaleY(1); }
        }
        .hv-bar { animation: hufi-wave 0.7s ease-in-out infinite alternate; }
        @keyframes hufi-glow {
          0%   { box-shadow: 0 0 0 0 rgba(249,115,22,0.6); }
          100% { box-shadow: 0 0 0 24px rgba(249,115,22,0); }
        }
        .hv-pulse { animation: hufi-glow 1.2s ease-out infinite; }
        @keyframes hufi-in {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        .hv-modal { animation: hufi-in 0.2s ease-out; }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
        className="hv-modal"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#F3F4F6",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={20} style={{ color: "#6B7280" }} />
        </button>

        {/* Logo */}
        <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 22, background: "#F97316",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 12px 32px rgba(249,115,22,0.3)",
          }}>
            <img src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png" alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)", padding: "10%" }} />
          </div>
          <span style={{ fontSize: 28, fontWeight: 900, color: "#1A1A1A", letterSpacing: "-0.5px" }}>Hufi</span>
        </div>

        {/* ── REVIEW SCREEN ── */}
        {state === "review" && (
          <div style={{ width: "100%", maxWidth: 340, padding: "0 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div
              style={{
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                borderRadius: 16,
                padding: "16px 18px",
                width: "100%",
                fontSize: 16,
                color: "#1A1A1A",
                lineHeight: 1.5,
                textAlign: "center",
                minHeight: 60,
              }}
            >
              „{transcript}"
            </div>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
              Alles korrekt? Dann senden oder nochmal aufnehmen.
            </p>
            <button
              onClick={handleSend}
              style={{
                width: "100%", height: 52, borderRadius: 16,
                background: "#F97316", border: "none", color: "#FFFFFF",
                fontSize: 16, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 16px rgba(249,115,22,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Send size={18} /> Senden ✓
            </button>
            <button
              onClick={reset}
              style={{
                width: "100%", height: 44, borderRadius: 14,
                background: "#F3F4F6", border: "none", color: "#374151",
                fontSize: 15, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <RefreshCw size={16} /> Neu aufnehmen 🔄
            </button>
          </div>
        )}

        {/* ── RECORDING / IDLE / ERROR SCREEN ── */}
        {state !== "review" && (
          <>
            {/* Wave visualization */}
            <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              {isActive ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, height: "100%" }}>
                  {[0, 0.08, 0.18, 0.06, 0.24, 0.12, 0.04, 0.16, 0.22, 0.1, 0.02, 0.14, 0.2].map((delay, i) => (
                    <div
                      key={i}
                      className="hv-bar"
                      style={{
                        width: 5,
                        height: `${40 + Math.sin(i * 0.8) * 28}px`,
                        borderRadius: 3,
                        background: waveColor,
                        transformOrigin: "bottom",
                        animationDelay: `${delay}s`,
                        animationDuration: state === "transcribing" ? "0.4s" : "0.7s",
                        opacity: state === "transcribing" ? 0.7 : 1,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 5, height: 40 }}>
                  {Array.from({ length: 13 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 4,
                        height: `${8 + Math.sin(i * 0.8) * 6}px`,
                        borderRadius: 3,
                        background: state === "error" ? "#FCA5A5" : "#E5E7EB",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Status text */}
            <p style={{
              fontSize: 17, fontWeight: 600,
              color: isActive ? waveColor : state === "error" ? "#EF4444" : "#9CA3AF",
              marginBottom: 48,
              transition: "color 0.3s",
              minHeight: 26,
            }}>
              {STATE_LABEL[state]}
            </p>

            {/* Big mic button — hide while transcribing */}
            {state !== "transcribing" && (
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                onTouchEnd={stopRecording}
                className={isRecording ? "hv-pulse" : ""}
                disabled={state === "transcribing"}
                style={{
                  width: 96, height: 96, borderRadius: "50%",
                  background: isRecording ? "#EF4444" : state === "error" ? "#F3F4F6" : "#F97316",
                  border: "none",
                  cursor: state === "idle" || state === "recording" || state === "error" ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: isRecording
                    ? "0 8px 32px rgba(239,68,68,0.45)"
                    : "0 8px 32px rgba(249,115,22,0.45)",
                  transition: "background 0.2s, box-shadow 0.2s, transform 0.1s",
                  transform: isRecording ? "scale(1.06)" : "scale(1)",
                  userSelect: "none" as const,
                }}
                onClick={state === "error" ? reset : undefined}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={state === "error" ? "#9CA3AF" : "#FFFFFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
            )}

            <p style={{ fontSize: 12, color: "#D1D5DB", marginTop: 20 }}>
              {state === "error"
                ? "Tippe um nochmal zu versuchen"
                : isRecording
                ? "Loslassen zum Senden"
                : "Halten und sprechen"}
            </p>
          </>
        )}
      </div>
    </>
  );
}
