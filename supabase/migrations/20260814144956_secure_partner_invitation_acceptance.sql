-- P1 Security Fix: Harden accept_partner_invitation
--
-- Vulnerabilities closed:
-- 1. Caller-supplied p_user_id trusted without auth.uid() binding
-- 2. anon and PUBLIC can execute SECURITY DEFINER function
-- 3. No race/reuse protection (SELECT-then-UPDATE not atomic)
-- 4. No email binding even when partner_email is populated
--
-- Compatibility: Keeps existing (p_token text, p_user_id uuid) signature
-- so frontend callers continue to work without deploy.

-- Replace the function with hardened version
CREATE OR REPLACE FUNCTION public.accept_partner_invitation(p_token text, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid;
  v_caller_email text;
  v_updated_count integer;
  v_grant record;
BEGIN
  -- 1. Require authenticated caller
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- 2. Bind p_user_id to auth.uid() — deny arbitrary user ID
  IF p_user_id IS DISTINCT FROM v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'User identity mismatch');
  END IF;

  -- 3. Basic token validation
  IF p_token IS NULL OR char_length(p_token) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  -- 4. Look up the pending invitation
  SELECT * INTO v_grant
  FROM public.horse_partner_access
  WHERE invite_token = p_token
  AND status = 'pending'
  FOR UPDATE SKIP LOCKED;  -- Lock row to prevent concurrent acceptance

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or already used');
  END IF;

  -- 5. Check expiry
  IF v_grant.valid_until IS NOT NULL AND v_grant.valid_until < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  -- 6. Email binding: if partner_email is populated, verify it matches caller
  IF v_grant.partner_email IS NOT NULL AND char_length(v_grant.partner_email) > 0 THEN
    SELECT email INTO v_caller_email
    FROM auth.users
    WHERE id = v_caller_id;

    IF v_caller_email IS NULL OR lower(v_caller_email) != lower(v_grant.partner_email) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Email does not match invitation');
    END IF;
  END IF;

  -- 7. Atomic guarded update — only succeeds if row is still pending
  UPDATE public.horse_partner_access
  SET partner_profile_id = v_caller_id,
      status = 'active',
      is_active = true,
      accepted_at = now()
  WHERE id = v_grant.id
  AND status = 'pending';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation already processed');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'grant_id', v_grant.id,
    'horse_id', v_grant.horse_id
  );
END;
$function$;

-- Revoke dangerous execute privileges
REVOKE EXECUTE ON FUNCTION public.accept_partner_invitation(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_partner_invitation(text, uuid) FROM PUBLIC;

-- Grant only to authenticated role
GRANT EXECUTE ON FUNCTION public.accept_partner_invitation(text, uuid) TO authenticated;

-- Ensure service_role retains access (for admin/server use)
GRANT EXECUTE ON FUNCTION public.accept_partner_invitation(text, uuid) TO service_role;
