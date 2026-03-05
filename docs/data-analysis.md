# Datenanalyse – Vollständige Entitätserfassung

**Stand: 05. März 2026**
**Quelle: `src/integrations/supabase/types.ts` (generiert aus Supabase Schema)**

> ✅ = vorhanden in DB | ❌ = fehlt / nicht vorhanden | ⚠️ = teilweise / veraltet

---

## 1. PROVIDER (Hufbearbeiter / mobiler Profi)

### Tabelle: `profiles` (gemeinsam für alle Rollen)

Es gibt **keine separate `provider_profiles`-Tabelle**. Alle Rollen teilen sich die `profiles`-Tabelle. Rollenunterscheidung über `user_roles`.

#### Stammdaten
| Feld | Typ | Status |
|---|---|---|
| `id` | uuid (PK) | ✅ |
| `email` | text | ✅ |
| `full_name` | text | ✅ |
| `first_name` | text | ✅ |
| `last_name` | text | ✅ |
| `phone` | text | ✅ |
| `phone_landline` | text | ✅ |
| `phone_mobile` | text | ✅ |
| `mobile` | text | ✅ (Duplikat zu phone_mobile!) |
| `avatar_url` | text | ✅ |
| `image_url` | text | ✅ (Duplikat zu avatar_url!) |
| `logo_url` | text | ✅ |
| `website` | text | ✅ |

#### Adresse
| Feld | Typ | Status |
|---|---|---|
| `address` | text | ✅ |
| `street` | text | ✅ |
| `house_number` | text | ✅ |
| `zip_code` | text | ✅ |
| `city` | text | ✅ |
| `state` | text | ✅ |
| `country` | text | ✅ |

#### GPS
| Feld | Typ | Status |
|---|---|---|
| `latitude` | float | ✅ |
| `longitude` | float | ✅ |
| `geo_lat` | float | ✅ (Duplikat!) |
| `geo_lng` | float | ✅ (Duplikat!) |
| `location_name` | text | ✅ |

#### Stall-Adresse (für Clients)
| Feld | Typ | Status |
|---|---|---|
| `stable_street` | text | ✅ |
| `stable_zip` | text | ✅ |
| `stable_city` | text | ✅ |
| `stable_latitude` | float | ✅ |
| `stable_longitude` | float | ✅ |

#### Business / Provider-spezifisch
| Feld | Typ | Status |
|---|---|---|
| `business_name` | text | ✅ |
| `company_name` | text | ✅ (Duplikat zu business_name!) |
| `owner_name` | text | ✅ |
| `business_hours` | json | ✅ |
| `cancellation_policy` | text | ✅ |
| `currency` | text | ✅ |
| `preferred_currency` | text | ✅ |

#### Steuer & Finanzen
| Feld | Typ | Status |
|---|---|---|
| `tax_id` | text | ✅ |
| `tax_number` | text | ✅ |
| `tax_model` | text | ✅ |
| `vat_number` | text | ✅ |
| `iban` | text | ✅ |
| `bank_name` | text | ✅ |
| `bic` | text | ✅ |

#### Rechnungen
| Feld | Typ | Status |
|---|---|---|
| `invoice_footer` | text | ✅ |
| `invoice_notes_default` | text | ✅ |
| `digital_signature_url` | text | ✅ |

#### Fahrzeug (Legacy, direkt auf Profile)
| Feld | Typ | Status |
|---|---|---|
| `vehicle_name` | text | ✅ |
| `vehicle_plate` | text | ✅ |
| `vehicle_consumption_per_100km` | float | ✅ |

#### Subscription / Plan
| Feld | Typ | Status |
|---|---|---|
| `subscription_plan` | text | ✅ |
| `subscription_status` | text | ✅ |
| `plan_override` | text | ✅ |
| `copecart_subscription_id` | text | ✅ |
| `access_valid_until` | timestamp | ✅ |

#### Client-spezifisch (auch auf profiles!)
| Feld | Typ | Status |
|---|---|---|
| `client_type` | enum (private/commercial) | ✅ |
| `client_status` | text | ✅ |
| `lifecycle_status` | enum (new/active/archive) | ✅ |
| `payment_rating` | text | ✅ |
| `reliability_score` | float | ✅ |
| `order_authorization` | boolean | ✅ |
| `price_group` | text | ✅ |
| `price_group_label` | text | ✅ |
| `emergency_contacts` | json | ✅ |
| `permissions_granted` | json | ✅ |
| `working_conditions` | text | ✅ |
| `created_by_provider_id` | uuid (FK) | ✅ |

