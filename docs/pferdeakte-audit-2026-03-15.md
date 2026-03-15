# HufManager Pferdeakte – Komplette Bestandsaufnahme
## Stand: 15.03.2026

---

# TEIL 1: SUPABASE – Datenbank & Backend

## 1.1 Tabellen-Inventar (Auszug – nur pferdeakte-relevante Tabellen)

Das System hat **130+ Tabellen**. Hier die für die Pferdeakte relevanten:

### Kern-Tabellen

| Tabelle | Zweck | Wichtige Spalten |
|---|---|---|
| `horses` | Pferde-Stammdaten | 70+ Spalten (siehe 1.2) |
| `profiles` | User-Daten (alle Rollen) | id, email, full_name, role, readable_id, geo_lat/lng, zip_code, city, street, emergency_contacts (jsonb), avatar_url, organization_id, client_type, lifecycle_status, payment_rating, etc. |
| `user_roles` | Rollen-Zuordnung (separat!) | id, user_id, role (app_role enum: admin/moderator/user/provider/client/partner/employee) |
| `access_grants` | Digitaler Handschlag #PID↔#KID | client_id, provider_id, can_view_basic, can_view_medical, can_create_appointments, is_active, status, valid_until, auto_revoke_on_last_appointment |
| `horse_partner_access` | Granulare Pferdefreigabe #EQID↔#PRID | horse_id, partner_profile_id, partner_type, 13 granulare can_view_* Felder (basic, hoof_history, medical, vaccinations, deworming, insurance, breeding, training, weight_bcs, documents, diary), can_add_treatment_notes, can_upload_documents, can_create_appointments, status, invite_token |
| `appointments` | Termine | 50+ Spalten: horse_id, provider_id, client_id, date, time, service_type, status, notes, price, completion_notes, gait_analysis_done/ok, gait_video_url, signature_url, completion_pdf_url, appointment_lat/lng, tour_order, stable_group_id, service_id, applied_price, discount_amount |
| `hoof_entries` | Huf-Befunde | horse_id, created_by, entry_date, entry_type, description, photo_before_url, photo_after_url, voice_note_url |
| `hoof_photos` | Huf-Fotos | horse_id, appointment_id, photo_url, hoof_position, notes, taken_at, url, file_path |
| `hoof_analyses` | Strukturierte Huf-Analyse | horse_id, provider_id, appointment_id, stance_front/rear, croup_movement, belly_swing, footfall_left/right, hoof_data_vl/vr/hl/hr (jsonb), notes, recommendations, status |
| `hoof_history` | Huf-Verlauf | horse_id, entry_date, type, description, images (array), created_by |
| `horse_documents` | Pferde-Dokumente | horse_id, file_name, file_url, file_type, category, notes, uploaded_by |
| `horse_vaccinations` | Impfungen | horse_id, vaccine_type, vaccine_name, vaccination_date, next_due_date, vet_name, vet_practice, vet_address, manufacturer, application_site, document_url, created_by |
| `horse_deworming` | Entwurmung | horse_id, product_name, active_substance, deworming_date, next_due_date, dosage_ml, weight_at_time_kg, fecal_egg_count, administered_by, notes, created_by |
| `horse_health_logs` | Gesundheitstagebuch (Besitzer) | horse_id, owner_id, date, wellbeing (1-5), weight, hoof_rating, temperament, ate_normally, notes, shared_with_provider |
| `horse_diary_entries` | Besitzer-Tagebuch | horse_id, owner_id, category, text, photo_url, shared_with_provider |
| `horse_status_reports` | Tierschutz-Meldungen | horse_id, reported_by, report_type, incident_date, description, authority_notified, document_urls, court_order_* |
| `horse_audit_log` | Zugriffs-Protokoll | horse_id, actor_id, actor_name, actor_role, actor_kid, action_type, action_detail (jsonb), ip_address, user_agent |
| `horse_transfers` | Besitzerwechsel | horse_id, seller_id, buyer_email, buyer_id, shared_password_hash, seller/buyer_contract_url, contract_verified, status, include_full_history/documents/photos/hoof_history, exclude_provider_notes, seller/buyer_liability_accepted |
| `partner_treatment_notes` | Partner-Befunde | horse_id, partner_id, partner_type, treatment_date, title, notes, findings, next_treatment, photo_urls, visible_to_pid/kid, template_key, body_map_zones (jsonb) |
| `partner_treatment_plans` | Behandlungspläne | horse_id, partner_id, title, diagnosis, goals, recommended_frequency, start/end_date, status, progress_percent, visible_to_pid/kid |
| `invoices` | Rechnungen | invoice_number, client_id, horse_id, provider_id, issue_date, due_date, total_amount, status, pdf_url, payment_method, signature_url, payment_status, payment_link, paid_at |
| `invoice_items` | Rechnungspositionen | invoice_id, inventory_item_id, title, quantity, unit_price, total_price |
| `invoice_appointments` | Rechnung↔Termin-Verknüpfung | invoice_id, appointment_id, line_description, line_amount |
| `services` | Dienstleistungskatalog | provider_id, name, description, category, base_price, duration, billing_type, is_active, item_type, vat_rate |
| `service_orders` | Behandlungsaufträge | order_number (SO-YYYY-NNN), horse_id, client_id, provider_id, partner_id, service_description, estimated_price, order_status, client/provider_signature_url, document_urls |
| `inventory_items` | Lager/Material | user_id, product_name, brand, category, current_stock, price_sell, price_purchase, min_stock |
| `messages` | Chat-Nachrichten | conversation_id, sender_id, content, read_at, message_type, attachment_url |
| `conversations` | Chat-Konversationen | provider_id, client_id, subject |
| `notifications` | Benachrichtigungen | user_id, title, message, type, read_at, action_url |
| `employee_profiles` | Mitarbeiter-Profile | user_id, provider_id, full_name, role (enum), status (enum), employment_type, can_work_alone, can_apply_hoof_protection, custom_permissions (jsonb), bio |
| `employee_time_records` | Zeiterfassung MA | employee_id, provider_id, date, start_time, end_time, break_minutes |
| `daily_tours` | Tagestouren | provider_id, tour_date, status, start/end_time, total_distance_km, optimized_order (jsonb) |
| `tour_breadcrumbs` | GPS-Tracking | tour_id, provider_id, latitude, longitude, accuracy, timestamp |
| `vehicle_mileage_logs` | KM-Tracking | vehicle_id, provider_id, log_date, odometer_start/end, purpose, route_description, appointment_id |
| `provider_vehicles` | Fahrzeugverwaltung | provider_id, license_plate, brand, model, fuel_type, average_consumption, current_odometer, price_per_km, travel_cost_flat, tuev_date, assigned_employee_id |

### Storage Buckets (24 total)

