-- P1-2 correction (Codex Correction Pass 4 review of autoflow-auto-invoice,
-- verschärft durch den Pass-4-Rereview: keine PROD-URL in einer generischen
-- Migration).
--
-- Root cause of "AUTOFLOW_TRIGGER_AUTH": the two DB triggers that invoke
-- supabase/functions/autoflow-auto-invoice (trg_autoflow_appointment_completed,
-- trg_autoflow_appointment_signed → autoflow_on_appointment_completed /
-- autoflow_on_appointment_signed, both added in
-- 20260219153151_c6f406a7-109f-4ad7-9610-fe5761d53104.sql) hardcode a Bearer
-- token in their net.http_post() call. Decoding that JWT's payload shows
-- "role":"anon" — but autoflow-auto-invoice/index.ts's own auth guard does
-- `if (token !== supabaseServiceKey) return 401`. So every trigger-fired
-- invocation of this function has always been rejected with 401 before it
-- even reads the appointment — auto-invoicing on appointment
-- completion/signature has never actually run in production.
-- (Live verified read-only against PROD vnschgjxkzzwzefqlrji on 2026-09-17:
-- both pg_proc bodies still contain that anon JWT, and both triggers exist
-- and are bound to public.appointments.)
--
-- Per Correction Pass 4 instructions, the fix must NOT be to weaken the
-- edge function's own service-role check (that check is correct — it is
-- the caller, this trigger, that sends the wrong credential) and must NOT
-- hardcode the real service_role key into a migration file (that key
-- bypasses RLS entirely; committing it to git/migration history would be a
-- much larger exposure than the anon key that was hardcoded before).
--
-- ── Zweiter Befund (Pass-4-Rereview): die Ziel-URL ───────────────────────────
-- Die ursprünglichen Trigger — und die erste Fassung dieser Migration —
-- enthielten die PROD-Function-URL
-- (https://<prod-ref>.supabase.co/functions/v1/autoflow-auto-invoice) als
-- Literal — hier bewusst nur redigiert wiedergegeben, damit auch im Kommentar
-- keine verwendbare Fremdumgebungs-URL steht.
-- Auf Staging angewendet würde der Staging-Trigger damit die PRODUKTION
-- aufrufen, mit dem Staging-Service-Key: bestenfalls 401, schlechtestenfalls
-- ein Cross-Environment-Schreibzugriff. Das ist nicht akzeptabel, also steht
-- in dieser Datei jetzt KEINE Projekt-URL mehr.
--
-- Geprüfte Alternativen im Repo:
--   - current_setting('app.settings.supabase_url', true): existiert als Muster
--     (z.B. 20260307050723_…, 20260309153622_…, 20260325143337_…), ist aber in
--     PROD NICHT gesetzt (read-only geprüft: current_setting liefert NULL, es
--     gibt 0 pg_settings-Einträge unter app.settings). Diese Funktionen bauen
--     also heute schon eine NULL-URL. Das Muster zu kopieren hieße, einen
--     bekannten Defekt zu erben.
--   - Vault: wird für den Service-Key ohnehin gebraucht, ist pro Projekt
--     getrennt und verlässt die Umgebung nie. Genau ein Mechanismus für beide
--     umgebungsabhängigen Werte statt zwei halbe.
--
-- Beide Werte kommen deshalb aus Supabase Vault (pgsodium-gestützt, in jedem
-- Supabase-Projekt vorhanden; vault.decrypted_secrets ist für anon/
-- authenticated nicht sichtbar, die SECURITY-DEFINER-Trigger laufen als
-- postgres). Dieselbe Migrationsdatei ist damit in Staging und Produktion
-- identisch anwendbar und referenziert immer nur die eigene Umgebung.
--
-- ── EINMALIGE MANUELLE EINRICHTUNG PRO UMGEBUNG ─────────────────────────────
-- (in diesem Pass NICHT ausgeführt — PRODUCTION_BACKEND_CHANGED=NO, und kein
-- Secret-Wert gehört jemals ins Repo):
--
--   select vault.create_secret(
--     '<SERVICE_ROLE_KEY DIESER UMGEBUNG>',
--     'autoflow_service_key',
--     'Bearer token the autoflow appointment triggers send to autoflow-auto-invoice.'
--   );
--   select vault.create_secret(
--     'https://<PROJECT_REF DIESER UMGEBUNG>.supabase.co/functions/v1',
--     'autoflow_functions_base_url',
--     'Edge-Function base URL of THIS project. Never point this at another environment.'
--   );
--
-- Staging bekommt den Staging-Key und die Staging-URL, Produktion die
-- Produktions-Werte. Fehlt eines der beiden Secrets, wird der HTTP-Aufruf
-- übersprungen (geloggt, nicht geworfen — ein fehlendes Secret darf das
-- UPDATE auf appointments, an dem der Trigger hängt, niemals scheitern
-- lassen). Eine frisch migrierte Staging-Umgebung ohne Secrets ruft also
-- nichts auf — insbesondere nicht die Produktion.
--
-- PREPARED ONLY: diese Migration ist in keiner Umgebung angewendet. Sie
-- ersetzt nur die Bodies der beiden bestehenden Triggerfunktionen
-- (CREATE OR REPLACE, gleiche Signatur, gleiche Trigger-Bindung) und legt
-- eine interne Hilfsfunktion an — keine Policy, kein Grant, keine Tabelle.

-- Eine Stelle für die Umgebungsauflösung, damit die beiden Triggerfunktionen
-- sie nicht duplizieren (und nicht auseinanderlaufen können).
CREATE OR REPLACE FUNCTION public._autoflow_trigger_endpoint()
RETURNS TABLE (function_url text, service_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url text;
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_base_url
  FROM vault.decrypted_secrets
  WHERE name = 'autoflow_functions_base_url';

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'autoflow_service_key';

  IF v_base_url IS NULL OR btrim(v_base_url) = '' OR v_key IS NULL OR btrim(v_key) = '' THEN
    RETURN;
  END IF;

  function_url := rtrim(btrim(v_base_url), '/') || '/autoflow-auto-invoice';
  service_key := v_key;
  RETURN NEXT;
END;
$$;

-- Nur die Triggerfunktionen (SECURITY DEFINER, Eigentümer postgres) dürfen das
-- aufrufen; niemand sonst bekommt darüber den Service-Key zu sehen.
REVOKE ALL ON FUNCTION public._autoflow_trigger_endpoint() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.autoflow_on_appointment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_endpoint record;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') AND NEW.provider_id IS NOT NULL THEN
    SELECT * INTO v_endpoint FROM public._autoflow_trigger_endpoint();

    IF v_endpoint IS NULL OR v_endpoint.function_url IS NULL THEN
      RAISE WARNING 'autoflow_on_appointment_completed: vault secrets autoflow_functions_base_url/autoflow_service_key not set for this environment, skipping auto-invoice call for appointment %', NEW.id;
    ELSE
      PERFORM net.http_post(
        url := v_endpoint.function_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_endpoint.service_key),
        body := jsonb_build_object('appointment_id', NEW.id, 'trigger_type', 'on_completion')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.autoflow_on_appointment_signed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_endpoint record;
BEGIN
  IF NEW.signed_at IS NOT NULL AND OLD.signed_at IS NULL AND NEW.provider_id IS NOT NULL THEN
    SELECT * INTO v_endpoint FROM public._autoflow_trigger_endpoint();

    IF v_endpoint IS NULL OR v_endpoint.function_url IS NULL THEN
      RAISE WARNING 'autoflow_on_appointment_signed: vault secrets autoflow_functions_base_url/autoflow_service_key not set for this environment, skipping auto-invoice call for appointment %', NEW.id;
    ELSE
      PERFORM net.http_post(
        url := v_endpoint.function_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_endpoint.service_key),
        body := jsonb_build_object('appointment_id', NEW.id, 'trigger_type', 'after_signature')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger bindings are unchanged (same function names, same events) — no
-- DROP/CREATE TRIGGER needed, CREATE OR REPLACE FUNCTION above is enough.