#### System / Meta
| Feld | Typ | Status |
|---|---|---|
| `readable_id` | text | ✅ (auto-generiert: PID-/KID-/PRID-) |
| `role` | text | ✅ (Legacy, eigentlich in user_roles) |
| `organization_id` | uuid (FK) | ✅ |
| `org_role` | enum (admin/employee) | ✅ |
| `onboarding_completed` | boolean | ✅ |
| `onboarding_dismissed` | boolean | ✅ |
| `has_logged_in` | boolean | ✅ |
| `is_suspended` | boolean | ✅ |
| `suspended_at` | timestamp | ✅ |
| `suspended_reason` | text | ✅ |
| `force_password_reset` | boolean | ✅ |
| `is_manually_managed` | boolean | ✅ |
| `deleted_at` | timestamp | ✅ (Soft Delete) |
| `feature_flags` | json | ✅ |
| `feature_statuses` | json | ✅ |
| `ecosystem_id` | text | ✅ |
| `ical_token` | text | ✅ |
| `otp_enabled` | boolean | ✅ |
| `preferred_app_theme` | text | ✅ |
| `affiliate_slug` | text | ✅ |
| `hufiai_training_consent` | boolean | ✅ |
| `invited_at` | timestamp | ✅ |

#### Erinnerungen (Client)
| Feld | Typ | Status |
|---|---|---|
| `reminder_1h` | boolean | ✅ |
| `reminder_6h` | boolean | ✅ |
| `reminder_evening` | boolean | ✅ |
| `reminder_text` | text | ✅ |

#### Fehlende kritische Felder (Provider)
| Feld | Beschreibung | Status |
|---|---|---|
| `profession_type` | Berufsgruppe (Hufbearbeiter/Osteo/Physio) | ❌ FEHLT |
| `vehicle_fuel_type` | Kraftstofftyp auf Profile-Ebene | ❌ FEHLT (nur in provider_vehicles) |

---

### Tabelle: `business_settings`

Erweiterte Provider-Einstellungen (1:1 Relation über `user_id`).

| Feld | Typ | Status |
|---|---|---|
| `id` | uuid | ✅ |
| `user_id` | uuid | ✅ |
| `business_name` | text | ✅ |
| `owner_name` | text | ✅ |
| `email` | text | ✅ |
| `phone` | text | ✅ |
| `address` | text | ✅ |
| `country` | text | ✅ |
| `currency` | text | ✅ |
| `logo_url` | text | ✅ |
| `about_text` | text | ✅ |
| `hero_headline` | text | ✅ |
| `hero_image_url` | text | ✅ |
| `primary_color` | text | ✅ |
| `accept_new_customers` | boolean | ✅ |
| `client_intake_status` | text | ✅ |
| **Steuer** | | |
| `tax_number` | text | ✅ |
| `vat_id` | text | ✅ |
| `default_vat_rate` | float | ✅ |
| `kleine_unternehmer` | boolean | ✅ |
| `mwst_pflichtig` | boolean | ✅ |
| `tax_country` | text | ✅ |
| `rksv_enabled` | boolean | ✅ (Österreich) |
| `swiss_rounding` | boolean | ✅ (Schweiz) |
| **Bank** | | |
| `iban` | text | ✅ |
| `bank_name` | text | ✅ |
| `bic` | text | ✅ |
| `paypal_link` | text | ✅ |
| `stripe_public_key` | text | ✅ |
| **Fahrzeug** | | |
| `vehicle_consumption_per_100km` | float | ✅ |
| `vehicle_fuel_type` | text | ✅ |
| `travel_cost_per_km` | float | ✅ |
| `travel_cost_flat` | float | ✅ |
| **Website / Marketing** | | |
| `subdomain` | text | ✅ |
| `custom_domain` | text | ✅ |
| `meta_description` | text | ✅ |
| `section_order` | json | ✅ |
| `website_active_pages` | json | ✅ |
| `website_navigation` | json | ✅ |
| `gallery_images` | json | ✅ |
| `reviews_layout` | text | ✅ |
| `social_facebook` | text | ✅ |
| `social_instagram` | text | ✅ |
| `social_tiktok` | text | ✅ |
| `social_website` | text | ✅ |
| `google_analytics_id` | text | ✅ |
| `google_search_console_code` | text | ✅ |
| `facebook_pixel_id` | text | ✅ |
| `exit_intent_enabled` | boolean | ✅ |
| **KI / Automatisierung** | | |
| `ki_features_enabled` | boolean | ✅ |
| **WhatsApp** | | |
| `whatsapp_enabled` | boolean | ✅ |
| `whatsapp_number` | text | ✅ |
| **Erinnerungen** | | |
| `reminder_intervals` | json | ✅ |
| `reminder_custom_text` | text | ✅ |
| **Rechtliches** | | |
| `terms` | text | ✅ |
| `terms_text` | text | ✅ |
| `privacy` | text | ✅ |
| `impressum_text` | text | ✅ |
| `imprint` | text | ✅ |
| **CoPeCaRT** | | |
| `copecart_vendor_id` | text | ✅ |
| `copecart_customer_portal_url` | text | ✅ |

