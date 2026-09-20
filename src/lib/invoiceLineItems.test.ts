import { describe, expect, it } from "vitest";
import {
  assertInvoiceItemsQuerySucceeded,
  parseLineItemsFromNotesLegacyFallback,
  resolveInvoiceLineItems,
} from "./invoiceLineItems";

describe("resolveInvoiceLineItems", () => {
  it("uses a single persisted invoice_items row as canonical truth", () => {
    const items = resolveInvoiceLineItems(
      [{ title: "Barhufbearbeitung", quantity: 1, unit_price: 45, total_price: 45 }],
      "irrelevant freitext, wird ignoriert",
      45,
    );
    expect(items).toEqual([
      { description: "Barhufbearbeitung", quantity: 1, unitPrice: 45, total: 45 },
    ]);
  });

  it("preserves multiple persisted positions in order with correct sums", () => {
    const items = resolveInvoiceLineItems(
      [
        { title: "Barhufbearbeitung", quantity: 1, unit_price: 45, total_price: 45 },
        { title: "Anfahrt", quantity: 1, unit_price: 15, total_price: 15 },
        { title: "Hufeisen", quantity: 4, unit_price: 8, total_price: 32 },
      ],
      null,
      92,
    );
    expect(items).toHaveLength(3);
    expect(items.map((item) => item.description)).toEqual(["Barhufbearbeitung", "Anfahrt", "Hufeisen"]);
    const total = items.reduce((sum, item) => sum + item.total, 0);
    expect(total).toBe(92);
    expect(items[2]).toEqual({ description: "Hufeisen", quantity: 4, unitPrice: 8, total: 32 });
  });

  it("defaults quantity to 1 when a persisted row has quantity=null", () => {
    const items = resolveInvoiceLineItems(
      [{ title: "Pauschale", quantity: null, unit_price: 60, total_price: 60 }],
      null,
      60,
    );
    expect(items[0].quantity).toBe(1);
  });

  it("P1-F: zero persisted items is ALWAYS a hard error — no automatic legacy/notes-fallback exists anymore", () => {
    expect(() => resolveInvoiceLineItems([], "Hufeisen (1x) = €40.00", 40)).toThrow("INVOICE_ITEMS_MISSING");
    expect(() => resolveInvoiceLineItems(null, "Hufeisen (1x) = €40.00", 40)).toThrow("INVOICE_ITEMS_MISSING");
  });

  it("P1-F: does not silently guess from created_at or any other heuristic — there is no such parameter anymore", () => {
    // resolveInvoiceLineItems nimmt bewusst keinen isLegacyInvoice-Parameter
    // mehr entgegen (LEGACY_INVOICE_CONTRACT=NOT_SUPPORTED) — jeder Aufruf
    // mit 0 Positionen ist ein Consistency-Fehler, unabhängig vom Alter.
    expect(() => resolveInvoiceLineItems([], "Produkte:\nHufeisen (2x) = €20.00", 20)).toThrow("INVOICE_ITEMS_MISSING");
  });

  it("never invents a discount line — no discount concept exists in invoice_items", () => {
    // invoice_items hat keine discount-Spalte (supabase/migrations/...atomic_invoice_with_items.sql);
    // CreateInvoiceModal kennt aktuell kein Rabattfeld. Die Summe der Positionen
    // ist daher immer exakt total_amount, ohne versteckten Abzug.
    const items = resolveInvoiceLineItems(
      [{ title: "Beschlag", quantity: 1, unit_price: 80, total_price: 80 }],
      null,
      80,
    );
    expect(items.reduce((sum, item) => sum + item.total, 0)).toBe(80);
  });
});

describe("assertInvoiceItemsQuerySucceeded", () => {
  it("does nothing when the query succeeded (error=null)", () => {
    expect(() => assertInvoiceItemsQuerySucceeded(null)).not.toThrow();
  });

  it("throws on a query error instead of allowing a silent notes-fallback", () => {
    // ein Supabase-Lesefehler darf NIE dazu führen, dass die PDF still aus
    // Freitext-Notizen rekonstruiert wird — er muss die PDF-Erzeugung abbrechen.
    expect(() => assertInvoiceItemsQuerySucceeded({ message: "permission denied" }))
      .toThrow("Rechnungspositionen konnten nicht geladen werden: permission denied");
  });
});

describe("parseLineItemsFromNotesLegacyFallback", () => {
  // P1-F: diese Funktion wird von resolveInvoiceLineItems NICHT mehr
  // automatisch aufgerufen (kein belastbarer Legacy-Marker vorhanden). Sie
  // bleibt als reine, getestete Parsing-Funktion für ein künftiges manuelles
  // Reparatur-/Migrationswerkzeug für einzelne alte Rechnungen erhalten.
  it("parses product lines out of freitext notes", () => {
    const items = parseLineItemsFromNotesLegacyFallback("Produkte:\nHufeisen (2x) = €20.00", 20);
    expect(items.some((item) => item.description === "Hufeisen")).toBe(true);
  });

  it("falls back to a generic service line when notes are empty", () => {
    const items = parseLineItemsFromNotesLegacyFallback(null, 40);
    expect(items).toEqual([{ description: "Hufbearbeitung", quantity: 1, unitPrice: 40, total: 40 }]);
  });
});
