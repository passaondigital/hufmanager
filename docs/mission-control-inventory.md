# 🎛️ HufManager Mission Control – Vollständige Bestandsaufnahme

> Stand: 02.03.2026 | Für Strategie-Planung mit Claude

---

## Architektur-Überblick

Mission Control ist das zentrale Admin-Dashboard, aufgebaut als Tab-basierte Single-Page mit **37+ Komponenten** in `src/components/admin/`. Zugang nur für Nutzer mit `role = 'admin'` in `user_roles`. Es gibt ein Konzept von **Master-Admin** (erweiterte Rechte wie Soft-Delete) vs. normalem Admin.

---

## 1. ÜBERSICHT (Dashboard-Home)

### 1.1 Echtzeit-KPIs (`MissionControlKPIs.tsx`)

| KPI | Quelle | Demo gefiltert? |
|---|---|---|
| Aktive Provider | `profiles` + `user_roles` mit Aktiv-Logik | ✅ |
| Neu diese Woche / letzte Woche | `created_at`-Vergleich | ✅ |
| MRR (verifiziert) | `admin_provider_payments` (period_start ≤ heute ≤ period_end) | ✅ |
| Churn (30d) + Churn-Rate | `access_valid_until` abgelaufen im letzten Monat | ✅ |
| Lifetime-User | `plan_override = 'lifetime_grant'` | ✅ |
| Gesperrte User | `is_suspended = true` | ✅ |
| Kunden (echt) | `user_roles.role = 'client'` | ✅ |
| Pferde gesamt | `horses` count | ❌ (zählt alle) |
| Partner (echt) | `user_roles.role = 'partner'` | ✅ |
| ARR (verifiziert) | MRR × 12 | ✅ |
| Aktive Verbindungen | `access_grants.is_active + status = 'active'` | ❌ |
| Offene Verbindungen | `access_grants.status = 'pending'` | ❌ |

**Aktiv-Logik**: Provider gilt als aktiv wenn: nicht gesperrt UND (`plan_override = lifetime_grant/employee` ODER `access_valid_until > now()` ODER `subscription_status = 'active'`)

### 1.2 System Health (`AdminSystemHealth.tsx`)

- Gesamt-Benutzer, Provider, Clients, Pferde
- Termine gesamt + diesen Monat
- Rechnungen, Nachrichten gesamt
- Aktive Abos, gesperrte User (Warnung)
- **Chart**: Neue Benutzer (7-Tage-Balkendiagramm)
- **Chart**: Plan-Verteilung (Pie Chart)
- System-Status-Banner (statisch "Online")

---

## 2. NUTZER & ROLLEN

### 2.1 Provider-DB (`AdminUserDB.tsx`, ~600 Zeilen)

**Ansicht**: Tabelle aller Nutzer mit Suche, Rollenfilter (Provider/Client/Admin)

**Pro Nutzer angezeigt**:
- Name, E-Mail, ID, Readable-ID, Rolle
- Plan-Badge (Aktiv/Gesperrt/Lifetime/Inaktiv)
- PLZ, Stadt, Pferdeanzahl
- Erstellungsdatum

**Aktionen pro Nutzer**:

| Aktion | Beschreibung |
|---|---|
| Plan ändern | Dropdown: Starter, Pro, Lifetime, Barzahlung 1J, Beta Tester, Employee |
| Zugangsdauer setzen | Datepicker für `access_valid_until` |
| Sperren | Mit Grund (`suspended_reason`), setzt `is_suspended = true` |
| Entsperren | Setzt `is_suspended = false`, räumt `suspended_at/reason` auf |
| Soft-Delete | Nur Master-Admin, setzt `deleted_at` |
| UUID kopieren | Clipboard |

**Plan-Override-Logik bei Speichern**:

```
starter        → plan_override: null, subscription_plan: "starter", subscription_status: "trialing"
pro            → plan_override: "pro", subscription_status: "active"
lifetime_grant → access_valid_until: 2099-12-31
manual_cash_1y → access_valid_until: +1 Jahr
employee       → access_valid_until: 2099-12-31
```

**⚠️ Kritische Lücke**: Plan-Änderung setzt **NICHT** automatisch `feature_statuses`. Features werden nur durch CopeCart-Webhook provisioniert.

### 2.2 Feature-Verwaltung (pro Provider)

