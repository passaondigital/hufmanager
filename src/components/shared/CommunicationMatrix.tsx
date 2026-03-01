import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type CommLevel = "direct" | "permission" | "none";

interface MatrixCell {
  level: CommLevel;
  info: string;
}

const ROLES = ["Besitzer", "Provider", "Partner", "Mitarbeiter"] as const;

const MATRIX: MatrixCell[][] = [
  // Besitzer →
  [
    { level: "none", info: "" },
    { level: "direct", info: "Du chattest direkt mit deinem Hufpfleger — immer, ohne Einschränkung." },
    { level: "permission", info: "Du kannst mit Tierärzten und Therapeuten chatten sobald du ihnen Zugang zu deinem Pferd gegeben hast." },
    { level: "none", info: "Kein direkter Chat mit Mitarbeitern vorgesehen." },
  ],
  // Provider →
  [
    { level: "direct", info: "Direkter Chat mit deinen Kunden." },
    { level: "none", info: "" },
    { level: "none", info: "Kein direkter Chat mit Partnern." },
    { level: "direct", info: "Kommunikation über den internen Team-Chat." },
  ],
  // Partner →
  [
    { level: "permission", info: "Chat mit Pferdebesitzern bei aktiver Freigabe." },
    { level: "none", info: "Kein direkter Chat mit Providern." },
    { level: "direct", info: "Direkte Kommunikation zwischen Fachpartnern." },
    { level: "none", info: "Kein direkter Chat mit Mitarbeitern." },
  ],
  // Mitarbeiter →
  [
    { level: "none", info: "Kein direkter Chat mit Besitzern." },
    { level: "direct", info: "Der Chef kommuniziert direkt mit seinen Mitarbeitern über den internen Team-Chat." },
    { level: "none", info: "Kein direkter Chat mit Partnern." },
    { level: "direct", info: "Team-Chat zwischen Mitarbeitern." },
  ],
];

const LEVEL_CONFIG: Record<CommLevel, { label: string; className: string }> = {
  direct: { label: "✅ Direkt", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  permission: { label: "🔐 Mit Freigabe", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  none: { label: "—", className: "bg-muted/30 text-muted-foreground border-muted" },
};

export function CommunicationMatrix() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">Kommunikations-Matrix</h3>
      <p className="text-sm text-muted-foreground">Wer kann mit wem kommunizieren?</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs text-muted-foreground">Von ↓ / An →</th>
              {ROLES.map((r) => (
                <th key={r} className="p-2 text-center text-xs font-semibold text-muted-foreground">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLES.map((fromRole, ri) => (
              <tr key={fromRole} className="border-t border-border">
                <td className="p-2 text-sm font-medium text-foreground">{fromRole}</td>
                {MATRIX[ri].map((cell, ci) => {
                  const config = LEVEL_CONFIG[cell.level];
                  return (
                    <td key={ci} className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Badge variant="outline" className={cn("text-xs", config.className)}>
                          {config.label}
                        </Badge>
                        {cell.info && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px]">
                              <p className="text-xs">{cell.info}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
        {(["direct", "permission", "none"] as CommLevel[]).map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <Badge variant="outline" className={cn("text-xs", LEVEL_CONFIG[level].className)}>
              {LEVEL_CONFIG[level].label}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