#### Fehlend in business_settings
| Feld | Status |
|---|---|
| `profession_type` (Berufsgruppe) | ❌ FEHLT |
| `signature_image_url` (Rechnungssignatur) | ❌ FEHLT (nur in profiles.digital_signature_url) |

---

## 2. FAHRZEUGPROFIL (`provider_vehicles`)

**Mehrere Fahrzeuge pro Provider möglich: ✅ JA** (via `provider_id` FK)

| Feld | Typ | Status |
|---|---|---|
| `id` | uuid (PK) | ✅ |
| `provider_id` | uuid (FK → profiles) | ✅ |
| `name` | text | ✅ |
| `brand` | text | ✅ Marke |
| `model` | text | ✅ Modell |
| `year` | integer | ✅ Baujahr |
| `color` | text | ✅ |
| `license_plate` | text | ✅ Kennzeichen |
| `vin` | text | ✅ Fahrgestellnummer |
| `fuel_type` | text | ✅ Kraftstofftyp |
| `average_consumption` | float | ✅ Verbrauch l/100km |
| `initial_odometer` | integer | ✅ Start-Tachostand |
| `current_odometer` | integer | ✅ Aktueller Tachostand |
| `price_per_km` | float | ✅ |
| `travel_cost_flat` | float | ✅ Pauschale |
| `is_primary` | boolean | ✅ Primärfahrzeug |
| `status` | text | ✅ |
| `photo_url` | text | ✅ |
| `notes` | text | ✅ |
| `assigned_employee_id` | uuid (FK → employee_profiles) | ✅ |
| **Versicherung** | | |
| `insurance_company` | text | ✅ |
| `insurance_policy_number` | text | ✅ |
| `insurance_expiry` | date | ✅ |
| **Steuern & TÜV** | | |
| `tax_yearly` | float | ✅ |
| `tuev_date` | date | ✅ |
| `created_at` / `updated_at` | timestamp | ✅ |

#### Fehlende Felder
| Feld | Beschreibung | Status |
|---|---|---|
| `trailer_height` | Anhängerhöhe für Routing | ❌ FEHLT |
| `trailer_weight` | Anhängergewicht | ❌ FEHLT |
| `trailer_license_plate` | Anhänger-Kennzeichen | ❌ FEHLT |
| `max_vehicle_height` | Max. Fahrzeughöhe (Brücken) | ❌ FEHLT |
| `max_vehicle_weight` | Max. Fahrzeuggewicht | ❌ FEHLT |

---

## 3. PARTNER (Tierarzt / Sattler / etc.)

**Keine separate `partner_profiles`-Tabelle!** Partner nutzen die gemeinsame `profiles`-Tabelle mit Rolle `partner` in `user_roles`.

### Zugriffsverwaltung: `horse_partner_access`

