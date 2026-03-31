
-- Add missing columns to admin_message_templates
ALTER TABLE public.admin_message_templates
  ADD COLUMN IF NOT EXISTS expires_in_days integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz DEFAULT NULL;

-- Insert 6 standard templates
INSERT INTO public.admin_message_templates (name, category, subject_template, body_template, default_priority, default_action_options, expires_in_days)
VALUES
  ('Plan-Upgrade Angebot', 'offer', 'Exklusives Upgrade-Angebot für dich, {{NUTZER_NAME}}', E'Hallo {{NUTZER_NAME}},\n\nals aktiver HufManager-Nutzer möchten wir dir ein besonderes Angebot machen: Upgrade auf {{NEUER_PLAN}} für nur {{NEUER_PREIS}}/Monat – alle Premium-Features, keine Einschränkungen.\n\nAngebot gilt bis {{ABLAUFDATUM}}.', 'important', '["Annehmen", "Ablehnen", "Später"]'::jsonb, 14),
  
  ('Zahlung ausstehend', 'warning', 'Zahlung ausstehend – bitte kurz prüfen', E'Hallo {{NUTZER_NAME}},\n\nfür deinen HufManager-Account liegt aktuell eine offene Zahlung vor. Bitte prüfe kurz ob alles in Ordnung ist.\n\nBei Fragen melde dich direkt hier.', 'urgent', '["Zahlung bestätigen", "Ich brauche Hilfe"]'::jsonb, 7),
  
  ('Vertrag läuft ab', 'info', 'Dein HufManager-Vertrag läuft bald ab', E'Hallo {{NUTZER_NAME}},\n\ndein Jahresvertrag ({{PLAN_NAME}}) läuft am {{ABLAUFDATUM}} aus. Möchtest du verlängern? Einfach hier bestätigen.', 'important', '["Verlängern", "Nicht verlängern", "Später entscheiden"]'::jsonb, 30),
  
  ('Willkommensnachricht', 'info', 'Willkommen bei HufManager, {{NUTZER_NAME}}! 🐴', E'Hallo {{NUTZER_NAME}},\n\nherzlich willkommen! Ich bin Pascal, Gründer von HufManager. Hast du Fragen beim Einstieg? Schreib mir direkt hier – ich helfe gerne persönlich.', 'normal', NULL, NULL),
  
  ('Feedback-Anfrage', 'request', 'Kurzes Feedback? Dauert nur 2 Minuten', E'Hallo {{NUTZER_NAME}},\n\nwie läufts mit HufManager? Was gefällt dir, was würdest du dir wünschen? Dein Feedback hilft mir direkt dabei, die App besser zu machen.', 'normal', '["Feedback geben", "Jetzt nicht"]'::jsonb, NULL),
  
  ('Jahresabo-Angebot', 'offer', 'Spare 2 Monate – Jahresabo jetzt sichern', E'Hallo {{NUTZER_NAME}},\n\nwechsle auf ein Jahresabo und spare 2 Monatsbeiträge. Statt {{PLAN_PREIS}} × 12 zahlst du nur {{NEUER_PREIS}} für das ganze Jahr.\n\nAngebot gilt bis {{ABLAUFDATUM}}.', 'important', '["Jahresabo sichern", "Lieber monatlich bleiben"]'::jsonb, 14);