**ProviderFeatureEditor**: Granulare Steuerung jedes Moduls pro Provider
- 3 Kategorien: **Core** (Invoicing, Chat, Maps, Academy, etc.), **AutoFlow** (Reminders, Scheduling, Feedback, etc.), **Advanced** (Beta Features)
- 4 Status-Stufen: `disabled`, `beta`, `early_access`, `public`
- Wird als `feature_statuses` JSONB im Profil gespeichert

### 2.3 Globale Feature-Flags (`GlobalFeatureFlagsManager.tsx`)

- Tabelle `global_feature_defaults` mit Default-Status pro Feature
- Änderungen gelten als neue Defaults für neu registrierte Nutzer
- Bestehende Nutzer behalten ihre individuellen Einstellungen

### 2.4 Feature-Rollout Dashboard (`FeatureRolloutDashboard.tsx`)

- Matrix-Ansicht: Jedes Feature × alle Provider
- Verteilung als Fortschrittsbalken (% disabled/beta/early_access/public)
- Drill-Down: Klick auf Status zeigt betroffene Provider-Liste
- Ermöglicht strategisches Rollout-Tracking

### 2.5 Mitarbeiter-Übersicht (`AdminEmployeeOverview.tsx`)

- Alle `employee_profiles` systemweit
- Felder: Name, E-Mail, Rolle (employee/team_lead), Status, Provider-Zuordnung
- Keine Verwaltungsaktionen (nur Leseansicht)

### 2.6 Partner-Übersicht (`AdminPartnerOverview.tsx`)

- Alle Partner-Accounts systemweit (Leseansicht)

### 2.7 Pferde-DB (`AdminHorseDB.tsx`)

- Alle Pferde systemweit mit Besitzer-Zuordnung

### 2.8 Verbindungen (`AdminConnections.tsx`)

- Alle `access_grants` systemweit
- Status: active, pending, revoked

---

## 3. FINANZEN

### 3.1 Finanz-Dashboard (`AdminRevenue.tsx`, ~1100 Zeilen)

**5 Tabs**: Übersicht, CopeCart, Trend, Ausgaben, EÜR

#### Tab: Übersicht
- **Abo-Verteilung**: 4 Plantypen (Starter 9,90€ / Pro 29€ / Duo 49€ / Team 79€) mit editierbaren Counts + DB-Vergleich
- MRR/ARR-Berechnung: `Abo-Count × Planpreis`
- Plan-Verteilung als Pie Chart
- Breakdown-Tabelle mit Monat/Jahr-Hochrechnung

#### Tab: CopeCart
- **Reconciliation-KPIs**: Zahlungen, Brutto-Einnahmen, Erstattungen, Netto-Revenue
- Transaktionslog aus `admin_revenue_log`
- Filter nach Event-Typ (payment, refund, chargeback, etc.)
- Letztes Event-Datum

#### Tab: Trend
- **6-Monats-Liniendiagramm**: Einnahmen (nur CopeCart-Log) vs. Ausgaben vs. Gewinn
- Daten aus `admin_revenue_log` + `admin_expenses`

#### Tab: Ausgaben
- CRUD für `admin_expenses`
- Kategorien: Hosting, Software, Marketing, CopeCart Gebühren, Steuerberater, Personal, Büro, Versicherungen, Sonstiges
- Kategorie-Filter + Suche
- Pie Chart nach Kategorie
- CSV-Import (Titel, Betrag, Datum, Kategorie)

#### Tab: EÜR
- Vereinfachte Einnahmen-Überschuss-Rechnung
- Hinweis: § 19 UStG (Kleinunternehmer)

**Exporte**:
- **CSV**: Kompletter Finanzbericht (Einnahmen + CopeCart-Log + Ausgaben + EÜR)
- **JSON**: Maschinen-lesbarer Export aller Finanzdaten

### 3.2 Manuelle Zahlungen (`AdminManualPayments.tsx`)

- Tabelle `admin_provider_payments`
- **Erfassbare Felder**: Provider, Betrag, Zahlungsmethode (CopeCart/Überweisung/Bar/PayPal/Sonstige), Zahlungsdatum, Plan (Starter/Pro/Duo/Team/Individuell), Zeitraum von/bis, Notiz
- MRR/ARR aus aktiven Zahlungen (period_start ≤ heute ≤ period_end)
- **Fehlend**: Bearbeiten, Löschen, Rechnungsnummer, automatische Feature-Provisionierung