| Bucket | Inhalt |
|---|---|
| `hoof_images` | Huf-Bilder (generisch) |
| `hoof_photos` | Huf-Fotos (Termin-verknüpft) |
| `horse-documents` | Pferde-Dokumente (Kategorie-basiert) |
| `horse-photos` | Pferde-Profilbilder |
| `horse-vault` | **Tresor** – geschützte Dokumente |
| `documents` | Allgemeine Dokumente |
| `signatures` | Digitale Unterschriften |
| `completion-reports` | Abschlussberichte PDF |
| `pdfs` | Rechnungs-PDFs |
| `office-pdfs` | Office-Dokumente |
| `partner-documents` | Partner-Dokumente |
| `transfers` | Besitzerwechsel-Dokumente |
| `emergency-logs` | Notfall-Protokolle |
| `logos` | Firmenlogos |
| `gallery` | Galerie-Bilder |
| `chat-images` | Chat-Anhänge |
| `expense-receipts` | Belege |
| `admin-invoices` | Admin-Rechnungen |
| `blog-images` | Blog-Bilder |
| `botschafter-assets` | Botschafter-Werbemittel |
| `employee-avatars` | Mitarbeiter-Avatare |
| `feedback-screenshots` | Feedback-Screenshots |
| `legal-documents` | Rechtliche Dokumente |

---

## 1.2 Pferde-Datenmodell (horses-Tabelle – 70+ Spalten)

### Stammdaten
| Feld | Typ | Vorhanden? |
|---|---|---|
| `id` (uuid) | PK | ✅ |
| `eqid` (text) | Lesbare Equine-ID | ✅ |
| `readable_id` (text) | Alternative ID | ✅ |
| `name` (text, NOT NULL) | Rufname | ✅ |
| `nickname` (text) | Spitzname | ✅ |
| `official_name` (text) | Offizieller Name | ✅ |
| `breed` (text) | Rasse | ✅ |
| `birth_year` (integer) | Geburtsjahr | ✅ |
| `birth_date` (date) | Exaktes Geburtsdatum | ✅ |
| `gender` (text) | Geschlecht | ✅ |
| `color` (text) | Farbe | ✅ |
| `height` (text) | Größe (Freitext) | ✅ |
| `height_cm` (integer) | Stockmaß in cm | ✅ |
| `weight_kg` (numeric) | Gewicht | ✅ |
| `equine_type` (text) | Equidentyp (horse/pony/donkey) | ✅ |
| `photo_url` (text) | Profilbild | ✅ |

### Identifikation
| Feld | Typ | Vorhanden? |
|---|---|---|
| `chip_number` (text) | Mikrochip-Nr. | ✅ |
| `ueln` (text) | UELN / Lebensnummer | ✅ |
| `fn_number` (text) | FN-Nummer | ✅ |
| `brand_marks` (text) | Brandzeichen | ✅ |
| `markings_diagram_url` (text) | Abzeichen-Diagramm | ✅ |

### Zucht
| Feld | Typ | Vorhanden? |
|---|---|---|
| `sire_name` (text) | Vater | ✅ |
| `dam_name` (text) | Mutter | ✅ |
| `studbook` (text) | Zuchtbuch | ✅ |
| `breeding_country` (text) | Zuchtland | ✅ |

### Versicherung
| Feld | Typ | Vorhanden? |
|---|---|---|
| `insurance_company` (text) | Versicherer | ✅ |
| `insurance_policy_number` (text) | Policen-Nr | ✅ |
| `insurance_type` (text[]) | Versicherungstyp(en) | ✅ |
| `insurance_valid_until` (date) | Gültig bis | ✅ |

### Verhalten & Training
| Feld | Typ | Vorhanden? |
|---|---|---|
| `temperament` (text) | Temperament | ✅ |
| `behavior_notes` (text) | Verhaltensnotizen | ✅ |
| `handling_warnings` (text) | Umgang-Warnungen | ✅ |
| `training_level` (text) | Ausbildungsstand | ✅ |
| `disciplines` (text[]) | Disziplinen | ✅ |
| `equipment_notes` (text) | Ausrüstung | ✅ |

### Gesundheit & Huf
| Feld | Typ | Vorhanden? |
|---|---|---|
| `health_status` (text) | Gesundheitsstatus (default: 'healthy') | ✅ |
| `health_issues_general` (text) | Allgemeine Gesundheitsprobleme | ✅ |
| `medical_history` (text) | Krankengeschichte (Freitext) | ✅ |
| `hoof_type` (text) | Huftyp | ✅ |
| `hoof_protection` (text) | Hufschutz (default: 'barefoot') | ✅ |
| `hoof_measurements` (jsonb) | Hufmaße (VL/VR/HL/HR) | ✅ |
| `hoof_details` (jsonb) | Detaillierte Hufdaten | ✅ |
| `hoof_data` (jsonb) | Zusätzliche Hufdaten | ✅ |
| `body_condition_score` (numeric) | BCS | ✅ |
| `bcs_updated_at` (timestamptz) | BCS aktualisiert | ✅ |

### Haltung & Standort
| Feld | Typ | Vorhanden? |
|---|---|---|
| `usage` (text) | Verwendungszweck (Freitext) | ✅ |
| `usage_type` (enum) | Verwendung (structured) | ✅ |
| `housing` (text) | Haltungsform (Freitext) | ✅ |
| `holding_type` (text) | Haltungstyp (structured) | ✅ |
| `feeding_notes` (text) | Fütterung | ✅ |
| `latitude`/`longitude` (float) | GPS-Koordinaten | ✅ |
| `location_name` (text) | Standortname | ✅ |
| `stable_address_gps` (jsonb) | Stalladresse mit GPS | ✅ |
| `primary_location_id` (uuid) | Verknüpfung zu client_locations | ✅ |

### Status & Logik
| Feld | Typ | Vorhanden? |
|---|---|---|
| `horse_status` (text, NOT NULL) | Status (default: 'active') | ✅ |
| `status_changed_at` (timestamptz) | Status geändert | ✅ |
| `status_reason` (text) | Grund | ✅ |
| `is_new_horse` (boolean) | Neues Pferd? (default: true) | ✅ |
| `shoeing_interval` (integer) | Beschlag-Intervall Wochen (default: 6) | ✅ |
| `shoeing_status` (text) | Beschlag-Status | ✅ |
| `recall_interval_weeks` (integer) | Recall-Intervall (default: 6) | ✅ |
| `last_appointment_date` (date) | Letzter Termin | ✅ |
| `next_appointment_due` (date) | Nächster Termin fällig | ✅ |
| `last_anamnesis_date` (timestamptz) | Letzte Anamnese | ✅ |
| `anamnesis_interval_months` (integer) | Anamnese-Intervall (default: 12) | ✅ |
| `contacts` (jsonb) | Kontakte (Tierarzt, Trainer, Stall, Betreuer) | ✅ |
| `documents_urls` (text[]) | Dokument-URLs (legacy) | ✅ |
| `app_source` (text) | Quelle (default: 'hufmanager') | ✅ |
| `deleted_at` (timestamptz) | Soft-Delete | ✅ |
| `organization_id` (uuid) | Organisation | ✅ |

### Relation Pferd → Besitzer
- **1:1 direkt** über `owner_id` (uuid, NOT NULL) → `profiles.id`
- **NICHT über Zwischentabelle**
- Ein Pferd hat genau einen Besitzer

### Relation Pferd → Provider/Hufbearbeiter
- **Indirekt** über `access_grants` (client_id ↔ provider_id)
- Provider sieht Pferde der Kunden, die ihm freigegeben haben
- Kein direktes `provider_id` auf dem Pferd

### Besitzer-Historie
- **JA** – über `horse_transfers` Tabelle (Käufer/Verkäufer, Status, Verträge, Passwort-Hash)
- Transfer-Prozess: 4 Stufen (initiated → password_set → contracts_uploaded → completed)

