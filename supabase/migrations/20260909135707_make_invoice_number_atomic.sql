-- Allow providers to allocate only their own invoice numbers. The caller must
-- receive a number before the atomic invoice RPC is allowed to run.
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_provider_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_year integer := extract(year FROM current_date)::integer;
  v_next_number integer;
BEGIN
  IF v_actor IS NULL OR p_provider_id IS NULL OR p_provider_id <> v_actor THEN
    RAISE EXCEPTION 'Invoice number provider must match authenticated user';
  END IF;

  INSERT INTO public.invoice_number_counters (provider_id, year, last_number)
  VALUES (p_provider_id, v_year, 1)
  ON CONFLICT (provider_id, year)
  DO UPDATE SET
    last_number = public.invoice_number_counters.last_number + 1,
    updated_at = now()
  RETURNING last_number INTO v_next_number;

  RETURN 'RE-' || v_year::text || '-' || lpad(v_next_number::text, 4, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_invoice_number(uuid)
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(uuid)
TO authenticated;
