// ============================================
// Kunden-Export Utility (CSV/Excel)
// ============================================

import { format as formatDate } from "date-fns";
import { de } from "date-fns/locale";

interface ExportableClient {
  id: string;
  readable_id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  phone_mobile?: string;
  phone_landline?: string;
  street?: string;
  house_number?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  client_type?: string;
  lifecycle_status?: string;
  payment_rating?: string;
  reliability_score?: number;
  working_conditions?: string;
  order_authorization?: boolean;
  created_at?: string;
  has_logged_in?: boolean;
  is_business?: boolean;
  vat_id?: string;
  geo_lat?: number;
  geo_lng?: number;
}

interface ExportableHorse {
  id: string;
  readable_id?: string;
  name: string;
  owner_id: string;
  breed?: string;
  birth_year?: number;
  gender?: string;
  chip_number?: string;
  holding_type?: string;
  usage_type?: string;
  shoeing_status?: boolean | string | null;
  hoof_protection?: string;
  health_status?: string;
}

// Labels für Enums
const PAYMENT_RATING_LABELS: Record<string, string> = {
  A: "A - Sehr gut",
  B: "B - Gut",
  C: "C - Mittelmäßig",
  D: "D - Problematisch",
};

const LIFECYCLE_STATUS_LABELS: Record<string, string> = {
  new: "Neukunde",
  active: "Bestandskunde",
  archive: "Archiv",
};

const CLIENT_TYPE_LABELS: Record<string, string> = {
  private: "Privat",
  commercial: "Gewerbe",
};

const HOLDING_TYPE_LABELS: Record<string, string> = {
  box: "Box",
  open_stable: "Offenstall",
  mixed: "Gemischt",
  pasture: "Weide",
};

const USAGE_TYPE_LABELS: Record<string, string> = {
  leisure: "Freizeit",
  sport: "Sport",
  western: "Western",
  dressage: "Dressur",
  jumping: "Springen",
  breeding: "Zucht",
  therapy: "Therapie",
  school: "Schulpferd",
  retirement: "Rentner",
};

// CSV-Escape-Funktion
function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Kunden zu CSV konvertieren
export function clientsToCSV(clients: ExportableClient[], horses: ExportableHorse[] = []): string {
  const headers = [
    "Kunden-ID",
    "Name",
    "Vorname",
    "Nachname",
    "E-Mail",
    "Telefon (Mobil)",
    "Telefon (Festnetz)",
    "Straße",
    "Hausnummer",
    "PLZ",
    "Stadt",
    "Bundesland",
    "Kundentyp",
    "Status",
    "Zahlungsmoral",
    "Zuverlässigkeit (1-5)",
    "Arbeitsbedingungen",
    "Auftragserteilung",
    "Geschäftskunde",
    "USt-IdNr.",
    "GPS Lat",
    "GPS Lng",
    "Registriert",
    "App aktiv",
    "Anzahl Pferde",
  ];

  const rows = clients.map((client) => {
    const clientHorses = horses.filter((h) => h.owner_id === client.id);
    
    return [
      client.readable_id || "",
      client.full_name || "",
      client.first_name || "",
      client.last_name || "",
      client.email || "",
      client.phone_mobile || client.phone || "",
      client.phone_landline || "",
      client.street || "",
      client.house_number || "",
      client.zip_code || "",
      client.city || "",
      client.state || "",
      CLIENT_TYPE_LABELS[client.client_type || ""] || client.client_type || "",
      LIFECYCLE_STATUS_LABELS[client.lifecycle_status || ""] || client.lifecycle_status || "",
      PAYMENT_RATING_LABELS[client.payment_rating || ""] || client.payment_rating || "",
      client.reliability_score?.toString() || "",
      client.working_conditions || "",
      client.order_authorization ? "Ja" : "Nein",
      client.is_business ? "Ja" : "Nein",
      client.vat_id || "",
      client.geo_lat?.toString() || "",
      client.geo_lng?.toString() || "",
      client.created_at ? formatDate(new Date(client.created_at), "dd.MM.yyyy", { locale: de }) : "",
      client.has_logged_in ? "Ja" : "Nein",
      clientHorses.length.toString(),
    ].map(escapeCSV).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

// Pferde zu CSV konvertieren
export function horsesToCSV(horses: ExportableHorse[], clients: ExportableClient[] = []): string {
  const headers = [
    "Pferde-ID",
    "Name",
    "Besitzer-ID",
    "Besitzer Name",
    "Rasse",
    "Geburtsjahr",
    "Geschlecht",
    "Chip-Nummer",
    "Haltungsform",
    "Nutzungsart",
    "Beschlagen",
    "Hufschutz",
    "Gesundheitsstatus",
  ];

  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const rows = horses.map((horse) => {
    const owner = clientMap.get(horse.owner_id);
    const shoeingStatus = horse.shoeing_status === true || horse.shoeing_status === "true" ? "Ja" : "Nein";
    
    return [
      horse.readable_id || "",
      horse.name,
      owner?.readable_id || "",
      owner?.full_name || "",
      horse.breed || "",
      horse.birth_year?.toString() || "",
      horse.gender || "",
      horse.chip_number || "",
      HOLDING_TYPE_LABELS[horse.holding_type || ""] || horse.holding_type || "",
      USAGE_TYPE_LABELS[horse.usage_type || ""] || horse.usage_type || "",
      shoeingStatus,
      horse.hoof_protection || "",
      horse.health_status || "",
    ].map(escapeCSV).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

// CSV als Datei herunterladen
export function downloadCSV(content: string, filename: string): void {
  // Add BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Kompletter Export (Kunden + Pferde in einer Datei)
export function exportClientsWithHorses(
  clients: ExportableClient[],
  horses: ExportableHorse[],
  exportFormat: "csv" | "separate" = "csv"
): void {
  const timestamp = formatDate(new Date(), "yyyy-MM-dd_HH-mm", { locale: de });

  if (exportFormat === "separate") {
    // Separate Dateien für Kunden und Pferde
    const clientsCSV = clientsToCSV(clients, horses);
    const horsesCSV = horsesToCSV(horses, clients);
    
    downloadCSV(clientsCSV, `kunden_export_${timestamp}.csv`);
    setTimeout(() => {
      downloadCSV(horsesCSV, `pferde_export_${timestamp}.csv`);
    }, 500);
  } else {
    // Kombinierter Export (nur Kunden mit Pferdeanzahl)
    const combinedCSV = clientsToCSV(clients, horses);
    downloadCSV(combinedCSV, `kundendaten_${timestamp}.csv`);
  }
}

// Quick Export Funktion für UI
export function exportClientData(
  clients: ExportableClient[],
  horses: ExportableHorse[],
  type: "clients" | "horses" | "all"
): void {
  const timestamp = formatDate(new Date(), "yyyy-MM-dd_HH-mm", { locale: de });

  switch (type) {
    case "clients":
      downloadCSV(clientsToCSV(clients, horses), `kunden_${timestamp}.csv`);
      break;
    case "horses":
      downloadCSV(horsesToCSV(horses, clients), `pferde_${timestamp}.csv`);
      break;
    case "all":
      exportClientsWithHorses(clients, horses, "separate");
      break;
  }
}