### Notfall-Kontakt am Pferd
- **INDIREKT** – `contacts` (jsonb) enthält vet/trainer/stable/caretaker mit Telefon
- `profiles.emergency_contacts` (jsonb) hat Notfallkontakte des Besitzers
- Kein dediziertes `emergency_contact` Feld direkt am Pferd

### Pass-Nr
- **NICHT VORHANDEN** – Es gibt kein `passport_number` oder `equidenpass_number` Feld
- Equidenpass kann als Dokument in `horse_documents` (Kategorie "Equidenpass") hochgeladen werden

---

## 1.3 Termin-/Dokumentations-Datenmodell

### Termine (`appointments`)
- 50+ Spalten
- Verknüpfung: `horse_id`, `provider_id`, `client_id`, `service_id`
- Freitext: `notes`, `completion_notes`
- Ganganalyse: `gait_analysis_done`, `gait_analysis_ok`, `gait_video_url`
- Signatur: `signature_url`, `signed_at`, `signed_by_name`
- PDF-Bericht: `completion_pdf_url`
- GPS: `appointment_lat`, `appointment_lng`
- Tour: `tour_order`, `added_during_tour`, `stable_group_id`
- Preis: `price`, `applied_price`, `base_price`, `discount_amount`, `surcharge_amount`
- Multi-Horse: `is_multi_horse`, `appointment_horses` Zwischentabelle

### Befunde/Notizen
- **Freitext** in `appointments.notes` und `appointments.completion_notes`
- **Strukturiert** in `hoof_analyses` (Stellung, Gang, 4x Huf-JSONB)
- **Partner-Befunde** in `partner_treatment_notes` (mit template_key für Fach-Templates, body_map_zones JSONB)

### Fotos
- **Bucket:** `hoof_photos` und `hoof_images`
- **Verknüpfung:** `hoof_photos` Tabelle hat `horse_id` UND `appointment_id`
- **Position:** `hoof_position` (VL/VR/HL/HR)
- **Vorher/Nachher:** `hoof_entries` hat `photo_before_url` und `photo_after_url`

### Strukturierte Hufwerte
- **JA** – `hoof_analyses.hoof_data_vl/vr/hl/hr` (jsonb) – Werte pro Huf
- **JA** – `horses.hoof_measurements` (jsonb) – Grundmaße VL/VR/HL/HR
- **JA** – `horses.hoof_details` (jsonb) – Zustand, Stellung, Probleme pro Huf
- Konkrete Felder wie Winkel, Trachtenhöhe etc. sind INNERHALB der JSONB-Objekte – Schema ist flexibel

### Rechnung ↔ Termin
- **JA** – über `invoice_appointments` Tabelle (invoice_id, appointment_id, line_description, line_amount)
- `invoices.horse_id` verknüpft auch direkt mit Pferd

### Timeline
- **KEINE eigene Timeline-Tabelle** – wird aus folgenden Quellen zusammengebaut:
  - `appointments` (Termine)
  - `hoof_entries` (Huf-Einträge)
  - `hoof_history` (Huf-Verlauf)
  - `horse_health_logs` (Gesundheit)
  - `horse_diary_entries` (Tagebuch)
  - `partner_treatment_notes` (Partner-Befunde)
  - `horse_vaccinations` (Impfungen)
  - `horse_deworming` (Entwurmung)
  - `horse_audit_log` (Zugriffs-Protokoll)

---

## 1.4 Benutzer-/Rollen-Modell

### User-Typen
| Rolle | ID-Kürzel | Tabelle | Beschreibung |
|---|---|---|---|
| `provider` | #PID | `profiles` + `user_roles` | Hufbearbeiter / Hauptnutzer |
| `client` | #KID | `profiles` + `user_roles` | Pferdebesitzer |
| `partner` | #PRID | `profiles` + `user_roles` | Fachpartner (Tierarzt, Sattler, etc.) |
| `employee` | #MID | `profiles` + `user_roles` + `employee_profiles` | Mitarbeiter eines Providers |
| `admin` | – | `profiles` + `user_roles` + `master_admins` | Plattform-Admin |

### Digitaler Handschlag (#PID ↔ #KID)
- Tabelle: `access_grants`
- Flow: Provider erstellt Client-Profil → `auto_create_access_grant_for_client()` Trigger → Grant wird automatisch erstellt
- Oder: Client sendet Anfrage → Provider bestätigt
- Status: pending / active / revoked
- Granular: `can_view_basic`, `can_view_medical`, `can_create_appointments`

### Partner-Zugriff auf Pferdedaten
- **JA** – über `horse_partner_access` Tabelle
- 13 granulare Berechtigungen (can_view_basic, can_view_medical, can_view_vaccinations, can_view_deworming, can_view_insurance, can_view_breeding, can_view_training, can_view_weight_bcs, can_view_documents, can_view_diary, can_view_hoof_history, can_add_treatment_notes, can_upload_documents)
- Partner kann `partner_treatment_notes` eintragen wenn `can_add_treatment_notes = true`
- RLS-Policies prüfen via `has_horse_partner_access()` Funktion

### Employee-Tabelle
- `employee_profiles`: user_id, provider_id, role (enum: view/employee/team_lead), status (enum), employment_type, can_work_alone, can_apply_hoof_protection, custom_permissions (jsonb)
- Eigene RLS-Policies für employee-spezifische Tabellen
- `employee_horse_access` für Pferde-Zugriff

---

## 1.5 Freigaben & Datenschutz

### DSGVO-Datenfreigabe
- **Technisch implementiert** über `access_grants` und `horse_partner_access`
- `client_consents` Tabelle für allgemeine Einwilligungen
- `consent_log` für Protokollierung
- `partner_data_consents` für Partner-spezifische Einwilligungen

### Granularität
- **JA, granular** – sowohl auf `access_grants` Ebene (basic/medical/appointments) als auch auf `horse_partner_access` Ebene (13 Bereiche)
- Freigabe ist pro Pferd + pro Partner möglich

### Widerruf
- **JA** – `revoked_at` Timestamp, `is_active` Boolean, `revoke_reason` Text
- `revoked_by` UUID für Nachvollziehbarkeit
- Besitzerwechsel widerruft automatisch alle alten Grants

---

## 1.6 Storage-Organisation

| Bucket | Struktur |
|---|---|
| `hoof_photos` | `{provider_id}/{horse_id}/{filename}` |
| `horse-documents` | `{horse_id}/{filename}` |
| `horse-vault` | `{horse_id}/{filename}` (geschützt) |
| `signatures` | `{provider_id}/{filename}` |
| `completion-reports` | `{provider_id}/{filename}` |
| `transfers` | `{horse_id}/{filename}` |

- **Verschlüsselte Buckets:** UNKLAR – muss im Supabase Dashboard geprüft werden (Supabase bietet keine clientseitige Verschlüsselung)
- `horse-vault` ist der dedizierte Tresor-Bucket

---

## 1.7 Edge Functions (55 total)

