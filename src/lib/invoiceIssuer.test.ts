import { describe, expect, it } from "vitest";
import { missingIssuerInvoiceFields } from "./invoiceIssuer";

describe("missingIssuerInvoiceFields", () => {
  it("ohne Betriebsdaten fehlen Name, Anschrift und Steuernummer", () => {
    expect(missingIssuerInvoiceFields(null)).toEqual(["Betriebsname", "Anschrift", "Steuernummer oder USt-IdNr."]);
  });
  it("Steuernummer ODER USt-IdNr. genügt, Leerzeichen zählen nicht", () => {
    expect(missingIssuerInvoiceFields({ business_name: "Huf", address: "Str 1\n04103 Leipzig", tax_number: "  ", vat_id: "DE123" })).toEqual([]);
    expect(missingIssuerInvoiceFields({ business_name: "Huf", address: " ", tax_number: "123" })).toEqual(["Anschrift"]);
  });
});
