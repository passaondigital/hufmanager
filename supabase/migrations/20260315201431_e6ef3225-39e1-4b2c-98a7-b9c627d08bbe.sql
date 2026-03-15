
-- 1. Add recommendation_for JSONB to partner_treatment_notes
ALTER TABLE public.partner_treatment_notes 
ADD COLUMN IF NOT EXISTS recommendation_for JSONB DEFAULT NULL;

-- 2. Cross-provider notification trigger on partner_treatment_notes INSERT
CREATE OR REPLACE FUNCTION public.notify_on_partner_treatment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  horse_name TEXT;
  partner_name TEXT;
  horse_owner_id UUID;
BEGIN
  -- Get horse info
  SELECT h.name, h.owner_id INTO horse_name, horse_owner_id
  FROM horses h WHERE h.id = NEW.horse_id;

  -- Get partner name
  SELECT p.full_name INTO partner_name
  FROM profiles p WHERE p.id = NEW.partner_id;

  -- Notify horse owner
  IF horse_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      horse_owner_id,
      'Neuer Befund für ' || COALESCE(horse_name, 'Pferd'),
      COALESCE(NEW.title, 'Behandlungsnotiz') || ' von ' || COALESCE(partner_name, 'Partner'),
      'partner_treatment',
      '/client-horse/' || NEW.horse_id
    );
  END IF;

  -- Notify providers with access to this horse (if visible_to_pid)
  IF NEW.visible_to_pid = true THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT DISTINCT
      a.provider_id,
      'Neuer Befund für ' || COALESCE(horse_name, 'Pferd'),
      COALESCE(NEW.title, 'Behandlungsnotiz') || ' – relevant für dich markiert',
      'partner_treatment_relevant',
      '/pferd/' || NEW.horse_id
    FROM appointments a
    WHERE a.horse_id = NEW.horse_id
      AND a.provider_id IS NOT NULL
      AND a.provider_id != NEW.partner_id
    GROUP BY a.provider_id;
  END IF;

  -- Handle recommendations
  IF NEW.recommendation_for IS NOT NULL AND jsonb_array_length(NEW.recommendation_for) > 0 THEN
    -- Notify providers based on target_role
    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT DISTINCT
      a.provider_id,
      'Empfehlung von ' || COALESCE(partner_name, 'Partner'),
      LEFT(rec->>'message', 150),
      'partner_recommendation',
      '/pferd/' || NEW.horse_id
    FROM jsonb_array_elements(NEW.recommendation_for) AS rec
    CROSS JOIN LATERAL (
      SELECT DISTINCT provider_id
      FROM appointments
      WHERE horse_id = NEW.horse_id AND provider_id IS NOT NULL AND provider_id != NEW.partner_id
    ) a
    WHERE rec->>'target_role' IN ('hufpfleger', 'hufschmied');

    -- Notify owner if recommendation targets them
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.recommendation_for) AS r WHERE r->>'target_role' = 'besitzer') THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      SELECT
        horse_owner_id,
        'Empfehlung von ' || COALESCE(partner_name, 'Therapeut'),
        LEFT(r->>'message', 150),
        'partner_recommendation',
        '/client-horse/' || NEW.horse_id
      FROM jsonb_array_elements(NEW.recommendation_for) AS r
      WHERE r->>'target_role' = 'besitzer'
        AND horse_owner_id IS NOT NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists to prevent duplicates
DROP TRIGGER IF EXISTS on_partner_treatment_insert ON public.partner_treatment_notes;
CREATE TRIGGER on_partner_treatment_insert
AFTER INSERT ON public.partner_treatment_notes
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_partner_treatment();

-- 3. Cross-provider notification trigger on horse_diary_entries INSERT
CREATE OR REPLACE FUNCTION public.notify_on_diary_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  horse_name TEXT;
BEGIN
  IF NEW.shared_with_provider = true THEN
    SELECT h.name INTO horse_name FROM horses h WHERE h.id = NEW.horse_id;

    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT DISTINCT
      a.provider_id,
      'Neue Notiz von Besitzer für ' || COALESCE(horse_name, 'Pferd'),
      COALESCE(NEW.title, COALESCE(NEW.category, 'Notiz')) || ': ' || LEFT(COALESCE(NEW.content, ''), 100),
      'owner_diary_shared',
      '/pferd/' || NEW.horse_id
    FROM appointments a
    WHERE a.horse_id = NEW.horse_id
      AND a.provider_id IS NOT NULL
    GROUP BY a.provider_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_diary_entry_insert ON public.horse_diary_entries;
CREATE TRIGGER on_diary_entry_insert
AFTER INSERT ON public.horse_diary_entries
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_diary_entry();
