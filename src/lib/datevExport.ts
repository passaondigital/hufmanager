import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Invoice {
  id: string;
  invoice_number: string | null;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  status: string | null;
  notes: string | null;
  client?: {
    full_name: string | null;
    readable_id: string | null;
  } | null;
  horse?: {
    name: string;
  } | null;
}

/**
 * Generate DATEV-compatible CSV export
 * Format follows DATEV Buchungsstapel (Posting batch) specification
 */
export function generateDatevExport(invoices: Invoice[], providerId: string): string {
  const now = new Date();
  const exportDate = format(now, "ddMMyyyy");
  const fiscalYear = now.getFullYear();
  
  // DATEV Header line
  const headerFields = [
    "EXTF",                      // Format identifier
    "700",                       // Version
    "21",                        // Data category (Buchungsstapel)
    "Buchungsstapel",           // Category name
    "13",                        // Format version
    exportDate,                  // Created date
    "",                          // Reserved
    "",                          // Reserved
    "",                          // Reserved
    "",                          // Reserved
    providerId.substring(0, 7),  // Berater (consultant number)
    "1",                         // Mandant (client number)
    String(fiscalYear),          // Fiscal year start
    "4",                         // Length of account numbers
    format(now, "yyyyMMddHHmmss"), // Creation timestamp
    "",                          // Reserved
    "",                          // Reserved
    "",                          // Reserved
    "EUR",                       // Currency
    "",                          // Reserved
    "",                          // Reserved
    "",                          // Reserved
    "",                          // Reserved
    "",                          // Reserved
    "",                          // Reserved
    "",                          // Reserved
    "",                          // Reserved
  ];
  
  // Column headers for posting data
  const columnHeaders = [
    "Umsatz (ohne Soll/Haben-Kz)",
    "Soll/Haben-Kennzeichen",
    "WKZ Umsatz",
    "Kurs",
    "Basis-Umsatz",
    "WKZ Basis-Umsatz",
    "Konto",
    "Gegenkonto (ohne BU-Schlüssel)",
    "BU-Schlüssel",
    "Belegdatum",
    "Belegfeld 1",
    "Belegfeld 2",
    "Skonto",
    "Buchungstext",
    "Postensperre",
    "Diverse Adressnummer",
    "Geschäftspartnerbank",
    "Sachverhalt",
    "Zinssperre",
    "Beleglink",
    "Beleginfo - Art 1",
    "Beleginfo - Inhalt 1",
    "Beleginfo - Art 2",
    "Beleginfo - Inhalt 2",
    "Beleginfo - Art 3",
    "Beleginfo - Inhalt 3",
    "Beleginfo - Art 4",
    "Beleginfo - Inhalt 4",
    "Beleginfo - Art 5",
    "Beleginfo - Inhalt 5",
    "Beleginfo - Art 6",
    "Beleginfo - Inhalt 6",
    "Beleginfo - Art 7",
    "Beleginfo - Inhalt 7",
    "Beleginfo - Art 8",
    "Beleginfo - Inhalt 8",
    "KOST1 - Kostenstelle",
    "KOST2 - Kostenstelle",
    "Kost-Menge",
    "EU-Land u. UStID",
    "EU-Steuersatz",
    "Abw. Versteuerungsart",
    "Sachverhalt L+L",
    "Funktionsergänzung L+L",
    "BU 49 Hauptfunktionstyp",
    "BU 49 Hauptfunktionsnummer",
    "BU 49 Funktionsergänzung",
    "Zusatzinformation - Art 1",
    "Zusatzinformation - Inhalt 1",
    "Zusatzinformation - Art 2",
    "Zusatzinformation - Inhalt 2",
    "Zusatzinformation - Art 3",
    "Zusatzinformation - Inhalt 3",
    "Zusatzinformation - Art 4",
    "Zusatzinformation - Inhalt 4",
    "Zusatzinformation - Art 5",
    "Zusatzinformation - Inhalt 5",
    "Zusatzinformation - Art 6",
    "Zusatzinformation - Inhalt 6",
    "Zusatzinformation - Art 7",
    "Zusatzinformation - Inhalt 7",
    "Zusatzinformation - Art 8",
    "Zusatzinformation - Inhalt 8",
    "Zusatzinformation - Art 9",
    "Zusatzinformation - Inhalt 9",
    "Zusatzinformation - Art 10",
    "Zusatzinformation - Inhalt 10",
    "Zusatzinformation - Art 11",
    "Zusatzinformation - Inhalt 11",
    "Zusatzinformation - Art 12",
    "Zusatzinformation - Inhalt 12",
    "Zusatzinformation - Art 13",
    "Zusatzinformation - Inhalt 13",
    "Zusatzinformation - Art 14",
    "Zusatzinformation - Inhalt 14",
    "Zusatzinformation - Art 15",
    "Zusatzinformation - Inhalt 15",
    "Zusatzinformation - Art 16",
    "Zusatzinformation - Inhalt 16",
    "Zusatzinformation - Art 17",
    "Zusatzinformation - Inhalt 17",
    "Zusatzinformation - Art 18",
    "Zusatzinformation - Inhalt 18",
    "Zusatzinformation - Art 19",
    "Zusatzinformation - Inhalt 19",
    "Zusatzinformation - Art 20",
    "Zusatzinformation - Inhalt 20",
    "Stück",
    "Gewicht",
    "Zahlweise",
    "Forderungsart",
    "Veranlagungsjahr",
    "Zugeordnete Fälligkeit",
    "Skontotyp",
    "Auftragsnummer",
    "Buchungstyp",
    "USt-Schlüssel (Anzahlungen)",
    "EU-Land (Anzahlungen)",
    "Sachverhalt L+L (Anzahlungen)",
    "EU-Steuersatz (Anzahlungen)",
    "Erlöskonto (Anzahlungen)",
    "Herkunft-Kz",
    "Buchungs GUID",
    "KOST-Datum",
    "SEPA-Mandatsreferenz",
    "Skontosperre",
    "Gesellschaftername",
    "Beteiligtennummer",
    "Identifikationsnummer",
    "Zeichnernummer",
    "Postensperre bis",
    "Bezeichnung SoBil-Sachverhalt",
    "Kennzeichen SoBil-Buchung",
    "Festschreibung",
    "Leistungsdatum",
    "Datum Zuord. Steuerperiode",
    "Fälligkeit",
    "Generalumkehr (GU)",
    "Steuersatz",
    "Land",
  ];
  
  // Generate data rows
  const dataRows = invoices
    .filter(inv => inv.status !== "cancelled")
    .map(invoice => {
      const invoiceDate = new Date(invoice.issue_date);
      const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
      
      // Format amount (German decimal format, no thousand separator)
      const amount = invoice.total_amount.toFixed(2).replace(".", ",");
      
      // Customer account (Debitorenkonto) - typically 10000-69999 range
      // We use a hash of the customer ID to generate a consistent account number
      const customerAccount = invoice.client?.readable_id 
        ? `1${invoice.client.readable_id.padStart(4, "0")}`
        : "10000";
      
      // Revenue account (Erlöskonto) - typically 8000-8999 for revenue
      const revenueAccount = "8400"; // Standard revenue account for services
      
      // Build booking text
      const bookingText = [
        invoice.invoice_number || `R-${invoice.id.substring(0, 8)}`,
        invoice.client?.full_name || "Kunde",
        invoice.horse?.name ? `(${invoice.horse.name})` : "",
      ].filter(Boolean).join(" ").substring(0, 60);
      
      // Format dates for DATEV (TTMM or TTMMJJJJ)
      const belegdatum = format(invoiceDate, "ddMM");
      
      // Build the row with all required fields
      const row: string[] = new Array(columnHeaders.length).fill("");
      
      row[0] = amount;                           // Umsatz
      row[1] = "S";                              // Soll/Haben (S = Soll/Debit for customer)
      row[2] = "EUR";                            // Currency
      row[3] = "";                               // Kurs
      row[4] = "";                               // Basis-Umsatz
      row[5] = "";                               // WKZ Basis-Umsatz
      row[6] = customerAccount;                  // Konto (customer account)
      row[7] = revenueAccount;                   // Gegenkonto (revenue account)
      row[8] = "";                               // BU-Schlüssel
      row[9] = belegdatum;                       // Belegdatum
      row[10] = invoice.invoice_number || "";    // Belegfeld 1 (invoice number)
      row[11] = "";                              // Belegfeld 2
      row[12] = "";                              // Skonto
      row[13] = bookingText;                     // Buchungstext
      
      // Additional fields for payment tracking
      if (invoice.status === "paid") {
        row[90] = "1"; // Zahlweise = bezahlt
      }
      
      if (dueDate) {
        row[93] = format(dueDate, "ddMMyyyy"); // Zugeordnete Fälligkeit
      }
      
      return row;
    });
  
  // Combine all parts
  const lines = [
    headerFields.join(";"),
    columnHeaders.join(";"),
    ...dataRows.map(row => row.join(";")),
  ];
  
  return lines.join("\r\n");
}

