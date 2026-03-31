
-- Insert issuer billing profile as a single JSON record in admin_settings
INSERT INTO admin_settings (key, value, description)
VALUES (
  'issuer_profile',
  '{"name": "Pascal Christian Schmid", "company": "HufManager", "address": "Pascal Schmid c/o Postflex #10643, Emsdettener Str. 10, 48268 Greven", "email": "support@hufmanager.de", "phone": "0152 0900 7017", "iban": "DE66 2020 2080 0002 8383 704", "bic": "SXPYDEHH", "account_holder": "Pascal Christian Schmid", "tax_note": "Gemäß §19 UStG wird keine Umsatzsteuer berechnet und ausgewiesen.", "tax_id": ""}'::jsonb,
  'Zentrale Rechnungssteller-Daten für Rechnungen und Verträge'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Make invoice_number immutable after status changes from draft
-- Replace the trigger function to also prevent number changes on non-draft invoices
CREATE OR REPLACE FUNCTION generate_admin_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_year TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  v_seq INT;
BEGIN
  -- For new records: auto-generate if empty
  IF TG_OP = 'INSERT' THEN
    IF NEW.invoice_number IS NOT NULL AND NEW.invoice_number != '' THEN
      RETURN NEW;
    END IF;
    SELECT COALESCE(MAX(
      CAST(SPLIT_PART(invoice_number, '-', 3) AS INT)
    ), 0) + 1
    INTO v_seq
    FROM public.admin_invoices
    WHERE invoice_number LIKE 'HM-' || v_year || '-%';
    NEW.invoice_number := 'HM-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
    RETURN NEW;
  END IF;

  -- For updates: prevent changing invoice_number on non-draft invoices
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'draft' AND NEW.invoice_number != OLD.invoice_number THEN
      RAISE EXCEPTION 'Rechnungsnummer kann nach Versand nicht mehr geändert werden';
    END IF;
    -- Auto-generate if still empty on update
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
      SELECT COALESCE(MAX(
        CAST(SPLIT_PART(invoice_number, '-', 3) AS INT)
      ), 0) + 1
      INTO v_seq
      FROM public.admin_invoices
      WHERE invoice_number LIKE 'HM-' || v_year || '-%';
      NEW.invoice_number := 'HM-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger for both INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_admin_invoice_number ON admin_invoices;
CREATE TRIGGER trg_admin_invoice_number
  BEFORE INSERT OR UPDATE ON admin_invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_admin_invoice_number();
