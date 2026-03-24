-- Fix log_horse_audit() trigger: column names don't match horse_audit_log table
-- Table columns: actor_id, action_type, action_detail, created_at
-- Function was using wrong names: changed_by, action, old_data, new_data, changed_at

CREATE OR REPLACE FUNCTION public.log_horse_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO horse_audit_log (
    horse_id,
    actor_id,
    action_type,
    action_detail,
    created_at
  )
  VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    TG_OP,
    jsonb_build_object(
      'old_data', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      'new_data', CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
    ),
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$function$;