import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DayCockpit } from "@/components/day-cockpit/DayCockpit";
import { ArrowLeft } from "lucide-react";
import type { CockpitState } from "@/components/day-cockpit/DayCockpit";

// ── Hufi comments per state ───────────────────────────────────────────────────

const HUFI_COMMENTS: Record<CockpitState, string> = {
  ready: "🗓️ Bereit für den Tag! Checkliste prüfen, Route optimieren — dann los.",
  underway: "🚀 Tour läuft! Hufi beobachtet im Hintergrund. Bei Bedarf einfach ansprechen.",
  complete: "✅ Super, Tour abgeschlossen! Alle Befunde dokumentiert? Ich erstelle die Zusammenfassung.",
};

// ── Log state transition to hufi_context_log ─────────────────────────────────

async function logCockpitState(userId: string, state: CockpitState): Promise<void> {
  try {
    const from = (t: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(t);
    await from("hufi_context_log").insert({
      user_id: userId,
      session_id: crypto.randomUUID(),
      trigger: "cockpit_state_change",
      context_snapshot: { cockpit_state: state, ts: new Date().toISOString() },
      action_taken: `cockpit_→_${state}`,
      explanation: HUFI_COMMENTS[state],
    });
  } catch { /* non-critical */ }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DayCockpitPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hufiComment, setHufiComment] = useState<string>(HUFI_COMMENTS.ready);
  const [showComment, setShowComment] = useState(true);

  useEffect(() => {
    if (user?.id) logCockpitState(user.id, "ready");
  }, [user?.id]);

  const handleStateChange = useCallback(
    (state: CockpitState) => {
      setHufiComment(HUFI_COMMENTS[state]);
      setShowComment(true);
      if (user?.id) logCockpitState(user.id, state);
      // Auto-dismiss after 7s
      const t = setTimeout(() => setShowComment(false), 7000);
      return () => clearTimeout(t);
    },
    [user?.id],
  );

  return (
    <div style={{ minHeight: "100dvh", background: "#F5F5F5", position: "relative" }}>
      {/* Sticky header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#FFFFFF",
          borderBottom: "1px solid #F0F0F0",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            color: "#6B7280",
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A", flex: 1 }}>
          Tages-Cockpit
        </span>
        <div
          style={{
            background: "rgba(249,115,22,0.1)",
            color: "#F97316",
            borderRadius: 20,
            padding: "3px 8px",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: ".06em",
            textTransform: "uppercase" as const,
          }}
        >
          HUFI
        </div>
      </div>

      {/* Hufi commentary banner */}
      {showComment && (
        <div
          style={{
            margin: "12px 16px 0",
            background: "rgba(249,115,22,0.06)",
            border: "1px solid rgba(249,115,22,0.2)",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            cursor: "pointer",
          }}
          onClick={() => setShowComment(false)}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: "#F97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <img src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png" alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)", padding: "10%" }} />
          </div>
          <span style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.45, flex: 1 }}>
            {hufiComment}
          </span>
          <span style={{ fontSize: 13, color: "#9CA3AF", flexShrink: 0 }}>×</span>
        </div>
      )}

      {/* Existing DayCockpit component — all logic lives there */}
      <DayCockpit onStateChange={handleStateChange} />
    </div>
  );
}
