-- Restore tenant-scoped reads for persisted invoice positions.
-- invoice_items had RLS enabled but no SELECT policy, so even the owning
-- provider/client received an empty result for a position they may access.

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
ON public.invoice_items (invoice_id);

DROP POLICY IF EXISTS "Invoice participants can view invoice items"
ON public.invoice_items;

CREATE POLICY "Invoice participants can view invoice items"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.id = invoice_items.invoice_id
      AND (
        invoice.provider_id = (SELECT auth.uid())
        OR invoice.client_id = (SELECT auth.uid())
      )
  )
);
