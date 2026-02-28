
CREATE OR REPLACE FUNCTION public.notify_user_on_feature_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  old_statuses jsonb;
  new_statuses jsonb;
  feature_key text;
  old_status text;
  new_status text;
  unlocked_features text[];
  notification_message text;
BEGIN
  IF OLD.feature_statuses IS NOT DISTINCT FROM NEW.feature_statuses THEN
    RETURN NEW;
  END IF;

  old_statuses := COALESCE(OLD.feature_statuses::jsonb, '{}'::jsonb);
  new_statuses := COALESCE(NEW.feature_statuses::jsonb, '{}'::jsonb);

  FOR feature_key IN SELECT jsonb_object_keys(new_statuses)
  LOOP
    new_status := new_statuses ->> feature_key;
    old_status := old_statuses ->> feature_key;

    IF (old_status IS NULL OR old_status = 'disabled') AND new_status IN ('public', 'early_access', 'beta') THEN
      unlocked_features := array_append(unlocked_features, feature_key);
    ELSIF old_status = 'beta' AND new_status IN ('public', 'early_access') THEN
      unlocked_features := array_append(unlocked_features, feature_key);
    ELSIF old_status = 'early_access' AND new_status = 'public' THEN
      unlocked_features := array_append(unlocked_features, feature_key);
    END IF;
  END LOOP;

  IF unlocked_features IS NOT NULL AND array_length(unlocked_features, 1) > 0 THEN
    IF array_length(unlocked_features, 1) = 1 THEN
      notification_message := 'Ein neues Feature wurde für dich freigeschaltet: ' || replace(replace(unlocked_features[1], 'module_', ''), 'autoflow_', 'AutoFlow ');
    ELSE
      notification_message := array_length(unlocked_features, 1)::text || ' neue Features wurden für dich freigeschaltet. Schau in deine Einstellungen!';
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.id,
      'Neue Features freigeschaltet 🎉',
      notification_message,
      'feature_unlock',
      '/management'
    );
  END IF;

  RETURN NEW;
END;
$function$;
