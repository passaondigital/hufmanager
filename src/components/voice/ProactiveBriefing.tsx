import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Volume2, CalendarDays, Receipt, CloudSun, Lightbulb } from "lucide-react";
import { useHufiTTS } from "@/hooks/useHufiTTS";
import { useAuth } from "@/hooks/useAuth";
import type { BriefingPayload, BriefingSection } from "@/lib/hufi-briefing";

interface Props {
  payload: BriefingPayload;
  onDismiss: () => void;
}

const SECTION_ICONS: Record<BriefingSection["type"], typeof CalendarDays> = {
  appointments: CalendarDays,
  route: CalendarDays,
  weather: CloudSun,
  invoices: Receipt,
  horses: Lightbulb,
  leads: Lightbulb,
};

export function ProactiveBriefing({ payload, onDismiss }: Props) {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { speak, cancel, isSupported } = useHufiTTS(user?.id ?? "", role);

  // Once-per-Tag-Markierung passiert bereits in MobileShell.tsx, bevor der
  // Payload gebaut wird -- ein zweiter Aufruf hier war Teil der State-
  // Kollision zwischen den beiden früheren Briefing-Systemen (siehe
  // AGENT_ANALYSE.md Etappe 4).
  useEffect(() => {
    return () => { cancel(); };
  }, [cancel]);

  const handleAction = (route: string) => {
    cancel();
    onDismiss();
    navigate(route);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 76,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        zIndex: "var(--z-fab)",
        padding: "0 12px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 20,
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 10px",
          borderBottom: "1px solid #F3F4F6",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "#F97316",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <img
                src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png"
                alt="Hufi"
                style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)", padding: 4 }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", lineHeight: 1 }}>Tages-Briefing</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>Hufi</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {isSupported && (
              <button
                onClick={() => speak([payload.greeting, ...payload.sections.map((s) => s.spoken)].join(" "))}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: "transparent", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#9CA3AF",
                }}
                aria-label="Vorlesen"
              >
                <Volume2 size={15} />
              </button>
            )}
            <button
              onClick={onDismiss}
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: "transparent", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#9CA3AF",
              }}
              aria-label="Schließen"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Greeting + Sections */}
        <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              background: "rgba(249,115,22,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: 1,
            }}>
              <CalendarDays size={12} style={{ color: "#F97316" }} />
            </div>
            <p style={{ fontSize: 13, color: "#111827", fontWeight: 600, lineHeight: 1.45, margin: 0 }}>
              {payload.greeting}
            </p>
          </div>
          {payload.sections.map((section, i) => {
            const Icon = SECTION_ICONS[section.type] ?? Lightbulb;
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                  background: "#F9FAFB",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginTop: 1,
                }}>
                  <Icon size={12} style={{ color: "#6B7280" }} />
                </div>
                <p style={{ fontSize: 13, color: "#4B5563", fontWeight: 400, lineHeight: 1.45, margin: 0 }}>
                  {section.content}
                </p>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        {payload.sections.some((s) => s.action) && (
          <div style={{ padding: "8px 16px 14px", display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            {payload.sections.filter((s) => s.action).map((section) => (
              <button
                key={section.action!.route}
                onClick={() => handleAction(section.action!.route)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  background: "rgba(249,115,22,0.08)",
                  color: "#F97316",
                  border: "1px solid rgba(249,115,22,0.2)",
                  cursor: "pointer",
                }}
              >
                {section.action!.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
