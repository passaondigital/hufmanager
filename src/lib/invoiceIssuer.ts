// Anbieter-Angaben, die auf der Rechnung erscheinen (invoicePdfGenerator: Anschrift, St.-Nr./USt-IdNr., Name).
// Nur Hinweis in der Rechnungsmaske – ob fehlende Angaben das Erstellen blockieren, ist eine Owner-Entscheidung.
export interface IssuerFields {
  business_name?: string | null;
  address?: string | null;
  tax_number?: string | null;
  vat_id?: string | null;
}

const filled = (v: string | null | undefined) => typeof v === "string" && v.trim().length > 0;

export function missingIssuerInvoiceFields(settings: IssuerFields | null | undefined): string[] {
  const missing: string[] = [];
  if (!filled(settings?.business_name)) missing.push("Betriebsname");
  if (!filled(settings?.address)) missing.push("Anschrift");
  if (!filled(settings?.tax_number) && !filled(settings?.vat_id)) missing.push("Steuernummer oder USt-IdNr.");
  return missing;
}
