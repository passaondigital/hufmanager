-- HufManager Slim — CopeCart-Kette hufi-data-core → Lifecycle → Entitlement → Gate (Contract-Tests C01–C16).
-- Deckt 20260929130000 ab (Käuferzuordnung, Kündigungsende) plus die bestehenden Garantien
-- (Idempotenz, Duplikat, Out-of-order, Testzahlung, Fremdprodukt, Trial→Paid, kein Doppel-Entitlement).
-- Aufruf (NUR lokaler Stack):
--   docker exec -i supabase_db_vnschgjxkzzwzefqlrji psql -U postgres -v ON_ERROR_STOP=1 < scripts/hufmanager-copecart-lifecycle-tests.sql
-- Läuft in einer Transaktion und endet mit ROLLBACK.
\set ON_ERROR_STOP 1
BEGIN;
CREATE TEMP TABLE r(t text, ok boolean, info text);
GRANT ALL ON r TO authenticated, anon;

CREATE FUNCTION pg_temp.mk_user(p_id uuid, p_email text, p_meta jsonb) RETURNS void LANGUAGE sql AS $$
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, email_confirmed_at)
  VALUES (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, p_meta,
          '{"provider":"email","providers":["email"]}', now(), now(), now());
$$;
CREATE FUNCTION pg_temp.ent(p_id uuid) RETURNS public.product_entitlements LANGUAGE sql AS $$
  SELECT * FROM public.product_entitlements WHERE user_id = p_id AND product = 'HUFMANAGER' AND plan = 'HUFMANAGER_SLIM' $$;
CREATE FUNCTION pg_temp.ent_n(p_id uuid) RETURNS int LANGUAGE sql AS $$
  SELECT count(*)::int FROM public.product_entitlements WHERE user_id = p_id $$;
CREATE FUNCTION pg_temp.ev_n(p_id uuid, p_name text) RETURNS int LANGUAGE sql AS $$
  SELECT count(*)::int FROM public.hm_lifecycle_events WHERE subject_id = p_id AND event_name::text = p_name $$;