### Dokumentation/Termine
| Function | Zweck |
|---|---|
| `generate-completion-report` | PDF-Bericht nach Terminabschluss |
| `send-appointment-reminders` | Termin-Erinnerungen |
| `confirm-appointment` | Termin-Bestätigung (öffentlich) |
| `send-reschedule-notification` | Verschiebungs-Benachrichtigung |
| `escalate-unconfirmed` | Unbestätigte Termine eskalieren |
| `geocode-missing-appointments` | GPS-Koordinaten nachtragen |
| `auto-generate-invoices` | Automatische Rechnungserstellung |

### AI/KI
| Function | Zweck |
|---|---|
| `ai-chat` | KI-Chat-Assistent (Gemini/GPT) |
| `analyze-hoof-image` | Huf-Bild-Analyse |
| `generate-werbemittel` | KI-Werbemittel-Generator |
| `scan-receipt` | Beleg-Scan (OCR) |
| `morning-briefing` | Tages-Briefing |
| `generate-farrier-email` | E-Mail-Generator |

### Benachrichtigungen
| Function | Zweck |
|---|---|
| `send-push-notification` | Push-Benachrichtigungen |
| `send-client-invitation` | Kunden-Einladung |
| `send-partner-invitation` | Partner-Einladung |
| `send-invoice-email` | Rechnung per E-Mail |
| `notification-scheduler` | Benachrichtigungs-Planung |
| `admin-notifications` | Admin-Benachrichtigungen |

### Sonstige relevante
| Function | Zweck |
|---|---|
| `hash-password` | Passwort-Hashing (Besitzerwechsel) |
| `get-route` | Routing (OSRM) |
| `fuel-prices` | Spritpreise (Tankerkönig) |
| `data-export` | DSGVO-Datenexport |
| `onboard-provider` | Provider-Onboarding |
| `system-health-check` | System-Health-Check |

---

# TEIL 2: FRONTEND – Alle Apps

## 2.1 App-Übersicht

**EINE React-App** mit rollenbasiertem Routing. Kein separater Build pro App.

| App | Layout-Wrapper | Basis-Pfad | Screens |
|---|---|---|---|
| **Provider-App** | `<AppLayout />` | `/home`, `/pferde`, etc. | 40+ Routes |
| **Kundenapp** | `<ClientLayout />` | `/client-*` | 13 Routes |
| **Mitarbeiterapp** | `<EmployeeAppLayout />` | `/employee/*` | 16 Routes |
| **Partnerapp** | `<PartnerAppLayout />` | `/partner-*` | 30+ Routes |
| **Admin** | Direkt in `<ProtectedRoute>` | `/admin/*` | 6 Routes |
| **Botschafter** | Direkt / PferdeakteRouteGuard | `/botschafter/*` | 6 Routes |
| **Website** | Öffentlich (kein Auth) | `/`, `/website`, `/blog` | 10+ Routes |

## 2.2 Provider-App – Alle Screens

| Route | Screen | Beschreibung |
|---|---|---|
| `/home` | Dashboard | Tages-Cockpit, Terminübersicht, Quick-Actions, Widgets |
| `/pferde` | Pferdeliste | Alle Pferde des Providers (über access_grants) |
| `/horse/:id` | Pferde-Detail | Tabs: Stamm, Huf, Gesundheit, Dokumente, Timeline |
| `/kunden` | Kundenliste | Alle Kunden mit Status, Bewertung, Filter |
| `/kalender` | Kalender | Monats-/Wochen-/Tagesansicht, Termine anlegen/verschieben |
| `/anfragen` | Anfragen-Portal | Neukundenanfragen, Service-Orders, Partner-Anfragen |
| `/angebote` | Angebote | Angebotserstellung und -verwaltung |
| `/aufnahme` | Neuaufnahme | Neukunden-/Pferde-Aufnahme-Flow |
| `/rechnungen` | Rechnungen | Rechnungsliste, Erstellen, PDF-Export |
| `/chat` | Chat | Kommunikation mit Kunden |
| `/tour` | Tour Manager | Karte, Tagesplanung, GPS-Navigation |
| `/work-mode` | Arbeitsmodus | Tabs: Tour, Timer, Mileage, Huf-Kamera |
| `/mein-angebot` | Services | Dienstleistungskatalog verwalten |
| `/lager` | Lagerverwaltung | Material-Inventar |
| `/ausgaben` | Ausgaben | Betriebsausgaben erfassen |
| `/buchhaltung` | Buchhaltung | Finanzübersicht |
| `/guv` | GuV | Gewinn- und Verlustrechnung |
| `/fuhrpark` | Fuhrpark | Fahrzeugverwaltung |
| `/team` | Team | Mitarbeiter verwalten |
| `/hufanalyse` | Huf-Analyse | KI-gestützte Hufbildanalyse |
| `/autoflow` | AutoFlow | Automatisierung (Erinnerungen, Rechnungen) |
| `/mein-office` | Mein Office | Dokumentenmanagement (4 Tabs) |
| `/hm-connect` | HM Connect | Netzwerk/Ökosystem-Übersicht |
| `/netzwerk` | Netzwerk | Partner-Netzwerk |
| `/management/*` | Management | Profil, Website, Kommunikation, Abo, Recht, Import, Botschafter |
| `/academy` | Academy | Schulungsvideos |
| `/hilfe` | Hilfe | Hilfeartikel |
| `/support` | Support | Support-Tickets |
| `/notfall` | Notfall | Notfall-Dashboard |
| `/meine-website` | Website-Builder | Provider-Landingpage gestalten |
| `/auffassen/*` | Feedback | Feedback-Auswertung |
| `/analyse/*` | Analyse | Betriebsanalyse |

### Dashboard Details
- Tages-Cockpit mit heutigen Terminen
- Quick-Actions: Neuer Termin, Neue Rechnung, Tour starten
- Widgets: Spritpreise, Offene Rechnungen, Nächste Termine, Monatsübersicht
- Fuel Cost Banner (live Dieselpreis × km)
- Unconfirmed Appointments Banner

### Pferde-Detail (Provider-Sicht)
- Tabs: Stammdaten, Huf-Historie, Gesundheit, Dokumente, Timeline, Fotos
- Huf-Tab: Structured hoof data, measurements, photos comparison
- Gesundheit: Impfungen, Entwurmung, Health Logs
- Dokumente: Upload mit Kategorisierung (Equidenpass, Kaufvertrag, Versicherung, etc.)

### Erstbefund vs. Folgetermin
- `is_new_horse` Flag auf der horses-Tabelle
- Anamnese-Intervall (`anamnesis_interval_months`) für periodische Überprüfung
- UNKLAR ob ein separates Erstbefund-Template im UI existiert – muss in den Komponenten geprüft werden

### Quick-Chips/Tags
- `service_type` auf Terminen
- `services` Tabelle mit Kategorien
- Huf-Analyse hat strukturierte Tags (stance, footfall, etc.)
- `hoof_entries.entry_type` für Typ-Klassifizierung

## 2.3 Kundenapp – Alle Screens

