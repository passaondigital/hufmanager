-- Store-Fahrplan Schritt 3C — Punkt 13 (erweitert): "Authenticated select global"
-- war eine RLS-Policy auf storage.objects OHNE bucket_id-Filter (qual = true).
-- Da Postgres RLS mehrere permissive Policies mit OR verknuepft, hebelte diese
-- eine Policy die spezifischen, korrekten Policies JEDES privaten Buckets aus
-- (horse-vault, verification-docs, admin-invoices, partner-documents,
-- legal-documents, ...): jeder eingeloggte Nutzer konnte ALLE Objekte in
-- ALLEN Buckets auflisten/lesen. Live bewiesen: Nicht-Admin-Testnutzer konnte
-- beide Objekte im admin-invoices-Bucket sehen (siehe Session-Log).
-- Kein Feature ist auf diese pauschale Policy angewiesen -- jeder Bucket hat
-- bereits eigene, korrekt gescopte SELECT-Policies. Ausnahme: hufcam-images
-- hatte GAR KEINE eigene SELECT-Policy (nur der Bucket-Flag "public=true"),
-- daher zusaetzlich eine eigentuemer-gescopte Policy fuer authenticated-Listing
-- (der Bucket ist aktuell leer, kein produktiver Schreibpfad im Code gefunden --
-- Bucket-public-Flag selbst bewusst NICHT angetastet, siehe Rueckfrage an Pascal).
DROP POLICY IF EXISTS "Authenticated select global" ON storage.objects;

CREATE POLICY "hufcam_images_owner_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'hufcam-images'
  AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.is_admin(auth.uid()))
);
