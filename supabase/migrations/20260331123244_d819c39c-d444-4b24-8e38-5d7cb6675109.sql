
-- =====================================================
-- DATA CORRECTIONS — Provider Account Fixes
-- =====================================================

-- KORREKTUR 2: Jennifer Böhler (PID-454300)
-- Fix: access_valid_until should be 2027-01-14 (Vertrag bis 14.01.2027)
-- plan_override stays manual_cash_1y, subscription_plan stays pro
UPDATE public.profiles
SET access_valid_until = '2027-01-14T23:59:59+00'
WHERE id = '715f653b-20df-4977-a56f-a17961083cb5';

-- KORREKTUR 3: Heiko Wittig (PID-458733)
-- Fix: plan_override → manual_cash_1y (not copecart_team), keep team via subscription_plan
-- Laufzeit: 27.02.2026–27.02.2027
UPDATE public.profiles
SET plan_override = 'manual_cash_1y',
    subscription_plan = 'team',
    access_valid_until = '2027-02-27T23:59:59+00'
WHERE id = 'aa66b911-8ccc-46d1-8bc5-abab9a5caf6d';

-- Fix Heiko's invoice plan from 'pro' to 'team'
UPDATE public.admin_invoices
SET plan = 'team'
WHERE id = 'e1d27c2e-934a-44b6-97dc-71a9fb36b3f3'
  AND provider_id = 'aa66b911-8ccc-46d1-8bc5-abab9a5caf6d';

-- KORREKTUR 2: Admin-Notiz Jennifer Böhler
INSERT INTO public.account_notes (account_id, account_type, note_text, is_system, created_by)
VALUES (
  '715f653b-20df-4977-a56f-a17961083cb5',
  'provider',
  'Sonderangebot Vertrauensbonus. 199€/Jahr bezahlt am 16.01.2026. Laufzeit bis 14.01.2027. Ab 15.01.2027: regulär Pro 29€/Monat.',
  false,
  '99e50f7f-c2d1-4ce4-ba99-d7dc800e5090'
);

-- KORREKTUR 3: Admin-Notiz Heiko Wittig
INSERT INTO public.account_notes (account_id, account_type, note_text, is_system, created_by)
VALUES (
  'aa66b911-8ccc-46d1-8bc5-abab9a5caf6d',
  'provider',
  'Team-Plan Jahresvorauszahlung. 948€ bezahlt per Überweisung. Rechnung HM-2026-0002. Laufzeit 27.02.2026–27.02.2027.',
  false,
  '99e50f7f-c2d1-4ce4-ba99-d7dc800e5090'
);

-- KORREKTUR 4: Admin-Notiz CopeCart-Providerin (Anna Grüninger, PID-902005)
INSERT INTO public.account_notes (account_id, account_type, note_text, is_system, created_by)
VALUES (
  'e228e26d-a266-4d3b-a7d1-c398f2e940b8',
  'provider',
  'Alter CopeCart-Preis 19€/Monat läuft noch. Eigentlich Starter (9,90€) oder Pro (29€). Entscheidung ausstehend — bei nächster Verlängerung auf korrekten Preis umstellen.',
  false,
  '99e50f7f-c2d1-4ce4-ba99-d7dc800e5090'
);

-- KORREKTUR 5: Admin-Notiz Pascal Schmid (Lifetime, Admin)
INSERT INTO public.account_notes (account_id, account_type, note_text, is_system, created_by)
VALUES (
  '99e50f7f-c2d1-4ce4-ba99-d7dc800e5090',
  'provider',
  'Admin/Eigentümer-Account. Lifetime-Zugang, 0€. Darf NICHT in MRR/ARR-Berechnungen eingehen.',
  false,
  '99e50f7f-c2d1-4ce4-ba99-d7dc800e5090'
);
