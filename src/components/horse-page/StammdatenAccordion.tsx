import { useState } from "react";
import { ChevronDown, Pencil, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Horse } from "@/components/horse-detail/types";
import {
  HOLDING_TYPE_OPTIONS,
  USAGE_TYPE_OPTIONS,
  HOOF_PROTECTION_OPTIONS,
} from "@/components/horse-detail/types";

interface StammdatenAccordionProps {
  horse: Horse;
  onHorseUpdate?: (horse: Horse) => void;
}

interface FieldDef {
  label: string;
  value: string | null | undefined;
  field: string; // DB field name
  type: "text" | "select";
  options?: readonly { value: string; label: string }[];
  nested?: string; // for contacts.vet etc.
}

interface AccordionSection {
  title: string;
  fields: FieldDef[];
}

export function StammdatenAccordion({ horse, onHorseUpdate }: StammdatenAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  const age = horse.birth_year ? new Date().getFullYear() - horse.birth_year : null;
  const genderLabel =
    horse.gender === "gelding" ? "Wallach" :
    horse.gender === "mare" ? "Stute" :
    horse.gender === "stallion" ? "Hengst" : horse.gender;
  const holdingType = HOLDING_TYPE_OPTIONS.find((h) => h.value === horse.holding_type);
  const usageType = USAGE_TYPE_OPTIONS.find((u) => u.value === horse.usage_type);
  const hoofProt = HOOF_PROTECTION_OPTIONS.find((p) => p.value === horse.hoof_protection);

  const sections: AccordionSection[] = [
    {
      title: "Besitzdaten",
      fields: [
        { label: "Name", value: horse.name, field: "name", type: "text" },
        { label: "Rufname", value: horse.nickname, field: "nickname", type: "text" },
        { label: "Rasse", value: horse.breed, field: "breed", type: "text" },
        { label: "Alter", value: age ? `${age} Jahre` : null, field: "birth_year", type: "text" },
        { label: "Geschlecht", value: genderLabel, field: "gender", type: "select", options: [
          { value: "gelding", label: "Wallach" },
          { value: "mare", label: "Stute" },
          { value: "stallion", label: "Hengst" },
        ] as any },
        { label: "Farbe", value: horse.color, field: "color", type: "text" },
        { label: "Standort", value: horse.location_name, field: "location_name", type: "text" },
      ],
    },
    {
      title: "Haltung & Nutzung",
      fields: [
        { label: "Haltungsform", value: holdingType?.label, field: "holding_type", type: "select", options: HOLDING_TYPE_OPTIONS as any },
        { label: "Nutzung", value: usageType?.label || horse.usage, field: "usage_type", type: "select", options: USAGE_TYPE_OPTIONS as any },
        { label: "Hufschutz", value: hoofProt?.label || "Barhuf", field: "hoof_protection", type: "select", options: HOOF_PROTECTION_OPTIONS as any },
        { label: "Beschlagintervall", value: horse.shoeing_interval ? `${horse.shoeing_interval} Wochen` : null, field: "shoeing_interval", type: "text" },
        { label: "Fütterung", value: horse.feeding_notes, field: "feeding_notes", type: "text" },
      ],
    },
    {
      title: "Kontakt & Vertrag",
      fields: [
        { label: "Tierarzt", value: horse.contacts?.vet, field: "contacts", type: "text", nested: "vet" },
        { label: "TA Telefon", value: horse.contacts?.vet_phone, field: "contacts", type: "text", nested: "vet_phone" },
        { label: "Trainer", value: horse.contacts?.trainer, field: "contacts", type: "text", nested: "trainer" },
        { label: "Stall", value: horse.contacts?.stable, field: "contacts", type: "text", nested: "stable" },
        { label: "Chip-Nr.", value: horse.chip_number, field: "chip_number", type: "text" },
      ],
    },
  ];

  const startEdit = (fieldKey: string, currentValue: string | null | undefined) => {
    setEditingField(fieldKey);
    setEditValue(currentValue || "");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveField = async (fieldDef: FieldDef) => {
    setSaving(true);
    try {
      let updateData: Record<string, any> = {};

      if (fieldDef.nested) {
        // Update nested contacts object
        const contacts = { ...(horse.contacts || {}) };
        contacts[fieldDef.nested] = editValue || undefined;
        updateData = { contacts };
      } else if (fieldDef.field === "birth_year") {
        const parsed = parseInt(editValue);
        if (isNaN(parsed)) {
          toast.error("Bitte ein gültiges Geburtsjahr eingeben");
          setSaving(false);
          return;
        }
        updateData = { birth_year: parsed };
      } else if (fieldDef.field === "shoeing_interval") {
        const parsed = parseInt(editValue);
        updateData = { shoeing_interval: isNaN(parsed) ? null : parsed };
      } else {
        updateData = { [fieldDef.field]: editValue || null };
      }

      const { error } = await supabase
        .from("horses")
        .update(updateData)
        .eq("id", horse.id);

      if (error) throw error;

      // Update local state
      const updatedHorse = { ...horse, ...updateData };
      if (fieldDef.nested) {
        updatedHorse.contacts = { ...(horse.contacts || {}), [fieldDef.nested]: editValue || undefined };
      }
      onHorseUpdate?.(updatedHorse);
      toast.success("Gespeichert");
      cancelEdit();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const getFieldKey = (fieldDef: FieldDef) =>
    fieldDef.nested ? `${fieldDef.field}.${fieldDef.nested}` : fieldDef.field;

  const getRawValue = (fieldDef: FieldDef): string => {
    if (fieldDef.nested) return (horse.contacts as any)?.[fieldDef.nested] || "";
    if (fieldDef.field === "birth_year") return horse.birth_year?.toString() || "";
    if (fieldDef.field === "shoeing_interval") return horse.shoeing_interval?.toString() || "";
    return (horse as any)[fieldDef.field] || "";
  };

  return (
    <div className="px-4">
      <div className="hp-section-header">
        <span className="hp-section-title">Stammdaten</span>
      </div>

      <div className="flex flex-col gap-2">
        {sections.map((section, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={section.title}
              className="rounded-lg overflow-hidden"
              style={{ background: "var(--hp-bg2)", border: "0.5px solid var(--hp-border)" }}
            >
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--hp-bg3)] transition-colors"
                aria-expanded={isOpen}
              >
                <span className="text-[13px] font-medium text-[var(--hp-text2)]">{section.title}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[var(--hp-text3)] transition-transform duration-[250ms] ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div className={`hp-accordion-body ${isOpen ? "open" : ""}`}>
                <div className="px-4 pb-1">
                  {section.fields.map((fieldDef) => {
                    const fieldKey = getFieldKey(fieldDef);
                    const isEditing = editingField === fieldKey;
                    const displayValue = fieldDef.value;

                    return (
                      <div
                        key={fieldKey}
                        className="flex items-center justify-between py-2 gap-2"
                        style={{ borderBottom: "0.5px solid var(--hp-border)" }}
                      >
                        <span className="text-[12px] text-[var(--hp-text3)] flex-shrink-0">{fieldDef.label}</span>

                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1 justify-end">
                            {fieldDef.type === "select" && fieldDef.options ? (
                              <select
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="bg-[var(--hp-bg3)] text-[var(--hp-text)] text-[12px] rounded px-2 py-1 border border-[var(--hp-border)] max-w-[140px]"
                              >
                                <option value="">—</option>
                                {fieldDef.options.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="bg-[var(--hp-bg3)] text-[var(--hp-text)] text-[12px] rounded px-2 py-1 border border-[var(--hp-border)] w-full max-w-[140px]"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveField(fieldDef);
                                  if (e.key === "Escape") cancelEdit();
                                }}
                              />
                            )}
                            <button
                              onClick={() => saveField(fieldDef)}
                              disabled={saving}
                              className="p-1 rounded hover:bg-[var(--hp-bg3)] text-[var(--hp-green)]"
                            >
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 rounded hover:bg-[var(--hp-bg3)] text-[var(--hp-red)]"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] text-[var(--hp-text2)]">
                              {displayValue || "—"}
                            </span>
                            <button
                              onClick={() => startEdit(fieldKey, getRawValue(fieldDef))}
                              className="p-1 rounded hover:bg-[var(--hp-bg3)] text-[var(--hp-text3)] hover:text-[var(--hp-amber)] transition-colors"
                              aria-label={`${fieldDef.label} bearbeiten`}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
