import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Check,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  XCircle,
  UserCheck,
  Pencil,
} from "lucide-react";
import type { ParsedContact, ContactCategory } from "./types";
import { CATEGORY_CONFIG } from "./types";

interface AiProcessedContact {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  street?: string;
  notes?: string;
  suggested_category: ContactCategory;
  status: "valid" | "warning" | "error";
  changes_made?: string[];
  duplicate_of?: string;
  confidence: number;
}

interface AiImportSummary {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
  duplicates: number;
  categories?: Record<string, number>;
}

interface AiImportReviewProps {
  processedContacts: AiProcessedContact[];
  summary: AiImportSummary;
  onAccept: (contacts: AiProcessedContact[]) => void;
  onFallbackManual: () => void;
}

const AiImportReview = ({ processedContacts, summary, onAccept, onFallbackManual }: AiImportReviewProps) => {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(processedContacts.filter(c => c.status !== "error" && !c.duplicate_of).map(c => c.id))
  );

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedContacts = processedContacts.filter(c => selected.has(c.id));

  const statusIcon = (status: string) => {
    if (status === "valid") return <Check className="h-3.5 w-3.5 text-emerald-500" />;
    if (status === "warning") return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  };

  const confidenceColor = (c: number) => {
    if (c >= 0.9) return "text-emerald-600";
    if (c >= 0.7) return "text-amber-600";
    return "text-destructive";
  };

  return (
    <div className="space-y-4">
      {/* AI Summary */}
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">KI-Analyse abgeschlossen</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="rounded-lg bg-background p-2">
            <p className="text-lg font-bold text-emerald-600">{summary.valid}</p>
            <p className="text-[10px] text-muted-foreground">Bereit</p>
          </div>
          <div className="rounded-lg bg-background p-2">
            <p className="text-lg font-bold text-amber-600">{summary.warnings}</p>
            <p className="text-[10px] text-muted-foreground">Warnungen</p>
          </div>
          <div className="rounded-lg bg-background p-2">
            <p className="text-lg font-bold text-destructive">{summary.errors}</p>
            <p className="text-[10px] text-muted-foreground">Fehler</p>
          </div>
          <div className="rounded-lg bg-background p-2">
            <p className="text-lg font-bold text-blue-600">{summary.duplicates}</p>
            <p className="text-[10px] text-muted-foreground">Duplikate</p>
          </div>
        </div>

        {summary.categories && (
          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(summary.categories).map(([cat, count]) => {
              const cfg = CATEGORY_CONFIG[cat as ContactCategory];
              if (!cfg || !count) return null;
              return (
                <Badge key={cat} variant="secondary" className="gap-1.5 text-xs">
                  <div className={`h-2 w-2 rounded-full ${cfg.color}`} />
                  {cfg.label}: {count}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact list */}
      <ScrollArea className="max-h-[45vh] rounded-lg border">
        <div className="divide-y">
          {processedContacts.map(c => {
            const cfg = CATEGORY_CONFIG[c.suggested_category];
            const isDuplicate = !!c.duplicate_of;
            return (
              <div key={c.id} className={`p-3 flex items-start gap-3 ${isDuplicate ? "opacity-50" : ""}`}>
                <Checkbox
                  checked={selected.has(c.id)}
                  onCheckedChange={() => toggleSelect(c.id)}
                  disabled={c.status === "error"}
                />
                <div className="mt-0.5">{statusIcon(c.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{c.full_name}</p>
                    <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                      <div className={`h-1.5 w-1.5 rounded-full ${cfg?.color || "bg-muted"}`} />
                      {cfg?.label || c.suggested_category}
                    </Badge>
                    <span className={`text-[10px] font-mono ${confidenceColor(c.confidence)}`}>
                      {Math.round(c.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {[c.email, c.phone, c.company_name].filter(Boolean).join(" · ")}
                  </p>
                  {c.changes_made && c.changes_made.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.changes_made.map((change, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0 gap-0.5">
                          <Sparkles className="h-2 w-2" /> {change}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {isDuplicate && (
                    <Badge variant="outline" className="text-[10px] mt-1 text-amber-600 border-amber-300">
                      Duplikat erkannt – übersprungen
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onFallbackManual} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Manuell prüfen
        </Button>
        <Button
          onClick={() => onAccept(selectedContacts)}
          disabled={selected.size === 0}
          className="flex-1 gap-2"
        >
          <UserCheck className="h-4 w-4" />
          {selected.size} Kontakte importieren
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AiImportReview;
export type { AiProcessedContact, AiImportSummary };