| Feld | Typ | Status |
|---|---|---|
| `id` | uuid | ✅ |
| `horse_id` | uuid (FK → horses) | ✅ |
| `partner_profile_id` | uuid (FK → profiles) | ✅ |
| `partner_name` | text | ✅ |
| `partner_email` | text | ✅ |
| `partner_type` | enum | ✅ |
| `status` | text (pending/active/rejected/revoked) | ✅ |
| `is_active` | boolean | ✅ |
| **Berechtigungen** | | |
| `can_view_basic` | boolean | ✅ |
| `can_view_medical` | boolean | ✅ |
| `can_view_hoof_history` | boolean | ✅ |
| `can_create_appointments` | boolean | ✅ |
| `can_add_treatment_notes` | boolean | ✅ |
| **Einladung** | | |
| `invited_by_client_id` | uuid | ✅ |
| `invited_by_provider_id` | uuid | ✅ |
| `invite_token` | text | ✅ |
| `invited_at` | timestamp | ✅ |
| `accepted_at` | timestamp | ✅ |
| `valid_until` | timestamp | ✅ |
| `access_note` | text | ✅ |

### Partner-Typen (Enum: `partner_type`)
✅ tierarzt | ✅ physiotherapeut | ✅ osteopath | ✅ chiropraktiker | ✅ reitlehrer | ✅ trainer | ✅ sattler | ✅ huforthopaedie | ✅ zahnarzt | ✅ ernaehrungsberater | ✅ other

#### Fehlend
| Feld | Status |
|---|---|
| Eigenes Fahrzeugprofil für Partner | ❌ FEHLT (kein FK in provider_vehicles auf Partner) |
| Fachgebiet/Spezialisierung als Freitext | ❌ FEHLT (nur via partner_type enum) |

---

## 4. MITARBEITER (`employee_profiles`)

| Feld | Typ | Status |
|---|---|---|
| `id` | uuid (PK) | ✅ |
| `user_id` | uuid (FK → auth.users) | ✅ |
| `provider_id` | uuid (FK → profiles) | ✅ |
| `organization_id` | uuid (FK → organizations) | ✅ |
| `full_name` | text | ✅ |
| `email` | text | ✅ |
| `phone` | text | ✅ |
| `avatar_url` | text | ✅ |
| `bio` | text | ✅ |
| `country` | text | ✅ |
| `timezone` | text | ✅ |
| **Rolle & Status** | | |
| `role` | enum (view/employee/team_lead) | ✅ Sub-Rollen |
| `status` | enum (active/sick/vacation/suspended/inactive) | ✅ |
| `employment_type` | enum (employee/contractor) | ✅ |
| **Vertrag** | | |
| `contract_start_date` | date | ✅ |
| `contract_end_date` | date | ✅ |
| `contract_pdf_url` | text | ✅ |
| **Fähigkeiten** | | |
| `can_apply_hoof_protection` | boolean | ✅ |
| `can_work_alone` | boolean | ✅ |
| `can_work_sensitive_clients` | boolean | ✅ |
| `custom_permissions` | json | ✅ |
| **Einladung** | | |
| `invitation_token` | text | ✅ |
| `invitation_sent_at` | timestamp | ✅ |
| `invitation_accepted_at` | timestamp | ✅ |
| **System** | | |
| `onboarding_completed` | json | ✅ |
| `notes` | text | ✅ |

### Zugehörige Tabellen
- ✅ `employee_assignments` – Termine zuweisen (mit check-in/check-out GPS + Zeitstempel)
- ✅ `employee_availability` – Verfügbarkeit (Wochentage, Zeiträume, Status)
- ✅ `employee_absence_requests` – Urlaubsanträge (type, status, review)
- ✅ `employee_audit_log` – Audit-Trail
- ✅ `employee_sync_queue` – Offline-Sync
- ✅ `employee_time_entries` – Zeiterfassung

#### Fehlend
| Feld | Status |
|---|---|
| Eigenes Fahrzeugprofil | ⚠️ TEILWEISE (provider_vehicles hat `assigned_employee_id`) |
| Arbeitszeiten (Soll-Stunden/Woche) | ❌ FEHLT (nur Verfügbarkeit, keine Vertrags-Stunden) |

---

## 5. CLIENT (Pferdebesitzer / Kunde)

### Tabelle: `profiles` (gleiche Tabelle wie Provider!)

Clients werden über `user_roles` (role = 'client') identifiziert.

Zusätzlich gibt es die **`contacts`-Tabelle** für Provider-seitige Kontaktverwaltung:

### Tabelle: `contacts`

