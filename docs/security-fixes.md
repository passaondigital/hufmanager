# Security Fixes – 05. März 2026

## Übersicht

Vier kritische Sicherheitslücken und ein Warning aus dem Security-Scan wurden durch eine einzige Migration behoben. Alle Fixes sind DSGVO-konform.

---

## ERROR 1: Profiles – PII-Zugriff verschärft

**Problem:** `profiles`-Tabelle erlaubte über `access_grants`-Verknüpfungen potenziell zu breiten Zugriff auf E-Mails, Telefonnummern und Adressen.

**Fix:**
- Overly-permissive Policy `"Enable all access for users based on id"` entfernt
- Policy `"Verbundene Profile sehen"` entfernt
- Neue strikte Policy `"profiles_strict_connected_select"`: SELECT nur erlaubt für:
  - Eigenes Profil (`auth.uid() = id`)
  - Provider mit aktivem, zeitlich begrenztem `access_grant`
  - Client sieht nur seinen eigenen Provider
  - Mitarbeiter sehen nur ihren Provider und dessen Kunden
- Separate `"Users can update own profile"` Policy für UPDATE

**DSGVO-Bezug:** Art. 5 Abs. 1 lit. f (Integrität und Vertraulichkeit), Art. 25 (Privacy by Design)

---

## ERROR 2: Horses – Medizinische Daten segregiert

**Problem:** Keine Trennung zwischen Basis- und medizinischen Pferdeakten. Partner ohne `can_view_medical` konnten `medical_history`, `health_status` etc. einsehen.

**Fix:**
- View `horses_basic` erstellt (SECURITY INVOKER): nur nicht-medizinische Felder
- View `horses_medical` erstellt (SECURITY INVOKER): nur medizinische Felder (health_status, medical_history, health_issues_general, feeding_notes, special_notes, contacts, documents_urls)
- Partner-Policy `"Partners can view shared horses basic"`: Zugriff nur über `horse_partner_access` mit `is_active = true`
- Medizinische Daten für Partner nur über `horses_medical` View + `can_view_medical = true` in `horse_partner_access`

**DSGVO-Bezug:** Art. 9 (Besondere Kategorien – Gesundheitsdaten analog), Art. 5 Abs. 1 lit. c (Datenminimierung)

---

## ERROR 3: Invoices – Zahlungsinterna geschützt

**Problem:** `payment_external_id` und `payment_link` waren für Clients sichtbar, obwohl nur für Provider relevant.

**Fix:**
- View `invoices_client_view` erstellt (SECURITY INVOKER): ohne `payment_external_id` und `payment_link`
- Bestehende RLS-Policies unverändert (bereits korrekt: Provider sieht nur eigene, Client sieht nur eigene)

**DSGVO-Bezug:** Art. 5 Abs. 1 lit. c (Datenminimierung), Art. 25 (Privacy by Default)

---

## ERROR 4: GPS/Locations – Zeitlich begrenzter Zugriff

**Problem:** Provider konnten GPS-Koordinaten und Adressen von Kunden unbegrenzt lange abrufen, auch nach Ende der Geschäftsbeziehung.

**Fix:**
- `access_grants.valid_until` (TIMESTAMPTZ, nullable) hinzugefügt
- `access_grants.auto_revoke_on_last_appointment` (BOOLEAN, default false) hinzugefügt
- Policy `"provider_view_client_locations_timed"`: prüft `valid_until` – abgelaufene Grants blockieren Zugriff
- Policy `"Provider can view client horses timed"`: ebenfalls zeitlich begrenzt
- **Auto-Revoke Trigger** `trg_auto_revoke_access`: Wenn letzter Termin eines Provider-Client-Paares abgeschlossen wird und `auto_revoke_on_last_appointment = true`, wird `valid_until = NOW() + 90 Tage` gesetzt
- Helper-Funktion `has_active_access_grant()` (SECURITY DEFINER) für einheitliche Prüfung

**DSGVO-Bezug:** Art. 17 (Recht auf Löschung), Art. 5 Abs. 1 lit. e (Speicherbegrenzung), Art. 25 (Privacy by Design)

---

## WARNING: Appointments – Consent-Tracking für Partner

**Problem:** Partner und Mitarbeiter konnten Termindaten ohne Consent-Tracking einsehen.

**Fix:**
- `appointments.data_shared_with_partners` (BOOLEAN, default false) hinzugefügt
- `appointments.data_shared_with_employees` (BOOLEAN, default true) hinzugefügt
- Policy `"Partners can view shared appointments with consent"`: Partner sehen nur Termine mit `data_shared_with_partners = true`
- View `appointments_partner_view` (SECURITY INVOKER): ohne `completion_notes`, `signature_url`, `gait_video_url`, `completion_pdf_url`

**DSGVO-Bezug:** Art. 6 Abs. 1 lit. a (Einwilligung), Art. 7 (Bedingungen für die Einwilligung)

---

## Technische Details

- **Migration:** `supabase/migrations/20260305_security_fixes.sql`
- **Neue Views:** `horses_basic`, `horses_medical`, `invoices_client_view`, `appointments_partner_view`
- **Neue Funktion:** `has_active_access_grant(_provider_id, _client_id)`
- **Neuer Trigger:** `trg_auto_revoke_access` auf `appointments`
- **Alle Views:** mit `security_invoker = on` (keine Privilege Escalation)

---

*Dokumentiert am 05.03.2026 – HufManager Security Team*
