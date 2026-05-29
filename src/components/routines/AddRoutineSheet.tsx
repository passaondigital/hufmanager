import { useState, useEffect } from "react";
import { X, Wand2, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  ROUTINE_TEMPLATES, interpretRoutineText, createRoutine, updateRoutine,
  templateToRoutine, type HufiRoutine, type RoutineTemplate,
} from "@/lib/hufi-routines";

interface Props {
  open: boolean;
  onClose: () => void;
  editRoutine: HufiRoutine | null;
  userId: string;
  onSaved: () => void;
}

type Step = "choose" | "template_confirm" | "custom_input" | "custom_confirm";

export function AddRoutineSheet({ open, onClose, editRoutine, userId, onSaved }: Props) {
  const [step, setStep] = useState<Step>("choose");
  const [selectedTemplate, setSelectedTemplate] = useState<RoutineTemplate | null>(null);
  const [customText, setCustomText] = useState("");
  const [interpreted, setInterpreted] = useState<Partial<HufiRoutine> | null>(null);
  const [interpreting, setInterpreting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Draft for editing template fields
  const [draft, setDraft] = useState<Partial<HufiRoutine>>({});

  useEffect(() => {
    if (open) {
      if (editRoutine) {
        setDraft({
          label: editRoutine.label,
          description: editRoutine.description,
          trigger_type: editRoutine.trigger_type,
          trigger_config: { ...editRoutine.trigger_config },
          action_type: editRoutine.action_type,
          action_config: { ...editRoutine.action_config },
          icon: editRoutine.icon,
          color: editRoutine.color,
          enabled: editRoutine.enabled,
        });
        setStep("custom_confirm");
        setInterpreted(editRoutine);
      } else {
        setStep("choose");
        setSelectedTemplate(null);
        setCustomText("");
        setInterpreted(null);
        setDraft({});
      }
    }
  }, [open, editRoutine]);

  async function handleInterpret() {
    if (!customText.trim()) return;
    setInterpreting(true);
    try {
      const result = await interpretRoutineText(customText);
      if (!result) {
        toast.error("Hufi konnte das nicht verstehen. Versuche es klarer zu formulieren.");
        return;
      }
      setInterpreted(result);
      setDraft(result);
      setStep("custom_confirm");
    } finally {
      setInterpreting(false);
    }
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      const base = selectedTemplate ? templateToRoutine(selectedTemplate) : interpreted ?? {};
      const final = { ...base, ...draft } as Omit<HufiRoutine, "id" | "user_id" | "created_at" | "last_triggered_at" | "trigger_count">;

      if (!final.label || !final.trigger_type || !final.action_type) {
        toast.error("Pflichtfelder fehlen");
        return;
      }

      if (editRoutine) {
        await updateRoutine(editRoutine.id, draft);
        toast.success("Routine aktualisiert");
      } else {
        await createRoutine(userId, final);
        toast.success(`Routine "${final.label}" angelegt`);
      }
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Maximum")) toast.error("Maximale Anzahl Routinen (10) erreicht");
      else toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 60,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%",
        transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        zIndex: 61,
        background: "#FFFFFF",
        borderRadius: "20px 20px 0 0",
        padding: "20px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)",
        maxHeight: "90dvh",
        overflowY: "auto",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
      }}>
        {/* Handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: "#E5E7EB", margin: "0 auto 16px",
        }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
            {editRoutine ? "Routine bearbeiten" : "Neue Routine"}
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#F3F4F6", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={14} style={{ color: "#6B7280" }} />
          </button>
        </div>

        {/* ── Step: choose ──────────────────────────────────────────────────── */}
        {step === "choose" && (
          <>
            {/* Custom text input */}
            <div style={{
              background: "#FFFBF5",
              border: "1.5px solid rgba(249,115,22,0.25)",
              borderRadius: 14, padding: 14, marginBottom: 20,
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#F97316", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: ".04em" }}>
                Eigene Routine beschreiben
              </p>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder='z.B. "Erinnere mich jeden Montag um 8 Uhr an die Wochenplanung"'
                rows={3}
                style={{
                  width: "100%", borderRadius: 10, border: "1px solid #F0F0F0",
                  background: "#FFFFFF", padding: "10px 12px",
                  fontSize: 13, color: "#1A1A1A", lineHeight: 1.5,
                  resize: "none", outline: "none", fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={handleInterpret}
                disabled={!customText.trim() || interpreting}
                style={{
                  marginTop: 10, height: 38, borderRadius: 10,
                  background: customText.trim() ? "#F97316" : "#E5E7EB",
                  border: "none",
                  color: customText.trim() ? "#FFFFFF" : "#9CA3AF",
                  fontSize: 13, fontWeight: 700,
                  padding: "0 16px", cursor: customText.trim() ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {interpreting
                  ? <><Loader2 size={14} className="animate-spin" /> Hufi interpretiert…</>
                  : <><Wand2 size={14} /> Hufi interpretieren lassen</>
                }
              </button>
            </div>

            {/* Template gallery */}
            <p style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: ".05em" }}>
              Oder Vorlage wählen
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ROUTINE_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setSelectedTemplate(t); setDraft(templateToRoutine(t)); setStep("template_confirm"); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "#F9FAFB", border: "1px solid #F0F0F0",
                    borderRadius: 12, padding: "11px 12px",
                    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    transition: "border-color 0.15s",
                  }}
                >
                  <span style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: t.color, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>
                    {t.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, lineHeight: 1.4 }}>{t.description}</div>
                  </div>
                  <ChevronRight size={14} style={{ color: "#D1D5DB", flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step: template confirm ─────────────────────────────────────────── */}
        {(step === "template_confirm" || step === "custom_confirm") && (selectedTemplate || interpreted) && (
          <>
            <RoutinePreview draft={draft} onUpdate={setDraft} />

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              {!editRoutine && (
                <button
                  onClick={() => setStep("choose")}
                  style={{
                    flex: 1, height: 44, borderRadius: 12,
                    background: "#F3F4F6", border: "none",
                    color: "#6B7280", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Zurück
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 2, height: 44, borderRadius: 12,
                  background: saving ? "#E5E7EB" : "#F97316",
                  border: "none",
                  color: saving ? "#9CA3AF" : "#FFFFFF",
                  fontSize: 14, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Speichern…</>
                  : editRoutine ? "Speichern" : "Routine anlegen"
                }
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Inline editable preview ────────────────────────────────────────────────────

function RoutinePreview({
  draft,
  onUpdate,
}: {
  draft: Partial<HufiRoutine>;
  onUpdate: (d: Partial<HufiRoutine>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Icon + Label */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: draft.color ?? "#F97316",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, flexShrink: 0,
        }}>
          {draft.icon ?? "⚡"}
        </div>
        <div style={{ flex: 1 }}>
          <input
            value={draft.label ?? ""}
            onChange={(e) => onUpdate({ ...draft, label: e.target.value })}
            placeholder="Name der Routine"
            style={{
              width: "100%", fontSize: 15, fontWeight: 700, color: "#1A1A1A",
              border: "none", borderBottom: "1.5px solid #F0F0F0",
              outline: "none", background: "transparent",
              paddingBottom: 4, fontFamily: "inherit",
            }}
          />
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
            {draft.description}
          </div>
        </div>
      </div>

      {/* Trigger time (daily_time / weekly) */}
      {(draft.trigger_type === "daily_time" || draft.trigger_type === "weekly") && (
        <Field label="Uhrzeit">
          <input
            type="time"
            value={draft.trigger_config?.time ?? "07:00"}
            onChange={(e) => onUpdate({
              ...draft,
              trigger_config: { ...draft.trigger_config, time: e.target.value },
            })}
            style={{
              height: 36, borderRadius: 8, border: "1px solid #E5E7EB",
              background: "#F9FAFB", padding: "0 10px",
              fontSize: 14, fontFamily: "inherit", outline: "none",
            }}
          />
        </Field>
      )}

      {/* Weekday (weekly) */}
      {draft.trigger_type === "weekly" && (
        <Field label="Wochentag">
          <select
            value={draft.trigger_config?.weekday ?? 0}
            onChange={(e) => onUpdate({
              ...draft,
              trigger_config: { ...draft.trigger_config, weekday: Number(e.target.value) },
            })}
            style={{
              height: 36, borderRadius: 8, border: "1px solid #E5E7EB",
              background: "#F9FAFB", padding: "0 10px",
              fontSize: 14, fontFamily: "inherit", outline: "none",
            }}
          >
            {["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"].map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
        </Field>
      )}

      {/* Days (interval) */}
      {draft.trigger_type === "interval_days" && (
        <Field label="Intervall (Tage)">
          <input
            type="number"
            min={1} max={365}
            value={draft.trigger_config?.days ?? 14}
            onChange={(e) => onUpdate({
              ...draft,
              trigger_config: { ...draft.trigger_config, days: Number(e.target.value) },
            })}
            style={{
              width: 80, height: 36, borderRadius: 8, border: "1px solid #E5E7EB",
              background: "#F9FAFB", padding: "0 10px",
              fontSize: 14, fontFamily: "inherit", outline: "none",
            }}
          />
        </Field>
      )}

      {/* Action message */}
      {(draft.action_type === "notification" || draft.action_type === "hufi_message") && (
        <Field label="Nachricht">
          <input
            value={draft.action_config?.message ?? ""}
            onChange={(e) => onUpdate({
              ...draft,
              action_config: { ...draft.action_config, message: e.target.value },
            })}
            placeholder="Was soll Hufi schreiben?"
            style={{
              flex: 1, height: 36, borderRadius: 8, border: "1px solid #E5E7EB",
              background: "#F9FAFB", padding: "0 10px",
              fontSize: 13, fontFamily: "inherit", outline: "none",
            }}
          />
        </Field>
      )}

      {/* AI prompt */}
      {draft.action_type === "ai_briefing" && (
        <Field label="KI-Anweisung">
          <textarea
            value={draft.action_config?.prompt ?? ""}
            onChange={(e) => onUpdate({
              ...draft,
              action_config: { ...draft.action_config, prompt: e.target.value },
            })}
            rows={2}
            placeholder="Was soll Hufi analysieren und zusammenfassen?"
            style={{
              flex: 1, borderRadius: 8, border: "1px solid #E5E7EB",
              background: "#F9FAFB", padding: "8px 10px",
              fontSize: 13, fontFamily: "inherit", outline: "none",
              resize: "none", lineHeight: 1.5,
            }}
          />
        </Field>
      )}

      {/* Action type badge */}
      <div style={{ display: "flex", gap: 6 }}>
        {["notification","ai_briefing","hufi_message"].map((t) => (
          <button
            key={t}
            onClick={() => onUpdate({ ...draft, action_type: t as HufiRoutine["action_type"] })}
            style={{
              height: 28, borderRadius: 8, border: "1.5px solid",
              borderColor: draft.action_type === t ? (draft.color ?? "#F97316") : "#E5E7EB",
              background: draft.action_type === t ? `${draft.color ?? "#F97316"}15` : "#F9FAFB",
              color: draft.action_type === t ? (draft.color ?? "#F97316") : "#9CA3AF",
              fontSize: 11, fontWeight: 600, padding: "0 10px",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {t === "notification" ? "📲 Push" : t === "ai_briefing" ? "🧠 KI-Briefing" : "💬 Hufi-Chat"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", width: 100, flexShrink: 0, paddingTop: 8 }}>
        {label}
      </span>
      <div style={{ flex: 1, display: "flex" }}>{children}</div>
    </div>
  );
}
