import type { Json } from "@/integrations/supabase/types";

/**
 * P1-G: create_invoice_with_items ist als `Returns: Json` typisiert (siehe
 * types.ts) — der generierte Typ kennt die tatsächliche Form nicht. Laut
 * Funktionsdefinition (supabase/migrations/20260912051700_fix_create_invoice_
 * with_items_entitlement_gate_v1.sql, `RETURN to_jsonb(v_invoice)`) ist das
 * Ergebnis immer die vollständige invoices-Zeile, also ein Objekt mit `id`.
 * Dieser Guard macht daraus einen echten Typ ohne `as any`-Shortcut und wirft
 * hart, statt eine unerwartete Form zu erraten — sonst könnte ein Aufrufer
 * mit einer defekten/leeren Antwort weiterarbeiten (z.B. einen Zahlungslink
 * mit `undefined` als Rechnungs-ID bauen).
 */
export interface CreateInvoiceWithItemsResult {
  id: string;
}

export function assertCreateInvoiceWithItemsResult(value: Json | null): CreateInvoiceWithItemsResult {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as Record<string, Json>).id === "string"
  ) {
    return { id: (value as Record<string, Json>).id as string };
  }
  throw new Error("create_invoice_with_items: unerwartete Serverantwort (keine gültige Rechnungs-ID)");
}
