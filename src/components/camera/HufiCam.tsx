import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HufiCamProps {
  mode?: "photo" | "video" | "both";
  facingMode?: "environment" | "user";
  onCapture: (blob: Blob, type: "photo" | "video", previewUrl: string) => void;
  onClose: () => void;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 50,
    background: "#000",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    position: "absolute" as const,
    inset: 0,
  },
  topBar: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    zIndex: 10,
    background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
  },
  iconBtn: {
    background: "rgba(0,0,0,0.5)",
    border: "none",
    borderRadius: "50%",
    width: 44,
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#fff",
    fontSize: 20,
  },
  bottomBar: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "32px 16px 48px",
    gap: 32,
    zIndex: 10,
    background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
  },
  shutterPhoto: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "#fff",
    border: "4px solid rgba(255,255,255,0.5)",
    cursor: "pointer",
    outline: "none",
    boxShadow: "0 0 0 3px rgba(255,255,255,0.3)",
  },
  shutterVideoIdle: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "#ef4444",
    border: "4px solid rgba(255,255,255,0.5)",
    cursor: "pointer",
    outline: "none",
    boxShadow: "0 0 0 3px rgba(239,68,68,0.3)",
  },
  shutterVideoRecording: {
    width: 72,
    height: 72,
    borderRadius: "12px",
    background: "#ef4444",
    border: "4px solid rgba(255,255,255,0.5)",
    cursor: "pointer",
    outline: "none",
    boxShadow: "0 0 0 3px rgba(239,68,68,0.5)",
    animation: "pulse 1s infinite",
  },
  timerBadge: {
    position: "absolute" as const,
    top: 60,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(239,68,68,0.85)",
    color: "#fff",
    borderRadius: 20,
    padding: "4px 14px",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 1,
    zIndex: 10,
  },
  errorBox: {
    position: "absolute" as const,
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    textAlign: "center" as const,
    color: "#fff",
    fontSize: 16,
    zIndex: 5,
  },
  previewOverlay: {
    position: "absolute" as const,
    inset: 0,
    zIndex: 20,
    background: "#000",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
  },
  previewMedia: {
    maxWidth: "100%",
    maxHeight: "calc(100vh - 140px)",
    objectFit: "contain" as const,
  },
  previewActions: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "center",
    gap: 16,
    padding: "24px 16px 48px",
    background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
  },
  btnPrimary: {
    background: "#f97316",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 28px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnSecondary: {
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    border: "2px solid rgba(255,255,255,0.4)",
    borderRadius: 12,
    padding: "12px 28px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  modeTabBar: {
    position: "absolute" as const,
    bottom: 120,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 8,
    zIndex: 10,
  },
  modeTab: (active: boolean) => ({
    background: active ? "rgba(249,115,22,0.9)" : "rgba(0,0,0,0.5)",
    color: "#fff",
    border: active ? "1px solid #f97316" : "1px solid rgba(255,255,255,0.3)",
    borderRadius: 20,
    padding: "6px 16px",
    fontSize: 13,
    fontWeight: active ? 700 : 400,
    cursor: "pointer",
  }),
};

// ── Component ─────────────────────────────────────────────────────────────────