/**
 * Download DATEV export as file
 */
export function downloadDatevExport(invoices: Invoice[], providerId: string): void {
  const csv = generateDatevExport(invoices, providerId);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `EXTF_Buchungsstapel_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Simple CSV export for invoices (user-friendly format)
 */
export function generateSimpleInvoiceExport(invoices: Invoice[]): string {
  const headers = [
    "Rechnungsnummer",
    "Datum",
    "Fällig",
    "Kunde",
    "Kunden-Nr",
    "Pferd",
    "Betrag (EUR)",
    "Status",
    "Notizen",
  ];
  
  const rows = invoices.map(invoice => [
    invoice.invoice_number || invoice.id.substring(0, 8),
    format(new Date(invoice.issue_date), "dd.MM.yyyy"),
    invoice.due_date ? format(new Date(invoice.due_date), "dd.MM.yyyy") : "",
    invoice.client?.full_name || "",
    invoice.client?.readable_id || "",
    invoice.horse?.name || "",
    invoice.total_amount.toFixed(2).replace(".", ","),
    invoice.status || "offen",
    (invoice.notes || "").replace(/[\n\r]+/g, " ").substring(0, 100),
  ]);
  
  const csvContent = [
    headers.join(";"),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(";")),
  ].join("\r\n");
  
  return csvContent;
}

/**
 * Download simple CSV export
 */
export function downloadSimpleExport(invoices: Invoice[]): void {
  const csv = generateSimpleInvoiceExport(invoices);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Rechnungen_Export_${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