| Feld | Typ | Status |
|---|---|---|
| `id` | uuid (PK) | ✅ |
| `provider_id` | uuid (FK) | ✅ |
| `profile_id` | uuid (FK → profiles, nullable) | ✅ |
| `full_name` | text | ✅ |
| `email` | text | ✅ |
| `phone` | text | ✅ |
| `street` | text | ✅ |
| `zip_code` | text | ✅ |
| `city` | text | ✅ |
| `company_name` | text | ✅ |
| `is_business` | boolean | ✅ |
| `vat_id` | text | ✅ |
| `category` | enum (client/partner/supplier/lead) | ✅ |
| `source` | text | ✅ |
| `notes` | text | ✅ |
| `readable_id` | text | ✅ (auto: KID-/PRID-/LID-) |
| `organization_id` | uuid | ✅ |
| `deleted_at` | timestamp | ✅ |

### Client-Felder auf `profiles`
| Feld | Beschreibung | Status |
|---|---|---|
| Wohn-Adresse (street, zip_code, city, country) | ✅ |
| Stall-Adresse (stable_street, stable_zip, stable_city) | ✅ |
| GPS Wohnung (latitude, longitude) | ✅ |
| GPS Stall (stable_latitude, stable_longitude) | ✅ |
| Notfallkontakte (emergency_contacts) | ✅ JSON |
| Zahlungsrating (payment_rating) | ✅ |
| Erinnerungen (reminder_1h, reminder_6h, reminder_evening) | ✅ |
| Berechtigungen (permissions_granted) | ✅ JSON |
| Client-Typ (private/commercial) | ✅ |
| Lebenszyklus (new/active/archive) | ✅ |

#### Fehlend
| Feld | Status |
|---|---|
| Mehrere Standorte pro Kunde | ❌ FEHLT (nur 1x Wohn- + 1x Stalladresse) |
| IBAN / Zahlungsmethode des Kunden | ❌ FEHLT |
| Kommunikationspräferenz (Push/E-Mail/SMS) | ❌ FEHLT (nur Reminder-Booleans) |
| Abo/Vertrag-Verknüpfung | ❌ FEHLT |
| Automatisches Geocoding der Adresse | ❌ FEHLT (GPS manuell oder per Frontend) |

---

## 6. PFERD (`horses`)

| Feld | Typ | Status |
|---|---|---|
| `id` | uuid (PK) | ✅ |
| `name` | text | ✅ |
| `nickname` | text | ✅ |
| `official_name` | text | ✅ |
| `owner_id` | uuid (FK → profiles) | ✅ Besitzer-Verknüpfung |
| `readable_id` | text | ✅ (auto: EQID-) |
| `eqid` | text | ✅ (Legacy-Duplikat) |
| `equine_type` | enum (horse/pony/donkey/mule/zebra) | ✅ |
| **Stammdaten** | | |
| `breed` | text | ✅ Rasse |
| `birth_year` | integer | ✅ |
| `birth_date` | date | ✅ |
| `gender` | text | ✅ |
| `color` | text | ✅ Farbe |
| `height` | text | ✅ Stockmaß (Freitext) |
| `height_cm` | integer | ✅ Stockmaß (cm) |
| `chip_number` | text | ✅ Chipnummer |
| `discipline` | text | ✅ |
| `usage` | text | ✅ (Freitext) |
| `usage_type` | enum | ✅ (leisure/sport/western/...) |
| **Standort** | | |
| `latitude` | float | ✅ |
| `longitude` | float | ✅ |
| `location_name` | text | ✅ |
| `stable_address_gps` | json ({lat, lng, address}) | ✅ |
| `holding_type` | enum (box/open_stable/mixed/pasture) | ✅ |
| `housing` | text | ✅ (Freitext) |
| **Huf** | | |
| `hoof_type` | text | ✅ |
| `hoof_protection` | text | ✅ |
| `hoof_measurements` | json (vl/vr/hl/hr) | ✅ |
| `hoof_details` | json (size/condition/stance/issues) | ✅ |
| `hoof_data` | json | ✅ |
| `shoeing_status` | text | ✅ |
| `shoeing_interval` | integer (Wochen) | ✅ |
| **Gesundheit** | | |
| `health_status` | text | ✅ |
| `medical_history` | text | ✅ |
| `health_issues_general` | text | ✅ |
| `feeding_notes` | text | ✅ |
| `special_notes` | text | ✅ Besondere Hinweise |
| **Kontakte** | | |
| `contacts` | json ({vet, vet_phone, trainer, stable, caretaker...}) | ✅ |
| **Termine** | | |
| `last_anamnesis_date` | date | ✅ |
| `anamnesis_interval_months` | integer | ✅ |
| `last_appointment_date` | date | ✅ |
| `next_appointment_due` | date | ✅ |
| `recall_interval_weeks` | integer | ✅ |
| `is_new_horse` | boolean | ✅ |
| **Dokumente** | | |
| `documents_urls` | text[] | ✅ |
| `photo_url` | text | ✅ |
| **System** | | |
| `organization_id` | uuid | ✅ |
| `app_source` | text | ✅ |
| `deleted_at` | timestamp | ✅ |