export function HufiCam({
  mode = "photo",
  facingMode: initialFacing = "environment",
  onCapture,
  onClose,
}: HufiCamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [facing, setFacing] = useState<"environment" | "user">(initialFacing);
  const [activeMode, setActiveMode] = useState<"photo" | "video">(
    mode === "video" ? "video" : "photo"
  );
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; type: "photo" | "video" } | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);

  // ── Start camera stream ───────────────────────────────────────────────────

  const startStream = useCallback(async (fm: "environment" | "user", vmode: "photo" | "video") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: fm },
        audio: vmode === "video",
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
    } catch {
      setCameraError("Kamera nicht verfügbar oder Zugriff verweigert.");
    }
  }, []);

  useEffect(() => {
    startStream(facing, activeMode);
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [facing, activeMode, startStream]);

  // ── Photo capture ─────────────────────────────────────────────────────────

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setPendingBlob(blob);
        setPreview({ url, type: "photo" });
      },
      "image/jpeg",
      0.9
    );
  }, []);

  // ── Video recording ───────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/mp4";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const mtype = mimeType.startsWith("video/webm") ? "video/webm" : "video/mp4";
      const blob = new Blob(chunksRef.current, { type: mtype });
      const url = URL.createObjectURL(blob);
      setPendingBlob(blob);
      setPreview({ url, type: "video" });
    };

    recorder.start(200);
    setRecording(true);
    setRecSeconds(0);

    timerRef.current = setInterval(() => {
      setRecSeconds(s => s + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  }, []);

  // ── Shutter handler ───────────────────────────────────────────────────────

  const handleShutter = useCallback(() => {
    if (activeMode === "photo") {
      capturePhoto();
    } else {
      if (recording) stopRecording();
      else startRecording();
    }
  }, [activeMode, recording, capturePhoto, startRecording, stopRecording]);

  // ── Flip camera ───────────────────────────────────────────────────────────

  const flipCamera = useCallback(() => {
    if (recording) return;
    setFacing(f => (f === "environment" ? "user" : "environment"));
  }, [recording]);

  // ── Preview actions ───────────────────────────────────────────────────────

  const handleUse = useCallback(() => {
    if (!pendingBlob || !preview) return;
    onCapture(pendingBlob, preview.type, preview.url);
  }, [pendingBlob, preview, onCapture]);

  const handleRetake = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setPendingBlob(null);
    startStream(facing, activeMode);
  }, [preview, facing, activeMode, startStream]);

  // ── Format timer ─────────────────────────────────────────────────────────

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={styles.overlay}>
      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Camera view */}
      {!cameraError && (
        <video
          ref={videoRef}
          style={styles.video}
          playsInline
          autoPlay
          muted
        />
      )}

      {/* Error state */}
      {cameraError && (
        <div style={styles.errorBox}>
          <div>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
            <div>{cameraError}</div>
          </div>
        </div>
      )}

      {/* Recording timer */}
      {recording && (
        <div style={styles.timerBadge}>
          ● {formatTime(recSeconds)}
        </div>
      )}

      {/* Top bar */}
      <div style={styles.topBar}>
        <button style={styles.iconBtn} onClick={onClose} aria-label="Schließen">
          ✕
        </button>
        {!recording && (
          <button style={styles.iconBtn} onClick={flipCamera} aria-label="Kamera wechseln">
            🔄
          </button>
        )}
      </div>

      {/* Mode tabs — only in "both" mode */}
      {mode === "both" && !recording && (
        <div style={styles.modeTabBar}>
          <button
            style={styles.modeTab(activeMode === "photo")}
            onClick={() => setActiveMode("photo")}
          >
            Foto
          </button>
          <button
            style={styles.modeTab(activeMode === "video")}
            onClick={() => setActiveMode("video")}
          >
            Video
          </button>
        </div>
      )}

      {/* Bottom bar */}
      {!cameraError && (
        <div style={styles.bottomBar}>
          <button
            style={
              activeMode === "photo"
                ? styles.shutterPhoto
                : recording
                ? styles.shutterVideoRecording
                : styles.shutterVideoIdle
            }
            onClick={handleShutter}
            aria-label={
              activeMode === "photo"
                ? "Foto aufnehmen"
                : recording
                ? "Aufnahme stoppen"
                : "Aufnahme starten"
            }
          />
        </div>
      )}

      {/* Preview overlay */}
      {preview && (
        <div style={styles.previewOverlay}>
          {preview.type === "photo" ? (
            <img src={preview.url} alt="Vorschau" style={styles.previewMedia} />
          ) : (
            <video
              src={preview.url}
              style={styles.previewMedia}
              controls
              autoPlay
              loop
              playsInline
            />
          )}
          <div style={styles.previewActions}>
            <button style={styles.btnSecondary} onClick={handleRetake}>
              Wiederholen
            </button>
            <button style={styles.btnPrimary} onClick={handleUse}>
              Verwenden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
