import { describe, expect, it } from "vitest";
import {
  getInvoiceStatusCategory,
  getInvoiceStatusLabel,
  isInvoiceOpen,
  isInvoiceOverdue,
  isInvoicePaid,
} from "./invoiceStatus";

describe("invoiceStatus", () => {
  it("treats a freshly created invoice (status=sent, payment_status=unpaid) as open", () => {
    const invoice = { status: "sent", payment_status: "unpaid" };
    expect(getInvoiceStatusCategory(invoice)).toBe("open");
    expect(isInvoiceOpen(invoice)).toBe(true);
    expect(isInvoicePaid(invoice)).toBe(false);
  });

  it("does not count a paid invoice as open, whether paid via status or payment_status", () => {
    expect(isInvoiceOpen({ status: "paid", payment_status: "unpaid" })).toBe(false);
    expect(isInvoiceOpen({ status: "sent", payment_status: "paid" })).toBe(false);
    expect(isInvoicePaid({ status: "sent", payment_status: "paid" })).toBe(true);
  });

  it("classifies overdue invoices as open and overdue", () => {
    const invoice = { status: "overdue", payment_status: "unpaid" };
    expect(getInvoiceStatusCategory(invoice)).toBe("overdue");
    expect(isInvoiceOpen(invoice)).toBe(true);
    expect(isInvoiceOverdue(invoice)).toBe(true);
  });

  it("treats cancellation via cancelled_at as cancelled even if status wasn't updated", () => {
    const invoice = { status: "sent", payment_status: "unpaid", cancelled_at: "2026-09-01T00:00:00Z" };
    expect(getInvoiceStatusCategory(invoice)).toBe("cancelled");
    expect(isInvoiceOpen(invoice)).toBe(false);
  });

  it("treats cancellation via status=cancelled as cancelled", () => {
    expect(getInvoiceStatusCategory({ status: "cancelled", payment_status: null })).toBe("cancelled");
  });

  it("does not count a draft as open (nothing has been issued yet)", () => {
    const invoice = { status: "draft", payment_status: null };
    expect(getInvoiceStatusCategory(invoice)).toBe("draft");
    expect(isInvoiceOpen(invoice)).toBe(false);
  });

  it("falls back unknown/legacy status values (pending, open) to open, never to paid", () => {
    expect(getInvoiceStatusCategory({ status: "pending", payment_status: null })).toBe("open");
    expect(getInvoiceStatusCategory({ status: "open", payment_status: null })).toBe("open");
    expect(isInvoiceOpen({ status: "pending", payment_status: null })).toBe(true);
  });

  it("treats a credit note (credit_note_for set) as credited, never open", () => {
    const invoice = { status: "sent", payment_status: "unpaid", credit_note_for: "11111111-1111-1111-1111-111111111111" };
    expect(getInvoiceStatusCategory(invoice)).toBe("credited");
    expect(isInvoiceOpen(invoice)).toBe(false);
  });

  it("treats a literal status=credited as credited even without credit_note_for", () => {
    expect(getInvoiceStatusCategory({ status: "credited", payment_status: null })).toBe("credited");
  });

  it("status=sent + payment_status=paid counts as paid, not open", () => {
    const invoice = { status: "sent", payment_status: "paid" };
    expect(getInvoiceStatusCategory(invoice)).toBe("paid");
    expect(isInvoiceOpen(invoice)).toBe(false);
    expect(isInvoicePaid(invoice)).toBe(true);
  });

  it("status=sent + payment_status=unpaid counts as open", () => {
    const invoice = { status: "sent", payment_status: "unpaid" };
    expect(isInvoiceOpen(invoice)).toBe(true);
    expect(isInvoicePaid(invoice)).toBe(false);
  });

  it("cancelled invoices are never open, regardless of payment_status", () => {
    expect(isInvoiceOpen({ status: "cancelled", payment_status: "unpaid" })).toBe(false);
    expect(isInvoiceOpen({ status: "sent", payment_status: "unpaid", cancelled_at: "2026-09-01" })).toBe(false);
  });

  it("produces a German label matching the resolved category", () => {
    expect(getInvoiceStatusLabel({ status: "sent", payment_status: "unpaid" })).toBe("Offen");
    expect(getInvoiceStatusLabel({ status: "paid", payment_status: null })).toBe("Bezahlt");
    expect(getInvoiceStatusLabel({ status: "overdue", payment_status: null })).toBe("Überfällig");
    expect(getInvoiceStatusLabel({ status: "draft", payment_status: null })).toBe("Entwurf");
    expect(getInvoiceStatusLabel({ status: "sent", payment_status: null, cancelled_at: "2026-09-01" })).toBe("Storniert");
    expect(getInvoiceStatusLabel({ status: "sent", payment_status: null, credit_note_for: "x" })).toBe("Gutschrift");
  });
});
