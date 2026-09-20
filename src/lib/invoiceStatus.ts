/**
 * Canonical "offene Rechnung"-Logik für Rechnungen, SlimFinanceScreen,
 * ClientInvoices, ClientInvoicesSection und TodayScreen.
 *
 * invoices.status ist freier Text ohne CHECK-Constraint (derselbe Trap wie
 * appointments.status, siehe CLAUDE.md "Bekannte Fallen"). Im Code kursieren
 * mehrere, teils nie geschriebene Werte:
 *   - tatsächlich geschrieben (CreateInvoiceModal): "sent" | "paid" |
 *     "overdue", sowie "cancelled" beim Stornieren.
 *   - DB-Spaltendefault, über die aktuelle UI nie erreicht: "draft".
 *   - in älteren UI-Filtern referenziert, aber nirgends mehr geschrieben:
 *     "pending", "open" (status) bzw. "open" (payment_status).
 *   - Gutschriften: kein Status-String "credited" existiert im Code (geprüft:
 *     keine Schreibstelle). Eine Rechnung ist eine Gutschrift, wenn
 *     credit_note_for (FK auf die Ursprungsrechnung) gesetzt ist. Sollte
 *     irgendwo doch literal status="credited" geschrieben werden, wird das
 *     ebenfalls erkannt.
 *
 * Diese Datei ist die einzige Stelle, die daraus eine kanonische Kategorie
 * ableitet. Es wird keine neue Statusarchitektur eingeführt — nur eine
 * einheitliche Lesart der bestehenden, freien Werte. Unbekannte/legacy Werte
 * fallen bewusst auf "open" zurück, nie auf "paid": eine Rechnung gilt erst
 * als erledigt, wenn payment_status oder status das explizit sagen.
 *
 * WICHTIG für Aufrufer: jede Query, die isInvoiceOpen / getInvoiceStatusLabel
 * / getInvoiceStatusCategory verwendet, muss status, payment_status,
 * cancelled_at UND credit_note_for selektieren und das volle Objekt
 * übergeben — nicht nur status. Ein Badge, der nur status+cancelled_at
 * bekommt, zeigt "Offen" für eine Rechnung, die bereits per payment_status
 * bezahlt wurde.
 */

export type InvoiceStatusCategory = "draft" | "open" | "overdue" | "paid" | "cancelled" | "credited";

export interface InvoiceStatusInput {
  status: string | null;
  payment_status?: string | null;
  cancelled_at?: string | null;
  credit_note_for?: string | null;
}

export function getInvoiceStatusCategory(invoice: InvoiceStatusInput): InvoiceStatusCategory {
  if (invoice.cancelled_at || invoice.status === "cancelled") return "cancelled";
  if (invoice.credit_note_for || invoice.status === "credited") return "credited";
  if (invoice.payment_status === "paid" || invoice.status === "paid") return "paid";
  if (invoice.status === "overdue") return "overdue";
  if (invoice.status === "draft") return "draft";
  return "open";
}

/** Offen = aktiv zu verfolgende, unbezahlte Rechnung (inkl. überfällig). */
export function isInvoiceOpen(invoice: InvoiceStatusInput): boolean {
  const category = getInvoiceStatusCategory(invoice);
  return category === "open" || category === "overdue";
}

export function isInvoicePaid(invoice: InvoiceStatusInput): boolean {
  return getInvoiceStatusCategory(invoice) === "paid";
}

export function isInvoiceOverdue(invoice: InvoiceStatusInput): boolean {
  return getInvoiceStatusCategory(invoice) === "overdue";
}

export function isInvoiceCancelled(invoice: InvoiceStatusInput): boolean {
  return getInvoiceStatusCategory(invoice) === "cancelled";
}

export function isInvoiceCredited(invoice: InvoiceStatusInput): boolean {
  return getInvoiceStatusCategory(invoice) === "credited";
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatusCategory, string> = {
  draft: "Entwurf",
  open: "Offen",
  overdue: "Überfällig",
  paid: "Bezahlt",
  cancelled: "Storniert",
  credited: "Gutschrift",
};

export function getInvoiceStatusLabel(invoice: InvoiceStatusInput): string {
  return INVOICE_STATUS_LABELS[getInvoiceStatusCategory(invoice)];
}