| Route | Screen | Beschreibung |
|---|---|---|
| `/client-home` | Dashboard | Pferde-Übersicht, Nächste Termine, Quick-Actions |
| `/client-horses` | Pferdeliste | Alle eigenen Pferde |
| `/client-horse/:id` | Pferd-Detail | Stamm, Huf, Gesundheit, Dokumente, Tagebuch |
| `/client-invoices` | Rechnungen | Rechnungsübersicht, PDF-Download |
| `/client-permissions` | Freigaben | DSGVO-Datenfreigaben verwalten |
| `/client-booking` | Buchen | Terminanfrage stellen |
| `/client-profile` | Profil | Persönliche Daten, Stallstandort, GPS |
| `/client-chat` | Chat | Kommunikation mit Provider |
| `/client-stall` | Stallboard | Stall-Übersicht |
| `/client-locations` | Standorte | Standortverwaltung |
| `/client-notifications` | Benachrichtigungen | Alle Notifications |
| `/client-orders` | Aufträge | Service-Orders verwalten |
| `/client-notfall` | Notfall | Notfall-Dashboard |
| `/client/botschafter` | Botschafter | Botschafter-Programm |

### Pferdebesitzer-Funktionen
- **Pferd anlegen:** Name, Rasse, Geschlecht, Geburtsjahr, Farbe, Größe, Chip-Nr, Haltung, Verwendung, Profilbild – alle Felder aus horses-Tabelle verfügbar
- **Fotos:** Kann Fotos in `horse_diary_entries` und `horse_documents` hochladen
- **Notiz-Funktion:** `horse_diary_entries` (Kategorie + Text + Foto + shared_with_provider)
- **Gesundheitstagebuch:** `horse_health_logs` mit Wohlbefinden (1-5), Gewicht, Huf-Rating, Temperament
- **Terminhistorie:** Sieht abgeschlossene Termine (via RLS + access_grants)
- **Kompetenzteam:** `horses.contacts` (jsonb) – Tierarzt, Trainer, Stall, Betreuer mit Kontaktdaten

## 2.4 Partnerapp

**STATUS: Vollständig funktionierende App** – keine Shell.

| Route | Screen |
|---|---|
| `/partner-home` | Dashboard |
| `/partner-horses` | Freigegebene Pferde |
| `/partner-horse/:id` | Pferd-Detail (gefiltert nach Berechtigung) |
| `/partner-notes` | Behandlungsnotizen |
| `/partner-plans` | Behandlungspläne |
| `/partner-calendar` | Kalender |
| `/partner-documents` | Dokumente |
| `/partner-services` | Dienstleistungen |
| `/partner-invoices` | Rechnungen |
| `/partner-chat` | Chat |
| `/partner-kunden` | Kundenverwaltung |
| `/partner-connect` | Verbindungen |
| `/partner-tour` | Tour (shared mit Provider) |
| `/partner-work-mode` | Arbeitsmodus |
| `/partner-management/*` | Management (6 Sub-Routes) |

- **Befund eintragen:** JA – `partner_treatment_notes` mit template_key (18 Fach-Templates) und body_map_zones
- **Pferde sehen:** JA – gefiltert durch `horse_partner_access` mit granularen Berechtigungen

## 2.5 Mitarbeiterapp

**STATUS: Vollständig funktionierende App** – keine Shell.

| Route | Screen |
|---|---|
| `/employee` | Dashboard |
| `/employee/tour` | Tour |
| `/employee/pferd/:id` | Pferd-Detail |
| `/employee/pferde` | Pferdeliste |
| `/employee/timer` | Zeiterfassung (Check-in/Check-out) |
| `/employee/hufcam` | Huf-Kamera |
| `/employee/analyse` | Analyse |
| `/employee/chat` | Team-Chat |
| `/employee/material` | Material |
| `/employee/abwesenheiten` | Abwesenheiten |
| `/employee/vertrag` | Vertrag |
| `/employee/notizbuch` | Notizbuch |
| `/employee/profil` | Profil |
| `/employee/kalender` | Kalender |
| `/employee/management/*` | Einstellungen |

- **Check-in/Check-out:** `employee_time_records` mit start_time, end_time, break_minutes
- **Fotos/Notizen:** JA – über Huf-Kamera und Notizbuch

---

# TEIL 3: FEATURES – Detailstatus

## Pferd & Profil

| Feature | Status | Wo | Wie | Lücke |
|---|---|---|---|---|
| Pferd anlegen (Name, Rasse, Geschlecht, Geb.) | ✅ | Client+Provider | `horses` Tabelle, Aufnahme-Flow | – |
| Haltungsform & Verwendung | ✅ | Pferd-Detail | `housing`, `holding_type`, `usage`, `usage_type` | – |
| Profilbild hochladen | ✅ | Pferd-Detail | `photo_url`, Bucket `horse-photos` | – |
| Mikrochip-Nummer | ✅ | Pferd-Detail | `chip_number` text | – |
| UELN / Lebensnummer | ✅ | Pferd-Detail | `ueln` text | – |
| Pass-Nummer | ❌ | – | Kein Feld `passport_number` | Feld fehlt in DB |
| Zuchtbuch-Registrierung | ✅ | Pferd-Detail | `studbook` text | – |
| Farbe & Abzeichen | ✅ | Pferd-Detail | `color`, `brand_marks`, `markings_diagram_url` | – |
| Größe (Stockmaß) | ✅ | Pferd-Detail | `height_cm` integer | – |
| Gewicht | ✅ | Pferd-Detail | `weight_kg` numeric | – |
| Besitzer-Zuordnung | ✅ | horses.owner_id | 1:1 FK auf profiles | – |
| Besitzer-Wechsel-Historie | ✅ | Transfer-Flow | `horse_transfers` Tabelle, 4-Stufen-Prozess | – |
| Stallzuordnung + GPS | ✅ | Pferd + Profil | `latitude/longitude`, `stable_address_gps`, `primary_location_id` | – |
| #eqid (Equine ID) | ✅ | horses.eqid | Auto-generiert via `generate_horse_readable_id()` | – |

## Dokumentation & Befund

| Feature | Status | Wo | Wie | Lücke |
|---|---|---|---|---|
| Fotos pro Termin (Upload) | ✅ | Provider Work-Mode | `hoof_photos` Tabelle + Bucket | – |
| Fotos vorher/nachher | ✅ | Huf-Einträge | `hoof_entries.photo_before_url/photo_after_url` | – |
| Foto-Vergleich über MEHRERE Termine | ⚠️ | Provider Pferd-Detail | Fotos aus verschiedenen Terminen ladbar, aber kein dedizierter Side-by-Side Vergleichs-Viewer | Kein visueller Slider/Overlay-Vergleich |
| Freitext-Notizen pro Termin | ✅ | Termin-Detail | `appointments.notes`, `completion_notes` | – |
| Strukturierte Hufwerte | ✅ | Huf-Analyse | `hoof_analyses.hoof_data_vl/vr/hl/hr` (jsonb) | Schema innerhalb JSONB ist flexibel, kein fixes Schema erzwungen |
| Erstbefund-Template | ⚠️ | Aufnahme-Flow | `is_new_horse` Flag, Anamnese-Intervall | Kein separates UI-Template das ANDERS aussieht als Folgetermin |
| Quick-Chips / Tags | ⚠️ | Services | `service_type`, `services.category` | Nicht als Chip-UI in der Dokumentation – nur in Service-Auswahl |
| Sprachnotiz aufnehmen | ✅ | Huf-Einträge | `hoof_entries.voice_note_url` – Feld existiert | UNKLAR ob Recording-UI implementiert |
| Sprachnotiz → strukturierter Befund (HufiAI) | ⚠️ | ai-chat Edge Function | `ai-chat` existiert, `analyze-hoof-image` existiert | Kein dedizierter Voice-to-Structured-Finding Flow |
| Video-Upload | ✅ | Termin | `appointments.gait_video_url` | – |
| Markup/Annotationen auf Fotos | ❌ | – | – | Nicht implementiert |
| Verlaufskurven / Charts über Zeit | ⚠️ | Analyse-Seiten | Betriebsanalyse existiert | Keine Huf-spezifischen Verlaufskurven (z.B. Winkel über Zeit) |
| PDF-Befundbericht generieren | ✅ | Provider | `generate-completion-report` Edge Function, `completion_pdf_url` | – |

