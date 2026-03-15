import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { Horse } from "./types";

interface HorseProfileCompletenessProps {
  horse: Horse;
  onEditClick?: () => void;
}

interface CompletenessField {
  key: string;
  label: string;
  check: (h: any) => boolean;
}

const COMPLETENESS_FIELDS: CompletenessField[] = [
  { key: "chip_number", label: "Chipnummer fehlt", check: h => !!h.chip_number },
  { key: "ueln", label: "Lebensnummer fehlt", check: h => !!h.ueln },
  { key: "passport_number", label: "Passnummer fehlt", check: h => !!h.passport_number },
  { key: "photo_url", label: "Profilbild fehlt", check: h => !!h.photo_url },
  { key: "weight_kg", label: "Gewicht fehlt", check: h => !!h.weight_kg },
  { key: "height_cm", label: "Stockmaß fehlt", check: h => !!h.height_cm },
  { key: "insurance", label: "Versicherung fehlt", check: h => !!(h.insurance_company || h.insurance_provider) },
  { 
    key: "vet", 
    label: "Tierarzt fehlt", 
    check: h => {
      const contacts = h.contacts;
      if (!contacts) return false;
      if (contacts.vet) return true;
      if (Array.isArray(contacts)) {
        return contacts.some((c: any) => c.role === 'vet' || c.role === 'veterinarian');
      }
      return false;
    }
  },
];

export function HorseProfileCompleteness({ horse, onEditClick }: HorseProfileCompletenessProps) {
  const filled = COMPLETENESS_FIELDS.filter(f => f.check(horse));
  const missing = COMPLETENESS_FIELDS.filter(f => !f.check(horse));
  const total = COMPLETENESS_FIELDS.length;
  const filledCount = filled.length;
  const percent = Math.round((filledCount / total) * 100);
  const isComplete = missing.length === 0;

  if (isComplete) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-700">Profil vollständig ✓</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-foreground">
            {filledCount} von {total} ausgefüllt
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{percent}%</span>
      </div>
      <Progress value={percent} className="h-1.5" />
      <div className="flex flex-wrap gap-1.5 pt-1">
        {missing.map(f => (
          <button
            key={f.key}
            onClick={onEditClick}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 transition-colors cursor-pointer border border-amber-500/20"
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}