### Zugehörige Tabellen
- ✅ `horse_documents` – Dokumente (category, file_url, notes)
- ✅ `horse_diary_entries` – Tagebuch (category, text, photo, shared_with_provider)
- ✅ `horse_health_logs` – Gesundheitslogs (wellbeing, temperament, hoof_rating, weight)
- ✅ `horse_partner_access` – Partner-Zugriff (s.o.)
- ✅ `hoof_photos` – Huffotos (position, appointment_id)
- ✅ `hoof_entries` – Hufeinträge
- ✅ `hoof_history` – Hufhistorie (before/after photos, voice_note)
- ✅ `hoof_analyses` – Hufanalysen (Gangbild, Stellung, 4-Huf-Daten)

#### Fehlend
| Feld | Status |
|---|---|
| Mehrere Standorte pro Pferd | ❌ FEHLT (nur 1x lat/lng + stable_address_gps) |
| Tierarzt-Verknüpfung als FK | ❌ FEHLT (nur Freitext in contacts JSON) |
| Impfpass-Tabelle | ❌ FEHLT (nur über horse_documents abbildbar) |
| Versicherung | ❌ FEHLT |
| Equidenpass-Nummer | ❌ FEHLT (chip_number vorhanden) |

---

## 7. TERMIN / APPOINTMENT (`appointments`)

| Feld | Typ | Status |
|---|---|---|
| `id` | uuid (PK) | ✅ |
| `horse_id` | uuid (FK → horses) | ✅ |
| `provider_id` | uuid (FK → profiles) | ✅ |
| `client_id` | uuid (FK → profiles) | ✅ |
| `assigned_to_user_id` | uuid (FK → profiles) | ✅ Mitarbeiter-Zuordnung |
| `group_id` | uuid (FK → appointment_groups) | ✅ Stallgruppe |
| `stable_group_id` | uuid (FK → appointment_groups) | ✅ |
| `service_id` | uuid (FK → services) | ✅ |
| `organization_id` | uuid (FK → organizations) | ✅ |
| **Zeitdaten** | | |
| `date` | date | ✅ |
| `time` | time | ✅ |
| `duration` | integer (Minuten) | ✅ |
| **Status** | | |
| `status` | text | ✅ |
| `is_confirmed_by_client` | boolean | ✅ |
| `confirmed_at` | timestamp | ✅ |
| `confirmation_token` | text | ✅ |
| `completed_at` | timestamp | ✅ |
| **Service / Auftragstyp** | | |
| `service_type` | text | ✅ (Freitext: "Barhuf", "Eisen" etc.) |
| `service_id` | uuid (FK → services) | ✅ (strukturierte Verknüpfung) |
| **Preis** | | |
| `price` | float | ✅ |
| `base_price` | float | ✅ |
| `applied_price` | float | ✅ |
| `price_group_applied` | text | ✅ |
| `discount_amount` | float | ✅ |
| `discount_reason` | text | ✅ |
| `surcharge_amount` | float | ✅ |
| `surcharge_reason` | text | ✅ |
| `is_internally_paid` | boolean | ✅ |
| **Ort** | | |
| `location` | text | ✅ (Freitext-Adresse) |
| **Notizen** | | |
| `notes` | text | ✅ |
| `completion_notes` | text | ✅ |
| `completion_pdf_url` | text | ✅ |
| **Unterschrift** | | |
| `signature_url` | text | ✅ |
| `signed_at` | timestamp | ✅ |
| `signed_by_name` | text | ✅ |
| **Ganganalyse** | | |
| `gait_analysis_done` | boolean | ✅ |
| `gait_analysis_ok` | boolean | ✅ |
| `gait_video_url` | text | ✅ |
| **Serie / Wiederholung** | | |
| `recurring_group_id` | uuid | ✅ |
| `is_series_appointment` | boolean | ✅ |
| `series_current` | integer | ✅ |
| `series_total` | integer | ✅ |
| `is_multi_horse` | boolean | ✅ |
| **Tour** | | |
| `tour_order` | integer | ✅ |
| `added_during_tour` | boolean | ✅ |
| **Notfall** | | |
| `is_emergency` | boolean | ✅ |

