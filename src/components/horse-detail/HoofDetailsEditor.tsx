import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HoofDetails, HoofDetailEntry } from "./types";

// Huf-Position Labels
const HOOF_POSITIONS = [
  { key: "vl", label: "Vorne Links", shortLabel: "VL" },
  { key: "vr", label: "Vorne Rechts", shortLabel: "VR" },
  { key: "hl", label: "Hinten Links", shortLabel: "HL" },
  { key: "hr", label: "Hinten Rechts", shortLabel: "HR" },
] as const;

// Zustandsoptionen
const CONDITION_OPTIONS = [
  { value: "good", label: "Gut", color: "bg-green-500", icon: "✓" },
  { value: "moderate", label: "Mäßig", color: "bg-amber-500", icon: "~" },
  { value: "poor", label: "Schlecht", color: "bg-orange-500", icon: "!" },
  { value: "cracked", label: "Rissig", color: "bg-red-500", icon: "✗" },
] as const;

// Stellungsoptionen
const STANCE_OPTIONS = [
  { value: "straight", label: "Gerade", icon: "↑" },
  { value: "toed-in", label: "Zeheneng", icon: "↗" },
  { value: "toed-out", label: "Zehenweit", icon: "↖" },
  { value: "club", label: "Bockhuf", icon: "△" },
] as const;

// Häufige Probleme
const COMMON_ISSUES = [
  "Strahlfäule",
  "Hornspalte",
  "White Line Disease",
  "Hufrehe",
  "Ballen-/Trachtenzwang",
  "Lose Wand",
  "Hohlwand",
  "Knollhuf",
  "Flachhuf",
  "Steile Trachten",
  "Untergeschobene Trachten",
];

interface HoofDetailsEditorProps {
  value: HoofDetails | null;
  onChange: (details: HoofDetails) => void;
  readOnly?: boolean;
}