CREATE FUNCTION pg_temp.acc(p_id uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT public._hm_has_hufmanager_access_v1(p_id) $$;
-- Ein CopeCart-Webhook so, wie hufi-data-core ihn an die RPC übergibt.
CREATE FUNCTION pg_temp.ing(p_type text, p_txn text, p_email text, p_product text, p_test boolean,
                            p_at timestamptz, p_payload jsonb DEFAULT '{}'::jsonb, p_amount numeric DEFAULT 19.95)
RETURNS text LANGUAGE sql AS $$
  SELECT (public.hufi_data_ingest_and_project_v1(
    'copecart', p_type || ':' || p_txn, p_type,
    CASE WHEN p_type IN ('payment.recurring.cancelled','payment.recurring.upcoming') THEN 'subscription'
         WHEN p_type IN ('payment.refunded','payment.charged_back') THEN 'refund' ELSE 'payment' END,
    'subscription', 'sub-' || p_email, p_product, 'ord-' || p_email, p_txn, 'sub-' || p_email,
    lower(p_email), 'QA Käufer', p_amount, 'EUR',
    CASE p_type WHEN 'payment.made' THEN 'paid' WHEN 'payment.recurring.cancelled' THEN 'cancelled'
                WHEN 'payment.recurring.upcoming' THEN 'upcoming' WHEN 'payment.refunded' THEN 'refunded' ELSE 'x' END,
    p_test, p_at, now(), md5(p_type || p_txn || p_email), p_payload)).result_code $$;

-- Fixtures: Provider T im Trial (gemischte Groß-/Kleinschreibung) + Geister-Kundenprofil gleicher Adresse
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000cc001', 'CC-Buyer@Example.invalid', '{"full_name":"QA CC Buyer","role":"provider","signup_app":"hufmanager"}');
INSERT INTO public.profiles (id, email, full_name, created_at)
VALUES ('00000000-0000-4000-9000-0000000cc0f0', 'cc-buyer@example.invalid', 'Geisterkunde', now() - interval '1 year');
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000cc002', 'cc-other@example.invalid', '{"full_name":"QA CC Other","role":"provider","signup_app":"hufmanager"}');
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000cc003', 'cc-new@example.invalid', '{"full_name":"QA CC New","role":"provider"}');

INSERT INTO r SELECT 'C00 Vorbedingung: Trial aktiv, 1 Entitlement, Geisterprofil ohne Entitlement',
  (e).status = 'TRIAL_ACTIVE' AND pg_temp.ent_n('00000000-0000-4000-9000-0000000cc001') = 1
  AND pg_temp.ent_n('00000000-0000-4000-9000-0000000cc0f0') = 0, (e).status::text
  FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000cc001') e) x;

-- C01 Testzahlung gewährt nie Zugang und ändert nichts
INSERT INTO r SELECT 'C01 Testzahlung: Event ok, Entitlement unverändert TRIAL_ACTIVE',
  pg_temp.ing('payment.made','t-test-1','cc-buyer@example.invalid','3a97bd25',true, now() - interval '3 hours') = 'APPLIED_NEW_EVENT'
  AND (pg_temp.ent('00000000-0000-4000-9000-0000000cc001')).status = 'TRIAL_ACTIVE'
  AND (pg_temp.ent('00000000-0000-4000-9000-0000000cc001')).billing_status = 'NONE', '';

-- C02 Fremdprodukt gewährt kein Slim
INSERT INTO r SELECT 'C02 Fremdprodukt: kein Slim-Paid',
  pg_temp.ing('payment.made','t-other-prod','cc-other@example.invalid','ffffffff',false, now() - interval '3 hours') = 'APPLIED_NEW_EVENT'
  AND (pg_temp.ent('00000000-0000-4000-9000-0000000cc002')).billing_status = 'NONE'
  AND (pg_temp.ent('00000000-0000-4000-9000-0000000cc002')).status = 'TRIAL_ACTIVE', '';

-- C03 Echte Zahlung: Käufer = Provider (nicht Geisterprofil), Trial→Paid
INSERT INTO r SELECT 'C03a Echte Zahlung angenommen', pg_temp.ing('payment.made','t-real-1','cc-buyer@example.invalid','3a97bd25',false, now() - interval '2 hours') = 'APPLIED_NEW_EVENT', '';
INSERT INTO r SELECT 'C03b Zuordnung zum Provider (case-insensitiv), nicht zum Geisterprofil',
  pg_temp.ev_n('00000000-0000-4000-9000-0000000cc001','payment_succeeded') = 1
  AND pg_temp.ev_n('00000000-0000-4000-9000-0000000cc0f0','payment_succeeded') = 0
  AND pg_temp.ent_n('00000000-0000-4000-9000-0000000cc0f0') = 0, '';
INSERT INTO r SELECT 'C03c Trial→Paid: ACTIVE/VERIFIED_PAID/copecart, trial_status NONE, 1 Zeile, Zugang',
  (e).status = 'ACTIVE' AND (e).billing_status = 'VERIFIED_PAID' AND (e).billing_provider = 'copecart'
  AND (e).trial_status = 'NONE' AND (e).external_subscription_id = 'sub-cc-buyer@example.invalid'
  AND pg_temp.ent_n('00000000-0000-4000-9000-0000000cc001') = 1 AND pg_temp.acc('00000000-0000-4000-9000-0000000cc001'),
  (e).status::text || '/' || (e).billing_status::text FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000cc001') e) x;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9000-0000000cc001","role":"authenticated"}', true);
INSERT INTO r SELECT 'C03d Kontext: ACTIVE_PAID, kein Trial', has_access AND reason_code = 'ACTIVE_PAID' AND trial_status = 'NONE', reason_code FROM public.get_hufmanager_access_context_v1();
RESET ROLE;

-- C04 Duplikat-Webhook (identischer Retry): idempotent, keine Doppelzeile
INSERT INTO r SELECT 'C04 Duplikat: ALREADY_APPLIED, 1 Lifecycle-Event, 1 Entitlement',
  pg_temp.ing('payment.made','t-real-1','cc-buyer@example.invalid','3a97bd25',false, now() - interval '2 hours') = 'ALREADY_APPLIED'
  AND pg_temp.ev_n('00000000-0000-4000-9000-0000000cc001','payment_succeeded') = 1
  AND pg_temp.ent_n('00000000-0000-4000-9000-0000000cc001') = 1, '';

-- C05 gleiche Event-ID, abweichender Inhalt → Kollision, abgewiesen
INSERT INTO r SELECT 'C05 Kollision gleiche ID/anderer Betrag → EVENT_ID_COLLISION_MISMATCH',
  pg_temp.ing('payment.made','t-real-1','cc-buyer@example.invalid','3a97bd25',false, now() - interval '2 hours', '{}'::jsonb, 99) = 'EVENT_ID_COLLISION_MISMATCH', '';

