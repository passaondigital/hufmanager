import { describe, expect, it } from "vitest";
import { resolveInvoiceTaxPresentation } from "./invoiceTax";

describe("resolveInvoiceTaxPresentation", () => {
  it("computes net/VAT split for a Privatkunde at the standard German rate", () => {
    const result = resolveInvoiceTaxPresentation("privat", 19, 119);
    expect(result.mode).toBe("privat");
    expect(result.netAmount).toBeCloseTo(100, 2);
    expect(result.vatAmount).toBeCloseTo(19, 2);
    expect(result.totalLabel).toBe("Gesamtbetrag:");
  });

  it("shows no VAT and a net-only line for a Gewerbekunde (reverse charge)", () => {
    const result = resolveInvoiceTaxPresentation("gewerbe", 19, 100);
    expect(result.mode).toBe("gewerbe");
    expect(result.netAmount).toBe(100);
    expect(result.vatAmount).toBe(0);
    expect(result.totalLabel).toBe("Gesamtbetrag (Netto):");
  });

  it("shows no VAT for a Kleinunternehmer, regardless of the configured VAT rate", () => {
    const result = resolveInvoiceTaxPresentation("kleinunternehmer", 19, 100);
    expect(result.mode).toBe("kleinunternehmer");
    expect(result.netAmount).toBe(100);
    expect(result.vatAmount).toBe(0);
    expect(result.totalLabel).toBe("Rechnungsbetrag:");
  });

  it("treats a 0% configured VAT rate as Kleinunternehmer even for customer_type=privat", () => {
    const result = resolveInvoiceTaxPresentation("privat", 0, 100);
    expect(result.mode).toBe("kleinunternehmer");
  });

  it("Kleinunternehmer wins over gewerbe if both signals are somehow present", () => {
    const result = resolveInvoiceTaxPresentation("kleinunternehmer", 0, 100);
    expect(result.mode).toBe("kleinunternehmer");
  });

  it("defaults to the Privatkunde (gross-with-VAT) branch for missing/unknown customer_type", () => {
    expect(resolveInvoiceTaxPresentation(null, 19, 119).mode).toBe("privat");
    expect(resolveInvoiceTaxPresentation(undefined, 19, 119).mode).toBe("privat");
  });
});
