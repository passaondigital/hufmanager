# HufManager – Subsystem-Analyse
**Stand: 05. März 2026**

---

## 1. RECHNUNGSWESEN

### Tabelle `invoices` – alle Felder
| Feld | Typ | Status |
|------|-----|--------|
| id | uuid | ✅ |
| invoice_number | string | ✅ |
| provider_id | uuid (FK profiles) | ✅ |
| client_id | uuid (FK profiles) | ✅ |
| horse_id | uuid (FK horses) | ✅ |
| organization_id | uuid (FK organizations) | ✅ |
| customer_type | string | ✅ |
| status | string | ✅ (draft/pending/paid/overdue/cancelled) |
| total_amount | number | ✅ |
| issue_date | string (date) | ✅ |
| due_date | string (date) | ✅ |
| paid_at | string (timestamp) | ✅ |
| payment_method | string | ✅ |
| payment_status | string | ✅ |
| payment_link | string | ✅ (CopeCart Smart Links) |
| payment_external_id | string | ✅ |
| pdf_url | string | ✅ |
| signature_url | string | ✅ |
| notes | string | ✅ |
| credit_note_for | uuid (FK invoices, self-ref) | ✅ Gutschrift-Logik |
| cancellation_reason | string | ✅ |
| cancelled_at | string (timestamp) | ✅ |
| created_at / updated_at | timestamps | ✅ |

### Zusatztabellen
| Tabelle | Status | Beschreibung |
|---------|--------|--------------|
| `invoice_items` | ✅ | Positionen: title, unit_price, quantity, total_price, inventory_item_id |
| `invoice_appointments` | ✅ | Verknüpfung Invoice↔Appointment mit line_amount, line_description |
| `invoice_number_counters` | ✅ | Fortlaufende Nummern je Provider + Jahr |

### Rechnungsnummern-Logik
- ✅ **Fortlaufend**: DB-Funktion `generate_invoice_number(provider_id)` → Format `RE-{JAHR}-{0001}`
- ✅ **Pro Provider + Jahr**: Tabelle `invoice_number_counters` mit `UPSERT ON CONFLICT`
- ❌ **Länderspezifisches Format**: Kein unterschiedliches Format für AT/CH (immer `RE-`)
- ❌ **Prefix konfigurierbar**: Fest auf "RE-" kodiert

### Swiss QR-Invoice
- ✅ **Implementiert**: `src/lib/swissQrBill.ts` – vollständige SPC-Datenstring-Generierung nach Swiss Payment Standards v2.3
- ✅ **Integration**: `invoicePdfGenerator.ts` ruft `addSwissQrBillToInvoice()` auf wenn `tax_country === 'CH'` und IBAN vorhanden
- ✅ **QR-Code**: Generiert via `qrcode` Library mit Swiss Cross Overlay
- ✅ **Felder**: creditorName, creditorStreet, creditorPostalCode, creditorCity, amount, currency (CHF), reference

### Österreich RKSV
- ⚠️ **Hinweis implementiert**: UI-Banner in `TaxCountryCard.tsx` warnt, dass HufManager keine BMF-zertifizierte Registrierkasse ist
- ✅ **Flag vorhanden**: `rksv_enabled` in `business_settings`
- ❌ **Keine RKSV-Implementierung**: Kein DEP (Datenerfassungsprotokoll), keine Signaturerstellungseinheit
- ℹ️ Korrekt: RKSV betrifft nur Barverkäufe – Überweisungsrechnungen sind nicht betroffen

### Mahnwesen
- ❌ **Nicht implementiert**: Kein automatisches Mahnwesen
- ✅ **Status "overdue"** wird in der UI angezeigt (Badge in `Rechnungen.tsx` und `ClientInvoices.tsx`)
- ✅ **Summe offener/überfälliger Rechnungen** wird berechnet und angezeigt
- ❌ **Keine Mahnstufen** (1. Mahnung, 2. Mahnung, Inkasso)
- ❌ **Keine automatische E-Mail/Push bei Überfälligkeit**
- ❌ **Kein Mahngebühren-Aufschlag**

### Steuerklassen / MwSt-Sätze
- ✅ **DACH-Konfiguration vorhanden**: `src/lib/dachConfig.ts`
  - DE: 19% (Standard), 7% (ermäßigt)
  - AT: 20% (Standard), 10%/13% (ermäßigt)
  - CH: 8.1% (Standard), 2.6% (ermäßigt)