-- C06 Folgezahlung (recurring) → weiter 1 Zeile, Periode fortgeschrieben
INSERT INTO r SELECT 'C06 Recurring-Zahlung: neues Event, weiterhin 1 Entitlement, Zugang',
  pg_temp.ing('payment.made','t-real-2','cc-buyer@example.invalid','3a97bd25',false, now() - interval '1 hour') = 'APPLIED_NEW_EVENT'
  AND pg_temp.ev_n('00000000-0000-4000-9000-0000000cc001','payment_succeeded') = 2
  AND pg_temp.ent_n('00000000-0000-4000-9000-0000000cc001') = 1
  AND pg_temp.acc('00000000-0000-4000-9000-0000000cc001'), '';

-- C07 recurring.upcoming ändert nichts
INSERT INTO r SELECT 'C07 upcoming: kein Lifecycle-Outcome, Entitlement unverändert',
  pg_temp.ing('payment.recurring.upcoming','t-up-1','cc-buyer@example.invalid','3a97bd25',false, now() - interval '50 minutes') = 'APPLIED_NEW_EVENT'
  AND (pg_temp.ent('00000000-0000-4000-9000-0000000cc001')).billing_status = 'VERIFIED_PAID', '';

-- C08 Kündigung zum Periodenende (Zukunft): Zugang bleibt, Grenze = Folgetag 00:00 Berlin
INSERT INTO r SELECT 'C08a Kündigung angenommen',
  pg_temp.ing('payment.recurring.cancelled','t-cancel-1','cc-buyer@example.invalid','3a97bd25',false, now() - interval '30 minutes',
              jsonb_build_object('is_cancelled_for', to_char((now() AT TIME ZONE 'Europe/Berlin')::date + 10, 'YYYY-MM-DD'))) = 'APPLIED_NEW_EVENT', '';
INSERT INTO r SELECT 'C08b CANCELLED, Ende = hm_billing_effective_end_at_v1(D), Zugang bis dahin',
  (e).billing_status = 'CANCELLED' AND (e).status = 'ACTIVE'
  AND (e).current_period_end = public.hm_billing_effective_end_at_v1((now() AT TIME ZONE 'Europe/Berlin')::date + 10)
  AND pg_temp.acc('00000000-0000-4000-9000-0000000cc001'), (e).current_period_end::text
  FROM (SELECT pg_temp.ent('00000000-0000-4000-9000-0000000cc001') e) x;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9000-0000000cc001","role":"authenticated"}', true);
INSERT INTO r SELECT 'C08c Kontext: CANCELLED_PERIOD_END_ACCESS', has_access AND reason_code = 'CANCELLED_PERIOD_END_ACCESS', reason_code FROM public.get_hufmanager_access_context_v1();
RESET ROLE;

-- C09 Out-of-order: verspätete ältere Zahlung überschreibt die Kündigung nicht
INSERT INTO r SELECT 'C09 Out-of-order ältere Zahlung: bleibt CANCELLED',
  pg_temp.ing('payment.made','t-late-old','cc-buyer@example.invalid','3a97bd25',false, now() - interval '5 hours') IN ('APPLIED_NEW_EVENT','OUT_OF_ORDER_STATE_UNCHANGED')
  AND (pg_temp.ent('00000000-0000-4000-9000-0000000cc001')).billing_status = 'CANCELLED', '';

-- C10 Periodenende erreicht (Zeitablauf simuliert): kein Zugang mehr
UPDATE public.product_entitlements SET current_period_end = now() - interval '1 minute'
 WHERE user_id = '00000000-0000-4000-9000-0000000cc001' AND product = 'HUFMANAGER';
INSERT INTO r SELECT 'C10a Nach Periodenende: Gate false', NOT pg_temp.acc('00000000-0000-4000-9000-0000000cc001'), '';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9000-0000000cc001","role":"authenticated"}', true);
INSERT INTO r SELECT 'C10b Nach Periodenende: Kontext LOCKED', NOT has_access AND reason_code = 'LOCKED', reason_code FROM public.get_hufmanager_access_context_v1();
RESET ROLE;