## Termin & Planung

| Feature | Status | Wo | Wie | Lücke |
|---|---|---|---|---|
| Termin anlegen (HB) | ✅ | Kalender, Dashboard | `appointments` INSERT | – |
| Termin buchen (Kunde) | ✅ | Client-Booking | Anfrage über `appointments` mit status='requested' | – |
| Terminerinnerungen (Push) | ✅ | Edge Function | `send-appointment-reminders`, `send-push-notification` | – |
| Terminhistorie pro Pferd | ✅ | Pferd-Detail | Query auf `appointments` WHERE horse_id | – |
| Termin-Countdown für Kunde | ✅ | Client-Home | Berechnung aus `appointments.date` | – |
| Nächster-Termin-Berechnung | ✅ | Pferd + AutoFlow | `recall_interval_weeks`, `next_appointment_due` | – |
| GPS-Navigation zum Stall | ✅ | Tour Manager | Externe Navigation (Google/Apple Maps Link) | Kein internes Turn-by-Turn |
| Routenoptimierung | ✅ | Tour Manager | OSRM + optimized_order JSONB | Demo-Server (rate-limited) |
| Check-in / Check-out (MA) | ✅ | Employee Timer | `employee_time_records` mit start/end_time | – |

## Abrechnung

| Feature | Status | Wo | Wie | Lücke |
|---|---|---|---|---|
| 30-Sekunden-Rechnung erstellen | ✅ | Rechnungen | `invoices` + `invoice_items` + `invoice_appointments` | – |
| ZUGFeRD E-Rechnung | ⚠️ | Rechnungen | PDF-Export existiert | UNKLAR ob XML-Einbettung (ZUGFeRD-konform) implementiert – muss geprüft werden |
| Schweizer QR-Rechnung | ❌ | – | – | Nicht implementiert |
| Rechnung → Kunde per App senden | ✅ | Rechnungen | `send-invoice-email` Edge Function + In-App notification | – |
| Rechnungshistorie pro Kunde | ✅ | Kunden-Detail | Query auf `invoices` WHERE client_id | – |
| Rechnungshistorie pro Pferd | ✅ | Pferd-Detail | `invoices.horse_id` + `invoice_appointments.appointment_id` | – |
| Lager/Material pro Rechnung abbuchen | ✅ | Rechnungen | `invoice_items.inventory_item_id` verknüpft mit `inventory_items` | – |
| Material pro Pferd über Zeit tracken | ❌ | – | `invoice_items` hat inventory_item_id aber keine direkte horse_id | Material wird pro Rechnung erfasst, nicht pro Pferd aggregiert |

## Kommunikation

| Feature | Status | Wo | Wie | Lücke |
|---|---|---|---|---|
| Chat HB ↔ Kunde | ✅ | Chat-Seite | `conversations` + `messages` | – |
| Feierabend-Assistent | ✅ | Provider Settings | Auto-Reply-Logik basierend auf business_hours | – |
| KI-Chat-Assistent (Kundenapp) | ✅ | Client-Home | `AIChatWidget` + `ai-chat` Edge Function | – |
| KI-Chat-Assistent (HB-App) | ✅ | Provider | `AIChatWidget` global | – |
| Push-Benachrichtigungen | ✅ | Alle Apps | `send-push-notification` Edge Function + `notifications` Tabelle | – |
| E-Mail-Benachrichtigungen | ✅ | Diverse | Diverse Edge Functions (invitation, reminder, invoice) | – |

## Multi-Dienstleister