- ✅ **Kleinunternehmerregelung**: `kleine_unternehmer` Flag in `business_settings`
- ✅ **MwSt-Pflicht**: `mwst_pflichtig` Flag in `business_settings`
- ✅ **Standard-MwSt-Satz**: `default_vat_rate` in `business_settings`
- ✅ **Brutto→Netto Berechnung**: `calculateVatFromGross()` in `dachConfig.ts`
- ✅ **Schwellenwert-Warnung**: Automatische Alerts bei Überschreitung der Kleinunternehmer-Grenze je Land

---

## 2. BENACHRICHTIGUNGSSYSTEM

### Tabelle `notifications`
| Feld | Typ |
|------|-----|
| id | uuid |
| user_id | uuid |
| title | string |
| message | string |
| type | string |
| link | string |
| is_read | boolean |
| created_at | timestamp |

### Tabelle `employee_notifications`
| Feld | Typ |
|------|-----|
| id | uuid |
| employee_id | uuid (FK employee_profiles) |
| title | string |
| body | string |
| type | string |
| link_to | string |
| read_at | timestamp |
| created_at | timestamp |

### Notification-Typen (via DB-Trigger)
| Typ | Trigger | Status |
|-----|---------|--------|
| `appointment_created` | `notify_client_on_appointment_created()` | ✅ |
| `appointment` (Status-Änderung) | `create_appointment_status_notification()` | ✅ |
| `chat` (neue Nachricht) | `create_message_notification()` | ✅ |
| `client_login` (erstmaliger Login) | `notify_provider_on_client_login()` | ✅ |
| `horse_created` | `notify_provider_on_horse_created()` | ✅ |
| `horse_updated` | `notify_provider_on_horse_updated()` | ✅ |
| `info` (Verbindungsanfrage) | `get_or_assign_provider_for_client()` | ✅ |

### Kanäle
| Kanal | Status | Details |
|-------|--------|---------|
| **In-App** | ✅ | `notifications` Tabelle + Glocken-Icon in UI |
| **Push** | ⚠️ Infrastruktur vorhanden | `push_subscriptions` Tabelle (endpoint, p256dh, auth), aber VAPID-Keys müssen konfiguriert werden |
| **E-Mail** | ❌ | Kein E-Mail-Versand implementiert (kein SMTP/Resend/SendGrid) |
| **SMS** | ❌ | Nicht implementiert |

### Erinnerungsfunktion
- ✅ **AutoFlow-System**: `autoflow_settings` mit `auto_reminder_enabled`, `reminder_hours_before` (1-72h konfigurierbar)
- ✅ **Reminder-Log**: `appointment_reminders` Tabelle (appointment_id, reminder_type, channel, sent_at)
- ✅ **Custom Text**: `reminder_custom_text` in `business_settings`
- ✅ **Intervalle**: `reminder_intervals` (JSON) in `business_settings`
- ❌ **Kein aktiver Cron-Job/Edge Function** die Erinnerungen tatsächlich versendet

### Benachrichtigungs-Templates
- ❌ **Keine editierbaren Templates** – Texte sind hart kodiert in DB-Triggern
- ✅ **Feste Texte** auf Deutsch (z.B. "Neuer Termin", "Pferdeakte aktualisiert")

---

## 3. ABOS & VERTRÄGE

### Provider-Abos (HufManager SaaS)
| Aspekt | Status | Details |
|--------|--------|---------|
| Plan-Verwaltung | ✅ | `subscription_plan` + `subscription_status` in `profiles` |
| CopeCart-Integration | ✅ | `copecart_subscription_id` in `profiles` |
| `subscription_links` | ✅ | CopeCart URLs mit Intervall + Pferdeanzahl |
| `subscription_settings` | ✅ | Preise pro Zone (4/6/8 Wochen) + Rabatt |
| Plan-Features | ✅ | `PLAN_FEATURE_MAP` in `plan-features.ts` |

### Kunden-Abos (Hufpflege-Pauschale)
- ❌ **Nicht implementiert**: Keine Tabelle für wiederkehrende Kunden-Abos
- ❌ **Keine automatische Abo-Rechnung** für Endkunden
- ✅ `subscription_links` + `subscription_settings` existieren für Provider→Kunde CopeCart-Links
- ❌ Keine interne Abo-Logik (ohne CopeCart)

### Verträge
| Tabelle | Status | Inhalt |
|---------|--------|--------|
| `provider_contracts` | ✅ | AVV, AGB, Datenschutz-Akzeptanz mit Timestamps, IP, User-Agent |
| Kunden-Verträge | ❌ | Keine eigene Tabelle für Werkverträge/Behandlungsverträge |
| Mitarbeiter-Verträge | ✅ | `contract_start_date`, `contract_end_date`, `contract_pdf_url` in `employee_profiles` |

