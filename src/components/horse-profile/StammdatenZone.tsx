import { useState } from "react";
import { ChevronDown, Pencil, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Horse } from "@/components/horse-detail/types";
import { HOLDING_TYPE_OPTIONS, USAGE_TYPE_OPTIONS, HOOF_PROTECTION_OPTIONS } from "@/components/horse-detail/types";

type Role = "client" | "provider" | "employee" | "partner" | "portal";

interface StammdatenZoneProps {
  horse: Horse;
  role: Role;
  onHorseUpdate?: (horse: Horse) => void;
}

interface FieldDef {
  label: string;
  value: string | null | undefined;
  field: string;
  type: "text" | "select";
  options?: readonly { value: string; label: string }[];
  nested?: string;
}

export function StammdatenZone({ horse, role, onHorseUpdate }: StammdatenZoneProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const canEdit = role === "provider" || role === "employee" || role === "client";
  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  const age = horse.birth_year ? new Date().getFullYear() - horse.birth_year : null;
  const genderLabel = horse.gender === "gelding" ? "Wallach" : horse.gender === "mare" ? "Stute" : horse.gender === "stallion" ? "Hengst" : horse.gender;
  const holdingType = HOLDING_TYPE_OPTIONS.find(h => h.value === horse.holding_type);
  const usageType = USAGE_TYPE_OPTIONS.find(u => u.value === horse.usage_type);
  const hoofProt = HOOF_PROTECTION_OPTIONS.find(p => p.value === horse.hoof_protection);

  const h = horse as any;

  const sections = [
    {
      title: "Besitzdaten",
      fields: [
        { label: "Name", value: horse.name, field: "name", type: "text" as const },
        { label: "Rufname", value: horse.nickname, field: "nickname", type: "text" as const },
        { label: "Rasse", value: horse.breed, field: "breed", type: "text" as const },
        { label: "Alter", value: age ? `${age} Jahre` : null, field: "birth_year", type: "text" as const },
        { label: "Geschlecht", value: genderLabel, field: "gender", type: "select" as const, options: [{ value: "gelding", label: "Wallach" }, { value: "mare", label: "Stute" }, { value: "stallion", label: "Hengst" }] as any },
        { label: "Farbe", value: horse.color, field: "color", type: "text" as const },
        { label: "Standort", value: horse.location_name, field: "location_name", type: "text" as const },
      ],
    },
    {
      title: "Identifikation",
      fields: [
        { label: "Chip-Nr.", value: horse.chip_number, field: "chip_number", type: "text" as const },
        { label: "UELN", value: h.ueln, field: "ueln", type: "text" as const },
        { label: "Pass-Nr.", value: h.passport_number, field: "passport_number", type: "text" as const },
        { label: "FN-Nr.", value: h.fn_number, field: "fn_number", type: "text" as const },
        { label: "Zuchtbuch", value: h.studbook, field: "studbook", type: "text" as const },
        { label: "Vater", value: h.sire_name, field: "sire_name", type: "text" as const },
        { label: "Mutter", value: h.dam_name, field: "dam_name", type: "text" as const },
      ],
    },
    {
      title: "Körpermaße",
      fields: [
        { label: "Stockmaß", value: h.height_cm ? `${h.height_cm} cm` : h.height, field: "height_cm", type: "text" as const },
        { label: "Gewicht", value: h.weight_kg ? `${h.weight_kg} kg` : null, field: "weight_kg", type: "text" as const },
        { label: "Brandzeichen", value: h.brand_marks, field: "brand_marks", type: "text" as const },
      ],
    },
    {
      title: "Haltung & Nutzung",
      fields: [
        { label: "Haltungsform", value: holdingType?.label, field: "holding_type", type: "select" as const, options: HOLDING_TYPE_OPTIONS as any },
        { label: "Nutzung", value: usageType?.label || horse.usage, field: "usage_type", type: "select" as const, options: USAGE_TYPE_OPTIONS as any },
        { label: "Hufschutz", value: hoofProt?.label || "Barhuf", field: "hoof_protection", type: "select" as const, options: HOOF_PROTECTION_OPTIONS as any },
        { label: "Beschlagintervall", value: horse.shoeing_interval ? `${horse.shoeing_interval} Wochen` : null, field: "shoeing_interval", type: "text" as const },
      ],
    },
    {
      title: "Kontakt & Vertrag",
      fields: [
        { label: "Tierarzt", value: horse.contacts?.vet, field: "contacts", type: "text" as const, nested: "vet" },
        { label: "TA Telefon", value: horse.contacts?.vet_phone, field: "contacts", type: "text" as const, nested: "vet_phone" },
        { label: "Trainer", value: horse.contacts?.trainer, field: "contacts", type: "text" as const, nested: "trainer" },
        { label: "Stall", value: horse.contacts?.stable, field: "contacts", type: "text" as const, nested: "stable" },
      ],
    },
    {
      title: "Versicherung",
      fields: [
        { label: "Versicherung", value: h.insurance_company, field: "insurance_company", type: "text" as const },
        { label: "Policen-Nr.", value: h.insurance_policy_number, field: "insurance_policy_number", type: "text" as const },
        { label: "Gültig bis", value: h.insurance_valid_until, field: "insurance_valid_until", type: "text" as const },
      ],
    },
  ];

  const getFieldKey = (f: FieldDef) => f.nested ? `${f.field}.${f.nested}` : f.field;
  const getRawValue = (f: FieldDef): string => {
    if (f.nested) return (horse.contacts as any)?.[f.nested] || "";
    if (f.field === "birth_year") return horse.birth_year?.toString() || "";
    if (f.field === "shoeing_interval") return horse.shoeing_interval?.toString() || "";
    if (f.field === "height_cm") return h.height_cm?.toString() || "";
    if (f.field === "weight_kg") return h.weight_kg?.toString() || "";
    return h[f.field] || "";
  };

  const saveField = async (fieldDef: FieldDef) => {
    setSaving(true);
    try {
      let updateData: Record<string, any> = {};
      if (fieldDef.nested) {
        const contacts = { ...(horse.contacts || {}) };
        contacts[fieldDef.nested] = editValue || undefined;
        updateData = { contacts };
      } else if (["birth_year", "shoeing_interval", "height_cm", "weight_kg"].includes(fieldDef.field)) {
        const parsed = parseFloat(editValue);
        if (editValue && isNaN(parsed)) { toast.error("Ungültige Zahl"); setSaving(false); return; }
        updateData = { [fieldDef.field]: editValue ? parsed : null };
      } else {
        updateData = { [fieldDef.field]: editValue || null };
      }

      const { error } = await supabase.from("horses").update(updateData).eq("id", horse.id);
      if (error) throw error;

      const updatedHorse = { ...horse, ...updateData };
      if (fieldDef.nested) updatedHorse.contacts = { ...(horse.contacts || {}), [fieldDef.nested]: editValue || undefined };
      onHorseUpdate?.(updatedHorse);
      toast.success("Gespeichert");
      setEditingField(null);
      setEditValue("");
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">Stammdaten</h3>
      <div className="flex flex-col gap-2">
        {sections.map((section, i) => {
          const isOpen = openIndex === i;
          // Count filled fields
          const filledCount = section.fields.filter(f => f.value).length;
          return (
            <div key={section.title} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{section.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {filledCount}/{section.fields.length}
                  </span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>

              {isOpen && (
                <div className="px-4 pb-3 border-t border-border">
                  {section.fields.map(fieldDef => {
                    const fieldKey = getFieldKey(fieldDef);
                    const isEditing = editingField === fieldKey;

                    return (
                      <div key={fieldKey} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 gap-2">
                        <span className="text-xs text-muted-foreground flex-shrink-0">{fieldDef.label}</span>
                        {isEditing && canEdit ? (
                          <div className="flex items-center gap-1.5 flex-1 justify-end">
                            {fieldDef.type === "select" && fieldDef.options ? (
                              <select
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="bg-muted text-foreground text-xs rounded px-2 py-1 border border-border max-w-[140px]"
                              >
                                <option value="">—</option>
                                {fieldDef.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                            ) : (
                              <input
                                type="text" value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="bg-muted text-foreground text-xs rounded px-2 py-1 border border-border w-full max-w-[140px]"
                                autoFocus
                                onKeyDown={e => { if (e.key === "Enter") saveField(fieldDef); if (e.key === "Escape") { setEditingField(null); setEditValue(""); } }}
                              />
                            )}
                            <button onClick={() => saveField(fieldDef)} disabled={saving} className="p-1 rounded hover:bg-accent text-green-600">
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </button>
                            <button onClick={() => { setEditingField(null); setEditValue(""); }} className="p-1 rounded hover:bg-accent text-red-500">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className={cn("text-xs", fieldDef.value ? "text-foreground" : "text-muted-foreground/50 italic")}>
                              {fieldDef.value || "Nicht hinterlegt"}
                            </span>
                            {canEdit && (
                              <button
                                onClick={() => { setEditingField(fieldKey); setEditValue(getRawValue(fieldDef)); }}
                                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