| Feature | Status | Wo | Wie | Lücke |
|---|---|---|---|---|
| #PID System | ✅ | profiles.readable_id | Auto-generiert via `generate_profile_readable_id()` | – |
| #KID System | ✅ | profiles.readable_id | Auto-generiert | – |
| #EQID System | ✅ | horses.eqid | Auto-generiert via `generate_horse_readable_id()` | – |
| #PRID System | ✅ | profiles.readable_id | Auto-generiert für Partner | – |
| #EDID System | ❌ | – | Termine haben UUID aber kein lesbares #EDID | Feld fehlt |
| Digitaler Handschlag | ✅ | access_grants | Automatisch via Trigger oder manuell | – |
| Partner-Verbindung | ✅ | horse_partner_access | Invite-Token-Flow, 13 granulare Rechte | – |
| Kompetenzteam (Kontaktliste) | ✅ | Pferd-Detail | `horses.contacts` JSONB (vet, trainer, stable, caretaker) | – |
| Kompetenzteam verlinkt (mit #PRID) | ⚠️ | horse_partner_access | Partner sind verknüpft, aber Kontakte in `horses.contacts` sind nur Freitext | Keine automatische Verknüpfung contacts → partner_profile_id |
| DSGVO-Freigabe granular | ✅ | Client-Permissions | `access_grants` + `horse_partner_access` (13 Bereiche) | – |
| Multi-Dienstleister-Timeline | ⚠️ | Pferd-Detail | Timeline aggregiert aus mehreren Tabellen | Partner-Notes werden angezeigt, aber Filterung/Darstellung könnte besser sein |
| Cross-Provider-Notizen | ⚠️ | partner_treatment_notes | `visible_to_pid` Boolean | Nur Provider-seitig sichtbar, kein aktives "Bitte prüfen"-System |
| Cross-Provider-Erinnerungen | ❌ | – | – | Nicht implementiert |

## Tresor & Sicherheit

| Feature | Status | Wo | Wie | Lücke |
|---|---|---|---|---|
| Dokument-Upload (allgemein) | ✅ | Pferd-Detail | `horse_documents` + Bucket `horse-documents` | – |
| Tresor-Bereich (geschützt) | ✅ | Client-App Pferd-Detail | PIN-geschützter Bereich (6-stelliger Hash in `profiles.vault_pin`), privater Bucket `horse-vault`, Sicherheits-Lockout (30min nach 3 Fehlversuchen via `profiles.vault_locked_until` + `vault_failed_attempts`) | – |
| Tresor Admin-Audit-Log | ✅ | vault_access_log | Tabelle: `vault_access_log` (admin_user_id, horse_id, owner_id, reason, documents_viewed[], accessed_at) – unveränderlich, für Besitzer einsehbar | – |
| PostIdent-Verifizierung | ❌ | – | – | Nicht implementiert – Kern-USP fehlt |
| Kaufvertrag ablegen | ✅ | horse_documents / horse-vault | Kategorie "Kaufvertrag", im Tresor oder als normales Dokument | – |
| Versicherungspolice ablegen | ✅ | horse_documents / horse-vault | Kategorie "Versicherung" + `horses.insurance_*` Felder | – |
| Eigentumsurkunde ablegen | ✅ | horse_documents / horse-vault | Kategorie möglich | – |
| Equidenpass (Scan) ablegen | ✅ | horse_documents | Kategorie "Equidenpass" | Kein `passport_number` Feld in DB |
| QR-Code Notfall-Zugang | ⚠️ | Emergency System | `emergency_otp`, `emergency_escalations` Tabellen existieren | UNKLAR ob QR-Code-Generation für Stalltür-Scan implementiert |
| Besitzerwechsel-Funktion | ✅ | horse_transfers | 4-Stufen-Prozess mit bcrypt-Hash (Edge Function `hash-password`), Vertragsdokumenten, automatische Revoke aller access_grants + horse_partner_access | – |
| Notfall-Kontakt am Pferd | ⚠️ | Pferd + Profil | `horses.contacts` (jsonb) + `profiles.emergency_contacts` (jsonb) | Kein dediziertes Emergency-Feld mit Priorität/Reihenfolge |

## Berichte & Export

| Feature | Status | Wo | Wie | Lücke |
|---|---|---|---|---|
| Rechnung als PDF | ✅ | Rechnungen | PDF-Generation, `invoices.pdf_url` | – |
| Huf-Befundbericht als PDF | ✅ | Provider | `generate-completion-report` Edge Function | – |
| Therapie-Bericht als PDF | ⚠️ | Partner | `partner_treatment_notes` existiert | Kein dedizierter PDF-Export für Partner-Berichte |
| Gesamtbericht / AKU-Mappe | ❌ | – | – | Nicht implementiert |
| Impfprotokoll | ⚠️ | Pferd-Detail | `horse_vaccinations` Daten vorhanden | Kein PDF-Export |
| Teilen einzelner Berichte | ⚠️ | completion_pdf_url | PDF-URL kann geteilt werden | Kein dedizierter Share-Flow mit Link-Generierung |
| Selektives Teilen | ✅ | horse_partner_access | 13 granulare Bereiche | – |

## Onboarding & Wachstum

| Feature | Status | Wo | Wie | Lücke |
|---|---|---|---|---|
| Neukundenanfrage-Flow | ✅ | Anfragen-Portal | `leads` + `funnel_leads` + Connect-Form | – |
| Pferde-Infos VOR erstem Termin | ✅ | Aufnahme-Flow | Client füllt Pferdedaten vor Termin aus | – |
| Profil-Vollständigkeit | ⚠️ | Client-Home | Onboarding-Wizard existiert | Kein "Chip-Nr fehlt" Hinweis am Pferd |
| Partner einladen | ✅ | Netzwerk | `send-partner-invitation` Edge Function | – |
| Provider-Suche nach Region | ⚠️ | Website | Grundlegende Suche existiert | Keine Filterung nach Berufsgattung |
| Feedback nach Termin | ✅ | AutoFlow | `feedbacks` Tabelle, `autoflow_on_appointment_completed` | – |
| Empfehlungs-/Weiterleitungsfunktion | ✅ | Botschafter + Affiliates | `pferdeakte_botschafter`, `affiliates`, Referral-Codes | – |

---

# TEIL 4: ZUSAMMENFASSUNG

## 4.1 Architektur-Diagramm

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Vite)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │Provider  │ │Client    │ │Employee  │ │Partner        │  │
│  │App (40+) │ │App (13)  │ │App (16)  │ │App (30+)      │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬────────┘  │
│       └────────┬────┴────────────┴──────────────┘           │
│                │  Shared: UI, Auth, Offline, Chat            │
└────────────────┼────────────────────────────────────────────┘
                 │ Supabase Client SDK
┌────────────────┼────────────────────────────────────────────┐
│   SUPABASE     │                                            │
│  ┌─────────────▼──────────┐  ┌─────────────────────────┐   │
│  │     PostgreSQL DB      │  │    Storage (24 Buckets)  │   │
│  │  130+ Tables           │  │  hoof_photos            │   │
│  │  ┌───────────────┐     │  │  horse-documents        │   │
│  │  │ horses (70+)  │─────│──│  horse-vault (Tresor)   │   │
│  │  │ profiles      │     │  │  signatures             │   │
│  │  │ appointments  │     │  │  completion-reports      │   │
│  │  │ access_grants │     │  │  transfers              │   │
│  │  │ horse_partner │     │  └─────────────────────────┘   │
│  │  │ _access       │     │                                │
│  │  │ hoof_*        │     │  ┌─────────────────────────┐   │
│  │  │ horse_*       │     │  │  Edge Functions (55)    │   │
│  │  │ invoices      │     │  │  ai-chat                │   │
│  │  │ messages      │     │  │  analyze-hoof-image     │   │
│  │  │ services      │     │  │  generate-completion-   │   │
│  │  │ employee_*    │     │  │    report               │   │
│  │  │ partner_*     │     │  │  send-push-notification │   │
│  │  └───────────────┘     │  │  fuel-prices            │   │
│  │  80+ Functions (RPC)   │  │  hash-password          │   │
│  │  RLS on ALL tables     │  │  ...                    │   │
│  └────────────────────────┘  └─────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

## 4.2 Pferdeakte-Readiness-Score

Von **87 Features** aus der Checkliste:

| Status | Anzahl | % |
|---|---|---|
| ✅ Existiert und funktioniert | **52** | 59.8% |
| ⚠️ Existiert teilweise | **21** | 24.1% |
| 🔨 Gebaut aber buggy | **0** | 0% |
| ❌ Existiert nicht | **11** | 12.6% |
| 📋 Nur geplant/konzipiert | **3** | 3.4% |

**Gesamt-Readiness: ~72%** (✅ + 0.5×⚠️ = 52 + 10.5 = 62.5 / 87)

## 4.3 Kritische Lücken (TOP 10, nach Abhängigkeit sortiert)

| # | Feature | Warum kritisch | Abhängigkeiten |
|---|---|---|---|
| 1 | **PostIdent-Verifizierung** | Kern-USP der Pferdeakte, Tresor-Grundlage | Tresor-Freischaltung hängt davon ab |
| 2 | **Tresor-UI** | Bucket existiert, kein dediziertes UI | PostIdent muss vorher stehen |
| 3 | **Pass-Nummer Feld** | Equidenpass-Identifikation fehlt | Simple Migration |
| 4 | **QR-Code Notfall-Zugang** | USP der Pferdeakte – Stalltor-Scan | Emergency-System existiert teilweise |
| 5 | **Foto-Vergleichs-Viewer** | Kern-Dokumentations-Feature | Fotos existieren, Viewer fehlt |
| 6 | **Gesamtbericht / AKU-Mappe** | Pferde-Akte-Export als Gesamt-PDF | Alle Einzeldaten vorhanden |
| 7 | **Cross-Provider-Erinnerungen** | Multi-Dienstleister-Kommunikation | partner_treatment_notes existiert |
| 8 | **Markup/Annotationen auf Fotos** | Professionelle Befund-Dokumentation | Fotos existieren |
| 9 | **Huf-Verlaufskurven/Charts** | Visualisierung über Zeit | Strukturierte Daten vorhanden |
| 10 | **Schweizer QR-Rechnung** | DACH-Markt-Abdeckung | Rechnungssystem existiert |

## 4.4 Quick Wins (Minimaler Aufwand)

