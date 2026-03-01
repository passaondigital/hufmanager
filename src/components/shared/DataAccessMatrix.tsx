import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AccessLevel = "full" | "restricted" | "none";

interface DataAccessRow {
  dataType: string;
  read: string;
  write: string;
  edit: string;
  delete: string;
}

const DATA_ACCESS: DataAccessRow[] = [
  { dataType: "Stammdaten", read: "Alle*", write: "Besitzer", edit: "Besitzer", delete: "Besitzer" },
  { dataType: "Medizin", read: "Alle*", write: "Provider, Partner", edit: "Provider, Partner", delete: "Besitzer" },
  { dataType: "Huf-Dokumentation", read: "Alle*", write: "Provider, MA", edit: "Provider", delete: "Besitzer" },
  { dataType: "Fotos", read: "Alle*", write: "Alle*", edit: "Ersteller", delete: "Besitzer" },
  { dataType: "Befunde Partner", read: "Alle*", write: "Partner", edit: "Partner", delete: "Besitzer" },
  { dataType: "Rechnungen", read: "Besitzer + Provider", write: "Provider, Partner", edit: "Provider, Partner", delete: "Provider, Partner" },
  { dataType: "Tagebuch", read: "Besitzer", write: "Besitzer", edit: "Besitzer", delete: "Besitzer" },
];

const OPERATIONS = ["Lesen", "Schreiben", "Bearbeiten", "Löschen"] as const;
const OP_KEYS = ["read", "write", "edit", "delete"] as const;

function getAccessColor(value: string): string {
  if (value === "Besitzer") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (value.includes("Alle")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (value.includes("Provider") || value.includes("Partner") || value.includes("MA") || value.includes("Ersteller"))
    return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  return "bg-muted/30 text-muted-foreground border-muted";
}

export function DataAccessMatrix() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">Datenzugriffs-Matrix</h3>
      <p className="text-sm text-muted-foreground">Wer darf was mit Pferdedaten?</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs text-muted-foreground">Datentyp</th>
              {OPERATIONS.map((op) => (
                <th key={op} className="p-2 text-center text-xs font-semibold text-muted-foreground">{op}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DATA_ACCESS.map((row) => (
              <tr key={row.dataType} className="border-t border-border">
                <td className="p-2 text-sm font-medium text-foreground">{row.dataType}</td>
                {OP_KEYS.map((key) => {
                  const val = row[key];
                  return (
                    <td key={key} className="p-2 text-center">
                      <Badge variant="outline" className={cn("text-xs", getAccessColor(val))}>
                        {val}
                      </Badge>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        * „Alle" = alle Nutzer mit aktiver Freigabe durch den Pferdebesitzer
      </p>
    </div>
  );
}
