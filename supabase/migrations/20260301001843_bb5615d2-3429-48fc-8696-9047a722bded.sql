
-- Server-side subscription enforcement: 
-- A SECURITY DEFINER function that checks plan limits before allowing horse inserts.
-- This prevents client-side bypass of plan restrictions.

CREATE OR REPLACE FUNCTION public.check_horse_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_provider_id uuid;
  v_plan text;
  v_horse_count integer;
  v_horse_limit integer;
BEGIN
  -- Find the provider for this horse's owner
  SELECT ag.provider_id INTO v_provider_id
  FROM access_grants ag
  WHERE ag.client_id = NEW.owner_id
    AND ag.is_active = true
  LIMIT 1;
  
  -- If no provider found, check if owner IS a provider
  IF v_provider_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.owner_id AND role = 'provider') THEN
      v_provider_id := NEW.owner_id;
    ELSE
      -- No provider connection, allow (will be managed later)
      RETURN NEW;
    END IF;
  END IF;
  
  -- Get provider's plan
  SELECT COALESCE(
    CASE p.plan_override
      WHEN 'copecart_starter' THEN 'starter'
      WHEN 'copecart_pro' THEN 'pro'
      WHEN 'copecart_duo' THEN 'duo'
      WHEN 'copecart_team' THEN 'team'
      WHEN 'lifetime_grant' THEN 'team'
      WHEN 'employee' THEN 'team'
      ELSE NULL
    END,
    COALESCE(p.subscription_plan, 'starter')
  ) INTO v_plan
  FROM profiles p
  WHERE p.id = v_provider_id;
  
  -- Set limit based on plan
  v_horse_limit := CASE v_plan
    WHEN 'starter' THEN 10
    WHEN 'pro' THEN 75
    WHEN 'advanced' THEN 75
    WHEN 'duo' THEN 150
    WHEN 'team' THEN 999999
    ELSE 10
  END;
  
  -- Count current active horses for this provider's clients
  SELECT COUNT(*) INTO v_horse_count
  FROM horses h
  WHERE h.deleted_at IS NULL
    AND (
      h.owner_id = v_provider_id
      OR h.owner_id IN (
        SELECT ag.client_id FROM access_grants ag
        WHERE ag.provider_id = v_provider_id AND ag.is_active = true
      )
    );
  
  IF v_horse_count >= v_horse_limit THEN
    RAISE EXCEPTION 'Pferde-Limit erreicht (% von % im %-Plan). Bitte upgraden Sie Ihren Plan.', v_horse_count, v_horse_limit, v_plan;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to horses table (only on INSERT)
DROP TRIGGER IF EXISTS enforce_horse_limit ON horses;
CREATE TRIGGER enforce_horse_limit
  BEFORE INSERT ON horses
  FOR EACH ROW
  EXECUTE FUNCTION check_horse_limit();
