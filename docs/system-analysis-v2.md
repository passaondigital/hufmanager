# HufManager – Systemanalyse v2 (Stand: 05. März 2026)

---

## 1. TAGES-COCKPIT (`/tour`)

### Implementierte Zustände

| Zustand | Datei | Status |
|---------|-------|--------|
| **Bereit** (`ready`) | `CockpitReady.tsx` | ✅ Implementiert – Terminliste, Route-Stats, Spritpreis, "Tour starten" Button (64px) |
| **Unterwegs** (`underway`) | `CockpitUnderway.tsx` | ✅ Implementiert – 55vh Karte / 45vh Panel, Leaflet Map, Buttons in Daumenzone |
| **Abschluss** (`complete`) | `CockpitComplete.tsx` | ✅ Implementiert – Zusammenfassung (km, Zeit, Spritkosten), CTA "Rechnungen erstellen" |

### Sidebar-Verhalten

| Frage | Antwort |
|-------|---------|
| Klappt Sidebar bei Tour-Start ein? | ✅ Ja – `CockpitFullscreenContext` setzt `isFullscreen=true` für **alle 3 Zustände**. `AppLayout.tsx` rendert bei `isFullscreen` nur `<Outlet />` ohne Sidebar, Header, BottomNav, DemoBanner. |
| Klappt Sidebar bei Pause/Stopp wieder auf? | ⚠️ Teilweise – `onDismiss` im Complete-Screen setzt `cockpitState` zurück auf "ready", aber `isFullscreen` bleibt `true` da `useEffect` immer `setFullscreen(true)` setzt. Sidebar wird **nie** angezeigt solange `/tour` aktiv ist. Nutzer muss manuell weg navigieren. |

### Feature-Status

| Feature | Status | Detail |
|---------|--------|--------|
| **Tempoanzeige (GPS speed)** | ❌ Nicht vorhanden | Kein `pos.coords.speed` wird ausgelesen oder angezeigt |
| **km-Akkumulation** | ✅ Implementiert | Haversine-Berechnung in `watchPosition`, 30m-Schwellenwert, Accuracy-Filter (`<50m`). Live-Update via `setGpsTotalKm`. **Aber:** Zeigt initial "0 km" bis GPS sich bewegt – kein Rückgriff auf OSRM-Entfernung. |
| **ORS Turn-by-Turn** | ❌ Nicht vorhanden | Route wird nur als gerade Linie (Polyline) zwischen GPS und nächstem Ziel gezeichnet. Kein ORS/OSRM Routing-Polyline. Keine Abbiegungshinweise. |
| **Sprachausgabe** | ❌ Nicht vorhanden | Kein `SpeechSynthesis` API verwendet |
| **Auto-Ankunftserkennung (Geofence)** | ❌ Nicht vorhanden | Kein automatischer Status-Wechsel bei Annäherung. "Angekommen" muss manuell gedrückt werden. |
| **Gefahrenstellen-POI** | ❌ Nicht vorhanden | Keine POI-Layer auf der Karte |
| **Farbcodierung je Auftragstyp** | ❌ Nicht vorhanden | Alle Termine haben gleiche Darstellung (oranger Nummernkreis) |
| **HelpTips im Cockpit** | ❌ Nicht vorhanden | Keine `<HelpTip>` Komponenten in den 3 Cockpit-Screens |
| **Offline-Tile-Cache** | ✅ Implementiert | `tilePrefetch.ts` cached OSM-Tiles (Zoom 10-16) via Cache API bei Tour-Start. Max 2000 Tiles. Cache wird bei Tour-Ende gelöscht. |
| **Karten-Rotation (Bearing)** | ❌ Nicht vorhanden | Karte ist statisch Nord-orientiert |
| **Auto-Zoom auf GPS + Ziel** | ✅ Implementiert | `MapAutoFit` Component nutzt `fitBounds` mit Padding |

### Benachrichtigungen an Kunden

| Benachrichtigung | Status |
|------------------|--------|
| "Hufbearbeiter ist angekommen" | ✅ Implementiert – `handleArrived()` insertet in `notifications`-Tabelle |
| "Hufbearbeiter ist unterwegs" | ❌ Nicht implementiert (kein "OnMyWay" im DayCockpit) |
| "Verspätung" | ❌ Nicht im DayCockpit (existiert separat in `EmergencyModeButton.tsx`) |
| "Termin fällt aus" | ❌ Nicht im DayCockpit |

