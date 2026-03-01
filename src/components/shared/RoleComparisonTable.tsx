import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import {
  PERMISSION_SECTIONS,
  ROLE_LABELS,
  type PermissionLevel,
  type PermissionRow,
} from "@/data/rolePermissions";
import { cn } from "@/lib/utils";

const ROLE_KEYS = ["client", "provider", "partner", "employee", "admin"] as const;

function PermissionBadge({ level }: { level: PermissionLevel }) {
  const config: Record<PermissionLevel, { label: string; className: string }> = {
    yes: { label: "✅", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    no: { label: "❌", className: "bg-red-500/10 text-red-400/60 border-red-500/20" },
    permission: { label: "Mit Erlaubnis", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    own: { label: "Eigene", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    assigned: { label: "Zugewiesene", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
    request: { label: "Anfrage", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    teamlead: { label: "Team Lead", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  };
  const c = config[level];
  return (
    <Badge variant="outline" className={cn("text-xs font-medium whitespace-nowrap", c.className)}>
      {c.label}
    </Badge>
  );
}

interface RoleComparisonTableProps {
  compact?: boolean;
}

export function RoleComparisonTable({ compact }: RoleComparisonTableProps) {
  const [search, setSearch] = useState("");
  const [onlyDiffs, setOnlyDiffs] = useState(false);

  const filteredSections = useMemo(() => {
    return PERMISSION_SECTIONS.map((section) => {
      const rows = section.rows.filter((row) => {
        if (search && !row.feature.toLowerCase().includes(search.toLowerCase())) return false;
        if (onlyDiffs) {
          const vals = ROLE_KEYS.map((k) => row[k]);
          return new Set(vals).size > 1;
        }
        return true;
      });
      return { ...section, rows };
    }).filter((s) => s.rows.length > 0);
  }, [search, onlyDiffs]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Feature suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="only-diffs" checked={onlyDiffs} onCheckedChange={setOnlyDiffs} />
          <Label htmlFor="only-diffs" className="text-sm text-muted-foreground">
            Nur Unterschiede
          </Label>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="w-full">
        <div className="min-w-[700px]">
          {/* Header */}
          <div className="grid grid-cols-6 gap-1 sticky top-0 z-10 bg-background border-b border-border pb-2 mb-2">
            <div className="text-sm font-semibold text-muted-foreground px-2">Feature</div>
            {ROLE_KEYS.map((role) => (
              <div key={role} className="text-xs font-semibold text-center text-muted-foreground">
                {ROLE_LABELS[role]}
              </div>
            ))}
          </div>

          {/* Sections */}
          {filteredSections.map((section) => (
            <div key={section.title} className="mb-4">
              <div className="text-sm font-bold text-primary px-2 py-1.5 bg-primary/5 rounded mb-1">
                {section.title}
              </div>
              {section.rows.map((row) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-6 gap-1 py-1.5 px-2 hover:bg-muted/30 rounded items-center"
                >
                  <div className="text-sm text-foreground">{row.feature}</div>
                  {ROLE_KEYS.map((role) => (
                    <div key={role} className="flex justify-center">
                      <PermissionBadge level={row[role]} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              Keine Features gefunden.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
        {(["yes", "no", "permission", "own", "assigned", "request", "teamlead"] as PermissionLevel[]).map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <PermissionBadge level={level} />
            <span className="text-xs text-muted-foreground">
              {level === "yes" && "Vollzugriff"}
              {level === "no" && "Kein Zugriff"}
              {level === "permission" && "Nur mit Freigabe des Besitzers"}
              {level === "own" && "Nur eigene Daten"}
              {level === "assigned" && "Nur zugewiesene Ressourcen"}
              {level === "request" && "Nur per Anfrage"}
              {level === "teamlead" && "Nur als Team Lead"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
