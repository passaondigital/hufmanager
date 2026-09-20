/**
 * Reine Steuerlogik für die Rechnungs-PDF-Summenzeile. Ausgelagert aus
 * invoicePdfGenerator.ts, damit sie ohne jsPDF/Supabase testbar ist.
 * customer_type kommt aus CreateInvoiceModal.tsx ("privat" | "gewerbe" |
 * "kleinunternehmer") und muss aus dem kanonischen Invoice-Load geladen
 * werden, sonst greift hier fälschlich immer der Privat-Zweig.
 */
import { calculateVatFromGross } from "./dachConfig";

export type InvoiceTaxMode = "kleinunternehmer" | "gewerbe" | "privat";

export interface InvoiceTaxPresentation {
  mode: InvoiceTaxMode;
  netAmount: number;
  vatAmount: number;
  vatRate: number;
  totalLabel: string;
}

export function resolveInvoiceTaxPresentation(
  customerType: string | null | undefined,
  vatRate: number,
  grossAmount: number,
): InvoiceTaxPresentation {
  const isKleinunternehmer = customerType === "kleinunternehmer" || vatRate === 0;
  const isGewerbe = !isKleinunternehmer && customerType === "gewerbe";

  if (isKleinunternehmer) {
    return { mode: "kleinunternehmer", netAmount: grossAmount, vatAmount: 0, vatRate: 0, totalLabel: "Rechnungsbetrag:" };
  }
  if (isGewerbe) {
    return { mode: "gewerbe", netAmount: grossAmount, vatAmount: 0, vatRate, totalLabel: "Gesamtbetrag (Netto):" };
  }
  const { netAmount, vatAmount } = calculateVatFromGross(grossAmount, vatRate);
  return { mode: "privat", netAmount, vatAmount, vatRate, totalLabel: "Gesamtbetrag:" };
}