-- C11 Neue echte Zahlung nach Ende → wieder Zugang, 1 Zeile
INSERT INTO r SELECT 'C11 Reaktivierung durch neue Zahlung: VERIFIED_PAID, Zugang, 1 Zeile',
  pg_temp.ing('payment.made','t-real-3','cc-buyer@example.invalid','3a97bd25',false, now()) = 'APPLIED_NEW_EVENT'
  AND (pg_temp.ent('00000000-0000-4000-9000-0000000cc001')).billing_status = 'VERIFIED_PAID'
  AND pg_temp.acc('00000000-0000-4000-9000-0000000cc001')
  AND pg_temp.ent_n('00000000-0000-4000-9000-0000000cc001') = 1, '';

-- C12 Kauf ohne vorheriges Entitlement (kein Trial) → genau 1 Paid-Zeile
INSERT INTO r SELECT 'C12 Kauf ohne Trial: 1 ACTIVE/VERIFIED_PAID-Zeile',
  pg_temp.ent_n('00000000-0000-4000-9000-0000000cc003') = 0
  AND pg_temp.ing('payment.made','t-new-1','CC-NEW@example.invalid','3a97bd25',false, now()) = 'APPLIED_NEW_EVENT'
  AND pg_temp.ent_n('00000000-0000-4000-9000-0000000cc003') = 1
  AND (pg_temp.ent('00000000-0000-4000-9000-0000000cc003')).billing_status = 'VERIFIED_PAID', '';

-- C13 Unbekannter Käufer → kein Entitlement, Reconciliation-Issue
INSERT INTO r SELECT 'C13 Unbekannte E-Mail: blockiert + Issue, kein Entitlement',
  pg_temp.ing('payment.made','t-unknown','nobody-xyz@example.invalid','3a97bd25',false, now()) = 'APPLIED_NEW_EVENT'
  AND EXISTS (SELECT 1 FROM public.hm_lifecycle_reconciliation_issues i WHERE i.source_event_id = 'payment.made:t-unknown'
              AND i.issue_type = 'LIFECYCLE_PROJECTION_BLOCKED_UNRESOLVED_SUBJECT'), '';

-- C14 Kündigung ohne Datum → blockiert, Zugang unverändert
INSERT INTO r SELECT 'C14 Kündigung ohne is_cancelled_for: blockiert, bleibt VERIFIED_PAID',
  pg_temp.ing('payment.recurring.cancelled','t-cancel-nodate','cc-buyer@example.invalid','3a97bd25',false, now() + interval '1 minute') = 'APPLIED_NEW_EVENT'
  AND (pg_temp.ent('00000000-0000-4000-9000-0000000cc001')).billing_status = 'VERIFIED_PAID', '';

-- C15 Refund: bewusst ohne automatische Wirkung (manuelle Owner-Prüfung)
INSERT INTO r SELECT 'C15 Refund: Event gespeichert, Entitlement unverändert (dokumentiert)',
  pg_temp.ing('payment.refunded','t-refund-1','cc-buyer@example.invalid','3a97bd25',false, now() + interval '2 minutes') = 'APPLIED_NEW_EVENT'
  AND (pg_temp.ent('00000000-0000-4000-9000-0000000cc001')).billing_status = 'VERIFIED_PAID', '';

-- C16 Manual-Grants unverändert: abgelaufener manual-Grant bleibt gesperrt, Legacy-ACTIVE ohne Ende bleibt offen
SELECT pg_temp.mk_user('00000000-0000-4000-9000-0000000cc004', 'cc-legacy@example.invalid', '{"full_name":"QA Legacy","role":"provider"}');
INSERT INTO public.product_entitlements (user_id, product, plan, status, billing_status, trial_status, source)
VALUES ('00000000-0000-4000-9000-0000000cc004', 'HUFMANAGER', 'HUFMANAGER_SLIM', 'ACTIVE', 'UNKNOWN_BILLING_STATE', 'NONE', 'LEGACY_BACKFILL_AMBIGUOUS_ACTIVE_ONLY');
INSERT INTO r SELECT 'C16 Legacy ACTIVE ohne Ende: Zugang unverändert', pg_temp.acc('00000000-0000-4000-9000-0000000cc004'), '';

INSERT INTO r SELECT 'C99 keine UNEXPECTED-Issues',
  NOT EXISTS (SELECT 1 FROM public.hm_lifecycle_reconciliation_issues i WHERE i.issue_type LIKE '%UNEXPECTED%'
              AND i.source_event_id LIKE 'payment.%:t-%'), '';

SELECT t, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, info FROM r ORDER BY t;
SELECT count(*) FILTER (WHERE ok) || '/' || count(*) AS summary FROM r;
ROLLBACK;