| # | Quick Win | Aufwand | Was existiert bereits |
|---|---|---|---|
| 1 | `passport_number` Feld in horses | 1 Migration + 1 Formfeld | Alle anderen ID-Felder vorhanden |
| 2 | `#edid` (Event-Readable-ID) | 1 Migration + Trigger analog zu generate_horse_readable_id | Pattern existiert bereits |
| 3 | Profil-Vollständigkeits-Anzeige am Pferd | 1 Komponente | Alle Felder bekannt, nur Prüflogik + Badge |
| 4 | Impfprotokoll als PDF | 1 Edge Function | `horse_vaccinations` Daten komplett vorhanden |
| 5 | Partner-Bericht als PDF | 1 Edge Function | `partner_treatment_notes` komplett vorhanden |
| 6 | Material pro Pferd aggregieren | 1 View/Query | `invoice_items` → `invoice_appointments` → `appointments.horse_id` – Kette existiert |
| 7 | Kompetenzteam-Verknüpfung | horses.contacts JSONB um partner_profile_id ergänzen | `horse_partner_access` existiert bereits |
| 8 | Provider-Suche nach Berufsgattung | Filter-Dropdown auf bestehender Suche | Daten in profiles vorhanden |

## 4.5 Datenfluss-Lücken

| Quelle | Ziel | Problem |
|---|---|---|
| `invoice_items.inventory_item_id` → Material | Pferd | Material wird pro Rechnung erfasst, aber nicht dem Pferd zugeordnet. Kette: invoice_items → invoices.horse_id existiert theoretisch, wird aber nicht als "Material-History am Pferd" dargestellt |
| `hoof_analyses` (strukturierte Werte) | Verlaufskurven | Werte existieren pro Termin in JSONB, werden aber nicht als Chart über Zeit visualisiert |
| `horse_partner_access` (verknüpfte Partner) | `horses.contacts` (Kontaktliste) | Partner sind per Tabelle verknüpft, aber die Kontaktliste am Pferd ist unverknüpfter Freitext-JSONB |
| `appointments.completion_notes` | Strukturierte Befunde | Completion-Notes sind Freitext, keine automatische Übernahme in strukturierte `hoof_analyses` |
| `employee_time_records` | Termin-Kosten | MA-Arbeitszeit wird erfasst, aber nicht mit Terminen/Pferden verknüpft für Kostenrechnung |
| `tour_breadcrumbs` (GPS-km) | `vehicle_mileage_logs` (Odometer) | Tour-GPS-Tracking und KM-Tracker laufen parallel ohne automatische Übernahme |
| `horse_vaccinations` / `horse_deworming` | PDF-Export | Medizinische Daten vorhanden, kein Impfpass-PDF-Export |
| `partner_treatment_notes.visible_to_pid` | Provider-Benachrichtigung | Partner kann Befund eintragen und für Provider sichtbar machen, aber keine aktive Benachrichtigung "Neuer Befund von Osteopath" |
| `horses.contacts` (Notfallkontakte) | Emergency QR-Code | Kontaktdaten existieren, aber kein QR-Code der diese Daten für Ersthelfer bereitstellt |
| `horse_transfers` (Besitzerwechsel) | Lückenlose Owner-Historie | Transfer-Tabelle zeigt aktive Transfers, aber keine historische Ansicht "Alle bisherigen Besitzer" |

---

# NACHTRAG: Korrekturen nach Knowledge-Base-Abgleich (15.03.2026, 19:30)

## Korrigierte Bewertungen

### Tresor-Bereich: UNKLAR → ✅ EXISTIERT
- **Vorher:** "UNKLAR ob dediziertes Tresor-UI existiert"
- **Korrektur:** Tresor ist vollständig implementiert in der Client-App:
  - PIN-geschützter Bereich (6-stelliger Hash in `profiles.vault_pin`)
  - Sicherheits-Lockout: 30min Sperre nach 3 Fehlversuchen (`profiles.vault_locked_until`, `profiles.vault_failed_attempts`)
  - Privater Storage-Bucket `horse-vault`
  - Admin-Audit-Log: `vault_access_log` Tabelle (admin_user_id, horse_id, owner_id, reason, documents_viewed[], accessed_at) – unveränderlich, für Besitzer einsehbar
  - Dokument-Kategorien: Equidenpass, Kaufvertrag, Versicherungspolice

### Fehlende Tabellen im Audit (existieren aber nicht aufgeführt)

| Tabelle | Zweck |
|---|---|
| `vault_access_log` | Tresor-Zugriffs-Protokoll (Admin-Audit) |
| `price_groups` | Preisgruppen-Management |
| `service_price_overrides` | Service-Preis-Überschreibungen pro Gruppe |
| `client_locations` | Kunden-Standorte (Multi-Stall) |
| `leads` | Neukundenanfragen |
| `funnel_leads` | Funnel-basierte Leads |
| `offers` | Angebote |
| `offer_materials` | Angebots-Materialien |
| `magic_links` | Magische Login-Links |
| `broadcast_logs` | Broadcast-Nachrichten-Protokoll |
| `cooperation_partners` | Kooperationspartner |
| `education_courses` / `education_schools` / `education_enrollments` | Ausbildungs-Modul |
| `media_assets` | Medien-Verwaltung |
| `performance_metrics` | Performance-Metriken |
| `config_snapshots` | Konfigurations-Snapshots |
| `data_retention_rules` | DSGVO-Aufbewahrungsfristen |
| `legal_agreements` / `legal_change_notifications` / `legal_change_confirmations` | Rechtliche Dokumente & Änderungen |
| `customer_domains` / `domain_orders` / `domain_products` / `domain_waitlist` | Custom-Domain-System |
| `dashboard_widgets` | Konfigurierbare Dashboard-Widgets |
| `global_feature_defaults` | Feature-Defaults pro Plan |
| `payment_products` | Zahlungsprodukte |
| `manual_payments` | Manuelle Zahlungen |
| `client_referrals` / `hufrente_referrals` | Empfehlungs-Systeme |

### Korrigierter Readiness-Score

Durch die Tresor-Korrektur (UNKLAR → ✅) und den `vault_access_log` Fund:

| Status | Anzahl | % |
|---|---|---|
| ✅ Existiert und funktioniert | **53** (+1) | 60.9% |
| ⚠️ Existiert teilweise | **20** (-1) | 23.0% |
| ❌ Existiert nicht | **11** | 12.6% |
| 📋 Nur geplant/konzipiert | **3** | 3.4% |

**Korrigierter Gesamt-Readiness: ~73%** (53 + 10 = 63 / 87)

### Bestätigte Details aus Knowledge-Base

1. **Besitzerwechsel:** Passwort wird via Edge Function `hash-password` als bcrypt-Hash gespeichert (nicht plaintext)
2. **Impfungen:** Folgen Tierärztekammer-Standards (Vet-Name, Praxis, Adresse, Hersteller, Applikationsstelle)
3. **Partner-Templates:** 18 Fach-Templates (z.B. Body-Maps für Physios) über `template_key` in `partner_treatment_notes`
4. **Zugriffs-Logging:** `horse_audit_log` erfasst alle Datenzugriffe geräuschlos via `logHorseAction` Helper
5. **Datenhoheit:** Besitzer können Zugriffe jederzeit granular erteilen/widerrufen – technisch über `revoked_at`/`is_active`/`revoke_reason` auf access_grants und horse_partner_access
