// Zentrales Speicherplan-Modell für die "5 GB pro Nutzer"-Produktentscheidung.
//
// Bewusst getrennt von src/hooks/useStorageQuota.tsx: Jener Hook spiegelt das
// heute tatsächlich in Supabase laufende, entitätsbasierte Quota-System
// (provider/client/horse mit 10 GB/1 GB/500 MB, RPC-gestützt). Dieses Modul
// hier ist reine Produkt-/Darstellungskonfiguration für die neue 5-GB-Story
// und noch an keine echte Verbrauchsmessung angebunden — siehe
// docs/storage-quota-plan.md für den offenen Punkt und die Empfehlung, wie
// beide Systeme später zusammengeführt werden sollten.

export const BYTES_PER_GB = 1024 * 1024 * 1024;

export type StoragePlanStatus = "included" | "planned";
export type StoragePlanAvailability = "live" | "in_preparation";

export interface StoragePlan {
  planId: string;
  label: string;
  includedBytes: number;
  displayLabel: string;
  isIncluded: boolean;
  isAddOn: boolean;
  status: StoragePlanStatus;
  availability: StoragePlanAvailability;
}

export const INCLUDED_STORAGE_PLAN: StoragePlan = {
  planId: "included-5gb",
  label: "Inklusive",
  includedBytes: 5 * BYTES_PER_GB,
  displayLabel: "5 GB",
  isIncluded: true,
  isAddOn: false,
  status: "included",
  availability: "live",
};

// Zusatzpakete: nur Größe und Status, bewusst kein Preisfeld — es existiert
// aktuell keine verlässliche Preisdefinition im Projekt (siehe Auftrag).
export const ADD_ON_STORAGE_PLANS: StoragePlan[] = [
  {
    planId: "addon-15gb",
    label: "+15 GB",
    includedBytes: 15 * BYTES_PER_GB,
    displayLabel: "+15 GB",
    isIncluded: false,
    isAddOn: true,
    status: "planned",
    availability: "in_preparation",
  },
  {
    planId: "addon-25gb",
    label: "+25 GB",
    includedBytes: 25 * BYTES_PER_GB,
    displayLabel: "+25 GB",
    isIncluded: false,
    isAddOn: true,
    status: "planned",
    availability: "in_preparation",
  },
  {
    planId: "addon-50gb",
    label: "+50 GB",
    includedBytes: 50 * BYTES_PER_GB,
    displayLabel: "+50 GB",
    isIncluded: false,
    isAddOn: true,
    status: "planned",
    availability: "in_preparation",
  },
];

export const STORAGE_PLANS: StoragePlan[] = [INCLUDED_STORAGE_PLAN, ...ADD_ON_STORAGE_PLANS];

export function bytesToGB(bytes: number, decimals = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round((bytes / BYTES_PER_GB) * factor) / factor;
}

export function percentUsed(usedBytes: number, totalBytes: number): number {
  if (totalBytes <= 0) return 0;
  return Math.min(100, Math.max(0, (usedBytes / totalBytes) * 100));
}

export function remainingBytes(usedBytes: number, totalBytes: number): number {
  return Math.max(0, totalBytes - usedBytes);
}

export type StorageStatus = "normal" | "warning" | "critical" | "full";

// Schwellen konsistent mit dem bestehenden StorageQuotaCard.tsx (80 % / 95 %).
export function storageStatus(percent: number): StorageStatus {
  if (percent >= 100) return "full";
  if (percent >= 95) return "critical";
  if (percent >= 80) return "warning";
  return "normal";
}
