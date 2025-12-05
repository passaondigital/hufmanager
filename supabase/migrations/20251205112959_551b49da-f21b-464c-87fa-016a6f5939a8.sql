-- Korrektur: Entferne die fehlerhafte horses-Bedingung
-- Die conversations- und appointments-Bedingungen prüfen bereits die provider_id

DROP POLICY IF EXISTS "Providers can view connected profiles" ON public.profiles;

CREATE POLICY "Providers can view connected profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id  -- Eigenes Profil
  OR (
    has_role(auth.uid(), 'provider'::app_role) AND (
      -- Verbindung über Konversationen (direkte Kommunikation)
      EXISTS (
        SELECT 1 FROM conversations c 
        WHERE c.client_id = profiles.id AND c.provider_id = auth.uid()
      )
      -- Verbindung über Termine (Provider hat Termin mit Pferd des Kunden)
      OR EXISTS (
        SELECT 1 FROM appointments a 
        JOIN horses h ON a.horse_id = h.id 
        WHERE h.owner_id = profiles.id AND a.provider_id = auth.uid()
      )
    )
  )
);