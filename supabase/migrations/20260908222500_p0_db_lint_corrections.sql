-- XXL staging P0 correction: align legacy functions with the schema that
-- actually exists after the historical migration replay.

CREATE OR REPLACE FUNCTION public.get_public_offers(provider_id_input uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price numeric,
  price_type text,
  features jsonb,
  image_url text,
  offer_type text,
  display_mode text,
  media_url text,
  external_link text,
  billing_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.title,
    o.description,
    o.price,
    o.price_type,
    to_jsonb(o.features),
    o.image_url,
    o.offer_type,
    o.display_mode,
    o.media_url,
    o.external_link,
    o.billing_type
  FROM public.offers o
  WHERE o.provider_id = provider_id_input
    AND o.is_active = true
    AND o.display_mode != 'hidden'
  ORDER BY o.sort_order
  LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_employee_account(_employee_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _emp_id uuid;
  _provider_id uuid;
  _emp_name text;
BEGIN
  IF auth.uid() != _employee_user_id THEN
    RAISE EXCEPTION 'Nur der eigene Account kann gelöscht werden';
  END IF;

  SELECT id, provider_id, full_name INTO _emp_id, _provider_id, _emp_name
  FROM public.employee_profiles
  WHERE user_id = _employee_user_id;

  IF _emp_id IS NULL THEN
    RAISE EXCEPTION 'Kein Mitarbeiterprofil gefunden';
  END IF;

  UPDATE public.employee_profiles
  SET status = 'inactive', updated_at = now()
  WHERE id = _emp_id;

  UPDATE public.employee_assignments
  SET status = 'cancelled'
  WHERE employee_id = _emp_id
    AND status NOT IN ('completed', 'cancelled', 'checked_out');

  INSERT INTO public.admin_activity_log (
    admin_id, action_type, target_type, target_id, target_name, details
  )
  VALUES (
    _provider_id,
    'employee_self_delete',
    'employee',
    _emp_id,
    _emp_name,
    jsonb_build_object('deleted_by', 'self', 'deleted_at', now()::text)
  );

  UPDATE public.profiles
  SET deleted_at = now()
  WHERE id = _employee_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_health_fix(fix_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  fixed_count integer := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Nur Admins können Reparaturen ausführen';
  END IF;

  CASE fix_type
    WHEN 'orphaned_profiles' THEN
      WITH orphans AS (
        SELECT au.id, au.email, au.raw_user_meta_data->>'full_name' AS full_name
        FROM auth.users au
        LEFT JOIN public.profiles p ON p.id = au.id
        WHERE p.id IS NULL
      ),
      inserted AS (
        INSERT INTO public.profiles (id, email, full_name)
        SELECT id, email, COALESCE(full_name, split_part(email, '@', 1), 'Unbekannt')
        FROM orphans
        RETURNING id
      )
      SELECT count(*) INTO fixed_count FROM inserted;

      result := jsonb_build_object('fix', 'orphaned_profiles', 'fixed', fixed_count, 'message', fixed_count || ' Profile erstellt');

    WHEN 'expired_invitations' THEN
      WITH updated AS (
        UPDATE public.employee_profiles
        SET status = 'inactive', invitation_token = NULL, updated_at = now()
        WHERE invitation_token IS NOT NULL
          AND invitation_accepted_at IS NULL
          AND invitation_sent_at < now() - interval '7 days'
        RETURNING id
      )
      SELECT count(*) INTO fixed_count FROM updated;

      result := jsonb_build_object('fix', 'expired_invitations', 'fixed', fixed_count, 'message', fixed_count || ' Einladungen bereinigt');

    WHEN 'old_notifications' THEN
      WITH deleted AS (
        DELETE FROM public.notifications
        WHERE is_read = true
          AND created_at < now() - interval '90 days'
        RETURNING id
      )
      SELECT count(*) INTO fixed_count FROM deleted;

      result := jsonb_build_object('fix', 'old_notifications', 'fixed', fixed_count, 'message', fixed_count || ' alte Benachrichtigungen gelöscht');

    WHEN 'stale_sync_queue' THEN
      WITH deleted AS (
        DELETE FROM public.employee_sync_queue
        WHERE synced_at IS NULL
          AND created_at < now() - interval '7 days'
        RETURNING id
      )
      SELECT count(*) INTO fixed_count FROM deleted;

      result := jsonb_build_object('fix', 'stale_sync_queue', 'fixed', fixed_count, 'message', fixed_count || ' Sync-Einträge bereinigt');

    ELSE
      result := jsonb_build_object('fix', fix_type, 'error', 'Unbekannter Fix-Typ');
  END CASE;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.classify_legacy_billing_state(_user_id uuid)
RETURNS public.billing_transition_class
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  has_verified_external boolean := false;
  has_manual_payment boolean := false;
  has_provider_subscription boolean := false;
  has_client_subscription boolean := false;
BEGIN
  SELECT
    subscription_status,
    subscription_plan,
    plan_override,
    access_valid_until,
    copecart_subscription_id
  INTO p
  FROM public.profiles
  WHERE id = _user_id;

  IF NOT FOUND THEN
    RETURN 'UNKNOWN_BILLING_STATE'::public.billing_transition_class;
  END IF;

  has_verified_external := p.copecart_subscription_id IS NOT NULL
    AND length(trim(p.copecart_subscription_id)) > 0;

  SELECT EXISTS (
    SELECT 1 FROM public.provider_subscriptions ps
    WHERE ps.provider_id = _user_id
      AND ps.status IN ('active', 'paid', 'verified')
  ) INTO has_provider_subscription;

  SELECT EXISTS (
    SELECT 1 FROM public.client_subscriptions cs
    WHERE cs.client_id = _user_id
      AND cs.status IN ('active', 'paid', 'verified')
  ) INTO has_client_subscription;

  SELECT EXISTS (
    SELECT 1 FROM public.manual_payments mp
    WHERE mp.provider_id = _user_id
      AND mp.amount > 0
      AND mp.payment_date <= current_date
  ) INTO has_manual_payment;

  IF has_verified_external OR has_provider_subscription OR has_client_subscription OR has_manual_payment THEN
    RETURN 'VERIFIED_PAID'::public.billing_transition_class;
  END IF;

  IF p.subscription_status = 'trialing' THEN
    RETURN 'TRIAL'::public.billing_transition_class;
  END IF;

  IF p.subscription_status = 'active' THEN
    RETURN 'UNKNOWN_BILLING_STATE'::public.billing_transition_class;
  END IF;

  IF p.plan_override IN ('lifetime_grant', 'manual_cash_1y', 'employee') THEN
    RETURN 'UNKNOWN_BILLING_STATE'::public.billing_transition_class;
  END IF;

  RETURN 'FREE'::public.billing_transition_class;
END;
$$;

CREATE OR REPLACE FUNCTION public.select_product_membership(
  _product public.product_membership_product,
  _migration_version text DEFAULT 'legacy-product-splitter-v1'
)
RETURNS TABLE (
  product public.product_membership_product,
  status public.product_membership_status,
  billing_transition_state public.billing_transition_class,
  transition_status public.product_transition_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  current_user_id uuid := (SELECT auth.uid());
  billing_state public.billing_transition_class;
  prior_state jsonb;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  billing_state := public.classify_legacy_billing_state(current_user_id);

  SELECT jsonb_build_object(
    'role', p.role,
    'signup_app', p.signup_app,
    'subscription_status', p.subscription_status,
    'subscription_plan', p.subscription_plan,
    'plan_override_present', p.plan_override IS NOT NULL,
    'access_valid_until_present', p.access_valid_until IS NOT NULL,
    'copecart_subscription_id_present', p.copecart_subscription_id IS NOT NULL,
    'has_horses', EXISTS (SELECT 1 FROM public.horses h WHERE h.owner_id = current_user_id),
    'existing_memberships', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('product', pm.product, 'status', pm.status))
      FROM public.product_memberships pm
      WHERE pm.user_id = current_user_id
    ), '[]'::jsonb)
  )
  INTO prior_state
  FROM public.profiles p
  WHERE p.id = current_user_id;

  INSERT INTO public.product_memberships (
    user_id, product, status, selected_at, source, migration_version
  )
  VALUES (
    current_user_id, _product, 'ACTIVE', now(), 'USER_SELECTION', _migration_version
  )
  ON CONFLICT (user_id, product) DO UPDATE SET
    status = 'ACTIVE',
    selected_at = COALESCE(public.product_memberships.selected_at, now()),
    source = 'USER_SELECTION',
    migration_version = EXCLUDED.migration_version,
    updated_at = now();

  INSERT INTO public.product_membership_decisions (
    user_id,
    selected_product,
    migration_version,
    previous_state,
    billing_transition_state,
    transition_status
  )
  VALUES (
    current_user_id,
    _product,
    _migration_version,
    COALESCE(prior_state, '{}'::jsonb),
    billing_state,
    'DECISION_REQUIRED'
  );

  RETURN QUERY
  SELECT
    _product,
    'ACTIVE'::public.product_membership_status,
    billing_state,
    'DECISION_REQUIRED'::public.product_transition_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_preview_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(extensions.gen_random_bytes(16), 'hex');
END;
$$;