### 3.3 Hufrente-Übersicht (`AdminHufrenteOverview.tsx`)

- Spezialmodul für Hufrenten-Tracking

---

## 4. COMPLIANCE

### 4.1 Vertrags-Tracking (`AdminContractTracking.tsx`)

- Tabelle `provider_contracts`
- Pro Provider: AVV-Unterzeichnung (Datum + Version), AGB-Akzeptanz, Datenschutz-Akzeptanz
- Filter: "Nur fehlende anzeigen"
- Status-Badges: Unterzeichnet (grün) / Fehlend (rot)

### 4.2 Datenaufbewahrung (`RetentionDashboard.tsx`)

- Tabelle `data_retention_rules` mit Kategorien, Aufbewahrungsfristen, Aktionen
- Scanner: Findet bald ablaufende Datensätze
- Unterstützt DSGVO Art. 17 (Recht auf Löschung)
- Kategorien: z.B. "Rechnungen" (10 Jahre, §147 AO), "Chat-Nachrichten" (180 Tage), etc.

---

## 5. SYSTEM

### 5.1 Dev-Zentrale (`AdminDevZentrale.tsx`)

- **Kanban-Board** für Bugs, Ideen, Prompts, Tasks
- 3 Spalten: Inbox, In Arbeit, Erledigt
- Prioritäten: Low, Normal, High, Urgent
- Gespeichert in `admin_notes`

### 5.2 Version Manager (`VersionManager.tsx`)

- App-Versionen für Provider-App und Client-App separat verwalten
- Force-Update erzwingen mit Custom-Message
- Gespeichert in `system_settings`

### 5.3 System-Doku (`AdminSystemDoku.tsx`)

- Interne technische Dokumentation
- Changelog aller Migrationen und Features

### 5.4 KI Data Hub (`AdminKIDataHub.tsx`)

- Verwaltung von KI-bezogenen Daten (Prompts, Trainingskontext)
- Tabelle `agent_data_hub` mit RLS (nur Admins)

### 5.5 Produkt-Katalog (`AdminProductCatalog.tsx`)

- Verwaltung aller Produkte/Services systemweit

---

## 6. MARKETING

### 6.1 Blog Manager (`AdminBlogManager.tsx`, ~760 Zeilen)

- Vollständiges CMS: Erstellen, Bearbeiten, Veröffentlichen, Planen
- Content-Typen: Blog-Artikel + Video-Content
- SEO: Meta-Titel, Meta-Description, Slug
- Kategorien, Featured Image, Video-URL
- Scheduled Publishing (geplante Veröffentlichung)
- Tabelle `blog_posts`

### 6.2 Funnel-Cockpit (`FunnelCockpit.tsx`)

- Lead-Management aus `funnel_leads`
- Lead-Karten mit Status-Tracking
- Filter: Status, Topic, Freitextsuche
- KPIs: Lead-Statistiken
- CRUD für Leads (Erstellen, Bearbeiten)

### 6.3 Demo Analytics (`DemoAnalyticsDashboard.tsx`)

- Tracking aller Demo-Account-Aktivitäten aus `demo_activity_logs`
- Zeitfilter: 24h, 7d, 30d, Alle
- KPIs: Seitenaufrufe, Aktionen, CopeCart-Klicks
- CopeCart-Klicks nach Plan aufgeschlüsselt
- Top-Seiten, Aktivität nach Stunde
- Einzelne Activity-Log-Einträge

### 6.4 Demo-Account-Verwaltung (`DemoAccountsManager.tsx`)

- Verwaltung der 4 Demo-Accounts
- Detail-Dialog (`DemoAccountDetailDialog.tsx`)

### 6.5 Content Calendar (`ContentCalendar.tsx`)

- Redaktionsplan für Blog/Social Media

### 6.6 Glossar (`AdminGlossaryManager.tsx`)

- Fachbegriffe-Verwaltung

### 6.7 Feedback-Viewer (`AdminFeedbackViewer.tsx`)

- Alle Nutzer-Feedbacks systemweit

### 6.8 Broadcast (`AdminBroadcastCard.tsx`)

- Massen-Nachrichten an Nutzergruppen

