-- 1. Fix: notify_admin_on_profile_change — add EXCEPTION handler
CREATE OR REPLACE FUNCTION public.notify_admin_on_profile_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE payload jsonb; edge_url text; service_key text;
BEGIN
  edge_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/admin-notifications';
  service_key := current_setting('app.settings.service_role_key', true);
  IF edge_url IS NULL OR edge_url = '/functions/v1/admin-notifications' THEN
    edge_url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/admin-notifications';
  END IF;
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object('type','INSERT','record',jsonb_build_object('email',NEW.email,'full_name',NEW.full_name));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.email IS DISTINCT FROM NEW.email OR OLD.full_name IS DISTINCT FROM NEW.full_name THEN
      payload := jsonb_build_object('type','UPDATE','record',jsonb_build_object('email',NEW.email,'full_name',NEW.full_name),'old_record',jsonb_build_object('email',OLD.email,'full_name',OLD.full_name));
    ELSE RETURN COALESCE(NEW, OLD); END IF;
  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object('type','DELETE','old_record',jsonb_build_object('email',OLD.email,'full_name',OLD.full_name));
  END IF;
  PERFORM net.http_post(url:=edge_url, headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||service_key), body:=payload);
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_admin_on_profile_change failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END; $$;

-- 2. Fix: log_horse_audit — add EXCEPTION handler
CREATE OR REPLACE FUNCTION public.log_horse_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO horse_audit_log (horse_id, actor_id, action_type, action_detail, created_at)
  VALUES (COALESCE(NEW.id,OLD.id), auth.uid(), TG_OP,
    jsonb_build_object('old_data', CASE WHEN TG_OP IN ('DELETE','UPDATE') THEN to_jsonb(OLD) ELSE NULL END,
                       'new_data', CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END), now());
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'log_horse_audit failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END; $$;

-- 3. Fix: notify_provider_on_horse_created — add EXCEPTION handler
CREATE OR REPLACE FUNCTION public.notify_provider_on_horse_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _provider_id uuid;
BEGIN
  SELECT ag.provider_id INTO _provider_id FROM access_grants ag WHERE ag.client_id = NEW.owner_id AND ag.is_active = true LIMIT 1;
  IF _provider_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
    VALUES (_provider_id, 'Neues Pferd angelegt', 'Ein Kunde hat ein neues Pferd angelegt: ' || NEW.name, 'info', 'horse', NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_provider_on_horse_created failed: %', SQLERRM; RETURN NEW;
END; $$;

-- 4. Fix: notify_provider_on_horse_updated — add EXCEPTION handler
CREATE OR REPLACE FUNCTION public.notify_provider_on_horse_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _provider_id uuid;
BEGIN
  SELECT ag.provider_id INTO _provider_id FROM access_grants ag WHERE ag.client_id = NEW.owner_id AND ag.is_active = true LIMIT 1;
  IF _provider_id IS NOT NULL AND OLD.name IS DISTINCT FROM NEW.name THEN
    INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
    VALUES (_provider_id, 'Pferdedaten geändert', 'Die Daten von ' || NEW.name || ' wurden aktualisiert.', 'info', 'horse', NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_provider_on_horse_updated failed: %', SQLERRM; RETURN NEW;
END; $$;

-- 5. Add missing DELETE policy for horses for providers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='horses' AND policyname='Provider can delete client horses') THEN
    CREATE POLICY "Provider can delete client horses" ON public.horses FOR DELETE TO authenticated
    USING (deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM access_grants ag WHERE ag.client_id = horses.owner_id AND ag.provider_id = auth.uid() AND ag.is_active = true AND ag.status = 'active'
    ));
  END IF;
END $$;