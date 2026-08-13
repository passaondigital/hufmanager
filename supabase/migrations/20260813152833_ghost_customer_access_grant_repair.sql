-- Ghost customers are business records, not authenticated client identities.
-- Keep access_grants strict: only an auth user with a trusted client role may
-- receive a customer-app relationship.

CREATE OR REPLACE FUNCTION public.auto_create_access_grant_for_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.created_by_provider_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM auth.users au
       WHERE au.id = NEW.id
     )
     AND public.get_user_role(NEW.id) = 'client'::public.app_role
  THEN
    INSERT INTO public.access_grants (
      provider_id,
      client_id,
      is_active,
      can_view_basic,
      can_view_medical,
      can_create_appointments
    )
    VALUES (
      NEW.created_by_provider_id,
      NEW.id,
      true,
      true,
      true,
      true
    )
    ON CONFLICT (client_id, provider_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_assign_client_to_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  resolved_provider_id uuid;
  client_email text;
  ghost_has_active_grant boolean := false;
BEGIN
  IF NEW.role <> 'client'::public.app_role THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.access_grants
    WHERE client_id = NEW.user_id
      AND is_active = true
  ) THEN
    RETURN NEW;
  END IF;

  SELECT p.created_by_provider_id, p.email
  INTO resolved_provider_id, client_email
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  IF resolved_provider_id IS NULL AND client_email IS NOT NULL THEN
    SELECT gp.created_by_provider_id,
           EXISTS (
             SELECT 1
             FROM public.access_grants existing_grant
             WHERE existing_grant.client_id = gp.id
               AND existing_grant.is_active = true
           )
    INTO resolved_provider_id, ghost_has_active_grant
    FROM public.profiles gp
    WHERE lower(gp.email) = lower(client_email)
      AND gp.id <> NEW.user_id
      AND gp.created_by_provider_id IS NOT NULL
      AND gp.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM auth.users au
        WHERE au.id = gp.id
      )
    ORDER BY gp.created_at ASC NULLS LAST, gp.id
    LIMIT 1;
  END IF;

  -- Legacy ghosts may already have a grant. handle_new_user() moves that
  -- existing row after this trigger, preserving its explicit permissions.
  IF ghost_has_active_grant THEN
    RETURN NEW;
  END IF;

  IF resolved_provider_id IS NULL THEN
    -- No trusted relationship evidence: fail closed instead of assigning an
    -- arbitrary provider.
    RETURN NEW;
  END IF;

  INSERT INTO public.access_grants (
    provider_id,
    client_id,
    is_active,
    can_view_basic,
    can_view_medical,
    can_create_appointments
  )
  VALUES (
    resolved_provider_id,
    NEW.user_id,
    true,
    true,
    true,
    true
  )
  ON CONFLICT (client_id, provider_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_ghost_customer_auth_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ghost_profile record;
  linked_ghost boolean := false;
BEGIN
  FOR ghost_profile IN
    SELECT p.id, p.created_by_provider_id, p.phone, p.street, p.zip_code, p.city
    FROM public.profiles p
    WHERE lower(p.email) = lower(NEW.email)
      AND p.id <> NEW.id
      AND p.created_by_provider_id IS NOT NULL
      AND p.deleted_at >= transaction_timestamp()
      AND NOT EXISTS (
        SELECT 1
        FROM auth.users au
        WHERE au.id = p.id
      )
    ORDER BY p.created_at ASC NULLS LAST, p.id
  LOOP
    linked_ghost := true;

    UPDATE public.invoices
    SET client_id = NEW.id
    WHERE client_id = ghost_profile.id;

    UPDATE public.quotes
    SET client_id = NEW.id
    WHERE client_id = ghost_profile.id;

    UPDATE public.service_orders
    SET client_id = NEW.id
    WHERE client_id = ghost_profile.id;

    UPDATE public.client_subscriptions
    SET client_id = NEW.id
    WHERE client_id = ghost_profile.id;

    UPDATE public.client_locations
    SET client_id = NEW.id
    WHERE client_id = ghost_profile.id;

    UPDATE public.horse_media
    SET owner_id = NEW.id
    WHERE owner_id = ghost_profile.id;

    UPDATE public.profiles
    SET created_by_provider_id = COALESCE(created_by_provider_id, ghost_profile.created_by_provider_id),
        phone = COALESCE(phone, ghost_profile.phone),
        street = COALESCE(street, ghost_profile.street),
        zip_code = COALESCE(zip_code, ghost_profile.zip_code),
        city = COALESCE(city, ghost_profile.city)
    WHERE id = NEW.id;
  END LOOP;

  -- A newly authenticated customer converted from a provider-managed ghost is
  -- unambiguously entering the free HufManager customer access. This is not a
  -- classification of an existing legacy account and creates no paid access.
  IF linked_ghost
     AND public.get_user_role(NEW.id) = 'client'::public.app_role
  THEN
    INSERT INTO public.product_memberships (
      user_id,
      product,
      status,
      selected_at,
      source,
      migration_version
    )
    VALUES (
      NEW.id,
      'HUFMANAGER',
      'ACTIVE',
      now(),
      'SYSTEM_MIGRATION',
      'ghost-customer-auth-link-v1'
    )
    ON CONFLICT (user_id, product) DO UPDATE SET
      status = 'ACTIVE',
      selected_at = COALESCE(public.product_memberships.selected_at, EXCLUDED.selected_at),
      source = 'SYSTEM_MIGRATION',
      migration_version = EXCLUDED.migration_version,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zz_finalize_ghost_customer_auth_link ON auth.users;
CREATE TRIGGER zz_finalize_ghost_customer_auth_link
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.finalize_ghost_customer_auth_link();

REVOKE ALL ON FUNCTION public.finalize_ghost_customer_auth_link() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_ghost_customer_auth_link() FROM anon;
REVOKE ALL ON FUNCTION public.finalize_ghost_customer_auth_link() FROM authenticated;

-- Rollback:
--   DROP TRIGGER zz_finalize_ghost_customer_auth_link ON auth.users;
--   DROP FUNCTION public.finalize_ghost_customer_auth_link();
--   Restore auto_create_access_grant_for_client() and
--   auto_assign_client_to_provider() from the immediately preceding migration
--   state. No table rows are deleted or rewritten by applying this migration.