---

## 2. KALENDER

| Frage | Antwort |
|-------|---------|
| Prominent oben in Sidebar? | ⚠️ Nein – Kalender ist unter Menüpunkt 4 "Auffassen" verschachtelt, nicht auf Top-Level |
| Live-Badge mit Anzahl heutiger Termine? | ❌ Nein – keine Badge am Kalender-Eintrag |
| Dashboard-Widget mit Tagesvorschau? | ✅ Ja – `DueAppointmentsWidget` auf dem Dashboard |
| Auftragstyp-Felder (`service_type`)? | ✅ Ja – `service_type` existiert in `appointments` Tabelle, wird im Kalender gefiltert und farbcodiert (`SERVICE_COLORS`) |
| Berufsgruppe wählbar in `business_settings`? | ❌ Nein – kein `profession_type` Feld in DB oder UI |
| Zeitpuffer je Auftragstyp konfigurierbar? | ❌ Nein – keine Zeitpuffer-Tabelle, keine Konfiguration vorhanden |

---

## 3. CLIENT-APP (Pferdebesitzer)

### Existierende Seiten

| Seite | Route | Beschreibung |
|-------|-------|--------------|
| ClientHome | `/client-home` | Hauptseite mit Pferden, Terminen, Quick Actions |
| ClientHorseDetail | `/client-horse/:id` | Pferdeakte Detail |
| ClientChat | `/client-chat` | Chat mit Provider |
| ClientBooking | `/client-booking` | Terminbuchung |
| ClientInvoices | `/client-invoices` | Rechnungen einsehen |
| ClientPermissions | `/client-permissions` | Datenschutz-Einstellungen |
| ClientProfile | `/client-profile` | Profil bearbeiten |
| ClientStallBoard | `/client-stall-board` | Stallboard |

### Benachrichtigungen & Live-Status

| Feature | Status | Detail |
|---------|--------|--------|
| Push-Benachrichtigungen | ✅ Grundstruktur | `usePushNotifications` Hook, `PushNotificationBanner`, `PushNotificationToggle`. Edge Function `send-push-notification` existiert. **Aber:** VAPID Key muss als Env-Variable konfiguriert sein. |
| Heutige Termine sichtbar? | ✅ Ja | `UpcomingAppointmentsList` mit Supabase Realtime Subscription |
| Provider-Status sichtbar? | ✅ Ja | `ProviderTourStatusWidget` zeigt: "Unterwegs", "Du bist als Nächstes dran", "Noch X Stationen vor dir", ETA-Berechnung, Verzögerungswarnung |
| Echtzeit-Karte wo Provider ist? | ❌ Nein | Kein Karten-Widget in Client-App. Nur Text-Status. |
| HelpTips in Client-App? | ✅ Ja | `HelpTip` auf ClientHome ("kunden.home") |
| Supabase Realtime? | ✅ Teilweise | `UpcomingAppointmentsList` nutzt Realtime für Termin-Updates. Provider-Status pollt alle 15 Sekunden (kein echtes Realtime). |

### Implementierte Benachrichtigungstypen (DB-Trigger)

| Typ | Trigger/Insert |
|-----|---------------|
| `appointment` | `create_appointment_status_notification()` – bei Status-Änderung |
| `appointment_created` | `notify_client_on_appointment_created()` – neuer Termin |
| `arrival` | DayCockpit `handleArrived()` – "Hufbearbeiter ist da!" |
| `horse_created` | `notify_provider_on_horse_created()` – Pferd angelegt |
| `horse_updated` | `notify_provider_on_horse_updated()` – Pferdeakte geändert |
| `chat` | `create_message_notification()` – neue Chat-Nachricht |
| `client_login` | `notify_provider_on_client_login()` – Erster Login |

---

## 4. PARTNER-APP & MITARBEITER-APP

### Partner-App

| Feature | Status |
|---------|--------|
| Eigenes Layout | ✅ `PartnerAppLayout.tsx` |
| Eigenes Cockpit/Tour | ❌ Kein eigenes Cockpit |
| Kalender in Sidebar | ❌ Nicht prominent – Partner hat eigene Navigation |
| HelpTips | ✅ Ja – auf PartnerHome, Behandlungspläne, Rechnungen |
| Seiten | PartnerHome, PartnerHorses, PartnerClients, PartnerTreatmentPlans, PartnerInvoices, PartnerCalendar, PartnerSettings |

### Mitarbeiter-App