export function HoofDetailsEditor({ value, onChange, readOnly = false }: HoofDetailsEditorProps) {
  const [activeHoof, setActiveHoof] = useState<keyof HoofDetails>("vl");
  const [newIssue, setNewIssue] = useState("");

  const hoofData = value || {};

  const updateHoof = (position: keyof HoofDetails, updates: Partial<HoofDetailEntry>) => {
    const current = hoofData[position] || {};
    onChange({
      ...hoofData,
      [position]: { ...current, ...updates },
    });
  };

  const addIssue = (position: keyof HoofDetails, issue: string) => {
    if (!issue.trim()) return;
    const current = hoofData[position] || {};
    const currentIssues = current.issues || [];
    if (!currentIssues.includes(issue)) {
      updateHoof(position, { issues: [...currentIssues, issue] });
    }
    setNewIssue("");
  };

  const removeIssue = (position: keyof HoofDetails, issue: string) => {
    const current = hoofData[position] || {};
    const currentIssues = current.issues || [];
    updateHoof(position, { issues: currentIssues.filter((i) => i !== issue) });
  };

  const getConditionInfo = (condition?: string) => {
    return CONDITION_OPTIONS.find((c) => c.value === condition);
  };

  const getHoofStatus = (hoof?: HoofDetailEntry) => {
    if (!hoof) return { hasData: false, condition: null, issueCount: 0 };
    const hasData = !!(hoof.size || hoof.condition || hoof.stance || hoof.issues?.length);
    return {
      hasData,
      condition: hoof.condition,
      issueCount: hoof.issues?.length || 0,
    };
  };

  const currentHoof = hoofData[activeHoof] || {};

  return (
    <div className="space-y-4">
      {/* Huf-Selektor (Visuell wie ein Pferd von oben) */}
      <div className="flex justify-center">
        <div className="relative w-48 h-64 bg-muted/30 rounded-3xl border-2 border-dashed border-muted-foreground/20">
          {/* Pferd-Silhouette Andeutung */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-16 bg-muted/50 rounded-full" />
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-20 h-32 bg-muted/50 rounded-full" />

          {/* Huf-Buttons */}
          {HOOF_POSITIONS.map((pos) => {
            const status = getHoofStatus(hoofData[pos.key as keyof HoofDetails]);
            const conditionInfo = getConditionInfo(status.condition);
            const isActive = activeHoof === pos.key;

            const positionStyles: Record<string, string> = {
              vl: "top-6 left-2",
              vr: "top-6 right-2",
              hl: "bottom-6 left-2",
              hr: "bottom-6 right-2",
            };

            return (
              <button
                key={pos.key}
                type="button"
                onClick={() => setActiveHoof(pos.key as keyof HoofDetails)}
                className={cn(
                  "absolute w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all",
                  positionStyles[pos.key],
                  isActive
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "hover:scale-105",
                  status.hasData
                    ? conditionInfo?.color || "bg-primary"
                    : "bg-muted border-2 border-dashed border-muted-foreground/30"
                )}
              >
                <span className={cn(
                  "text-xs font-bold",
                  status.hasData ? "text-primary-foreground" : "text-muted-foreground"
                )}>
                  {pos.shortLabel}
                </span>
                {status.issueCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                  >
                    {status.issueCount}
                  </Badge>
                )}
              </button>
            );
          })}

          {/* Legende */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
            Klicke auf einen Huf zum Bearbeiten
          </div>
        </div>
      </div>

      {/* Aktiver Huf Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {HOOF_POSITIONS.find((p) => p.key === activeHoof)?.label}
            {currentHoof.condition && (
              <Badge className={cn("text-xs", getConditionInfo(currentHoof.condition)?.color)}>
                {getConditionInfo(currentHoof.condition)?.label}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Größe */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Größe (mm)</Label>
              <Input
                type="number"
                placeholder="z.B. 130"
                value={currentHoof.size || ""}
                onChange={(e) => updateHoof(activeHoof, { size: e.target.value ? Number(e.target.value) : undefined })}
                disabled={readOnly}
              />
            </div>

            {/* Zustand */}
            <div>
              <Label className="text-xs">Zustand</Label>
              <Select
                value={currentHoof.condition || ""}
                onValueChange={(v) => updateHoof(activeHoof, { condition: v as HoofDetailEntry["condition"] })}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wählen" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", opt.color)} />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stellung */}
            <div>
              <Label className="text-xs">Stellung</Label>
              <Select
                value={currentHoof.stance || ""}
                onValueChange={(v) => updateHoof(activeHoof, { stance: v as HoofDetailEntry["stance"] })}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wählen" />
                </SelectTrigger>
                <SelectContent>
                  {STANCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span className="text-lg">{opt.icon}</span>
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Probleme */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Probleme / Befunde
            </Label>

            {/* Aktuelle Probleme */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px]">
              {(currentHoof.issues || []).length === 0 ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Keine Probleme dokumentiert
                </span>
              ) : (
                currentHoof.issues?.map((issue) => (
                  <Badge
                    key={issue}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {issue}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeIssue(activeHoof, issue)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))
              )}
            </div>

            {/* Problem hinzufügen */}
            {!readOnly && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Eigenes Problem eingeben..."
                    value={newIssue}
                    onChange={(e) => setNewIssue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addIssue(activeHoof, newIssue);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => addIssue(activeHoof, newIssue)}
                    disabled={!newIssue.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Schnellauswahl häufiger Probleme */}
                <div className="flex flex-wrap gap-1">
                  {COMMON_ISSUES.filter(
                    (issue) => !currentHoof.issues?.includes(issue)
                  )
                    .slice(0, 6)
                    .map((issue) => (
                      <Button
                        key={issue}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => addIssue(activeHoof, issue)}
                      >
                        + {issue}
                      </Button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Zusammenfassung aller Hufe */}
      <div className="grid grid-cols-4 gap-2">
        {HOOF_POSITIONS.map((pos) => {
          const hoof = hoofData[pos.key as keyof HoofDetails];
          const status = getHoofStatus(hoof);
          const conditionInfo = getConditionInfo(status.condition);

          return (
            <div
              key={pos.key}
              className={cn(
                "p-2 rounded-lg text-center text-xs border",
                activeHoof === pos.key ? "border-primary" : "border-border"
              )}
            >
              <div className="font-semibold">{pos.shortLabel}</div>
              {status.hasData ? (
                <>
                  {hoof?.size && <div className="text-muted-foreground">{hoof.size}mm</div>}
                  {conditionInfo && (
                    <div className={cn("flex items-center justify-center gap-1", conditionInfo.color.replace("bg-", "text-"))}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "currentColor" }} />
                      {conditionInfo.label}
                    </div>
                  )}
                  {status.issueCount > 0 && (
                    <div className="text-destructive">{status.issueCount} Problem(e)</div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">—</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
