-- Store-Fahrplan Schritt 3C — Kategorie C: ~10 kleinere IDOR-Funktionen
-- Gleiches Muster wie Schritt 3B: SECURITY DEFINER ohne auth.uid()-Bezug,
-- Parameter frei wählbar. Für jede Funktion wurden vor dem Fix die
-- tatsächlichen Aufrufer (Frontend + interne SQL-Trigger) geprüft, um
-- keinen legitimen Pfad zu brechen.

-- get_owner_horse_ids: kein Frontend-Aufrufer, kein interner SQL-Aufrufer
-- gefunden. Nur der Eigentümer selbst (oder Admin) darf die eigene
-- Pferde-ID-Liste abfragen.
CREATE OR REPLACE FUNCTION public.get_owner_horse_ids(_owner_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.horses
  WHERE owner_id = _owner_id
    AND deleted_at IS NULL
    AND (auth.uid() = _owner_id OR public.is_admin(auth.uid()));
$function$;

-- get_user_organization: einziger interner Aufrufer (auto_assign_organization-
-- Trigger) übergibt bereits auth.uid() — Fix bricht nichts.
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT organization_id FROM public.profiles
  WHERE id = _user_id AND (auth.uid() = _user_id OR public.is_admin(auth.uid()))
  LIMIT 1
$function$;

-- get_active_emergency_for_provider: kein Frontend- oder SQL-Aufrufer
-- gefunden (orphaned). Nur Provider selbst oder Admin.
CREATE OR REPLACE FUNCTION public.get_active_emergency_for_provider(p_provider_id uuid)
 RETURNS TABLE(id uuid, started_at timestamp with time zone, estimated_delay_minutes integer, reason text, tour_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    tes.id,
    tes.started_at,
    tes.estimated_delay_minutes,
    tes.reason,
    dt.tour_date
  FROM tour_emergency_status tes
  JOIN daily_tours dt ON tes.tour_id = dt.id
  WHERE tes.provider_id = p_provider_id
    AND tes.ended_at IS NULL
    AND (auth.uid() = p_provider_id OR public.is_admin(auth.uid()))
  LIMIT 1;
$function$;

-- get_hufi_voice_credits: einziger Aufrufer (useHufiVoiceCredits.ts)
-- übergibt bereits user!.id (eigene ID).
CREATE OR REPLACE FUNCTION public.get_hufi_voice_credits(p_user_id uuid)
 RETURNS hufi_voice_credits
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.ensure_hufi_voice_credits_current(p_user_id)
  WHERE auth.uid() = p_user_id OR public.is_admin(auth.uid());
$function$;

-- get_storage_usage: drei Entity-Typen (provider/client/horse), jeweils
-- eigene Berechtigungsprüfung analog zu bestehenden RLS-Mustern.
CREATE OR REPLACE FUNCTION public.get_storage_usage(p_entity_type text, p_entity_id uuid)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(file_size_bytes), 0)::BIGINT
  FROM public.storage_usage
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND (
      public.is_admin(auth.uid())
      OR (p_entity_type = 'provider' AND auth.uid() = p_entity_id)
      OR (p_entity_type = 'client' AND (
        auth.uid() = p_entity_id
        OR EXISTS (SELECT 1 FROM public.access_grants ag WHERE ag.client_id = p_entity_id AND ag.provider_id = auth.uid() AND ag.is_active = true)
      ))
      OR (p_entity_type = 'horse' AND (
        EXISTS (SELECT 1 FROM public.horses h WHERE h.id = p_entity_id AND h.owner_id = auth.uid())
        OR public.is_provider_for_horse(auth.uid(), p_entity_id)
      ))
    );
$function$;

-- sync_affiliate_stats: kein Frontend- oder SQL-Aufrufer gefunden. Nur der
-- betroffene Provider selbst oder Admin darf seine eigenen Stats neu
-- berechnen lassen.
CREATE OR REPLACE FUNCTION public.sync_affiliate_stats(p_provider_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total integer;
  v_active integer;
  v_monthly integer;
  v_total_comm integer;
BEGIN
  IF NOT (auth.uid() = p_provider_id OR public.is_admin(auth.uid())) THEN
    RETURN;
  END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'active'),
    COALESCE(sum(monthly_commission) FILTER (WHERE status = 'active'), 0)::integer,
    COALESCE(sum(total_commission), 0)::integer
  INTO v_total, v_active, v_monthly, v_total_comm
  FROM public.hufrente_referrals
  WHERE provider_id = p_provider_id;

  INSERT INTO public.affiliate_stats (provider_id, referral_count, active_referrals, monthly_commission, total_commission, last_updated)
  VALUES (p_provider_id, v_total, v_active, v_monthly, v_total_comm, now())
  ON CONFLICT (provider_id)
  DO UPDATE SET
    referral_count = v_total,
    active_referrals = v_active,
    monthly_commission = v_monthly,
    total_commission = v_total_comm,
    last_updated = now();
END;
$function$;

-- log_emergency_action: _actor_id war frei wählbar (Audit-Log-Fälschung
-- möglich). Jetzt ausschließlich auth.uid(); Parameter bleibt aus
-- Kompatibilitätsgründen in der Signatur, wird aber ignoriert.
CREATE OR REPLACE FUNCTION public.log_emergency_action(_actor_id uuid, _action_type text, _target_kid character varying, _details jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role VARCHAR;
  v_log_id UUID;
BEGIN
  SELECT role::text INTO v_actor_role
  FROM public.profiles
  WHERE id = v_actor_id;

  INSERT INTO public.emergency_audit_log (
    actor_id,
    actor_role,
    action_type,
    target_kid,
    details,
    ip_address
  )
  VALUES (
    v_actor_id,
    v_actor_role,
    _action_type,
    _target_kid,
    _details,
    inet_client_addr()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$function$;

-- search_profiles_universal: ID-Präfix- und E-Mail-Zweig hatten (anders als
-- der Name-/PLZ-Zweig) keinen is_discoverable-Filter. is_discoverable
-- defaultet auf true, betrifft also nur Nutzer, die sich aktiv abgemeldet
-- haben — konsistent zum Rest der Funktion angeglichen (Pascal bestätigt:
-- global anwenden).
CREATE OR REPLACE FUNCTION public.search_profiles_universal(search_term text, search_limit integer DEFAULT 15)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  results json;
  clean_term text;
BEGIN
  clean_term := trim(search_term);

  IF length(clean_term) < 2 THEN
    RETURN '[]'::json;
  END IF;

  IF clean_term ~ '^#?[A-Z]{2,4}-' OR clean_term ~ '^(PID|KID|PRID|EQID|EID)' THEN
    clean_term := regexp_replace(clean_term, '^#', '');

    SELECT json_agg(row_to_json(r)) INTO results
    FROM (
      SELECT
        p.id,
        p.readable_id,
        p.full_name as name,
        p.avatar_url,
        p.role,
        p.zip_code as postal_code,
        NULL::text as specialty,
        'profile' as result_type
      FROM profiles p
      WHERE p.readable_id ILIKE clean_term || '%'
        AND p.deleted_at IS NULL
        AND p.is_discoverable = true
      LIMIT search_limit
    ) r;

  ELSIF clean_term LIKE '%@%' THEN
    SELECT json_agg(row_to_json(r)) INTO results
    FROM (
      SELECT
        p.id,
        p.readable_id,
        p.full_name as name,
        p.avatar_url,
        p.role,
        p.zip_code as postal_code,
        NULL::text as specialty,
        'profile' as result_type
      FROM profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE u.email ILIKE '%' || clean_term || '%'
        AND p.deleted_at IS NULL
        AND p.is_discoverable = true
      LIMIT search_limit
    ) r;

  ELSIF clean_term ~ '^\d{4,5}$' THEN
    SELECT json_agg(row_to_json(r)) INTO results
    FROM (
      SELECT
        p.id,
        p.readable_id,
        p.full_name as name,
        p.avatar_url,
        p.role,
        p.zip_code as postal_code,
        (SELECT pbs.specialty FROM partner_business_settings pbs WHERE pbs.partner_id = p.id LIMIT 1) as specialty,
        'profile' as result_type
      FROM profiles p
      WHERE p.zip_code ILIKE clean_term || '%'
        AND p.deleted_at IS NULL
        AND p.is_discoverable = true
      ORDER BY p.full_name ASC
      LIMIT search_limit
    ) r;

  ELSE
    SELECT json_agg(row_to_json(r)) INTO results
    FROM (
      SELECT
        p.id,
        p.readable_id,
        p.full_name as name,
        p.avatar_url,
        p.role,
        p.zip_code as postal_code,
        pbs.specialty,
        'profile' as result_type
      FROM profiles p
      LEFT JOIN partner_business_settings pbs ON pbs.partner_id = p.id
      WHERE (
        p.full_name ILIKE '%' || clean_term || '%'
        OR p.readable_id ILIKE '%' || clean_term || '%'
        OR pbs.specialty ILIKE '%' || clean_term || '%'
        OR pbs.qualifications ILIKE '%' || clean_term || '%'
      )
        AND p.deleted_at IS NULL
        AND p.is_discoverable = true
      ORDER BY
        CASE WHEN p.full_name ILIKE clean_term || '%' THEN 0
             WHEN pbs.specialty ILIKE '%' || clean_term || '%' THEN 1
             ELSE 2 END,
        p.full_name ASC
      LIMIT search_limit
    ) r;
  END IF;

  RETURN COALESCE(results, '[]'::json);
END;
$function$;

-- search_profile_by_readable_id: gleicher is_discoverable-Filter, auch für
-- die öffentliche Partner-Profilseite (/partner/:prid) — Pascal bestätigt:
-- global anwenden, kein separater Pfad für den öffentlichen Link.
CREATE OR REPLACE FUNCTION public.search_profile_by_readable_id(search_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  clean_id TEXT;
BEGIN
  clean_id := UPPER(TRIM(REPLACE(search_id, '#', '')));

  IF char_length(clean_id) > 20 OR char_length(clean_id) < 5 THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT jsonb_build_object(
    'found', true,
    'id', p.id,
    'readable_id', p.readable_id,
    'full_name', COALESCE(p.full_name, 'Unbekannt'),
    'avatar_url', p.avatar_url,
    'role', (SELECT role FROM public.user_roles WHERE user_id = p.id LIMIT 1)
  )
  INTO result
  FROM public.profiles p
  WHERE p.readable_id = clean_id
    AND p.deleted_at IS NULL
    AND p.is_discoverable = true;

  RETURN COALESCE(result, jsonb_build_object('found', false));
END;
$function$;