| Feature | Status |
|---------|--------|
| Eigenes Layout | ✅ `EmployeeAppLayout.tsx` |
| Eigene Tour-Seite | ✅ `EmployeeTour.tsx` – Listenbasiert (keine Karte), Assignments mit Status-Tracking |
| Eigenes Cockpit (Vollbild-Navi)? | ❌ Nein – nur einfache Kartenliste |
| Kalender | ❌ Nicht in Employee-Navigation |
| HelpTips | ❌ Nicht in Employee-Screens |
| Onboarding | ✅ `EmployeeOnboarding.tsx` mit Checkliste |
| Unterschied zum Provider | Employee hat kein Karten-Cockpit, keine Routenberechnung, keine Spritpreise, keine km-Akkumulation |

---

## 5. LANDINGPAGE (`www.hufmanager.de`)

### Aktuelle Sektionen (in Reihenfolge)

1. `Navbar` – Navigation
2. `HeroV2` – Hero-Bereich
3. `ProblemSection` – Problemdarstellung
4. `IdentitySection` – Identität
5. `HorseEcosystem` – Ökosystem-Übersicht
6. `SolutionSection` – Lösung / Nutzen
7. `EcosystemSection` – Ecosystem Detail
8. `AudienceTabsSection` – Zielgruppen-Tabs
9. `DataSovereigntyBadge` – DSGVO-Badge
10. `PillarsSection` – Die 5 A's
11. `OfflineSection` – Offline-Fähigkeit
12. `DemoSection` – Demo-Account
13. `PricingV2` – Preise
14. `TrustSection` – Vertrauen
15. `ContactFormSection` – Kontaktformular
16. `HufrenteSection` – Hufrente
17. `FAQ` – FAQ
18. `FinalCTA` – Final Call-to-Action
19. `LatestBlogPosts` – Blog-Posts
20. `FooterNew` – Footer
21. `CookieBanner` – Cookie-Consent

### Feature-Bewerbung

| Feature | Auf Landingpage beworben? |
|---------|--------------------------|
| Live-Spritpreise (Tankerkönig) | ❌ Nicht erwähnt |
| Tages-Cockpit / Navi-Modus | ❌ Nicht erwähnt |
| Turn-by-Turn Navigation | ❌ Nicht erwähnt (auch nicht implementiert) |
| Automatisches Fahrtenbuch | ❌ Nicht erwähnt |
| Kundenbenachrichtigung in Echtzeit | ❌ Nicht erwähnt |
| Tour Manager | ❌ Nicht auf Website-Sektionen gefunden |

### Berufsgruppen

- `SolutionSection` erwähnt "für jede Berufsgruppe" generisch
- Website-Titel: "Pferde-Profis" (umfassend)
- Keine explizite Auflistung von Osteopath, Physio etc. auf der Landingpage gefunden (müsste in `AudienceTabsSection` geprüft werden)

### Blog / Changelog

| Feature | Status |
|---------|--------|
| Blog | ✅ `/blog` Seite existiert, `LatestBlogPosts` auf Landingpage |
| Changelog | ✅ `/docs/changelog` existiert (öffentliche Docs) |
| Screenshots/Mockups | ❓ Müsste in den Website-Komponenten visuell geprüft werden |

---

## 6. DATENBANK – Feldprüfung

| Feld / Tabelle | Vorhanden? | Detail |
|----------------|------------|--------|
| `vehicle_consumption_per_100km` in `business_settings` | ✅ Ja | Spalte existiert in Types |
| `vehicle_fuel_type` in `business_settings` | ✅ Ja | Spalte existiert in Types |
| `profession_type` in `profiles` oder `business_settings` | ❌ Nein | Kein solches Feld vorhanden |
| Auftragstyp-Zeitpuffer Tabelle | ❌ Nein | Keine Tabelle oder Konfiguration |
| Push-Notification Tabelle/Logik | ✅ Teilweise | `push_subscriptions` wird von `usePushNotifications` verwendet. Edge Function `send-push-notification` existiert. `notifications`-Tabelle für In-App. |
| `onboarding_completed` in Profiles | ✅ Ja | `profiles.onboarding_completed` (boolean) |
| `onboarding_completed` in Employee | ✅ Ja | `employee_profiles.onboarding_completed` (JSON) |
| `client_notifications` Tabelle | ❌ Nein | Keine separate Tabelle. Clients nutzen die allgemeine `notifications`-Tabelle |
| `provider_vehicles` | ✅ Ja | Mit `average_consumption`, `fuel_type`, `price_per_km`, `is_primary` |
| `daily_tours` | ✅ Ja | Mit `tour_active_since`, `tour_ended_at`, `total_distance_km`, `optimized_order` |
| `tour_breadcrumbs` | ✅ Ja | GPS-Breadcrumbs mit `latitude`, `longitude`, `accuracy` |
| `tour_emergency_status` | ✅ Ja | Für Verspätungs-Meldungen |

