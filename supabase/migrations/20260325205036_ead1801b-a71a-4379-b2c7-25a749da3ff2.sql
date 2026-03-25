CREATE OR REPLACE FUNCTION public.auto_assign_client_to_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_provider_id uuid;
  new_user_email text;
  demo_emails text[] := ARRAY[
    'hufbearbeiter.hufmanager@gmail.com',
    'pferdebesitzer.hufmanager@gmail.com',
    'mitarbeiter.hufmanager@gmail.com',
    'partner.hufmanager@gmail.com',
    'hufmanagerbusiness@gmail.com',
    'hufmanagerstallbetreiber@gmail.com'
  ];
BEGIN
  IF NEW.role != 'client' THEN
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

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = NEW.user_id
      AND created_by_provider_id IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

  SELECT email
  INTO new_user_email
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF new_user_email IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.profiles gp
    JOIN public.access_grants ag
      ON ag.client_id = gp.id
     AND ag.is_active = true
    WHERE gp.email = new_user_email
      AND gp.id <> NEW.user_id
      AND gp.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM auth.users au
        WHERE au.id = gp.id
      )
  ) THEN
    RETURN NEW;
  END IF;

  SELECT ur.user_id
  INTO first_provider_id
  FROM public.user_roles ur
  JOIN public.profiles p
    ON p.id = ur.user_id
  WHERE ur.role = 'provider'
    AND p.deleted_at IS NULL
    AND COALESCE(p.email, '') <> ALL(demo_emails)
  ORDER BY ur.id
  LIMIT 1;

  IF first_provider_id IS NULL THEN
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
    first_provider_id,
    NEW.user_id,
    true,
    true,
    true,
    true
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;