---

## 4. DOKUMENTE & MEDIEN

### Supabase Storage Buckets
| Bucket | Zugriff | Verwendung |
|--------|---------|------------|
| `hoof_photos` | 🔒 Privat | Huffotos, Hufanalyse-Bilder |
| `hoof_images` | 🔒 Privat | Weitere Hufbilder |
| `horse-documents` | 🔒 Privat | Pferdedokumente (Impfpass etc.) |
| `legal-documents` | 🔒 Privat | AVV, AGB-PDFs |
| `signatures` | 🔒 Privat | Digitale Unterschriften |
| `completion-reports` | 🔒 Privat | Abschlussberichte als PDF |
| `chat-images` | 🔒 Privat | Bilder aus Chat-Nachrichten |
| `employee-avatars` | 🔒 Privat | Mitarbeiter-Profilbilder |
| `logos` | 🌐 Öffentlich | Business-Logos |
| `gallery` | 🌐 Öffentlich | Galerie-Bilder für Website |
| `blog-images` | 🌐 Öffentlich | Blog-Beitragsbilder |
| `documents` | 🔒 Privat | Allgemeine Dokumente |
| `pdfs` | 🔒 Privat | Generierte PDFs (Rechnungen etc.) |
| `avatars` | 🔒 Privat | Nutzer-Profilbilder |

### Dokumenten-Verwaltung
- ✅ **`provider_documents` Tabelle**: document_type, file_url, file_name, file_size, mime_type, folder, horse_id, appointment_id, expense_id
- ✅ **Signed URLs**: Private Buckets nutzen temporäre URLs (1h Gültigkeit) via `src/lib/storage.ts`
- ✅ **Upload-Validierung**: Dateitypen und Größen (max 5-10MB) werden validiert

### DSGVO-Löschfristen
- ✅ **`data_retention_rules` Tabelle**: category, retention_days, target_table, target_date_column, action
- ✅ **Admin-Dashboard**: `RetentionDashboard.tsx` zeigt ablaufende Fristen
- ⚠️ **Kein automatischer Lösch-Cron**: Edge Function `check_retention_deadlines` löst nur Benachrichtigungen aus, löscht nicht automatisch
- ✅ **Manuelle Löschung**: Admin kann über Dashboard manuell löschen

---

## 5. SYNC & OFFLINE

### Was wird offline gecacht?
| Datentyp | Cache-Strategie | Status |
|----------|----------------|--------|
| **Statische Daten** (horses, contacts, services, profiles, business-settings) | ✅ Infinite stale time, IndexedDB via `idb-keyval` | Persistent |
| **Dynamische Daten** (appointments, notifications, messages, invoices) | ✅ Kürzere stale time | Persistent |
| **Query Cache** | ✅ 7 Tage max (`QUERY_CACHE_MAX_AGE`) | IndexedDB |
| **Karten-Tiles** | ✅ Cache bei Tour-Start, Clear bei Tour-Ende | Cache API |

### Offline-Mutations (Schreib-Queue)
| Tabelle | Status |
|---------|--------|
| appointments | ✅ |
| horses | ✅ |
| contacts | ✅ |
| hoof_photos | ✅ |
| horse_documents | ✅ |
| invoices | ✅ |
| leads | ✅ |
| messages | ✅ |
| hoof_analyses | ✅ |
| vehicle_mileage_logs | ✅ |

### Sync-Queue Details
- ✅ **`syncQueue.ts`**: IndexedDB-basiert, Aktionen: create/update/delete
- ✅ **Retry-Logik**: Max 5 Retries (`MAX_SYNC_RETRIES`)
- ✅ **Sync-Intervall**: Alle 2 Minuten (`SYNC_CHECK_INTERVAL`)
- ✅ **UI-Feedback**: `useOfflineState` Hook zeigt Sync-Status (idle/syncing/offline/error)
- ✅ **Event-basiert**: Custom Events `syncQueueUpdated` + `offlineImagesUpdated`

### Offline-Bild-Queue
- ✅ **`imageQueue.ts`**: Separate Queue für Bilder (Blob-Speicherung in IndexedDB)
- ✅ **Metadaten**: bucket, path, fileName, retryCount, createdAt

### Konfliktlösung
- ❌ **Keine echte Konfliktlösung**: Last-Write-Wins (keine Merge-Strategie)
- ❌ **Kein Conflict Detection**: Keine Versionierung oder Timestamp-Vergleich bei Sync
- ⚠️ **Risiko**: Bei gleichzeitiger Online/Offline-Änderung wird der spätere Sync den früheren überschreiben

---

