
CREATE OR REPLACE FUNCTION public.admin_repair_user_role(
  p_user_id uuid,
  p_new_role text,
  p_admin_id uuid,
  p_reason text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_role text;
  v_new_prefix text;
  v_new_readable_id text;
  v_attempts integer := 0;
  v_max_attempts integer := 100;
BEGIN
  -- Validate admin
  IF NOT public.is_admin(p_admin_id) THEN
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

  -- Log to admin_activity_log
  INSERT INTO public.admin_activity_log (admin_id, admin_email, action_type, target_type, target_id, target_name, details)
  VALUES (
    p_admin_id,
    (SELECT email FROM public.profiles WHERE id = p_admin_id),
    'role_repaired',
    'user',
    p_user_id::text,
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
$$;
