-- Store-Fahrplan Schritt 3B — Fund 6: create_emergency_otp autorisieren
--
-- Zwei Probleme gefunden:
-- 1. Sicherheitslücke: kein Auth-Check — jeder konnte für ein beliebiges
--    Provider/Klient-Paar ein Notfall-OTP erzeugen.
-- 2. Unabhängiger Vorbestehender Bug (beim Pentest entdeckt): SET search_path
--    TO 'public' schließt das 'extensions'-Schema aus, in dem pgcrypto
--    (gen_salt/crypt) lebt — die Funktion schlug daher für ALLE Aufrufer
--    (auch legitime) mit "function gen_salt(unknown) does not exist" fehl.
--    Es gibt aktuell keinen Einlöse-/Verifizierungspfad für dieses OTP im
--    Code (nur Erzeugung + Anzeige zum Vorlesen per Telefon/SMS) — daher
--    kein zusätzlicher Fund nötig, aber ohne diesen Fix bliebe die Funktion
--    auch nach der Auth-Korrektur für echte Nutzer weiterhin kaputt.
--
-- Autorisierung analog zu Fund 2 (get_provider_clients): Provider selbst,
-- Admin, oder Partner während einer aktiven Notfall-Situation dieses
-- Providers (deckt den bestehenden EmergencyDashboard-Aufrufpfad ab).
CREATE OR REPLACE FUNCTION public.create_emergency_otp(_provider_id uuid, _client_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_raw TEXT;
  v_hash TEXT;
BEGIN
  IF NOT (
    auth.uid() = _provider_id
    OR public.is_admin(auth.uid())
    OR (
      public.has_role(auth.uid(), 'partner'::app_role)
      AND (
        EXISTS (
          SELECT 1 FROM public.tour_emergency_status tes
          WHERE tes.provider_id = _provider_id AND tes.ended_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.emergency_escalations ee
          WHERE ee.provider_id = _provider_id AND ee.status = 'open'
        )
      )
    )
  ) THEN
    RAISE EXCEPTION 'Keine Berechtigung für dieses Provider/Klient-Paar';
  END IF;

  v_raw := substring(md5(random()::text) from 1 for 8);
  v_hash := crypt(v_raw, gen_salt('bf'));

  INSERT INTO public.emergency_otp (
    provider_id, client_id, otp_hash, expires_at
  ) VALUES (
    _provider_id, _client_id, v_hash, now() + INTERVAL '30 minutes'
  );

  RETURN v_raw;
END;
$function$;
