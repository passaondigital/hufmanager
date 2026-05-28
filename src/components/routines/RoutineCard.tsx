import { useState } from "react";
import { Pencil, Trash2, ChevronRight } from "lucide-react";
import { type HufiRoutine, describeTrigger, describeAction } from "@/lib/hufi-routines";

interface Props {
  routine: HufiRoutine;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function RoutineCard({ routine, onToggle, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const nextLabel = routine.next_trigger_at
    ? new Date(routine.next_trigger_at).toLocaleString("de-DE", {
        weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div style={{
      background: routine.enabled ? "#FFFFFF" : "#FAFAFA",
      border: `1px solid ${routine.enabled ? "rgba(0,0,0,0.07)" : "#F0F0F0"}`,
      borderRadius: 14,
      padding: "13px 14px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      transition: "all 0.15s",
      opacity: routine.enabled ? 1 : 0.7,
    }}>
      {/* Icon */}
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: routine.enabled ? routine.color : "#E5E7EB",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
        transition: "background 0.2s",
      }}>
        {routine.icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600,
          color: routine.enabled ? "#1A1A1A" : "#9CA3AF",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {routine.label}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          <span style={{
            fontSize: 11, color: "#9CA3AF",
            background: "#F3F4F6", borderRadius: 6,
            padding: "1px 6px", fontWeight: 500,
          }}>
            {describeTrigger(routine.trigger_type, routine.trigger_config)}
          </span>
          <span style={{
            fontSize: 11, color: routine.enabled ? routine.color : "#9CA3AF",
            background: routine.enabled ? `${routine.color}15` : "#F3F4F6",
            borderRadius: 6, padding: "1px 6px", fontWeight: 500,
          }}>
            {describeAction(routine.action_type)}
          </span>
        </div>
        {nextLabel && routine.enabled && (
          <div style={{ fontSize: 10, color: "#C4C4C4", marginTop: 3 }}>
            nächstes Mal: {nextLabel}
          </div>
        )}
        {routine.trigger_count > 0 && (
          <div style={{ fontSize: 10, color: "#D1D5DB", marginTop: 1 }}>
            {routine.trigger_count}× ausgeführt
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {confirmDelete ? (
          <>
            <button
              onClick={() => onDelete()}
              style={{
                height: 30, borderRadius: 8, background: "#EF4444",
                border: "none", color: "#FFFFFF", fontSize: 12, fontWeight: 700,
                padding: "0 10px", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Löschen
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                height: 30, borderRadius: 8, background: "#F3F4F6",
                border: "none", color: "#6B7280", fontSize: 12,
                padding: "0 10px", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Nein
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onEdit}
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: "#F3F4F6", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Pencil size={13} style={{ color: "#6B7280" }} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: "#FEF2F2", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} style={{ color: "#EF4444" }} />
            </button>
            {/* Toggle */}
            <button
              onClick={() => onToggle(!routine.enabled)}
              aria-label={routine.enabled ? "Deaktivieren" : "Aktivieren"}
              style={{
                width: 44, height: 26, borderRadius: 13, border: "none",
                background: routine.enabled ? routine.color : "#D1D5DB",
                position: "relative", cursor: "pointer",
                transition: "background .2s", flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute",
                top: 3, left: routine.enabled ? 21 : 3,
                width: 20, height: 20, borderRadius: "50%",
                background: "#FFFFFF",
                boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                transition: "left .2s",
              }} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
