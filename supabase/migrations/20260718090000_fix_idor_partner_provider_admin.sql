-- Store-Fahrplan Schritt 3B — Fund 1-3: IDOR-Fixes
-- get_partner_shared_data, get_provider_clients, admin_repair_user_role
-- prüften bisher nicht (oder nur gegen einen vom Aufrufer frei wählbaren
-- Parameter statt gegen auth.uid()), wer tatsächlich aufruft.

-- Fund 1: get_partner_shared_data — jetzt nur die eigene, per auth.uid()
-- verifizierte E-Mail-Adresse erlaubt (gleiche Logik wie RLS-Policy
-- "Partners can view their own grants by email" auf access_grants).
CREATE OR REPLACE FUNCTION public.get_partner_shared_data(p_partner_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF p_partner_email IS NULL OR p_partner_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('error', 'Invalid email');
  END IF;

  IF p_partner_email IS DISTINCT FROM public.auth_user_email() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'grant_id', ag.id,
      'provider_id', ag.provider_id,
      'client_id', ag.client_id,
      'status', ag.status,
      'is_active', ag.is_active,
      'can_view_basic', ag.can_view_basic,
      'can_view_medical', ag.can_view_medical,
      'can_create_appointments', ag.can_create_appointments,
      'granted_at', ag.granted_at,
      'provider_name', (SELECT full_name FROM profiles WHERE id = ag.provider_id AND deleted_at IS NULL),
      'client_name', (SELECT full_name FROM profiles WHERE id = ag.client_id AND deleted_at IS NULL)
    )
  )
  INTO result
  FROM access_grants ag
  WHERE ag.partner_email = p_partner_email
    AND ag.is_active = true;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;

-- Fund 2: get_provider_clients — nur noch erlaubt für:
--   a) den Provider selbst (auth.uid() = _provider_id)
--   b) Admins
--   c) Partner, WÄHREND für diesen Provider eine aktive Notfall-Situation
--      läuft (tour_emergency_status.ended_at IS NULL ODER
--      emergency_escalations.status = 'open') — deckt den bestehenden
--      Emergency-Dashboard-Aufrufpfad (src/pages/EmergencyDashboard.tsx)
--      ab, ohne dass Partner jederzeit beliebige Kundenlisten ziehen können.
CREATE OR REPLACE FUNCTION public.get_provider_clients(_provider_id uuid)
 RETURNS TABLE(client_id uuid, client_readable_id character varying, client_email text, client_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT
    p.id,
    p.readable_id,
    p.email,
    p.full_name
  FROM public.profiles p
  INNER JOIN public.access_grants ag ON ag.client_id = p.id
  WHERE ag.provider_id = _provider_id
    AND ag.is_active = true
    AND p.role::text = 'client'
    AND (
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
    )
  ORDER BY p.full_name;
$function$;

-- Fund 3: admin_repair_user_role — p_admin_id war ein vom Aufrufer frei
-- wählbarer Parameter, der für den Admin-Check UND fürs Logging genutzt
-- wurde. Jetzt zählt ausschließlich auth.uid(); der Parameter bleibt aus
-- Kompatibilitätsgründen im Funktionssignatur bestehen (Frontend schickt
-- ohnehin schon adminUser.id = auth.uid() des echten Admins), wird aber
-- ignoriert. Zusätzlich: vorbestehender Typ-Cast-Bug behoben
-- (target_id ist uuid, p_user_id::text schlug fehl — betraf auch echte
-- Admins, nicht nur den Exploit-Pfad).
CREATE OR REPLACE FUNCTION public.admin_repair_user_role(p_user_id uuid, p_new_role text, p_admin_id uuid DEFAULT NULL, p_reason text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_old_role text;
  v_new_prefix text;
  v_new_readable_id text;
  v_attempts integer := 0;
  v_max_attempts integer := 100;
BEGIN
  -- Validate admin — ausschließlich über den echten Aufrufer, nicht über
  -- einen vom Client mitgeschickten Parameter.
  IF NOT public.is_admin(v_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not an admin');
  END IF;

  -- Validate new role
  IF p_new_role NOT IN ('provider', 'client', 'partner', 'employee') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Get current role
  SELECT role::text INTO v_old_role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1;

  IF v_old_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User has no role');
  END IF;

  -- Determine new ID prefix
  CASE p_new_role
    WHEN 'provider' THEN v_new_prefix := 'PID';
    WHEN 'client' THEN v_new_prefix := 'KID';
    WHEN 'partner' THEN v_new_prefix := 'PRID';
    WHEN 'employee' THEN v_new_prefix := 'EID';
  END CASE;

  -- Generate new readable_id
  LOOP
    v_new_readable_id := public.generate_random_id(v_new_prefix);
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE readable_id = v_new_readable_id) THEN
      EXIT;
    END IF;
    v_attempts := v_attempts + 1;
    IF v_attempts >= v_max_attempts THEN
      RETURN jsonb_build_object('success', false, 'error', 'Could not generate unique ID');
    END IF;
  END LOOP;

  -- Update role (delete old, insert new)
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, p_new_role::app_role);

  -- Update readable_id on profile
  UPDATE public.profiles SET readable_id = v_new_readable_id WHERE id = p_user_id;

  -- Log to admin_activity_log (target_id ist uuid — kein ::text-Cast mehr)
  INSERT INTO public.admin_activity_log (admin_id, admin_email, action_type, target_type, target_id, target_name, details)
  VALUES (
    v_admin_id,
    (SELECT email FROM public.profiles WHERE id = v_admin_id),
    'role_repaired',
    'user',
    p_user_id,
    (SELECT full_name FROM public.profiles WHERE id = p_user_id),
    jsonb_build_object(
      'old_role', v_old_role,
      'new_role', p_new_role,
      'new_readable_id', v_new_readable_id,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_role', v_old_role,
    'new_role', p_new_role,
    'new_readable_id', v_new_readable_id
  );
END;
$function$;
