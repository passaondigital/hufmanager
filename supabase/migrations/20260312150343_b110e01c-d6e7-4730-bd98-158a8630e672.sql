
-- Prevent employees from escalating their own role, status, provider_id, or custom_permissions
-- Uses a trigger instead of WITH CHECK to give clear error messages

CREATE OR REPLACE FUNCTION public.prevent_employee_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only restrict if the current user is the employee themselves (not the provider)
  IF OLD.user_id = auth.uid() AND OLD.provider_id != auth.uid() THEN
    -- Block role changes
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Mitarbeiter können ihre eigene Rolle nicht ändern.';
    END IF;
    -- Block status changes
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Mitarbeiter können ihren eigenen Status nicht ändern.';
    END IF;
    -- Block provider_id changes
    IF NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN
      RAISE EXCEPTION 'Mitarbeiter können ihren Provider nicht ändern.';
    END IF;
    -- Block custom_permissions changes
    IF NEW.custom_permissions IS DISTINCT FROM OLD.custom_permissions THEN
      RAISE EXCEPTION 'Mitarbeiter können ihre eigenen Berechtigungen nicht ändern.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_employee_self_escalation ON public.employee_profiles;

CREATE TRIGGER trg_prevent_employee_self_escalation
  BEFORE UPDATE ON public.employee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_employee_self_escalation();
