/**
 * Reine, Supabase-/jsPDF-freie Positionslogik für Rechnungen. Ausgelagert aus
 * invoicePdfGenerator.ts, damit sie ohne Supabase-Client-Initialisierung
 * testbar ist.
 */

export interface ResolvedInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isBundle?: boolean;
}

export interface CanonicalInvoiceItemRow {
  title: string;
  quantity: number | null;
  unit_price: number;
  total_price: number;
}

/**
 * invoice_items ist canonical truth für PDF/Anzeige. Ein Query-FEHLER darf
 * NIE zum stillen Freitext-Fallback führen (das wäre eine falsche Rechnung
 * fürs Finanzamt). Reine Funktion: wirft bei error, tut sonst nichts.
 */
export function assertInvoiceItemsQuerySucceeded(error: { message: string } | null): void {
  if (error) {
    throw new Error(`Rechnungspositionen konnten nicht geladen werden: ${error.message}`);
  }
}

// P1-F (Correction Pass 3): die vorherige Legacy-Erkennung verglich
// invoices.created_at gegen ein festes Cutover-Datum
// (ATOMIC_INVOICE_ITEMS_CUTOVER). Codex hat das zurecht als nicht belastbar
// zurückgewiesen: created_at ist kein persistierter Beweis dafür, DASS eine
// bestimmte Rechnung tatsächlich vor der RPC-Migration ohne invoice_items
// angelegt wurde — es ist nur ein Datum, das zufällig korreliert. Es gibt
// keine echte, persistierte Markierung (kein Flag, keine Spalte) auf
// invoices, die "diese Rechnung ist strukturell legacy" beweist (geprüft:
// supabase/migrations/, src/integrations/supabase/types.ts → invoices.Row
// kennt keine solche Spalte).
//
// LEGACY_INVOICE_CONTRACT=NOT_SUPPORTED — es gibt aktuell keinen
// unterstützten automatischen Legacy-Fallback. Der Vertrag ist jetzt:
//   - invoice_items vorhanden (>0 Zeilen)  → canonical (siehe unten)
//   - Query-Fehler                          → harter Fehler (assertInvoiceItemsQuerySucceeded)
//   - 0 invoice_items                       → Consistency-Fehler, IMMER
// Einzelne alte Rechnungen ohne invoice_items müssen separat identifiziert
// und repariert/migriert werden (nicht hier, nicht automatisch, nicht
// geraten). parseLineItemsFromNotesLegacyFallback bleibt als reine
// Parsing-Funktion für ein solches manuelles Reparatur-Werkzeug erhalten,
// wird aber von resolveInvoiceLineItems nicht mehr automatisch aufgerufen.
export function parseLineItemsFromNotesLegacyFallback(notes: string | null, totalAmount: number): ResolvedInvoiceLineItem[] {
  if (!notes) {
    return [{ description: "Hufbearbeitung", quantity: 1, unitPrice: totalAmount, total: totalAmount }];
  }

  const items: ResolvedInvoiceLineItem[] = [];
  const lines = notes.split('\n');

  let currentSection = '';
  let runningTotal = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check for section headers
    if (trimmedLine === 'Produkte:') {
      currentSection = 'products';
      continue;
    }

    // Parse product lines: "Product Name (2x) = €10.00"
    const productMatch = trimmedLine.match(/^(.+?)\s*\((\d+)x\)\s*=\s*€?([\d.,]+)$/);
    if (productMatch) {
      const [, name, qty, total] = productMatch;
      const quantity = parseInt(qty, 10);
      const totalPrice = parseFloat(total.replace(',', '.'));
      const unitPrice = totalPrice / quantity;
      items.push({
        description: name.trim(),
        quantity,
        unitPrice,
        total: totalPrice,
        isBundle: currentSection === 'bundles'
      });
      runningTotal += totalPrice;
      continue;
    }

    // Parse travel cost: "Anfahrt: 25 km (Hin- und Rückfahrt) = €25.00"
    const travelMatch = trimmedLine.match(/^Anfahrt:\s*(\d+)\s*km.*=\s*€?([\d.,]+)$/);
    if (travelMatch) {
      const [, km, total] = travelMatch;
      const totalPrice = parseFloat(total.replace(',', '.'));
      items.push({
        description: `Anfahrt (${km} km × 2)`,
        quantity: 1,
        unitPrice: totalPrice,
        total: totalPrice
      });
      runningTotal += totalPrice;
      continue;
    }
  }

  // If we couldn't parse anything, add a generic service line
  if (items.length === 0) {
    const cleanNotes = notes.replace(/\n/g, ' ').substring(0, 80);
    items.push({
      description: cleanNotes || "Hufbearbeitung",
      quantity: 1,
      unitPrice: totalAmount,
      total: totalAmount
    });
  } else {
    // Check if we need to add remaining amount as a service fee
    const remaining = totalAmount - runningTotal;
    if (remaining > 0.01) {
      items.unshift({
        description: "Hufbearbeitung / Dienstleistung",
        quantity: 1,
        unitPrice: remaining,
        total: remaining
      });
    }
  }

  return items;
}

/**
 * Kanonische Positionen-Auflösung (P1-F: LEGACY_INVOICE_CONTRACT=NOT_SUPPORTED).
 *
 * - Persistierte invoice_items (>0 Zeilen) sind IMMER die Quelle.
 * - 0 Zeilen ist IMMER ein inkonsistenter Datensatz und wirft einen Fehler —
 *   es gibt keinen automatischen Freitext-Fallback mehr, weil es keinen
 *   belastbaren, persistierten Marker gibt, der eine Rechnung zweifelsfrei
 *   als "strukturell legacy" ausweist (siehe Kommentar bei
 *   parseLineItemsFromNotesLegacyFallback). Alte Einzelfälle müssen separat
 *   identifiziert und repariert werden, nicht hier automatisch geraten.
 */
export function resolveInvoiceLineItems(
  canonicalItems: CanonicalInvoiceItemRow[] | null | undefined,
  notes: string | null,
  totalAmount: number,
): ResolvedInvoiceLineItem[] {
  if (canonicalItems && canonicalItems.length > 0) {
    return canonicalItems.map((item) => ({
      description: item.title,
      quantity: item.quantity ?? 1,
      unitPrice: Number(item.unit_price),
      total: Number(item.total_price),
    }));
  }
  throw new Error(
    "INVOICE_ITEMS_MISSING: Diese Rechnung hat keine invoice_items-Zeilen. Das ist ein inkonsistenter " +
    "Datensatz — es gibt keinen unterstützten automatischen Legacy-Fallback (LEGACY_INVOICE_CONTRACT=NOT_SUPPORTED).",
  );
}
