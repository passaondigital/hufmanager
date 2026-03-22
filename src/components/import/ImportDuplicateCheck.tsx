import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  Check,
  Copy,
  ArrowRight,
  RefreshCw,
  UserCheck,
  UserPlus,
} from "lucide-react";
import type { ParsedContact } from "./types";

export interface DuplicateMatch {
  importContact: ParsedContact;
  existingContact: { id: string; full_name: string; email: string | null; phone: string | null };
  matchType: "email" | "phone" | "name";
  action: "skip" | "update" | "import";
}

interface ImportDuplicateCheckProps {
  duplicates: DuplicateMatch[];
  onResolve: (resolved: DuplicateMatch[]) => void;
  newContacts: ParsedContact[];
}

const ImportDuplicateCheck = ({ duplicates, onResolve, newContacts }: ImportDuplicateCheckProps) => {
  const [matches, setMatches] = useState<DuplicateMatch[]>(duplicates);

  const setAction = (idx: number, action: DuplicateMatch["action"]) => {
    setMatches(prev => prev.map((m, i) => i === idx ? { ...m, action } : m));
  };

  const setAllAction = (action: DuplicateMatch["action"]) => {
    setMatches(prev => prev.map(m => ({ ...m, action })));
  };

  const matchLabel = (type: string) => {
    if (type === "email") return "E-Mail";
    if (type === "phone") return "Telefon";
    return "Name";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <div>
          <h3 className="font-semibold text-foreground">
            {duplicates.length} mögliche Duplikate gefunden
          </h3>
          <p className="text-xs text-muted-foreground">
            {newContacts.length} neue Kontakte werden direkt importiert.
          </p>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setAllAction("skip")} className="gap-1.5 text-xs">
          Alle überspringen
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAllAction("update")} className="gap-1.5 text-xs">
          Alle aktualisieren
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAllAction("import")} className="gap-1.5 text-xs">
          Alle trotzdem importieren
        </Button>
      </div>

      {/* Duplicate list */}
      <ScrollArea className="max-h-[40vh] rounded-lg border">
        <div className="divide-y">
          {matches.map((match, idx) => (
            <div key={match.importContact.id} className="p-3 space-y-2">
              <div className="flex items-start gap-3">
                <Copy className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{match.importContact.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Neu: {[match.importContact.email, match.importContact.phone].filter(Boolean).join(" · ")}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{matchLabel(match.matchType)}-Match</Badge>
                    <span className="text-xs text-muted-foreground">
                      ↔ {match.existingContact.full_name}
                      {match.existingContact.email ? ` (${match.existingContact.email})` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5 ml-7">
                <Button
                  size="sm"
                  variant={match.action === "skip" ? "default" : "outline"}
                  onClick={() => setAction(idx, "skip")}
                  className="text-xs h-7 gap-1"
                >
                  <Check className="h-3 w-3" /> Überspringen
                </Button>
                <Button
                  size="sm"
                  variant={match.action === "update" ? "default" : "outline"}
                  onClick={() => setAction(idx, "update")}
                  className="text-xs h-7 gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Aktualisieren
                </Button>
                <Button
                  size="sm"
                  variant={match.action === "import" ? "default" : "outline"}
                  onClick={() => setAction(idx, "import")}
                  className="text-xs h-7 gap-1"
                >
                  <UserPlus className="h-3 w-3" /> Trotzdem
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Button onClick={() => onResolve(matches)} className="w-full gap-2">
        Weiter mit Import <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ImportDuplicateCheck;