## 6. ANALYTICS & AUSWERTUNG

### Implementierte KPIs
| KPI | Status | Quelle |
|-----|--------|--------|
| Umsatz gesamt (pro Monat/Jahr) | ✅ | `invoices` aggregiert |
| Umsatz-Trend (Liniendiagramm) | ✅ | Recharts, monatlich |
| Termin-Statistik (Balkendiagramm) | ✅ | `appointments` nach Monat |
| Abschlussquote | ✅ | completed/total Appointments |
| Durchschnittl. Zeit pro Kunde | ✅ | Duration-Parsing aus Terminen |
| Gesamt-km pro Woche | ✅ | `vehicle_mileage_logs` / Tour-Daten |
| Offene Rechnungen (Summe) | ✅ | `invoices` WHERE status='pending' |
| Überfällige Rechnungen (Summe) | ✅ | `invoices` WHERE status='overdue' |
| Neue Kunden pro Monat | ✅ | `profiles` created_at |
| MRR / ARR (Admin) | ✅ | Mission Control, normalisiert |

### Fehlende KPIs
| KPI | Status |
|-----|--------|
| Umsatz pro einzelnem Kunden | ❌ |
| Umsatz pro Pferd | ❌ |
| Umsatz pro Route/Stall | ❌ |
| Vergleich Monat vs. Vorjahr (nebeneinander) | ⚠️ Jahres-Filter vorhanden, aber kein Side-by-Side-Vergleich |
| Durchschnittl. Rechnungsbetrag | ❌ |
| Kundenbindungsrate (Churn) | ❌ |
| Spritkosten pro Tour | ✅ (im Cockpit berechnet, nicht in Analytics) |

---

## 7. MULTI-LÄNDER (DACH)

### Länderfeld
| Tabelle | Feld | Status |
|---------|------|--------|
| `business_settings` | `country` | ✅ |
| `business_settings` | `tax_country` | ✅ |
| `profiles` | `country` | ✅ |
| `employee_profiles` | `country` | ✅ |
| `invoices` | – | ❌ Kein Länderfeld auf Rechnungsebene |
| `appointments` | – | ❌ Kein Länderfeld |

### Währung
| Aspekt | Status | Details |
|--------|--------|---------|
| EUR (€) | ✅ | Standard für DE/AT |
| CHF (Fr.) | ✅ | Automatisch bei `tax_country === 'CH'` |
| `currency` Feld | ✅ | In `business_settings`, `admin_expenses`, `admin_provider_payments`, `admin_revenue_log` |
| Schweizer Rundung (5 Rappen) | ✅ | `swiss_rounding` Flag in `business_settings` |
| Multi-Währung pro Rechnung | ❌ | Währung kommt aus `business_settings`, nicht pro Rechnung konfigurierbar |

### Spracheinstellung
| Aspekt | Status | Details |
|--------|--------|---------|
| UI-Sprache | ❌ | Fest auf Deutsch – kein i18n-Framework |
| `date-fns` Locale | ✅ | `de` Locale überall verwendet |
| Regionale Begriffe | ✅ | "Jänner" für AT, "MWST" für CH in `dachConfig.ts` |
| Nutzer-Sprachfeld | ❌ | Kein `language`/`locale` Feld in `profiles` |

---

## ZUSAMMENFASSUNG: Kritische Lücken

| Priorität | Bereich | Lücke |
|-----------|---------|-------|
| 🔴 Hoch | Mahnwesen | Kein automatisches Mahnwesen (Mahnstufen, E-Mail, Gebühren) |
| 🔴 Hoch | E-Mail-Versand | Kein E-Mail-Kanal für Rechnungen, Erinnerungen, Mahnungen |
| 🔴 Hoch | Erinnerungen | AutoFlow-Settings vorhanden, aber kein Cron/Edge Function die tatsächlich sendet |
| 🟡 Mittel | Konfliktlösung | Offline-Sync ohne Merge-Strategie (Last-Write-Wins) |
| 🟡 Mittel | Kunden-Abos | Keine interne Abo-/Pauschalen-Verwaltung |
| 🟡 Mittel | Notification Templates | Texte hart kodiert, nicht editierbar |
| 🟡 Mittel | Analytics | Kein Umsatz pro Kunde/Pferd/Route |
| 🟢 Niedrig | Rechnungsnummer-Prefix | Nicht konfigurierbar (immer "RE-") |
| 🟢 Niedrig | i18n | Kein Sprachwechsel möglich (nur Deutsch) |
| 🟢 Niedrig | RKSV | Nur Hinweis, keine Integration (korrekt für Zielgruppe) |
