
-- KORREKTUR 2: Anna Grüninger (PID-902005) auf Starter umstellen
UPDATE public.profiles
SET account_status = 'active',
    subscription_plan = 'starter',
    plan_override = 'copecart_starter'
WHERE id = 'e228e26d-a266-4d3b-a7d1-c398f2e940b8';

-- KORREKTUR 3: Spam-Account PID-200710 — suspended_reason ergänzen
UPDATE public.profiles
SET suspended_reason = 'Spam-Account, automatisch generierte E-Mail-Adresse'
WHERE id = 'f90704d7-0c08-4909-a566-441d7ba5e7fc';

-- Admin-Notiz für Anna Grüninger
INSERT INTO public.account_notes (account_id, account_type, note_text, is_system)
VALUES (
  'e228e26d-a266-4d3b-a7d1-c398f2e940b8',
  'provider',
  'CopeCart-Altpreis 19€/Mo. läuft noch. Plan auf Starter korrigiert (1 Kunde, 1 Pferd). CopeCart-Abo sollte auf 9,90€ umgestellt werden — Kunde informieren bei nächster Gelegenheit.',
  false
);

-- Admin-Notiz für Spam-Account
INSERT INTO public.account_notes (account_id, account_type, note_text, is_system)
VALUES (
  'f90704d7-0c08-4909-a566-441d7ba5e7fc',
  'provider',
  'Gesperrt 31.03.2026 — Spam-Account (aieo@foauiae.de).',
  false
);

-- LIFETIME-SCHUTZ: Trigger der verhindert, dass lifetime_grant Accounts auf expired gesetzt werden
CREATE OR REPLACE FUNCTION public.protect_lifetime_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.account_status = 'expired' 
     AND NEW.plan_override = 'lifetime_grant' THEN
    NEW.account_status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_lifetime_accounts ON public.profiles;
CREATE TRIGGER trg_protect_lifetime_accounts
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_lifetime_accounts();
