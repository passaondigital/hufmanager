import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MemoryRow {
  id: string;
  user_id: string;
  category: string;
  key: string;
  value: Record<string, unknown>;
  source: string;
  last_updated: string;
}

interface HufiMemoryViewerProps {
  userId: string;
  onClose: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatValue(value: Record<string, unknown>): string {
  if (typeof value === "string") return value;
  const keys = Object.keys(value);
  if (keys.length === 1) {
    const v = value[keys[0]];
    return String(v);
  }
  return JSON.stringify(value);
}

export function HufiMemoryViewer({ userId, onClose }: HufiMemoryViewerProps) {
  const [rows, setRows] = useState<MemoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadMemory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadMemory() {
    setLoading(true);
    try {
      const from = (table: string) =>
        (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

      const { data } = await from("hufi_memory")
        .select("id, user_id, category, key, value, source, last_updated")
        .eq("user_id", userId)
        .order("last_updated", { ascending: false })
        .limit(30) as { data: MemoryRow[] | null };

      setRows(data ?? []);
    } catch (err) {
      console.warn("[HufiMemoryViewer] load failed:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const from = (table: string) =>
        (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

      await from("hufi_memory").delete().eq("id", id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.warn("[HufiMemoryViewer] delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "12px",
        padding: "20px",
        maxWidth: "540px",
        width: "100%",
        boxSizing: "border-box",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
      }}
    >
      {/* Header */}
      <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1A1A1A", margin: "0 0 6px 0" }}>
        Was Hufi über dich weiß
      </h2>
      <p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 16px 0", lineHeight: "1.5" }}>
        Hufi merkt sich Informationen, um dir besser helfen zu können. Du kannst Einträge löschen.
      </p>

      {/* Content */}
      {loading ? (
        <p style={{ fontSize: "13px", color: "#9CA3AF", textAlign: "center", padding: "20px 0" }}>
          Wird geladen...
        </p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#9CA3AF", textAlign: "center", padding: "20px 0" }}>
          Hufi hat noch nichts gespeichert.
        </p>
      ) : (
        <ul style={{ margin: "0 0 16px 0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
          {rows.map((row) => (
            <li
              key={row.id}
              style={{
                background: "#FAFAFA",
                borderRadius: "8px",
                padding: "10px 12px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                border: "1px solid #F3F4F6",
              }}
            >
              {/* Left content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Category badge */}
                <span
                  style={{
                    display: "inline-block",
                    background: "#FFF7ED",
                    color: "#F97316",
                    border: "1px solid #FDBA74",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: "700",
                    padding: "1px 6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: "4px",
                  }}
                >
                  {row.category}
                </span>

                {/* Key */}
                <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "0 0 2px 0" }}>
                  {row.key}
                </p>

                {/* Value */}
                <p style={{ fontSize: "13px", fontWeight: "600", color: "#1A1A1A", margin: "0 0 4px 0", wordBreak: "break-word" }}>
                  {formatValue(row.value)}
                </p>

                {/* Date */}
                <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "0" }}>
                  {formatDate(row.last_updated)} · {row.source}
                </p>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(row.id)}
                disabled={deletingId === row.id}
                aria-label="Eintrag löschen"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: deletingId === row.id ? "not-allowed" : "pointer",
                  color: "#D1D5DB",
                  fontSize: "16px",
                  lineHeight: "1",
                  padding: "2px 4px",
                  borderRadius: "4px",
                  flexShrink: 0,
                  opacity: deletingId === row.id ? 0.5 : 1,
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          width: "100%",
          background: "transparent",
          color: "#6B7280",
          border: "1px solid #D1D5DB",
          borderRadius: "8px",
          padding: "10px",
          fontSize: "14px",
          fontWeight: "500",
          cursor: "pointer",
        }}
      >
        Schließen
      </button>
    </div>
  );
}

export default HufiMemoryViewer;
