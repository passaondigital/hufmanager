-- Insert the 3 BHS plans for barhufserviceschmid
INSERT INTO subscription_plans (
  provider_id, name, description, tier, plan_type,
  interval_weeks, price_monthly, price_per_appointment,
  max_horses, travel_fee_zone1, travel_fee_zone2,
  surcharge_per_30min, discount_per_extra_horse,
  duration_minutes, duration_weeks, max_appointments,
  flat_price, payment_split, cancellation_notice,
  includes, not_included, requires_application,
  badge_color, is_active
) VALUES
-- BHS GO
(
  '99e50f7f-c2d1-4ce4-ba99-d7dc800e5090',
  'BHS GO',
  'Einzeltermin / Einstieg — kein Abo, keine Bindung',
  'go', 'single',
  NULL, 0, 65,
  1, 10, 20,
  20, 0,
  35, NULL, NULL,
  NULL, NULL, NULL,
  ARRAY['Analyse Hufstatus', 'Funktionelle Bearbeitung', 'Korrektur & Balance', 'Kurz-Empfehlung'],
  ARRAY['Hufschutz', 'Material', 'Tierarzt'],
  false,
  '#22c55e', true
),
-- BHS BALANCE
(
  '99e50f7f-c2d1-4ce4-ba99-d7dc800e5090',
  'BHS BALANCE',
  'Das Hufpflege-Abo — fester Tourenplatz, regelmäßige Bearbeitung',
  'balance', 'abo',
  6, 65, 65,
  10, 10, 20,
  20, 5,
  45, NULL, NULL,
  NULL, NULL, '4 Wochen zum Monatsende',
  ARRAY['Fachgerechte Barhufbearbeitung', 'Fester Tourenplatz', 'Dokumentation in Pferdeakte', 'Beratung & Empfehlung'],
  ARRAY['Hufschutz', 'Material', 'Tierarzt'],
  false,
  '#3b82f6', true
),
-- BHS INTENSIV
(
  '99e50f7f-c2d1-4ce4-ba99-d7dc800e5090',
  'BHS INTENSIV',
  'Die Hufe sind das Ziel — 8-Wochen-Programm für schwierige Fälle',
  'intensiv', 'package',
  NULL, 0, NULL,
  1, 0, 0,
  0, 0,
  90, 8, 8,
  699, '50/50', NULL,
  ARRAY['Huf-/Bewegungsanalyse', 'Training Hufgabe/Führen', 'Besitzer-Anleitung', 'Reha-Begleitung', 'Abstimmung Tierarzt/Osteo'],
  ARRAY['Material', 'Tierarzt', 'Osteopathie', 'Klinikkosten'],
  true,
  '#f59e0b', true
);