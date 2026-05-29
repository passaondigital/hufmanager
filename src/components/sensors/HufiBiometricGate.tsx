import { useState } from "react";
import {
  isBiometricsAvailable,
  registerBiometric,
  verifyBiometric,
} from "@/lib/hufi-biometrics";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HufiBiometricGateProps {
  userId: string;
  userName: string;
  mode: "setup" | "verify";
  onSuccess: () => void;
  onCancel: () => void;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fff7ed";
const ORANGE_DARK = "#ea580c";

const styles = {
  backdrop: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 40,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    padding: "0 0 0 0",
  },
  card: {
    background: "#fff",
    borderRadius: "24px 24px 0 0",
    padding: "32px 24px 48px",
    width: "100%",
    maxWidth: 480,
    boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    background: "#e5e7eb",
    borderRadius: 4,
    marginBottom: 4,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: ORANGE_LIGHT,
    border: `3px solid ${ORANGE}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
    textAlign: "center" as const,
    margin: 0,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center" as const,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 320,
  },
  btnPrimary: {
    background: ORANGE,
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: "14px 0",
    width: "100%",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.15s",
  },
  btnPrimaryHover: {
    background: ORANGE_DARK,
  },
  btnSecondary: {
    background: "transparent",
    color: "#6b7280",
    border: "none",
    padding: "10px 0",
    width: "100%",
    fontSize: 14,
    cursor: "pointer",
    textDecoration: "underline",
  },
  btnDisabled: {
    background: "#d1d5db",
    color: "#9ca3af",
    border: "none",
    borderRadius: 14,
    padding: "14px 0",
    width: "100%",
    fontSize: 16,
    fontWeight: 700,
    cursor: "not-allowed",
  },
  alertSuccess: {
    background: "#f0fdf4",
    border: "1px solid #86efac",
    borderRadius: 12,
    padding: "12px 16px",
    color: "#15803d",
    fontSize: 14,
    textAlign: "center" as const,
    width: "100%",
  },
  alertError: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: 12,
    padding: "12px 16px",
    color: "#b91c1c",
    fontSize: 14,
    textAlign: "center" as const,
    width: "100%",
  },
  unavailableNote: {
    background: "#fefce8",
    border: "1px solid #fde68a",
    borderRadius: 12,
    padding: "12px 16px",
    color: "#92400e",
    fontSize: 13,
    textAlign: "center" as const,
    width: "100%",
  },
  spinner: {
    width: 20,
    height: 20,
    border: "3px solid rgba(255,255,255,0.3)",
    borderTop: "3px solid #fff",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.8s linear infinite",
    marginRight: 8,
    verticalAlign: "middle",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function HufiBiometricGate({
  userId,
  userName,
  mode,
  onSuccess,
  onCancel,
}: HufiBiometricGateProps) {
  const available = isBiometricsAvailable();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSetup = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await registerBiometric({
      userId,
      userName,
      userDisplayName: userName,
    });

    setLoading(false);

    if (result.success) {
      setSuccessMsg("Biometrie erfolgreich eingerichtet!");
      setTimeout(() => {
        onSuccess();
      }, 800);
    } else {
      setErrorMsg(result.error ?? "Einrichtung fehlgeschlagen.");
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setErrorMsg(null);

    const result = await verifyBiometric(userId);

    setLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setErrorMsg("Nicht erkannt. Erneut versuchen.");
    }
  };

  const isSetup = mode === "setup";

  return (
    <>
      {/* Inline CSS for animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={styles.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
        <div style={styles.card}>
          {/* Drag handle */}
          <div style={styles.dragHandle} />

          {/* Icon */}
          <div style={styles.iconCircle}>
            {isSetup ? "🔐" : "👆"}
          </div>

          {/* Title */}
          <h2 style={styles.title}>
            {isSetup ? "Biometrische Anmeldung einrichten" : "Mit Biometrie entsperren"}
          </h2>

          {/* Description */}
          <p style={styles.description}>
            {isSetup
              ? "Nutze Fingerabdruck, Gesichtserkennung oder Iris-Scan, um Hufi schnell zu entsperren."
              : "Bestätige deine Identität mit Fingerabdruck oder Gesichtserkennung."}
          </p>

          {/* Not available warning */}
          {!available && (
            <div style={styles.unavailableNote}>
              ⚠️ Biometrie ist auf diesem Gerät oder Browser nicht verfügbar.
            </div>
          )}

          {/* Success message */}
          {successMsg && (
            <div style={styles.alertSuccess}>✓ {successMsg}</div>
          )}

          {/* Error message */}
          {errorMsg && (
            <div style={styles.alertError}>⚠️ {errorMsg}</div>
          )}

          {/* Primary action */}
          {available && !successMsg && (
            <button
              style={loading ? styles.btnDisabled : styles.btnPrimary}
              onClick={isSetup ? handleSetup : handleVerify}
              disabled={loading}
            >
              {loading && <span style={styles.spinner} />}
              {loading
                ? "Warte auf Gerät…"
                : isSetup
                ? "Jetzt einrichten"
                : "Entsperren"}
            </button>
          )}

          {/* Retry in verify mode after error */}
          {!isSetup && errorMsg && !loading && (
            <button
              style={styles.btnPrimary}
              onClick={handleVerify}
            >
              Erneut versuchen
            </button>
          )}

          {/* Cancel */}
          <button style={styles.btnSecondary} onClick={onCancel}>
            Abbrechen
          </button>
        </div>
      </div>
    </>
  );
}
