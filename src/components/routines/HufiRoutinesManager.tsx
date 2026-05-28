import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  getRoutines, toggleRoutine, deleteRoutine,
  type HufiRoutine,
} from "@/lib/hufi-routines";
import { RoutineCard } from "./RoutineCard";
import { AddRoutineSheet } from "./AddRoutineSheet";

export function HufiRoutinesManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editRoutine, setEditRoutine] = useState<HufiRoutine | null>(null);

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ["hufi_routines", user?.id],
    queryFn: () => getRoutines(user!.id),
    enabled: !!user?.id,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toggleRoutine(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hufi_routines"] }),
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRoutine(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hufi_routines"] });
      toast.success("Routine gelöscht");
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  const activeCount = routines.filter((r) => r.enabled).length;
  const canAdd = routines.length < 10;

  return (
    <div style={{ padding: "0 0 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
            Meine Routinen
          </h3>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: "3px 0 0" }}>
            {routines.length} / 10 · {activeCount} aktiv
          </p>
        </div>
        <button
          onClick={() => { setEditRoutine(null); setAddOpen(true); }}
          disabled={!canAdd}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            height: 36, borderRadius: 10,
            background: canAdd ? "#F97316" : "#E5E7EB",
            border: "none",
            color: canAdd ? "#FFFFFF" : "#9CA3AF",
            fontSize: 13, fontWeight: 700,
            padding: "0 14px", cursor: canAdd ? "pointer" : "not-allowed",
            fontFamily: "inherit",
          }}
        >
          <Plus size={14} />
          Hinzufügen
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "#F0F0F0", borderRadius: 2, marginBottom: 20 }}>
        <div style={{
          height: "100%", borderRadius: 2,
          background: routines.length >= 8 ? "#EF4444" : "#F97316",
          width: `${(routines.length / 10) * 100}%`,
          transition: "width 0.3s",
        }} />
      </div>

      {/* Empty state */}
      {!isLoading && routines.length === 0 && (
        <div style={{
          textAlign: "center", padding: "40px 20px",
          background: "#FAFAFA", borderRadius: 16,
          border: "1.5px dashed #E5E7EB",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: "0 0 6px" }}>
            Noch keine Routinen
          </p>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 16px" }}>
            Lass Hufi für dich arbeiten — automatisch und personalisiert.
          </p>
          <button
            onClick={() => setAddOpen(true)}
            style={{
              height: 40, borderRadius: 10, background: "#F97316",
              border: "none", color: "#FFFFFF", fontSize: 13, fontWeight: 700,
              padding: "0 20px", cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <Zap size={14} /> Erste Routine anlegen
          </button>
        </div>
      )}

      {/* Routine list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {routines.map((r) => (
          <RoutineCard
            key={r.id}
            routine={r}
            onToggle={(enabled) => toggleMut.mutate({ id: r.id, enabled })}
            onEdit={() => { setEditRoutine(r); setAddOpen(true); }}
            onDelete={() => deleteMut.mutate(r.id)}
          />
        ))}
      </div>

      {/* Add / Edit Sheet */}
      <AddRoutineSheet
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditRoutine(null); }}
        editRoutine={editRoutine}
        userId={user?.id ?? ""}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["hufi_routines"] });
          setAddOpen(false);
          setEditRoutine(null);
        }}
      />
    </div>
  );
}