### 6.9 Academy Videos

- Video-Tutorials verwalten (Tabelle `academy_videos`)

---

## 7. DATENBANK-TABELLEN (Admin-spezifisch)

| Tabelle | Zweck |
|---|---|
| `admin_provider_payments` | Manuell erfasste Zahlungen |
| `admin_revenue_log` | CopeCart-Webhook-Events |
| `admin_expenses` | Betriebsausgaben |
| `admin_activity_log` | Admin-Aktionen (Audit) |
| `admin_notes` | Dev-Zentrale (Bugs/Ideen/Tasks) |
| `global_feature_defaults` | Standard-Feature-Status |
| `system_settings` | App-Versionen, Force-Update |
| `data_retention_rules` | DSGVO-Aufbewahrungsfristen |
| `provider_contracts` | AVV/AGB/Datenschutz-Tracking |
| `demo_activity_logs` | Demo-Account-Tracking |
| `funnel_leads` | Lead-Management |
| `blog_posts` | CMS |
| `config_snapshots` | Konfigurations-Backups |

---

## 8. COPECART-WEBHOOK (Edge Function)

### Feature-Provisionierung (`PLAN_FEATURE_MAP`)

| Plan | module_team | AutoFlow | Beta |
|---|---|---|---|
| starter | ❌ disabled | ❌ alle disabled | ❌ |
| advanced | 🧪 beta | ✅ reminders, invoicing, feedback | ❌ |
| pro | ✅ public | ✅ alle public | ✅ |

### Webhook-Flow

1. CopeCart sendet Event → Edge Function
2. Signatur-Verifizierung
3. Provider-Lookup per E-Mail
4. `subscription_plan` + `subscription_status` update
5. `feature_statuses` JSONB auto-provision via `PLAN_FEATURE_MAP`
6. Log in `admin_revenue_log`
7. Grace Period: 7 Tage bei Downgrade

---

## 9. BEKANNTE LÜCKEN (für Strategie-Planung)

### Kritisch für Pricing-Strategie

1. **Keine Feature-Provisionierung bei manuellem Plan-Wechsel** – Nur CopeCart-Webhook setzt Features
2. **MRR-Berechnung fehlerhaft** – Jahres-Zahlungen werden nicht auf /12 normalisiert
3. **Duo + Team fehlen in Admin-Plan-Dropdown** – Nur Starter, Pro, Lifetime, Barzahlung, Beta, Employee verfügbar
4. **Kein Rechnungsnummer-Feld** in `admin_provider_payments`
5. **Kein Mitarbeiter-Limit pro Plan** – Unbegrenzt ab `module_team = public`
6. **PLAN_FEATURE_MAP nutzt veraltete Plan-Namen** – `advanced` statt `duo`, kein `team`-Eintrag mit voller Differenzierung
7. **Getrennte Revenue-Tracking** – CopeCart und manuell in separaten Tabellen, kein konsolidierter View
8. **Kein DATEV-Export** – Nur CSV mit vereinfachter Struktur
9. **Keine automatische Zugangs-Verlängerung** bei Zahlungserfassung

---

## 10. SALES-FUNNEL & LANDINGPAGE

### 10.1 CTAs auf der Landingpage

| Button/CTA | Ziel |
|---|---|
| "Kostenlos testen" (Navbar) | `#demo` Anchor |
| "Demo starten" (Hero) | `/auth?force=login` |
| Pricing-Buttons (alle 4 Pläne) | `#demo` Anchor (kein Direktkauf!) |
| "Eigenen Account erstellen" (Final CTA) | `/auth?force=login` |
| Audience Tab: Hufbearbeiter | `#demo` |
| Audience Tab: Fachpartner | `/auth?role=partner` |
| Audience Tab: Mitarbeiter | `/employee-invite` |
| Audience Tab: Pferdebesitzer | `/auth?role=client` |

### 10.2 Demo-Flow

1. Landingpage → `/auth?force=login` → 1-Click Demo-Login
2. Im Demo-Account: `DemoStickyBanner` am unteren Rand
3. Banner-CTA "Eigenen Account erstellen" → öffnet `PricingModal`
4. PricingModal enthält die **einzigen** CopeCart-Checkout-Links

### 10.3 CopeCart-Produkt-IDs

