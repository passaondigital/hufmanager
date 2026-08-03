import { HardDrive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ADD_ON_STORAGE_PLANS,
  BYTES_PER_GB,
  INCLUDED_STORAGE_PLAN,
  bytesToGB,
  percentUsed,
  remainingBytes,
  storageStatus,
  type StorageStatus,
} from "@/lib/hufi-storage-plans";

// Demo-/Vorschau-Komponente: zeigt, wie die 5-GB-Speicheranzeige später
// aussehen soll. Der Verbrauch ist ein fester Mock-Wert, keine echte
// Messung — siehe docs/storage-quota-plan.md für den technischen Stand.
// Exportiert, damit die kompakte Statuspille in HufiPremiumLab.tsx
// denselben Demo-Wert zeigt wie dieser Detail-Dialog.
export const DEMO_USED_BYTES = 1.2 * BYTES_PER_GB;

const STATUS_LABEL: Record<StorageStatus, string> = {
  normal: "Verfügbar",
  warning: "Wird knapp",
  critical: "Fast voll",
  full: "Voll",
};

export function HufiStorageUsage({ className }: { className?: string }) {
  const total = INCLUDED_STORAGE_PLAN.includedBytes;
  const used = DEMO_USED_BYTES;
  const percent = percentUsed(used, total);
  const status = storageStatus(percent);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-primary" />
          Speicherplatz
          <Badge variant="outline" className="ml-auto text-[10px]">
            Demo-Daten
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {bytesToGB(used)} GB von {bytesToGB(total)} GB verwendet
            </span>
            <span className="font-medium">{STATUS_LABEL[status]}</span>
          </div>
          <Progress value={percent} className="h-1.5" />
        </div>

        <p className="text-xs text-muted-foreground">
          {bytesToGB(remainingBytes(used, total))} GB frei von {bytesToGB(total)} GB inklusive
        </p>

        <div className="pt-2 border-t space-y-2">
          <p className="text-xs text-muted-foreground">
            Die dauerhafte Ablage für Pferdeakten, Bilder und Dokumente wird schrittweise freigeschaltet.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ADD_ON_STORAGE_PLANS.map((plan) => (
              <Badge key={plan.planId} variant="secondary" className="text-[10px] font-normal">
                {plan.displayLabel} · in Vorbereitung
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