---

## 7. BEKANNTE BUGS & OFFENE ISSUES

### Bugs

| Bug | Schweregrad | Detail |
|-----|-------------|--------|
| km zeigt "0 km" bei Tour-Start | 🟡 Mittel | GPS braucht Bewegung > 30m für erstes Update. Kein Rückgriff auf berechnete Route-Distanz. |
| Route ist nur gerade Linie | 🔴 Hoch | `CockpitUnderway` zeichnet `Polyline` direkt zwischen GPS und Ziel, kein ORS/OSRM Routing-Polyline. Sieht unprofessionell aus. |
| Kein Zurück-Button im Cockpit | 🟡 Mittel | Nutzer kann `/tour` nicht verlassen ohne Browser-Navigation oder URL-Änderung |
| `haversine` als lokale Funktion | 🟢 Niedrig | Dupliziert – existiert auch in `src/lib/geo.ts` |
| Sidebar-Toggle in Ready-State | 🟡 Mittel | Sidebar ist auch im "Bereit"-Zustand komplett weg – Nutzer verliert Navigation |
| OSRM Demo-Server | 🔴 Hoch | `router.project-osrm.org` ist öffentlich und rate-limited |
| Tile-URL Inkonsistenz | 🟢 Niedrig | `CockpitUnderway` nutzt `tile.openstreetmap.org`, andere Stellen nutzen `tile.openstreetmap.de` |

### Architektur-Schwächen

| Issue | Detail |
|-------|--------|
| `DayCockpit.tsx` zu groß | 499 Zeilen – alle Queries, GPS, Tour-Logik in einer Datei |
| Keine Route-Polyline vom Router | Route wird berechnet (OSRM Distanz/Dauer) aber die Polyline-Geometrie wird nicht auf die Karte gezeichnet |
| Provider-Status nur Polling | `ProviderTourStatusWidget` pollt alle 15s – kein Supabase Realtime |
| Keine echte Offline-Synchronisation | Tour-Breadcrumbs werden bei Offline nicht gequeued, sondern gehen verloren |
| Hardcoded Farben | Cockpit-Screens nutzen inline `style={{ color: "#F5970A" }}` statt Design-System-Tokens |

### Security

| Issue | Detail |
|-------|--------|
| Supabase outdated warnings | Abhängig von Scan-Ergebnis – 2 bekannte Issues erwähnt |
| No RLS auf `tour_breadcrumbs`? | Muss geprüft werden – Client-seitig wird nach `provider_id` gefiltert, aber server-seitige RLS unklar |

### Console Errors

- Zum Zeitpunkt der Analyse: **Keine Console-Errors gefunden** (User ist auf Auth-Seite)

### Nicht angebundene Komponenten

| Komponente | Status |
|------------|--------|
| `OnMyWayButton.tsx` (tour-manager) | Existiert aber wird **nicht** im DayCockpit verwendet |
| `TourControls.tsx` (tour-manager) | Alter Tour Manager – parallel zu DayCockpit, potenziell redundant |
| `TourManager.tsx` (tour-manager) | Alte Vollbild-Karte – ersetzt durch DayCockpit |
| `BreadcrumbsReplay.tsx` | Existiert, Einbindung unklar |
| `NearbyCustomersLayer.tsx` | Existiert, nicht im DayCockpit eingebunden |
| `TourMapView.tsx` | WorkMode-eingebettete Karte – parallel zum DayCockpit |

---

## Dateien-Übersicht (Cockpit)

```
src/components/day-cockpit/
├── CockpitComplete.tsx      (135 Zeilen)
├── CockpitFullscreenContext.tsx (21 Zeilen)
├── CockpitReady.tsx         (167 Zeilen)
├── CockpitUnderway.tsx      (250 Zeilen)
├── DayCockpit.tsx           (499 Zeilen) ← zu groß
└── index.ts
```

---

*Erstellt: 05.03.2026 | Analyse-Methode: Statische Code-Analyse*
