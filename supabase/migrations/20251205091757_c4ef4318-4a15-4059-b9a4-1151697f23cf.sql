-- 1. KRITISCH: Entferne die gefährliche "Providers can manage roles" Policy
DROP POLICY IF EXISTS "Providers can manage roles" ON public.user_roles;

-- 2. KRITISCH: Ändere die Profile-Policy - Provider sehen nur verbundene Kunden
DROP POLICY IF EXISTS "Providers can view all profiles" ON public.profiles;

CREATE POLICY "Providers can view connected profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id  -- Eigenes Profil
  OR has_role(auth.uid(), 'provider'::app_role) AND (
    -- Verbindung über Pferde (Kunde ist Pferdebesitzer)
    EXISTS (
      SELECT 1 FROM horses h WHERE h.owner_id = profiles.id
    )
    -- Verbindung über Konversationen
    OR EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.client_id = profiles.id AND c.provider_id = auth.uid()
    )
    -- Verbindung über Termine (Pferd gehört dem Profilinhaber)
    OR EXISTS (
      SELECT 1 FROM appointments a 
      JOIN horses h ON a.horse_id = h.id 
      WHERE h.owner_id = profiles.id AND a.provider_id = auth.uid()
    )
  )
);

-- 3. Notifications: INSERT Policy für Provider/System
CREATE POLICY "Providers can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'provider'::app_role));

-- 4. Messages: Validierungstrigger für Nachrichtenlänge (CHECK Constraints müssen immutable sein)
CREATE OR REPLACE FUNCTION public.validate_message_length()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF length(NEW.content) > 5000 THEN
    RAISE EXCEPTION 'Message content exceeds maximum length of 5000 characters';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_message_length ON public.messages;
CREATE TRIGGER check_message_length
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.validate_message_length();

-- 5. AI Chat Messages: Gleiche Validierung
DROP TRIGGER IF EXISTS check_ai_message_length ON public.ai_chat_messages;
CREATE TRIGGER check_ai_message_length
BEFORE INSERT OR UPDATE ON public.ai_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.validate_message_length();