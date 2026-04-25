import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Trash2, Brain, FileText, Shield, ChevronRight, AlertTriangle } from "lucide-react";

const db = (table: string) =>
  (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

const CATEGORY_LABELS: Record<string, string> = {
  routine:       "Routine",
  preference:    "Einstellung",
  horse_pattern: "Pferd-Muster",
  client_note:   "Kunden-Notiz",
  alert:         "Alert",
  dsgvo:         "Datenschutz",
  permission:    "Berechtigung",
};

const TRIGGER_LABELS: Record<string, string> = {
  login:      "Login",
  voice:      "Sprache",
  manual:     "Manuell",
  timer:      "Timer",
  ai_action:  "KI-Aktion",
};

type MemoryEntry = {
  id: string;
  category: string;
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  source: string;
  last_updated: string;
};

type LogEntry = {
  id: string;
  trigger: string;
  context_snapshot: Record<string, unknown>;
  action_taken: string | null;
  user_feedback: string | null;
  created_at: string;
};

export default function MeinHufi() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"memory" | "log" | "dsgvo">("memory");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: memory = [], isLoading: memLoading } = useQuery({
    queryKey: ["hufi-memory", user?.id],
    queryFn: async () => {
      const { data } = await db("hufi_memory")
        .select("id, category, key, value, confidence, source, last_updated")
        .eq("user_id", user!.id)
        .order("last_updated", { ascending: false });
      return (data ?? []) as MemoryEntry[];
    },
    enabled: !!user,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["hufi-context-log", user?.id],
    queryFn: async () => {
      const { data } = await db("hufi_context_log")
        .select("id, trigger, context_snapshot, action_taken, user_feedback, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as LogEntry[];
    },
    enabled: !!user,
  });

  const deleteMemoryEntry = useMutation({
    mutationFn: async (id: string) => {
      await db("hufi_memory").delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hufi-memory"] }),
  });

  const deleteAllData = useMutation({
    mutationFn: async () => {
      await Promise.all([
        db("hufi_memory").delete().eq("user_id", user!.id),
        db("hufi_context_log").delete().eq("user_id", user!.id),
      ]);
      localStorage.removeItem("hufi-dsgvo-consent");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hufi-memory"] });
      queryClient.invalidateQueries({ queryKey: ["hufi-context-log"] });
      setDeleteConfirm(false);
    },
  });

  const tabs: Array<{ id: "memory" | "log" | "dsgvo"; label: string; icon: typeof Brain }> = [
    { id: "memory", label: "Gedächtnis", icon: Brain },
    { id: "log",    label: "Aktions-Log", icon: FileText },
    { id: "dsgvo",  label: "Datenschutz", icon: Shield },
  ];

  return (
    <div style={{ background: "#F9FAFB", minHeight: "100dvh", maxWidth: 680, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #F0F0F0", padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png" alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)", padding: "10%" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1A1A1A", margin: 0 }}>Mein Hufi</h1>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Transparenz & Datenschutz (EU AI Act)</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "none" }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: "10px 4px 12px",
                  background: "transparent",
                  border: "none",
                  borderBottom: active ? "2px solid #F97316" : "2px solid transparent",
                  color: active ? "#F97316" : "#9CA3AF",
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "16px 16px 80px" }}>

        {/* ── MEMORY TAB ─────────────────────────────────────────────────── */}
        {activeTab === "memory" && (
          <>
            <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 14, lineHeight: 1.5 }}>
              Hufi speichert diese Informationen, um dir proaktiv zu helfen. Du kannst jeden Eintrag einzeln löschen.
            </p>

            {memLoading && (
              <div style={{ textAlign: "center", padding: 40, color: "#9CA3AF", fontSize: 14 }}>
                Lade Gedächtnis…
              </div>
            )}

            {!memLoading && memory.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#9CA3AF", fontSize: 14 }}>
                Keine Einträge vorhanden.
              </div>
            )}

            {memory.map((entry) => (
              <div
                key={entry.id}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 10,
                  border: "1px solid #F0F0F0",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{
                      background: entry.category === "dsgvo" ? "rgba(239,68,68,0.1)" : "rgba(249,115,22,0.1)",
                      color: entry.category === "dsgvo" ? "#EF4444" : "#F97316",
                      borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700,
                    }}>
                      {CATEGORY_LABELS[entry.category] ?? entry.category}
                    </span>
                    <span style={{ fontSize: 10, color: "#9CA3AF" }}>
                      {entry.source} · {Math.round(entry.confidence * 100)}% Konfidenz
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", marginBottom: 2 }}>
                    {entry.key}
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", wordBreak: "break-word" }}>
                    {typeof entry.value === "object"
                      ? (entry.value.message as string ?? JSON.stringify(entry.value).slice(0, 120))
                      : String(entry.value)}
                  </div>
                  <div style={{ fontSize: 11, color: "#D1D5DB", marginTop: 4 }}>
                    {entry.last_updated
                      ? format(new Date(entry.last_updated), "d. MMM yyyy HH:mm", { locale: de })
                      : ""}
                  </div>
                </div>
                <button
                  onClick={() => deleteMemoryEntry.mutate(entry.id)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: "#D1D5DB", flexShrink: 0 }}
                  title="Löschen"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </>
        )}

        {/* ── LOG TAB ────────────────────────────────────────────────────── */}
        {activeTab === "log" && (
          <>
            <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 14, lineHeight: 1.5 }}>
              Jede KI-Entscheidung wird hier protokolliert (EU AI Act Art. 13). Du siehst, was Hufi getan hat und warum.
            </p>

            {logsLoading && (
              <div style={{ textAlign: "center", padding: 40, color: "#9CA3AF", fontSize: 14 }}>
                Lade Aktions-Log…
              </div>
            )}

            {!logsLoading && logs.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#9CA3AF", fontSize: 14 }}>
                Noch keine Aktionen protokolliert.
              </div>
            )}

            {logs.map((log) => {
              const isExpanded = expandedLog === log.id;
              const snapshot = log.context_snapshot as Record<string, unknown>;
              return (
                <div
                  key={log.id}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 10,
                    border: "1px solid #F0F0F0",
                    cursor: "pointer",
                  }}
                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{
                          background: "rgba(99,102,241,0.1)",
                          color: "#6366F1",
                          borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700,
                        }}>
                          {TRIGGER_LABELS[log.trigger] ?? log.trigger}
                        </span>
                        {log.user_feedback && (
                          <span style={{
                            background: log.user_feedback === "confirmed" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                            color: log.user_feedback === "confirmed" ? "#10B981" : "#EF4444",
                            borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700,
                          }}>
                            {log.user_feedback === "confirmed" ? "✓ Bestätigt" : log.user_feedback === "corrected" ? "✎ Korrigiert" : "— Ignoriert"}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.4 }}>
                        {log.action_taken?.slice(0, 80) ?? "Keine Aktion"}
                        {(log.action_taken?.length ?? 0) > 80 ? "…" : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "#D1D5DB", marginTop: 3 }}>
                        {log.created_at
                          ? format(new Date(log.created_at), "d. MMM yyyy HH:mm", { locale: de })
                          : ""}
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      style={{
                        color: "#D1D5DB",
                        transform: isExpanded ? "rotate(90deg)" : "none",
                        transition: "transform 0.15s",
                        flexShrink: 0,
                      }}
                    />
                  </div>

                  {isExpanded && (
                    <div style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid #F0F0F0",
                    }}>
                      {snapshot.explanation && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
                            Warum hat Hufi das entschieden?
                          </div>
                          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, background: "#F9FAFB", borderRadius: 8, padding: "8px 10px" }}>
                            {snapshot.explanation as string}
                          </div>
                        </div>
                      )}
                      {snapshot.userMessage && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
                            Deine Eingabe
                          </div>
                          <div style={{ fontSize: 13, color: "#374151", fontStyle: "italic" }}>
                            „{(snapshot.userMessage as string).slice(0, 200)}"
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── DSGVO TAB ─────────────────────────────────────────────────── */}
        {activeTab === "dsgvo" && (
          <>
            <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 18, marginBottom: 16, border: "1px solid #F0F0F0" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A", marginBottom: 12 }}>
                📋 Deine Rechte (DSGVO)
              </h3>
              {[
                { title: "Auskunft", desc: "Du siehst alle über dich gespeicherten Daten in diesem Bereich." },
                { title: "Löschung", desc: "Du kannst jeden Eintrag einzeln oder alle Hufi-Daten auf einmal löschen." },
                { title: "Widerspruch", desc: "Du kannst der KI-Verarbeitung jederzeit widersprechen." },
                { title: "Transparenz", desc: "Jede KI-Entscheidung ist im Aktions-Log einsehbar und erklärbar (EU AI Act Art. 13)." },
              ].map((r) => (
                <div key={r.title} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F97316", marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{r.title}: </span>
                    <span style={{ fontSize: 13, color: "#6B7280" }}>{r.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 18, marginBottom: 16, border: "1px solid #F0F0F0" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A", marginBottom: 8 }}>
                🤖 EU AI Act Compliance
              </h3>
              <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, margin: 0 }}>
                Hufi ist ein KI-Assistent nach EU AI Act. Jede automatische Entscheidung wird transparent gemacht,
                erklärt und kann vom Nutzer abgelehnt werden. Es gibt keine versteckten Aktionen.
                Alle KI-Aktionen sind im Aktions-Log protokolliert.
              </p>
            </div>

            {/* Delete all data */}
            <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 18, border: "1px solid #FEE2E2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <AlertTriangle size={16} style={{ color: "#EF4444" }} />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#EF4444", margin: 0 }}>
                  Alle Hufi-Daten löschen
                </h3>
              </div>
              <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5, marginBottom: 14 }}>
                Löscht dein gesamtes Hufi-Gedächtnis, den Aktions-Log und die Datenschutz-Einwilligung.
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>

              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  style={{
                    width: "100%", height: 44, borderRadius: 10,
                    background: "#FEF2F2", color: "#EF4444",
                    border: "1px solid #FECACA",
                    cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <Trash2 size={15} /> Alle Daten löschen
                </button>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    style={{ flex: 1, height: 44, borderRadius: 10, background: "#F3F4F6", color: "#6B7280", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => deleteAllData.mutate()}
                    disabled={deleteAllData.isPending}
                    style={{ flex: 2, height: 44, borderRadius: 10, background: "#EF4444", color: "#FFFFFF", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", opacity: deleteAllData.isPending ? 0.6 : 1 }}
                  >
                    {deleteAllData.isPending ? "Wird gelöscht…" : "Ja, alles löschen"}
                  </button>
                </div>
              )}
            </div>

            <p style={{ fontSize: 11, color: "#D1D5DB", textAlign: "center", marginTop: 16 }}>
              Hufi Brain v2.0 · DSGVO-konform · EU AI Act Art. 13
            </p>
          </>
        )}
      </div>
    </div>
  );
}
