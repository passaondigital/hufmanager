-- Rechnung „Kleinunternehmer (§19 UStG)“ speicherbar machen (Release-Sprint 28.09.2026, P1).
--
-- Befund: CreateInvoiceModal bietet customer_type = 'kleinunternehmer' an und die PDF-/Steuerlogik
-- (src/lib/invoiceTax.ts) wertet ihn aus, der CHECK erlaubte aber nur 'privat' | 'gewerbe' → Insert schlug fehl.
-- Rein additive Erweiterung: alle Bestandszeilen erfüllen den neuen CHECK weiterhin, keine Datenänderung.
-- Rollback: Constraint wieder auf ('privat','gewerbe') setzen (nur möglich, solange keine
-- 'kleinunternehmer'-Rechnungen existieren).

BEGIN;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_customer_type_check;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_customer_type_check
  CHECK (customer_type = ANY (ARRAY['privat'::text, 'gewerbe'::text, 'kleinunternehmer'::text]));

COMMIT;