### Zugehörige Tabellen
- ✅ `appointment_groups` – Stallgruppen (location, stable_name, GPS)
- ✅ `appointment_horses` – Mehrere Pferde pro Termin
- ✅ `appointment_reminders` – Versendete Erinnerungen

#### Fehlend
| Feld | Status |
|---|---|
| GPS-Koordinaten des Termins (lat/lng) | ❌ FEHLT direkt (nur Freitext `location` oder via appointment_groups) |
| Geschätzte Dauer pro Auftragstyp | ❌ FEHLT (duration ist pro Termin, nicht pro Typ automatisch) |
| Zeitpuffer-Konfiguration | ❌ FEHLT |

---

## 8. KALENDER ↔ COCKPIT DATENFLUSS

### Wie werden Termine ins Cockpit geladen?
✅ `DayCockpit.tsx` lädt Termine für das heutige Datum via:
```
supabase.from("appointments")
  .select("*, horses(*), contacts:client_id(*)")
  .eq("provider_id", userId)
  .eq("date", today)
  .order("tour_order")
```

### GPS-Koordinaten für Routing
⚠️ **TEILWEISE**: Das Cockpit nutzt `contacts.street + zip_code + city` und geocodiert sie zur Laufzeit (Nominatim). Es gibt **kein direktes lat/lng-Feld** am Termin. GPS-Daten kommen aus:
- `profiles.stable_latitude / stable_longitude` (Client-Stalladresse)
- `horses.latitude / longitude` (Pferdestandort)
- `appointment_groups.location_lat / location_lng` (Gruppenstandort)

### Auftragstyp für Zeitpuffer
❌ **NEIN** – Es gibt keine Tabelle die Auftragstypen mit geschätzter Dauer verknüpft. `services.duration` existiert, wird aber nicht automatisch als Zeitpuffer zwischen Terminen verwendet.

### Fahrzeug automatisch auswählen
❌ **NEIN** – `daily_tours` hat keinen FK zu `provider_vehicles`. Das Cockpit nutzt `business_settings.vehicle_consumption_per_100km` für Spritkosten, wählt aber kein spezifisches Fahrzeug aus.

### Termindaten → Fahrtenbuch + Rechnung
✅ **TEILWEISE**:
- `vehicle_mileage_logs` speichert Fahrten mit `route` (JSON), `start_km`, `end_km`
- `invoice_appointments` verknüpft Rechnungen mit Terminen
- Automatischer Fluss existiert aber **nicht** – manuelles Erstellen erforderlich

---

## ZUSAMMENFASSUNG: Kritische Lücken

| # | Fehlend | Priorität |
|---|---|---|
| 1 | `profession_type` in profiles/business_settings | 🔴 Hoch – Kernfeature für Multi-Berufsgruppen |
| 2 | GPS lat/lng direkt am Appointment | 🔴 Hoch – Cockpit muss geocoden statt direkt zugreifen |
| 3 | Zeitpuffer-Konfiguration pro Auftragstyp | 🟡 Mittel |
| 4 | Fahrzeug-Verknüpfung in daily_tours | 🟡 Mittel |
| 5 | Anhänger-Profil (Höhe/Gewicht für Routing) | 🟡 Mittel |
| 6 | Mehrere Standorte pro Client/Pferd | 🟡 Mittel |
| 7 | Client-Zahlungsmethode / IBAN | 🟢 Niedrig |
| 8 | Kommunikationspräferenz (Push/SMS/E-Mail) | 🟢 Niedrig |
| 9 | Equidenpass-Nr / Versicherung am Pferd | 🟢 Niedrig |
| 10 | Duplikate in profiles (phone vs mobile, geo_lat vs latitude, etc.) | 🟡 Technische Schuld |
