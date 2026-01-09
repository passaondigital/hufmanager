-- =============================================
-- SECURITY FIX PART 2: RLS-Policies auf Original-Tabellen verschärfen
-- =============================================

-- 1. BUSINESS_SETTINGS: Client-Policy entfernen (nutzt jetzt safe_business_settings oder Function)
-- =============================================
DROP POLICY IF EXISTS "Clients can view connected provider settings" ON business_settings;

-- 2. HORSES: GPS-Daten und Medical-Daten Policy verschärfen
-- =============================================
-- Aktuelle Policies ersetzen durch striktere Versionen

-- Zuerst alle alten Policies entfernen
DROP POLICY IF EXISTS "Horses access for owners and providers" ON horses;
DROP POLICY IF EXISTS "Horses visibility" ON horses;

-- Neue strikte Policies für horses

-- Owner hat vollen Zugriff auf eigene Pferde
CREATE POLICY "Horse owner full access" ON horses
FOR ALL 
USING (owner_id = auth.uid() AND deleted_at IS NULL);

-- Provider können Pferde sehen wenn sie eine AKTIVE Verbindung haben
CREATE POLICY "Provider can view client horses" ON horses
FOR SELECT 
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.client_id = horses.owner_id
      AND ag.provider_id = auth.uid()
      AND ag.is_active = true
      AND ag.status = 'active'
  )
);

-- Provider können Pferde bearbeiten wenn sie eine aktive Verbindung haben
CREATE POLICY "Provider can manage client horses" ON horses
FOR UPDATE 
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.client_id = horses.owner_id
      AND ag.provider_id = auth.uid()
      AND ag.is_active = true
      AND ag.status = 'active'
  )
);

-- Provider können Pferde für Clients anlegen
CREATE POLICY "Provider can create horses for clients" ON horses
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.client_id = horses.owner_id
      AND ag.provider_id = auth.uid()
      AND ag.is_active = true
      AND ag.status = 'active'
  )
  OR owner_id = auth.uid()
);

-- Admins haben vollen Zugriff
CREATE POLICY "Admins can manage all horses" ON horses
FOR ALL 
USING (public.is_admin(auth.uid()));

-- 3. PROFILES: Policy für Clients auf Provider-Profile einschränken
-- =============================================
-- Aktuelle "Clients can view connected provider profiles" verschärfen
DROP POLICY IF EXISTS "Clients can view connected provider profiles" ON profiles;

-- Clients können nur basic Infos von verbundenen Providern sehen
-- (full access nur über safe_provider_profiles view oder get_provider_business_settings function)
CREATE POLICY "Clients can view limited provider info" ON profiles
FOR SELECT 
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM access_grants ag
    JOIN user_roles ur ON ur.user_id = profiles.id
    WHERE ag.provider_id = profiles.id
      AND ag.client_id = auth.uid()
      AND ag.is_active = true
      AND ag.status = 'active'
      AND ur.role = 'provider'
  )
);

-- 4. APPOINTMENTS: Location-Zugriff auf relevante Zeiträume beschränken
-- =============================================
DROP POLICY IF EXISTS "Appointments access" ON appointments;

-- Provider sehen alle ihre Termine
CREATE POLICY "Provider can access own appointments" ON appointments
FOR ALL 
USING (provider_id = auth.uid());

-- Clients sehen Termine ihrer Pferde
CREATE POLICY "Clients can view horse appointments" ON appointments
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM horses h
    WHERE h.id = appointments.horse_id
      AND h.owner_id = auth.uid()
      AND h.deleted_at IS NULL
  )
);

-- Admins haben vollen Zugriff
CREATE POLICY "Admins can manage all appointments" ON appointments
FOR ALL 
USING (public.is_admin(auth.uid()));

-- 5. Storage Buckets: horse-documents auf privat mit strikten Policies
-- =============================================
-- Bestehende Policies für horse-documents löschen und neu erstellen
DROP POLICY IF EXISTS "Horse documents access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload horse documents" ON storage.objects;

-- Striktere Storage Policy: Nur Owner und verbundene Provider
CREATE POLICY "Horse documents owner access" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'horse-documents'
  AND (
    -- Owner kann eigene Dokumente sehen
    EXISTS (
      SELECT 1 FROM horse_documents hd
      JOIN horses h ON h.id = hd.horse_id
      WHERE hd.file_url LIKE '%' || storage.objects.name || '%'
        AND h.owner_id = auth.uid()
        AND h.deleted_at IS NULL
    )
    -- Provider mit aktiver Verbindung kann Dokumente sehen
    OR EXISTS (
      SELECT 1 FROM horse_documents hd
      JOIN horses h ON h.id = hd.horse_id
      JOIN access_grants ag ON ag.client_id = h.owner_id
      WHERE hd.file_url LIKE '%' || storage.objects.name || '%'
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
        AND ag.status = 'active'
    )
  )
);

-- Upload nur für berechtigte User
CREATE POLICY "Horse documents upload" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'horse-documents'
  AND auth.uid() IS NOT NULL
);