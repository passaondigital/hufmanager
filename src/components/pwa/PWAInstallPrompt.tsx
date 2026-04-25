import { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const DISMISSED_KEY = "hufi-pwa-dismissed";
const DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const SHOW_DELAY_MS = 30_000; // 30 seconds

export function PWAInstallPrompt() {
  const { canInstall, isInstalled, isIOS, isMacSafari, promptInstall } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    if (isInstalled) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - parseInt(dismissed) < DISMISSED_DURATION) return;

    if (!canInstall && !isIOS && !isMacSafari) return;

    const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [canInstall, isInstalled, isIOS, isMacSafari]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setVisible(false);
    setShowIOSSteps(false);
  }

  async function handleInstall() {
    if (canInstall) {
      await promptInstall();
      setVisible(false);
    } else if (isIOS || isMacSafari) {
      setShowIOSSteps(true);
    }
  }

  if (!visible) return null;

  // iOS step-by-step instructions
  if (showIOSSteps) {
    return (
      <Overlay>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <HufiIcon size={44} />
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A", margin: 0 }}>Hufi installieren</p>
              <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Zum Home-Bildschirm hinzufügen</p>
            </div>
          </div>
          <CloseBtn onClick={dismiss} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { n: 1, text: <span>Tippe auf <Share size={14} style={{ display: "inline", verticalAlign: "middle", color: "#3B82F6" }} /> <strong>Teilen</strong> in der Safari-Leiste</span> },
            { n: 2, text: <span>Wähle <Plus size={14} style={{ display: "inline", verticalAlign: "middle" }} /> <strong>Zum Home-Bildschirm</strong></span> },
            { n: 3, text: <span>Tippe auf <strong>Hinzufügen</strong> – fertig!</span> },
          ].map(({ n, text }) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, background: "#F9FAFB", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "#FFF", fontWeight: 700, fontSize: 13 }}>{n}</span>
              </div>
              <span style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.4 }}>{text}</span>
            </div>
          ))}
        </div>

        <button onClick={dismiss} style={btnStyle("#F97316", "#FFFFFF", true)}>
          Verstanden
        </button>
      </Overlay>
    );
  }

  // Main install banner
  return (
    <Overlay>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <HufiIcon size={52} />
          <div>
            <p style={{ fontWeight: 800, fontSize: 18, color: "#1A1A1A", margin: 0, letterSpacing: "-0.3px" }}>
              Hufi installieren
            </p>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "3px 0 0", lineHeight: 1.4 }}>
              Installiere die App auf deinem Smartphone
            </p>
          </div>
        </div>
        <CloseBtn onClick={dismiss} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={dismiss} style={btnStyle("#F3F4F6", "#6B7280", false)}>
          Später
        </button>
        <button onClick={handleInstall} style={btnStyle("#F97316", "#FFFFFF", true)}>
          Weiter
        </button>
      </div>
    </Overlay>
  );
}

/* ── Shared sub-components ──────────────────────────── */

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 98 }} />
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99,
        background: "#FFFFFF",
        borderRadius: "24px 24px 0 0",
        padding: "28px 20px 40px",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.12)",
      }}>
        {children}
      </div>
    </>
  );
}

function HufiIcon({ size }: { size: number }) {
  const r = Math.round(size * 0.22);
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: r,
      background: "#F97316",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 14px rgba(249,115,22,0.35)",
      flexShrink: 0,
      overflow: "hidden",
      padding: size * 0.1,
    }}>
      <img
        src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png"
        alt="Hufi"
        style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)" }}
      />
    </div>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 32, height: 32, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <X size={16} style={{ color: "#9CA3AF" }} />
    </button>
  );
}

function btnStyle(bg: string, color: string, primary: boolean): React.CSSProperties {
  return {
    flex: primary ? 2 : 1,
    height: 48,
    borderRadius: 12,
    background: bg,
    color,
    border: "none",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "inherit",
    boxShadow: primary ? "0 4px 14px rgba(249,115,22,0.3)" : "none",
  };
}