| Plan | CopeCart-ID | Status |
|---|---|---|
| Starter (9,90€) | `9bb65569` | ✅ aktiv |
| Pro (29€) | `ec500b5e` | ✅ aktiv |
| Duo (49€) | `483bbb5b` | ✅ aktiv |
| Team (79€) | `team-checkout` | ⚠️ Platzhalter |

### 10.4 Funnel-Schwächen

1. **Kein Direktkauf** von der Landingpage möglich
2. **Team-Plan** hat keinen funktionierenden Checkout-Link
3. Wenn Demo-Banner geschlossen → kein Kaufpfad mehr sichtbar
4. **Kein Tracking** für Landingpage-Besucher oder Conversion-Rates
5. Kein UTM/Pixel/Google Analytics implementiert

---

## 11. PROVIDER-VERWALTUNG – PLAN-TYPEN

### Im System existierende Plan-Typen

| Wert | Label | Verhalten |
|---|---|---|
| `starter` | Starter (Free) | `plan_override: null`, `subscription_status: trialing` |
| `pro` | Pro | `plan_override: pro`, `subscription_status: active` |
| `lifetime_grant` | Lifetime (Goldesel) | `access_valid_until: 2099-12-31` |
| `manual_cash_1y` | Barzahlung (1 Jahr) | `access_valid_until: +1 Jahr` |
| `beta_tester` | Beta Tester | Override ohne spezielle Automatik |
| `employee` | Employee | `access_valid_until: 2099-12-31` |

### CopeCart-Webhook zusätzliche Mappings

`copecart_starter`, `copecart_pro`, `copecart_duo`, `copecart_team`, `copecart_anfaenger`, `copecart_fortgeschritten`, `copecart_profi`

### Status-Typen

- **`active`** – aktives Abo (Badge: grün ✓)
- **`trialing`** – Starter/Test (Badge: grau)
- **`is_suspended = true`** – Gesperrt (Badge: rot)
- **`lifetime_grant`** – Lifetime (Badge: gold mit Krone)
- Kein expliziter "cancelled"-Status – Churn über `access_valid_until < now()`

---

## 12. MITARBEITER-SYSTEM

### Aktueller Aufbau

- **Tabelle `employee_profiles`**: id, user_id, provider_id, full_name, email, role (employee/team_lead), status (active/inactive/pending), organization_id
- **Zugehörige Tabellen**: employee_time_tracking, employee_absence_requests, employee_material_assignments, employee_audit_log, employee_notes, employee_schedules
- **Feature-Gate**: `module_team` in `PLAN_FEATURE_MAP` – ab `pro` Plan auf `public`
- **Kein Mitarbeiter-Limit** pro Plan – keine Validierung

### Für Addon-System nötig

1. Neues DB-Feld `max_employees` (integer, default 0) in `profiles` oder `business_settings`
2. Validierungs-Trigger auf `employee_profiles`: INSERT prüft `COUNT(*) < max_employees`
3. Neues CopeCart-Produkt mit eigenem Webhook-Event (z.B. `employee_addon`)
4. Webhook-Handler: Bei `employee_addon`-Event `max_employees` inkrementieren
5. Downgrade-Logik (Grace Period? Automatische Deaktivierung?)
6. UI: "X/Y Mitarbeiter-Plätze belegt" + Upgrade-CTA
7. Admin: Manuelles Setzen von `max_employees` in Mission Control

---

## 13. ADMIN-BUCHHALTUNG (§19 UStG)

### Vorhandene Funktionen

- EÜR-Übersicht (vereinfacht, MRR-basiert)
- Ausgaben-Tracking mit Kategorien
- CopeCart-Transaktionslog
- CSV-Export (Einnahmen + Ausgaben + EÜR)
- JSON-Export

### Fehlend für vollständige Kleinunternehmer-Buchhaltung

1. Echte EÜR mit Zufluss-/Abfluss-Prinzip
2. Rechnungsnummern-System für Admin-Rechnungen
3. DATEV-Export (SKR03/SKR04)
4. Belegzuordnung zu Ausgaben (receipt_url existiert, UI fehlt)
5. GoBD-konforme Unveränderbarkeit (Audit-Log für Änderungen)
6. Jahresabschluss-Übersicht pro Steuerjahr
7. Umsatzgrenze-Tracking (Warnung bei Annäherung an 22.000€ §19-Grenze)
