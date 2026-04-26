import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

/**
 * Erklärungstexte für jedes System-ID-Präfix.
 * Wird im Tooltip beim Hover angezeigt.
 */
const ID_EXPLANATIONS: Record<string, { label: string; description: string; relations: string }> = {
  "#PID": {
    label: "Provider-ID",
    description: "Identifiziert einen Hufbearbeiter / Dienstleister im Hufi-System.",
    relations: "Verknüpft mit: Kunden (#KID), Pferde (#EQID), Termine, Rechnungen",
  },
  "#KID": {
    label: "Kunden-ID",
    description: "Identifiziert einen Pferdebesitzer / Kunden.",
    relations: "Verknüpft mit: Provider (#PID), Pferde (#EQID), Rechnungen, Termine",
  },
  "#EQID": {
    label: "Equiden-ID",
    description: "Identifiziert ein Pferd / Equide in der digitalen Pferdeakte.",
    relations: "Verknüpft mit: Besitzer (#KID), Provider (#PID), Partner (#PRID), Behandlungen",
  },
  "#PRID": {
    label: "Partner-ID",
    description: "Identifiziert einen Fachpartner (Tierarzt, Physio, Sattler etc.).",
    relations: "Verknüpft mit: Provider (#PID), Pferde (#EQID), Geteilte Akten",
  },
  "#OID": {
    label: "Organisations-ID",
    description: "Identifiziert eine Organisation (Versicherung, Verband, Hersteller, Klinik etc.).",
    relations: "Verknüpft mit: Mitarbeiter, Nutzer, Pferde (#EQID), Provider (#PID)",
  },
};

/** Extrahiert das Präfix aus einer ID wie "#EQID-D001" → "#EQID" */
function getPrefix(id: string): string {
  const match = id.match(/^(#[A-Z]+)/);
  return match?.[1] || "";
}

interface DemoSystemIdProps {
  /** Die vollständige Demo-ID, z.B. "#EQID-D001" */
  id: string;
  /** Optional: Kompaktere Darstellung ohne Icon */
  compact?: boolean;
}

/**
 * Demo-System-ID Badge mit Hover-Tooltip.
 * Zeigt beim Hovern eine Erklärung an, was die ID bedeutet,
 * wozu sie gehört und mit welchen anderen IDs sie verknüpft ist.
 * 
 * Klar als "Demo-ID" gekennzeichnet.
 */
export function DemoSystemId({ id, compact = false }: DemoSystemIdProps) {
  if (!id) return null;

  const prefix = getPrefix(id);
  const info = ID_EXPLANATIONS[prefix];

  const prefixColors: Record<string, string> = {
    "#PID": "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400",
    "#KID": "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
    "#EQID": "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    "#PRID": "border-purple-500/30 bg-purple-500/5 text-purple-700 dark:text-purple-400",
    "#OID": "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-400",
  };

  const colorClass = prefixColors[prefix] || "border-muted bg-muted/50 text-muted-foreground";

  const badge = (
    <span
      className={`
        inline-flex items-center gap-1 font-mono text-[11px] leading-none
        px-1.5 py-0.5 rounded border cursor-help
        transition-colors hover:opacity-80
        ${colorClass}
      `}
    >
      {id}
      {!compact && <Info className="h-2.5 w-2.5 opacity-50" />}
    </span>
  );

  if (!info) return badge;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs p-3 space-y-1.5 bg-popover border-border"
        >
          <div className="flex items-center gap-2">
            <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${colorClass}`}>
              {prefix}
            </span>
            <span className="text-sm font-semibold text-foreground">{info.label}</span>
          </div>
          <p className="text-xs text-muted-foreground">{info.description}</p>
          <p className="text-[11px] text-muted-foreground/80 italic">{info.relations}</p>
          <div className="pt-1 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              ⚠️ Dies ist eine fiktive Demo-ID – keine echten Daten.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
