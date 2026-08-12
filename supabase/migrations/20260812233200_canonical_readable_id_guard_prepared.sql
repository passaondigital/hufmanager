-- P0 CANONICAL ID AUDIT
-- Prepared only. Do not apply to production before backup, dry run, and ID-owner approval.
--
-- Live truth on 2026-08-12:
-- - horses.eqid is empty for existing horses.
-- - horses.readable_id is set for existing horses and carries the EQID prefix.
-- - profiles.readable_id carries KID/PID/EID/PRID prefixes.
--
-- This migration does NOT generate, backfill, copy, delete, or rewrite any ID.
-- It only adds immutability guards for already assigned readable IDs.

CREATE OR REPLACE FUNCTION public.prevent_canonical_readable_id_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.readable_id IS NOT NULL
     AND OLD.readable_id <> ''
     AND NEW.readable_id IS DISTINCT FROM OLD.readable_id THEN
    RAISE EXCEPTION 'canonical readable_id is immutable once assigned'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_profiles_readable_id_change ON public.profiles;
CREATE TRIGGER trg_prevent_profiles_readable_id_change
  BEFORE UPDATE OF readable_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_canonical_readable_id_change();

DROP TRIGGER IF EXISTS trg_prevent_horses_readable_id_change ON public.horses;
CREATE TRIGGER trg_prevent_horses_readable_id_change
  BEFORE UPDATE OF readable_id ON public.horses
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_canonical_readable_id_change();

DO $$
BEGIN
  IF to_regclass('public.contacts') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_prevent_contacts_readable_id_change ON public.contacts;
    CREATE TRIGGER trg_prevent_contacts_readable_id_change
      BEFORE UPDATE OF readable_id ON public.contacts
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_canonical_readable_id_change();
  END IF;
END $$;

-- The legacy horses.eqid column is intentionally not backfilled from readable_id.
-- If any historical non-null eqid values exist in an environment, protect them
-- from silent rewrite as well.
CREATE OR REPLACE FUNCTION public.prevent_legacy_horse_eqid_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.eqid IS NOT NULL
     AND OLD.eqid <> ''
     AND NEW.eqid IS DISTINCT FROM OLD.eqid THEN
    RAISE EXCEPTION 'legacy horse eqid is immutable once assigned'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'horses'
      AND column_name = 'eqid'
  ) THEN
    DROP TRIGGER IF EXISTS trg_prevent_horses_eqid_change ON public.horses;
    CREATE TRIGGER trg_prevent_horses_eqid_change
      BEFORE UPDATE OF eqid ON public.horses
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_legacy_horse_eqid_change();
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.prevent_canonical_readable_id_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_legacy_horse_eqid_change() FROM PUBLIC, anon, authenticated;
